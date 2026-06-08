#!/usr/bin/env bash
# Slide Remote — automated installer for macOS and Linux.
# Clones the repo (if needed), installs dependencies, runs tests, and builds
# the phone web app. Optionally starts the server with --start.

set -euo pipefail

REPO_URL="https://github.com/msrishav-28/ppt-remote-controller.git"
TARGET_DIR="ppt-remote-controller"
MIN_NODE_MAJOR=20

if [ -t 1 ]; then
  C_RED=$'\033[31m'; C_GRN=$'\033[32m'; C_YLW=$'\033[33m'; C_BLU=$'\033[34m'; C_RST=$'\033[0m'
else
  C_RED=''; C_GRN=''; C_YLW=''; C_BLU=''; C_RST=''
fi

step() { printf "\n%s▶%s %s\n" "$C_BLU" "$C_RST" "$1"; }
ok()   { printf "%s✓%s %s\n" "$C_GRN" "$C_RST" "$1"; }
warn() { printf "%s!%s %s\n" "$C_YLW" "$C_RST" "$1"; }
err()  { printf "%s✗%s %s\n" "$C_RED" "$C_RST" "$1" >&2; }

usage() {
  cat <<EOF
Slide Remote installer (macOS / Linux)

Usage: install.sh [options]

Options:
  --start          Start the server after installing
  --dir <path>     Install directory (default: ./$TARGET_DIR)
  --no-test        Skip running the test suite
  -h, --help       Show this help and exit
EOF
}

START_AFTER=0
RUN_TESTS=1
INSTALL_DIR=""

while [ $# -gt 0 ]; do
  case "$1" in
    --start)   START_AFTER=1; shift ;;
    --dir)     INSTALL_DIR="${2:-}"; shift 2 ;;
    --no-test) RUN_TESTS=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *)         err "Unknown option: $1"; usage; exit 2 ;;
  esac
done

step "Checking prerequisites"

if ! command -v git >/dev/null 2>&1; then
  err "git is not installed."
  case "$(uname -s)" in
    Darwin) echo "  Install: xcode-select --install   (or brew install git)" ;;
    Linux)  echo "  Install: sudo apt install git     (Debian/Ubuntu) or your distro's package manager" ;;
  esac
  exit 1
fi
ok "git: $(git --version)"

if ! command -v node >/dev/null 2>&1; then
  err "Node.js is not installed."
  case "$(uname -s)" in
    Darwin) echo "  Install: brew install node        (or download from https://nodejs.org)" ;;
    Linux)  echo "  Install: see https://nodejs.org or use nvm (https://github.com/nvm-sh/nvm)" ;;
  esac
  exit 1
fi
NODE_VERSION="$(node --version | sed 's/^v//')"
NODE_MAJOR="${NODE_VERSION%%.*}"
if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
  err "Node.js v$NODE_VERSION found, but v${MIN_NODE_MAJOR} or newer is required."
  echo "  Upgrade from https://nodejs.org or your package manager."
  exit 1
fi
ok "Node.js v$NODE_VERSION"

if ! command -v npm >/dev/null 2>&1; then
  err "npm is not installed (it normally ships with Node.js)."
  exit 1
fi
ok "npm v$(npm --version)"

if [ -z "$INSTALL_DIR" ]; then
  if [ -f "package.json" ] && grep -q '"name": "presentation-remote"' package.json 2>/dev/null; then
    INSTALL_DIR="."
    ok "Found existing Slide Remote checkout in current directory"
  else
    INSTALL_DIR="$TARGET_DIR"
  fi
fi

step "Fetching Slide Remote source"
if [ "$INSTALL_DIR" = "." ]; then
  ok "Using current directory"
elif [ -d "$INSTALL_DIR/.git" ]; then
  ok "Repository already at $INSTALL_DIR — pulling latest"
  ( cd "$INSTALL_DIR" && git pull --ff-only )
else
  git clone "$REPO_URL" "$INSTALL_DIR"
  ok "Cloned into $INSTALL_DIR"
fi

cd "$INSTALL_DIR"

step "Installing dependencies (compiles a native keyboard module — may take a few minutes)"
if ! npm install; then
  err "npm install failed. See docs/TROUBLESHOOTING.md → 'npm install fails'."
  exit 1
fi
ok "Dependencies installed"

if [ "$RUN_TESTS" -eq 1 ]; then
  step "Running tests"
  npm test
  ok "Tests passed"
fi

step "Building the phone web app"
npm run build
ok "Build complete"

step "Platform notes"
case "$(uname -s)" in
  Darwin)
    warn "macOS Accessibility permission is required for the remote to send keystrokes."
    echo "    Open: System Settings → Privacy & Security → Accessibility"
    echo "    Enable your terminal app (Terminal, iTerm, etc.) and restart it once."
    ;;
  Linux)
    echo "    On X11, your session must permit synthetic input (most do by default)."
    echo "    On Wayland, key injection may need extra setup — see @nut-tree-fork/nut-js docs."
    ;;
esac

printf "\n%s✓%s Slide Remote is ready.\n\n" "$C_GRN" "$C_RST"
echo "Next steps:"
printf "  %scd %s && npm start%s\n" "$C_BLU" "$INSTALL_DIR" "$C_RST"
echo "  Then scan the QR code or open the URL printed in the terminal on your phone."
echo
echo "Docs: README.md, docs/SETUP.md, docs/USAGE.md, docs/TROUBLESHOOTING.md"
echo

if [ "$START_AFTER" -eq 1 ]; then
  step "Starting the server"
  exec npm start
fi
