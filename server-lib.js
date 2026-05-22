'use strict';

// Pure, side-effect-free server logic. Kept separate from server.js so it can
// be unit tested without binding a port or loading native keyboard modules.

const path = require('path');

function buildCommandKeyMap(commands, keyEnum) {
  return Object.fromEntries(
    Object.values(commands).map((command) => {
      const keys = command.keyNames.map((keyName) => {
        const key = keyEnum[keyName];
        if (key === undefined) {
          throw new Error(`Unknown key mapping "${keyName}" for command "${command.id}"`);
        }
        return key;
      });

      return [command.id, keys];
    })
  );
}

function safeResolveStaticPath(distDir, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  if (decodedPath.includes('\0')) {
    return null;
  }

  const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const resolvedPath = path.normalize(path.join(distDir, requestedPath));
  const relativePath = path.relative(distDir, resolvedPath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  return resolvedPath;
}

function isAllowedOrigin(origin, allowedHosts, allowedPorts) {
  if (!origin) {
    return true;
  }

  try {
    const url = new URL(origin);
    return allowedHosts.has(url.hostname) && allowedPorts.has(url.port || '80');
  } catch {
    return false;
  }
}

function parseMessage(rawMessage, maxBytes) {
  const byteLength = typeof rawMessage === 'string'
    ? Buffer.byteLength(rawMessage)
    : rawMessage.length;

  if (byteLength > maxBytes) {
    return { ok: false, error: 'Message is too large.' };
  }

  let data;
  try {
    data = JSON.parse(rawMessage.toString());
  } catch {
    return { ok: false, error: 'Message must be valid JSON.' };
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'Message must be a JSON object.' };
  }

  return { ok: true, data };
}

// Sliding-window check. Returns the trimmed timestamp list so the caller can
// persist it; `limited` is true when the window is already full.
function checkRateLimit(timestamps, now, windowMs, max) {
  const recent = timestamps.filter((timestamp) => now - timestamp < windowMs);

  if (recent.length >= max) {
    return { limited: true, timestamps: recent };
  }

  recent.push(now);
  return { limited: false, timestamps: recent };
}

// Tracks failed pairing attempts per key (IP) and locks a key out after too
// many failures, so a 4-digit PIN cannot be brute-forced over the LAN.
function createPairGuard({ maxAttempts, windowMs, lockoutMs }) {
  const records = new Map();

  function status(key, now) {
    const record = records.get(key);
    if (record && record.lockedUntil > now) {
      return { locked: true, retryAfterMs: record.lockedUntil - now };
    }
    return { locked: false, retryAfterMs: 0 };
  }

  function recordFailure(key, now) {
    let record = records.get(key);

    if (!record || now - record.windowStart > windowMs) {
      record = { count: 0, windowStart: now, lockedUntil: 0 };
      records.set(key, record);
    }

    record.count += 1;

    if (record.count >= maxAttempts) {
      record.count = 0;
      record.lockedUntil = now + lockoutMs;
      record.windowStart = now + lockoutMs;
      return { locked: true, retryAfterMs: lockoutMs, remaining: 0 };
    }

    return { locked: false, retryAfterMs: 0, remaining: maxAttempts - record.count };
  }

  function recordSuccess(key) {
    records.delete(key);
  }

  function prune(now) {
    for (const [key, record] of records) {
      if (record.lockedUntil <= now && now - record.windowStart > windowMs) {
        records.delete(key);
      }
    }
  }

  function size() {
    return records.size;
  }

  return { status, recordFailure, recordSuccess, prune, size };
}

module.exports = {
  buildCommandKeyMap,
  checkRateLimit,
  createPairGuard,
  isAllowedOrigin,
  parseMessage,
  safeResolveStaticPath
};
