'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const qrcode = require('qrcode-terminal');
const WebSocket = require('ws');

const { COMMANDS, PROFILES } = require('./protocol');
const {
  buildCommandKeyMap,
  checkRateLimit,
  createPairGuard,
  isAllowedOrigin,
  parseMessage,
  safeResolveStaticPath
} = require('./server-lib');

function loadNutJs() {
  const candidates = ['@nut-tree-fork/nut-js', '@nut-tree/nut-js'];

  for (const name of candidates) {
    try {
      return require(name);
    } catch (error) {
      const isMissing = error.code === 'MODULE_NOT_FOUND' && error.message.includes(name);
      if (!isMissing) {
        throw error;
      }
    }
  }

  throw new Error(
    'Keyboard control module not found. Run "npm install" to install @nut-tree-fork/nut-js.'
  );
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
const HEARTBEAT_INTERVAL_MS = 30000;
const PAIR_MAX_ATTEMPTS = 5;
const PAIR_WINDOW_MS = 60000;
const PAIR_LOCKOUT_MS = 30000;

const allowedOriginPorts = new Set([String(PORT), String(FRONTEND_DEV_PORT)]);

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

const commandKeyMap = buildCommandKeyMap(COMMANDS, Key);
const pairGuard = createPairGuard({
  maxAttempts: PAIR_MAX_ATTEMPTS,
  windowMs: PAIR_WINDOW_MS,
  lockoutMs: PAIR_LOCKOUT_MS
});

function json(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
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

  const staticPath = safeResolveStaticPath(DIST_DIR, url.pathname);
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
    'Cache-Control': fileToServe === INDEX_FILE ? 'no-store' : 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff'
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

  if (!isAllowedOrigin(req.headers.origin, getAllowedOriginHosts(), allowedOriginPorts)) {
    safeSend(ws, { type: 'error', code: 'origin_denied', message: 'This origin is not allowed.' });
    ws.close(1008, 'Origin not allowed');
    return;
  }

  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  console.log(`Remote connected from ${client}`);
  safeSend(ws, makeStatus(state));

  ws.on('message', async (message) => {
    const parsed = parseMessage(message, MAX_MESSAGE_BYTES);
    if (!parsed.ok) {
      safeSend(ws, { type: 'error', code: 'bad_message', message: parsed.error });
      return;
    }

    const data = parsed.data;

    if (data.type === 'pair') {
      const now = Date.now();
      const lock = pairGuard.status(client, now);

      if (lock.locked) {
        const seconds = Math.ceil(lock.retryAfterMs / 1000);
        safeSend(ws, {
          type: 'error',
          code: 'pairing_locked',
          message: `Too many incorrect PINs. Try again in ${seconds}s.`
        });
        return;
      }

      const pin = typeof data.pin === 'string' ? data.pin.trim() : '';

      if (pin === PAIRING_PIN) {
        pairGuard.recordSuccess(client);
        state.paired = true;
        state.commandTimestamps = [];
        safeSend(ws, { type: 'paired' });
        safeSend(ws, makeStatus(state));
        console.log(`Remote paired from ${client}`);
        return;
      }

      const failure = pairGuard.recordFailure(client, now);
      if (failure.locked) {
        const seconds = Math.ceil(failure.retryAfterMs / 1000);
        safeSend(ws, {
          type: 'error',
          code: 'pairing_locked',
          message: `Too many incorrect PINs. Try again in ${seconds}s.`
        });
        console.warn(`Pairing locked for ${client} after ${PAIR_MAX_ATTEMPTS} failed attempts`);
      } else {
        safeSend(ws, { type: 'error', code: 'pairing_failed', message: 'Incorrect pairing PIN.' });
      }
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

      const rateLimit = checkRateLimit(state.commandTimestamps, Date.now(), RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_COMMANDS);
      state.commandTimestamps = rateLimit.timestamps;
      if (rateLimit.limited) {
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

  ws.on('error', (error) => {
    console.error(`Socket error from ${client}:`, error.message);
  });
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, HEARTBEAT_INTERVAL_MS);
heartbeat.unref();

const pairGuardCleanup = setInterval(() => pairGuard.prune(Date.now()), PAIR_LOCKOUT_MS);
pairGuardCleanup.unref();

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`\nReceived ${signal}, shutting down.`);

  clearInterval(heartbeat);
  clearInterval(pairGuardCleanup);

  for (const ws of wss.clients) {
    ws.close(1001, 'Server shutting down');
  }
  wss.close();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

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
