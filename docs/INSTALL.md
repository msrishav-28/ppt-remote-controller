# Automated Install

The repo ships with two installer scripts that download, install, build, and
ready Slide Remote in one command. Run one of them and you can `npm start`.

- [One-line install](#one-line-install)
- [Clone-and-run install](#clone-and-run-install)
- [What the installer does](#what-the-installer-does)
- [Options](#options)
- [Prerequisites](#prerequisites)
- [Re-running the installer](#re-running-the-installer)
- [Uninstall](#uninstall)
- [Why a script?](#why-a-script)

## One-line install

These commands download the installer from GitHub and run it. The installer
clones the repo into `./ppt-remote-controller` and prepares it for use.

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/msrishav-28/ppt-remote-controller/main/scripts/install.sh | bash
```

To start the server immediately after install, pass `--start`:

```bash
curl -fsSL https://raw.githubusercontent.com/msrishav-28/ppt-remote-controller/main/scripts/install.sh | bash -s -- --start
```

### Windows (PowerShell)

```powershell
iwr -useb https://raw.githubusercontent.com/msrishav-28/ppt-remote-controller/main/scripts/install.ps1 | iex
```

If the script is blocked by execution policy, allow it for this session only:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
iwr -useb https://raw.githubusercontent.com/msrishav-28/ppt-remote-controller/main/scripts/install.ps1 | iex
```

## Clone-and-run install

Safer if you'd rather inspect the script before running it:

### macOS / Linux

```bash
git clone https://github.com/msrishav-28/ppt-remote-controller.git
cd ppt-remote-controller
bash scripts/install.sh
```

### Windows (PowerShell)

```powershell
git clone https://github.com/msrishav-28/ppt-remote-controller.git
cd ppt-remote-controller
.\scripts\install.ps1
```

The installer detects that it's already inside the repo and skips the clone
step.

## What the installer does

1. **Checks prerequisites** — `git`, Node.js (20+), and `npm`. Fails fast with
   install hints if anything is missing.
2. **Fetches the source** — clones the repo, or runs `git pull` if it's already
   there, or uses the current directory if you launched it from a checkout.
3. **Installs dependencies** — runs `npm install`, which also compiles the
   native keyboard module `@nut-tree-fork/nut-js`. This is the slowest step.
4. **Runs the tests** — `npm test` (12 unit tests) to confirm the install works.
   Skip with `--no-test` / `-NoTest`.
5. **Builds the phone web app** — `npm run build` produces `dist/`.
6. **Prints platform notes** — Windows Firewall and macOS Accessibility
   reminders.
7. **Prints next steps** — how to start the server.
8. **(Optional) Starts the server** — with `--start` / `-Start`.

No system-wide changes are made: nothing is installed globally, no firewall
rules are added, no services are registered.

## Options

| Flag (`install.sh`) | Flag (`install.ps1`) | Effect |
| --- | --- | --- |
| `--start` | `-Start` | Run `npm start` after installing. |
| `--dir <path>` | `-Dir <path>` | Install into a specific directory. |
| `--no-test` | `-NoTest` | Skip running the test suite. |
| `-h`, `--help` | `-Help` | Show help and exit. |

Examples:

```bash
# macOS / Linux — install into a custom path and start immediately
bash scripts/install.sh --dir ~/apps/slide-remote --start
```

```powershell
# Windows — install but skip the test step
.\scripts\install.ps1 -NoTest
```

## Prerequisites

The installer checks these for you, but here they are up front:

| Requirement | Notes |
| --- | --- |
| Git | `git --version` should work in your shell. |
| Node.js 20+ | `node --version`. Install from [nodejs.org](https://nodejs.org) or a version manager. |
| npm | Ships with Node.js. |
| A C/C++ toolchain | Needed by `npm install` to compile the native keyboard module. See [Troubleshooting → `npm install fails`](TROUBLESHOOTING.md#npm-install-fails). |

The phone needs nothing installed — just a browser on the same Wi-Fi network.

## Re-running the installer

Re-running is safe. The installer:

- Pulls the latest changes if the repo is already cloned.
- Re-runs `npm install` (a no-op if dependencies are unchanged).
- Re-runs tests and the build.

Use this after pulling new commits, or to verify your install after a Node
upgrade.

## Uninstall

There's nothing to uninstall — the installer only writes inside the project
directory. To remove everything:

```bash
# macOS / Linux
rm -rf ./ppt-remote-controller
```

```powershell
# Windows
Remove-Item -Recurse -Force .\ppt-remote-controller
```

## Why a script?

The full manual flow is `git clone ...`, `npm install`, `npm run build`,
`npm start` — not difficult, but the installer also:

- Verifies Node.js is new enough up front (the manual flow only fails later).
- Surfaces platform-specific gotchas (firewall, Accessibility) at the right
  moment.
- Runs the test suite, so you find out it works before your first talk.

Prefer the manual flow if you're modifying the project — see the
[Setup Guide](SETUP.md) and [Contributing](../CONTRIBUTING.md).
