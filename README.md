# Slide Remote

Turn your phone into a wireless presentation clicker. Slide Remote runs a small
server on your laptop and serves a phone-friendly web app — pair once with a PIN
and control your slides from across the room over your local Wi-Fi network.

No app store, no cloud, no account. Everything stays on your own network.

```
  Phone browser  ──  Wi-Fi WebSocket  ──▶  Laptop server  ──▶  keyboard shortcut
   tap "Next"                                                   →  slide advances
```

## Contents

- [Features](#features)
- [Quick start](#quick-start)
- [How it works](#how-it-works)
- [Commands](#commands)
- [Configuration](#configuration)
- [Security](#security)
- [Development](#development)
- [Documentation](#documentation)
- [Compatibility](#compatibility)
- [License](#license)

## Features

- **Phone-first remote** — large, thumb-friendly controls designed to be used
  glance-free while you focus on your audience.
- **Works with any presentation app** — it sends real keyboard shortcuts, so
  PowerPoint, Keynote, Google Slides, PDF viewers, and more all just work.
- **Three command groups** — Slides, Media (video play/pause), and Zoom.
- **Built-in presenter timer** — a stopwatch to keep your talk on pace.
- **Secure pairing** — a fresh PIN each session, brute-force lockout, and
  local-network-only connections.
- **Installable** — add it to your phone's home screen and it opens full-screen
  like a native app.
- **Responsive** — phones and tablets, portrait and landscape, without breaking.

## Quick start

You need [Node.js](https://nodejs.org) 20 or newer on the laptop. The phone
needs nothing but a browser.

### Automated install (recommended)

One command — clones the repo, installs dependencies, runs the tests, and
builds the phone app:

**macOS / Linux**

```bash
curl -fsSL https://raw.githubusercontent.com/msrishav-28/ppt-remote-controller/main/scripts/install.sh | bash
```

**Windows (PowerShell)**

```powershell
iwr -useb https://raw.githubusercontent.com/msrishav-28/ppt-remote-controller/main/scripts/install.ps1 | iex
```

Then `cd ppt-remote-controller && npm start`. Pass `--start` (bash) or `-Start`
(PowerShell) to start the server in the same command. Full details, flags, and
the safer clone-first variant are in the [Install guide](docs/INSTALL.md).

### Manual install

```bash
git clone https://github.com/msrishav-28/ppt-remote-controller.git
cd ppt-remote-controller
npm install
npm run build
npm start
```

The terminal prints a pairing PIN, a URL, and a QR code:

```
Presentation remote server is running on port 3000
Pairing PIN: 4821
Open on phone: http://192.168.1.42:3000/?pin=4821
```

On your phone — connected to the **same Wi-Fi** — scan the QR code or open the
URL. The PIN is built into the link, so the remote pairs automatically. Tap
**Pair remote** and you are in control.

> **First run:** on Windows, allow Node.js through the firewall on private
> networks. On macOS, grant Accessibility permission to your terminal app so it
> can send keystrokes. See the [Setup Guide](docs/SETUP.md) for details.

## How it works

The laptop runs one Node process that does two things on the same port:

1. Serves the built phone web app over HTTP.
2. Runs a WebSocket endpoint the phone connects back to.

When you tap a button, the phone sends a command message; the server validates
it and replays it as a real keyboard shortcut into whatever window is focused on
the laptop. Keep your presentation window focused and the keystrokes land there.

For the full picture, see the [Architecture guide](docs/ARCHITECTURE.md).

## Commands

| Group | Command | Keyboard shortcut |
| --- | --- | --- |
| **Slides** | Start Show | `F5` |
| **Slides** | Previous Slide | `←` |
| **Slides** | Next Slide | `→` |
| **Slides** | Black Screen | `B` |
| **Slides** | White Screen | `W` |
| **Slides** | End Show | `Esc` |
| **Media** | Play / Pause | `Space` |
| **Media** | Play Selected | `Enter` |
| **Zoom** | Zoom In | `Ctrl` + `=` |
| **Zoom** | Zoom Out | `Ctrl` + `-` |
| **Zoom** | Reset Zoom | `Ctrl` + `0` |

Media and Zoom are grouped separately because presentation apps handle embedded
video and zooming differently — keep the relevant slide, video, or browser
window focused before using them. The full walkthrough is in the
[Usage Guide](docs/USAGE.md).

## Configuration

All settings are optional environment variables. Copy `.env.example` to `.env`
to change them:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP + WebSocket port the server listens on. |
| `HOST` | `0.0.0.0` | Interface to bind. `0.0.0.0` exposes the remote to the LAN. |
| `FRONTEND_DEV_PORT` | `5173` | Vite dev-server port, allowed as a WebSocket origin during `npm run dev`. |
| `CONTROL_PIN` | _(random)_ | Fixes the pairing PIN instead of generating a new one each start. |
| `DRY_RUN_KEYS` | _(off)_ | Set to `1` to acknowledge commands **without** pressing real keys. |

## Security

Slide Remote is a local-network tool, but it still guards against a malicious
device on the same Wi-Fi:

- A fresh random 4-digit PIN is generated on every server start.
- A phone must pair with the PIN before any command is accepted.
- Five wrong PINs lock that device out for 30 seconds — the PIN cannot be
  brute-forced over the LAN.
- WebSocket connections are restricted to local-network origins.
- Unknown commands, oversized messages, and rapid command bursts are rejected.

It does not use TLS, so treat it as you would any LAN service — use it on
networks you trust. See the [Architecture guide](docs/ARCHITECTURE.md#pairing-and-security)
for the full model.

## Development

```bash
npm run dev        # Vite dev server + backend, with hot-reload
npm run typecheck  # TypeScript check
npm test           # unit tests (Node's built-in test runner)
npm run build      # bundle the web app into dist/
```

`npm run dev` serves the app on port `5173` with hot-reload; open
`http://<laptop-ip>:5173` on the phone. Contributions are welcome — see
[CONTRIBUTING.md](CONTRIBUTING.md).

## Documentation

| Guide | What it covers |
| --- | --- |
| [Install guide](docs/INSTALL.md) | The automated installer scripts, options, and prerequisites. |
| [Setup Guide](docs/SETUP.md) | Manual installing, building, network setup, configuration. |
| [Usage Guide](docs/USAGE.md) | Pairing and presenting — for everyday use. |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Fixes for common problems. |
| [Architecture](docs/ARCHITECTURE.md) | How it is built, the protocol, extending it. |
| [Contributing](CONTRIBUTING.md) | Developing and submitting changes. |
| [Changelog](CHANGELOG.md) | Notable changes per version. |

## Compatibility

- **Laptop:** Windows, macOS, or Linux with Node.js 20+.
- **Phone:** any modern browser (Safari, Chrome, Firefox, Edge).
- **Presentation apps:** anything that responds to the standard keyboard
  shortcuts above — PowerPoint, Keynote, Google Slides, PDF viewers, and more.

## License

Released under the [MIT License](LICENSE).
