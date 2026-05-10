const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const qrcode = require('qrcode-terminal');
const WebSocket = require('ws');

const { COMMANDS, PROFILES } = require('./protocol');

function loadNutJs() {
  try {
    return require('@nut-tree-fork/nut-js');
  } catch (forkError) {
    const forkPackageMissing =
      forkError.code === 'MODULE_NOT_FOUND' &&
      forkError.message.includes('@nut-tree-fork/nut-js');

    if (!forkPackageMissing) {
      throw forkError;
    }

    return require('@nut-tree/nut-js');
  }
}

const { keyboard, Key } = loadNutJs();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const FRONTEND_DEV_PORT = Number(process.env.FRONTEND_DEV_PORT || 5173);
const DIST_DIR = path.join(__dirname, 'dist');
const INDEX_FILE = path.join(DIST_DIR, 'index.html');
const DRY_RUN_KEYS = process.env.DRY_RUN_KEYS === '1';
const PAIRING_PIN = process.env.CONTROL_PIN || crypto.randomInt(0, 10000).toString().padStart(4, '0');
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_COMMANDS = 8;
const MAX_MESSAGE_BYTES = 1024;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function getCommandKeyMap() {
  return Object.fromEntries(
    Object.values(COMMANDS).map((command) => {
      const keys = command.keyNames.map((keyName) => {
        const key = Key[keyName];
        if (key === undefined) {
          throw new Error(`Unknown key mapping "${keyName}" for command "${command.id}"`);
        }
        return key;
      });

      return [command.id, keys];
    })
  );
}

const commandKeyMap = getCommandKeyMap();

function json(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(body));
}

function sendDevFallback(res) {
  res.writeHead(503, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Build required</title></head>
  <body style="font-family: system-ui; padding: 2rem;">
    <h1>React build not found</h1>
    <p>Run <code>npm run build</code> before <code>npm start</code>, or use <code>npm run dev</code> and open the Vite URL.</p>
  </body>
</html>`);
}

function safeResolveStaticPath(pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const resolvedPath = path.normalize(path.join(DIST_DIR, requestedPath));
  const relativePath = path.relative(DIST_DIR, resolvedPath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  return resolvedPath;
}

function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method not allowed');
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);

  if (url.pathname === '/health') {
    json(res, 200, {
      ok: true,
      dryRun: DRY_RUN_KEYS,
      profiles: Object.keys(PROFILES)
    });
    return;
  }

  if (!fs.existsSync(INDEX_FILE)) {
    sendDevFallback(res);
    return;
  }

  const staticPath = safeResolveStaticPath(url.pathname);
  if (!staticPath) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  const fileToServe = fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()
    ? staticPath
    : INDEX_FILE;
  const extension = path.extname(fileToServe).toLowerCase();

  res.writeHead(200, {
    'Content-Type': mimeTypes[extension] || 'application/octet-stream',
    'Cache-Control': fileToServe === INDEX_FILE ? 'no-store' : 'public, max-age=31536000, immutable'
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  fs.createReadStream(fileToServe).pipe(res);
}

const httpServer = http.createServer(serveStatic);

function getLocalAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        addresses.push(entry.address);
      }
    }
  }

  return addresses;
}

function getAllowedOriginHosts() {
  return new Set(['localhost', '127.0.0.1', ...getLocalAddresses()]);
}

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  try {
    const url = new URL(origin);
    const allowedPorts = new Set([String(PORT), String(FRONTEND_DEV_PORT)]);
    return getAllowedOriginHosts().has(url.hostname) && allowedPorts.has(url.port || '80');
  } catch {
    return false;
  }
}

function safeSend(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function makeStatus(state) {
  return {
    type: 'status',
    connected: true,
    paired: state.paired,
    profiles: PROFILES,
    commands: COMMANDS
  };
}

function parseMessage(message) {
  if (message.length > MAX_MESSAGE_BYTES) {
    return { ok: false, error: 'Message is too large.' };
  }

  try {
    const data = JSON.parse(message.toString());
    if (!data || typeof data !== 'object') {
      return { ok: false, error: 'Message must be a JSON object.' };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Message must be valid JSON.' };
  }
}

function isRateLimited(state) {
  const now = Date.now();
  state.commandTimestamps = state.commandTimestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (state.commandTimestamps.length >= RATE_LIMIT_MAX_COMMANDS) {
    return true;
  }

  state.commandTimestamps.push(now);
  return false;
}

async function pressKeys(keys) {
  if (DRY_RUN_KEYS) {
    return;
  }

  const pressedKeys = [];

  try {
    for (const key of keys) {
      await keyboard.pressKey(key);
      pressedKeys.push(key);
    }
  } finally {
    while (pressedKeys.length > 0) {
      const key = pressedKeys.pop();
      try {
        await keyboard.releaseKey(key);
      } catch (error) {
        console.error('Failed to release key:', error.message);
      }
    }
  }
}

async function executeCommand(commandId) {
  const keys = commandKeyMap[commandId];
  if (!keys) {
    throw new Error(`Unknown command: ${commandId}`);
  }

  await pressKeys(keys);
}

const wss = new WebSocket.Server({
  server: httpServer,
  maxPayload: MAX_MESSAGE_BYTES
});

wss.on('connection', (ws, req) => {
  const state = {
    paired: false,
    commandTimestamps: []
  };
  const client = req.socket.remoteAddress || 'unknown device';

  if (!isAllowedOrigin(req.headers.origin)) {
    safeSend(ws, { type: 'error', code: 'origin_denied', message: 'This origin is not allowed.' });
    ws.close(1008, 'Origin not allowed');
    return;
  }

  console.log(`Remote connected from ${client}`);
  safeSend(ws, makeStatus(state));

  ws.on('message', async (message) => {
    const parsed = parseMessage(message);
    if (!parsed.ok) {
      safeSend(ws, { type: 'error', code: 'bad_message', message: parsed.error });
      return;
    }

    const data = parsed.data;

    if (data.type === 'ping') {
      safeSend(ws, { type: 'status', connected: true, paired: state.paired });
      return;
    }

    if (data.type === 'pair') {
      const pin = typeof data.pin === 'string' ? data.pin.trim() : '';

      if (pin === PAIRING_PIN) {
        state.paired = true;
        state.commandTimestamps = [];
        safeSend(ws, { type: 'paired' });
        safeSend(ws, makeStatus(state));
        console.log(`Remote paired from ${client}`);
        return;
      }

      safeSend(ws, { type: 'error', code: 'pairing_failed', message: 'Incorrect pairing PIN.' });
      return;
    }

    if (data.type === 'command') {
      const commandId = typeof data.command === 'string' ? data.command : '';
      const command = COMMANDS[commandId];

      if (!state.paired) {
        safeSend(ws, { type: 'error', code: 'not_paired', message: 'Pair this remote before sending commands.' });
        return;
      }

      if (!command) {
        safeSend(ws, { type: 'error', code: 'unknown_command', message: `Unknown command: ${commandId}` });
        return;
      }

      if (typeof data.profile === 'string' && data.profile !== command.profile) {
        safeSend(ws, { type: 'error', code: 'profile_mismatch', message: `Command "${commandId}" is not part of profile "${data.profile}".` });
        return;
      }

      if (isRateLimited(state)) {
        safeSend(ws, { type: 'error', code: 'rate_limited', message: 'Slow down before sending more commands.' });
        return;
      }

      try {
        await executeCommand(commandId);
        safeSend(ws, { type: 'ack', command: commandId, profile: command.profile, dryRun: DRY_RUN_KEYS });
        console.log(`Command: ${commandId}${DRY_RUN_KEYS ? ' (dry run)' : ''}`);
      } catch (error) {
        safeSend(ws, { type: 'error', code: 'command_failed', message: `Could not run command: ${command.label}` });
        console.error(`Keyboard error for "${commandId}":`, error.message);
      }
      return;
    }

    safeSend(ws, { type: 'error', code: 'unknown_message', message: `Unknown message type: ${data.type}` });
  });

  ws.on('close', () => {
    console.log(`Remote disconnected from ${client}`);
  });
});

function withPin(url) {
  return `${url}/?pin=${encodeURIComponent(PAIRING_PIN)}`;
}

httpServer.listen(PORT, HOST, () => {
  const addresses = getLocalAddresses();
  const urls = addresses.length > 0
    ? addresses.map((address) => `http://${address}:${PORT}`)
    : [`http://localhost:${PORT}`];

  console.log(`Presentation remote server is running on port ${PORT}`);
  console.log(`Pairing PIN: ${PAIRING_PIN}`);
  console.log(DRY_RUN_KEYS ? 'Keyboard mode: dry run' : 'Keyboard mode: live');

  for (const url of urls) {
    const appUrl = withPin(url);
    console.log(`Open on phone: ${appUrl}`);
    qrcode.generate(appUrl, { small: true });

    if (!fs.existsSync(INDEX_FILE)) {
      console.log(`Dev UI: http://${new URL(url).hostname}:${FRONTEND_DEV_PORT}/?pin=${PAIRING_PIN}`);
    }
  }
});
