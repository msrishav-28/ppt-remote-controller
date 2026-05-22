'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  buildCommandKeyMap,
  checkRateLimit,
  createPairGuard,
  isAllowedOrigin,
  parseMessage,
  safeResolveStaticPath
} = require('../server-lib');

test('buildCommandKeyMap maps key names and rejects unknown keys', () => {
  const keyEnum = { F5: 100, Left: 101, Right: 102 };
  const commands = {
    start: { id: 'start', keyNames: ['F5'] },
    prev: { id: 'prev', keyNames: ['Left', 'Right'] }
  };

  assert.deepEqual(buildCommandKeyMap(commands, keyEnum), {
    start: [100],
    prev: [101, 102]
  });

  assert.throws(
    () => buildCommandKeyMap({ bad: { id: 'bad', keyNames: ['Missing'] } }, keyEnum),
    /Unknown key mapping/
  );
});

test('safeResolveStaticPath keeps requests inside the dist directory', () => {
  const dist = path.join(process.cwd(), 'dist');

  assert.notEqual(safeResolveStaticPath(dist, '/'), null);
  assert.notEqual(safeResolveStaticPath(dist, '/index.html'), null);

  const asset = safeResolveStaticPath(dist, '/assets/app.js');
  assert.notEqual(asset, null);
  assert.ok(!path.relative(dist, asset).startsWith('..'));

  assert.equal(safeResolveStaticPath(dist, '/../server.js'), null);
  assert.equal(safeResolveStaticPath(dist, '/..%2f..%2fserver.js'), null);
  assert.equal(safeResolveStaticPath(dist, '/%2e%2e/server.js'), null);
  assert.equal(safeResolveStaticPath(dist, '/file%00.js'), null);
});

test('isAllowedOrigin only accepts known hosts on known ports', () => {
  const hosts = new Set(['localhost', '127.0.0.1', '192.168.1.5']);
  const ports = new Set(['3000', '5173']);

  assert.equal(isAllowedOrigin(undefined, hosts, ports), true);
  assert.equal(isAllowedOrigin('', hosts, ports), true);
  assert.equal(isAllowedOrigin('http://192.168.1.5:3000', hosts, ports), true);
  assert.equal(isAllowedOrigin('http://localhost:5173', hosts, ports), true);

  assert.equal(isAllowedOrigin('http://evil.example:3000', hosts, ports), false);
  assert.equal(isAllowedOrigin('http://192.168.1.5:9999', hosts, ports), false);
  assert.equal(isAllowedOrigin('http://192.168.1.5', hosts, ports), false);
  assert.equal(isAllowedOrigin('not-a-url', hosts, ports), false);
});

test('parseMessage rejects oversized, invalid, and non-object payloads', () => {
  assert.equal(parseMessage('x'.repeat(2000), 1024).ok, false);
  assert.equal(parseMessage('not json', 1024).ok, false);
  assert.equal(parseMessage('[1,2,3]', 1024).ok, false);
  assert.equal(parseMessage('null', 1024).ok, false);
  assert.equal(parseMessage('42', 1024).ok, false);

  const parsed = parseMessage('{"type":"pair","pin":"1234"}', 1024);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.data, { type: 'pair', pin: '1234' });

  const fromBuffer = parseMessage(Buffer.from('{"type":"command"}'), 1024);
  assert.equal(fromBuffer.ok, true);
});

test('checkRateLimit blocks once the window is full and prunes old entries', () => {
  let timestamps = [];
  for (let i = 0; i < 8; i += 1) {
    const result = checkRateLimit(timestamps, 1000, 1000, 8);
    assert.equal(result.limited, false);
    timestamps = result.timestamps;
  }

  assert.equal(checkRateLimit(timestamps, 1000, 1000, 8).limited, true);

  const afterWindow = checkRateLimit(timestamps, 5000, 1000, 8);
  assert.equal(afterWindow.limited, false);
  assert.equal(afterWindow.timestamps.length, 1);
});

test('createPairGuard locks a key out after repeated failures', () => {
  const guard = createPairGuard({ maxAttempts: 3, windowMs: 1000, lockoutMs: 500 });

  assert.equal(guard.status('phone', 0).locked, false);
  assert.equal(guard.recordFailure('phone', 0).remaining, 2);
  assert.equal(guard.recordFailure('phone', 0).remaining, 1);

  const locking = guard.recordFailure('phone', 0);
  assert.equal(locking.locked, true);
  assert.equal(guard.status('phone', 0).locked, true);
  assert.equal(guard.status('phone', 499).locked, true);
  assert.equal(guard.status('phone', 501).locked, false);
});

test('createPairGuard resets the counter outside the window and on success', () => {
  const guard = createPairGuard({ maxAttempts: 3, windowMs: 1000, lockoutMs: 500 });

  guard.recordFailure('a', 0);
  guard.recordFailure('a', 0);
  const afterWindow = guard.recordFailure('a', 5000);
  assert.equal(afterWindow.locked, false);
  assert.equal(afterWindow.remaining, 2);

  guard.recordFailure('b', 0);
  guard.recordSuccess('b');
  assert.equal(guard.status('b', 0).locked, false);
});

test('createPairGuard prunes stale records', () => {
  const guard = createPairGuard({ maxAttempts: 3, windowMs: 1000, lockoutMs: 500 });

  guard.recordFailure('stale', 0);
  assert.equal(guard.size(), 1);
  guard.prune(10000);
  assert.equal(guard.size(), 0);
});
