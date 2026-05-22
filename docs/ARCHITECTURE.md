# Architecture

A technical overview of how Slide Remote is built, for anyone modifying or
extending it.

- [Overview](#overview)
- [Project layout](#project-layout)
- [The WebSocket protocol](#the-websocket-protocol)
- [Pairing and security](#pairing-and-security)
- [Frontend](#frontend)
- [Adding a command](#adding-a-command)
- [Testing](#testing)
- [Build and deploy](#build-and-deploy)

## Overview

Slide Remote is two halves that talk over a WebSocket on the local network:

```
   Phone browser                         Laptop
 ┌───────────────┐                ┌───────────────────────┐
 │  React app    │   WebSocket    │  Node server          │
 │ (src/, dist/) │ ◄────────────► │  (server.js)          │
 │               │   ws://:3000   │      │                │
 └───────────────┘                │      ▼                │
        ▲                         │  @nut-tree-fork/nut-js │
        │ HTTP (same server        │      │                │
        │ serves the built app)    │      ▼                │
        └──────────────────────────┤  OS keyboard events   │
                                   └───────────────────────┘
```

- The **Node server** serves the built web app over HTTP **and** runs the
  WebSocket endpoint on the same port (default `3000`).
- The **React app** runs in the phone browser, connects back over WebSocket,
  pairs with a PIN, and sends command messages.
- The server validates each command and replays it as a real keyboard shortcut
  using `@nut-tree-fork/nut-js`, so any focused application receives it.

There is no database, no cloud service, and no account system. State is
per-connection and in-memory.

## Project layout

| Path | Role |
| --- | --- |
| `server.js` | Server entry point — HTTP static serving, WebSocket wiring, keyboard output, lifecycle. The I/O layer. |
| `server-lib.js` | Pure, side-effect-free server logic: path safety, origin checks, message parsing, rate limiting, the pairing guard, key-map building. Unit-tested in isolation. |
| `protocol.js` | The single source of truth for commands and profiles, shared by server and client (CommonJS). |
| `protocol.d.ts` | Hand-written TypeScript declarations for `protocol.js`. Keep in sync when commands change. |
| `index.html` | HTML shell, PWA meta tags, manifest/icon links. |
| `public/` | Static assets copied verbatim into the build (`icon.svg`, `manifest.webmanifest`). |
| `src/main.tsx` | React entry point. |
| `src/App.tsx` | The entire UI: pairing screen, remote, command groups, timer, guide. |
| `src/Icon.tsx` | Inline SVG icon set. |
| `src/useRemoteSocket.ts` | React hook owning the WebSocket lifecycle — connect, reconnect, pair, send. |
| `src/types.ts` | TypeScript types for the wire protocol and UI state. |
| `src/styles.css` | All styling — a token-based dark theme, responsive. |
| `test/` | `node:test` unit tests (no test framework dependency). |

`server.js`, `server-lib.js`, `protocol.js`, and the tests are CommonJS and run
directly on Node. The `src/` app is TypeScript + React, bundled by Vite.

## The WebSocket protocol

All messages are JSON objects. The wire types live in `src/types.ts`.

**Client → server**

| Message | Purpose |
| --- | --- |
| `{ type: 'pair', pin }` | Authenticate this connection with the pairing PIN. |
| `{ type: 'command', command, profile }` | Request a command be run. |

**Server → client**

| Message | Purpose |
| --- | --- |
| `{ type: 'status', connected, paired, profiles?, commands? }` | Connection/pairing state, plus the command catalog. |
| `{ type: 'paired' }` | Pairing succeeded. |
| `{ type: 'ack', command, profile, dryRun? }` | A command was executed. |
| `{ type: 'error', code?, message }` | Something was rejected. |

Error `code` values: `origin_denied`, `bad_message`, `pairing_failed`,
`pairing_locked`, `not_paired`, `unknown_command`, `profile_mismatch`,
`rate_limited`, `command_failed`, `unknown_message`.

## Pairing and security

Slide Remote is a LAN tool, but it still defends against a malicious device on
the same network:

- **PIN pairing** — a fresh random 4-digit PIN per server start (`CONTROL_PIN`
  overrides it). A connection cannot send commands until it pairs.
- **Brute-force lockout** — `createPairGuard` in `server-lib.js` tracks failed
  attempts per client IP. After 5 failures within a 60-second window the IP is
  locked out for 30 seconds, so the PIN cannot be guessed by flooding attempts.
- **Origin allow-list** — browser WebSocket connections are accepted only from
  local-network hosts on the server or dev-server port, blocking drive-by
  connections from malicious web pages.
- **Command rate limiting** — 8 commands per second per connection.
- **Message size cap** — payloads above 1 KB are rejected.
- **Static path safety** — `safeResolveStaticPath` blocks path traversal and
  null-byte tricks; only files inside `dist/` are ever served.
- **Heartbeat** — the server pings clients every 30 seconds and drops dead ones.

The pure logic above is exported from `server-lib.js` specifically so it can be
tested without binding a port or loading native modules.

## Frontend

The UI is a single React component tree with no router and no UI library.

- **`useRemoteSocket`** owns the socket. It connects, reconnects with capped
  backoff, re-pairs automatically on reconnect (remembering the last PIN), and
  exposes `{ state, pair, sendCommand }`. Stale-socket callbacks are guarded by
  a `wsRef` identity check so a replaced socket cannot mutate state.
- **`App`** renders the pairing screen until the connection has paired at least
  once (`hasPaired`). After that it shows the remote, and brief disconnects keep
  the user on the remote in a disabled "Reconnecting" state instead of bouncing
  back to the PIN screen.
- **Layout** — Start Show, a Previous/Next hero pair, a Slides/Media/Zoom
  segmented control with its command tiles, and a presenter timer. The
  `protocol.js` profiles drive what each group shows; no command is rendered
  twice.
- **Styling** is a token-based dark theme in `styles.css`, responsive across
  phone and tablet, portrait and landscape, using system fonts only so it stays
  readable offline.

## Adding a command

1. **`protocol.js`** — add an entry to `COMMANDS` (`id`, `profile`, `label`,
   `shortLabel`, `hint`, `keyNames`, `tone`) and list its `id` in the relevant
   profile's `commandIds`. The `keyNames` must be valid
   [`@nut-tree-fork/nut-js`](https://github.com/nut-tree/nut.js) `Key` names.
2. **`protocol.d.ts`** — add the new id to the `CommandId` union so TypeScript
   stays in sync.
3. **`src/App.tsx`** — add the command id to `iconByCommand`, and add a new icon
   to `src/Icon.tsx` if needed.
4. **Run `npm test`** — `test/protocol.test.js` verifies every command resolves
   to a valid profile and every profile references real commands, so a mistake
   fails fast.

## Testing

Tests use Node's built-in runner — no Jest, Mocha, or Vitest dependency:

```bash
npm test          # node --test
npm run typecheck # tsc --noEmit
```

- `test/protocol.test.js` — protocol consistency (commands, profiles, layout
  groups).
- `test/server-lib.test.js` — path safety, origin checks, message parsing, rate
  limiting, and the pairing lockout.

## Build and deploy

```bash
npm run build   # Vite bundles src/ + public/ into dist/
npm start       # server.js serves dist/ and runs the WebSocket endpoint
```

`dist/` is git-ignored and regenerated by the build. The server falls back to a
"build required" page if `dist/` is missing. Because it is a single Node process
serving everything on one port, deployment is just "run `npm start` on the
laptop" — there is no separate frontend host.
