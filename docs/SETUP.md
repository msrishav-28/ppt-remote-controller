# Setup Guide

This guide covers installing and running Slide Remote on the laptop that drives
your presentation. The phone needs nothing installed — it just opens a web page.

- [Requirements](#requirements)
- [Install](#install)
- [Build and run](#build-and-run)
- [Connect your phone](#connect-your-phone)
- [Network and permissions](#network-and-permissions)
- [Configuration](#configuration)
- [Development mode](#development-mode)
- [Verifying the install](#verifying-the-install)

## Requirements

| Requirement | Notes |
| --- | --- |
| [Node.js](https://nodejs.org) 20 or newer | Runs the laptop server. Check with `node --version`. |
| A laptop and a phone on the **same Wi-Fi network** | They must be able to reach each other directly. |
| A modern phone browser | Safari, Chrome, Firefox, or Edge. |

The laptop and phone do **not** need internet access — only a shared local
network. Everything runs on your own devices.

## Install

Clone the repository and install dependencies:

```bash
git clone https://github.com/msrishav-28/ppt-remote-controller.git
cd ppt-remote-controller
npm install
```

`npm install` also builds the native keyboard module (`@nut-tree-fork/nut-js`).
If installation fails here, see [Troubleshooting](TROUBLESHOOTING.md#npm-install-fails).

## Build and run

```bash
npm run build   # bundles the phone web app into dist/
npm start       # starts the server
```

`npm run build` only needs to be re-run when the app's source code changes.
`npm start` is what you run before each presentation.

On startup the terminal prints the pairing PIN, a URL, and a QR code:

```
Presentation remote server is running on port 3000
Pairing PIN: 4821
Keyboard mode: live
Open on phone: http://192.168.1.42:3000/?pin=4821
█▀▀▀▀▀█ ▀▄ █ █▀▀▀▀▀█
█ ███ █ ▀█▀▄ █ ███ █   ← scan this with your phone
...
```

Leave this terminal window open for the whole presentation — closing it stops
the server.

## Connect your phone

1. Make sure the phone is on the **same Wi-Fi network** as the laptop.
2. Scan the QR code, or type the printed `http://<laptop-ip>:3000` URL into the
   phone's browser.
3. The pairing PIN is embedded in the QR/URL, so the remote pairs automatically.
   If you typed a plain URL, enter the 4-digit PIN shown in the terminal.
4. Tap **Pair remote**. The status pill turns green — you are in control.

For day-to-day use, see the [Usage Guide](USAGE.md).

## Network and permissions

### Windows

The first time you run `npm start`, Windows Firewall may ask whether to allow
Node.js. **Allow access on private networks** — otherwise your phone cannot
reach the server.

### macOS

macOS blocks synthetic keystrokes until you grant permission. Open
**System Settings → Privacy & Security → Accessibility** and enable the terminal
app you run the server from (Terminal, iTerm, etc.). Without this, the remote
pairs and sends commands but slides do not advance.

### Same network

Phone and laptop must be on the same network *and* the network must allow
devices to talk to each other. Some guest, corporate, or public Wi-Fi networks
isolate clients ("AP isolation") and will block the connection — use a personal
hotspot or home network instead.

## Configuration

All settings are optional environment variables. Copy the example file and edit
it:

```bash
cp .env.example .env
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP + WebSocket port the server listens on. |
| `HOST` | `0.0.0.0` | Interface to bind. `0.0.0.0` exposes the remote to the LAN. |
| `FRONTEND_DEV_PORT` | `5173` | Vite dev-server port, allowed as a WebSocket origin during `npm run dev`. |
| `CONTROL_PIN` | _(random)_ | Fixes the pairing PIN instead of generating a new one each start. Handy for testing. |
| `DRY_RUN_KEYS` | _(off)_ | Set to `1` to accept and acknowledge commands **without** pressing real keys. |

`.env` is git-ignored and never committed.

## Development mode

For working on the app itself, run the Vite dev server and the backend together:

```bash
npm run dev
```

This serves the web app with hot-reload on port `5173` and runs the WebSocket
server on `3000`. Open `http://<laptop-ip>:5173` on the phone — the app
automatically connects back to the server on port `3000`.

## Verifying the install

```bash
npm run typecheck   # TypeScript checks the frontend
npm test            # runs the protocol and server unit tests
curl http://localhost:3000/health   # should return {"ok":true,...}
```

A quick end-to-end check without touching your keyboard:

```bash
DRY_RUN_KEYS=1 CONTROL_PIN=1234 npm start
```

Pair from the phone with PIN `1234` and tap a few buttons — the event bar should
show "Command delivered" even though no real keys are pressed.
