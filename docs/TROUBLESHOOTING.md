# Troubleshooting

Common problems and how to fix them. If something here does not help, open an
issue at <https://github.com/msrishav-28/ppt-remote-controller/issues>.

- [The phone cannot reach the server](#the-phone-cannot-reach-the-server)
- ["React build not found"](#react-build-not-found)
- [Pairing fails or is locked](#pairing-fails-or-is-locked)
- [Buttons do nothing / slides do not move](#buttons-do-nothing--slides-do-not-move)
- [The connection keeps dropping](#the-connection-keeps-dropping)
- [Media or Zoom commands do not work](#media-or-zoom-commands-do-not-work)
- [npm install fails](#npm-install-fails)
- [Multiple URLs or QR codes printed](#multiple-urls-or-qr-codes-printed)

## The phone cannot reach the server

The browser shows "No server", "Reconnecting", or the page does not load at all.

- **Same network?** Phone and laptop must be on the *same* Wi-Fi. Phone mobile
  data must not override Wi-Fi.
- **Client isolation.** Guest, hotel, corporate, and some public networks block
  devices from talking to each other. Use a home network or a phone hotspot.
- **Firewall (Windows).** Allow Node.js through Windows Firewall on private
  networks. Re-run `npm start` and accept the prompt, or add the rule manually
  in Windows Defender Firewall settings.
- **Right address?** Use the exact `http://<laptop-ip>:3000` URL the terminal
  printed. The laptop's IP can change between sessions.
- **Server running?** The `npm start` terminal must stay open. Check with
  `curl http://localhost:3000/health` on the laptop — it should return
  `{"ok":true,...}`.

## "React build not found"

The page shows "React build not found / Run npm run build".

The server serves the pre-built web app from `dist/`, which does not exist yet.
Run the build once:

```bash
npm run build
```

Then `npm start` again. Alternatively use `npm run dev` and open the Vite URL
(port `5173`) instead.

## Pairing fails or is locked

- **"Incorrect pairing PIN."** The PIN changes every time the server starts.
  Use the value printed next to `Pairing PIN:` in the current terminal session.
  Scanning the QR code avoids typing it at all.
- **"Too many incorrect PINs. Try again in 30s."** Five wrong attempts lock that
  device out for 30 seconds. Wait, then enter the correct PIN.
- **Want a stable PIN for testing?** Start the server with a fixed PIN:
  `CONTROL_PIN=1234 npm start`.

## Buttons do nothing / slides do not move

The remote shows "Command delivered" but the slides do not change.

- **Window focus.** Slide Remote sends keystrokes to whatever window is active
  on the laptop. Click your presentation window so it has focus, then try again.
- **macOS Accessibility.** macOS blocks synthetic keystrokes until you grant
  permission. Enable your terminal app under **System Settings → Privacy &
  Security → Accessibility**, then restart the server.
- **Dry-run mode.** If you started the server with `DRY_RUN_KEYS=1`, it
  acknowledges commands without pressing any keys. The terminal logs
  `Keyboard mode: dry run` and acks say "(dry run)". Restart without that
  variable for live control.
- **App shortcut differences.** A few apps remap keys. Check the [Guide](USAGE.md#the-guide-screen)
  tab to see exactly which shortcut each button sends and confirm your app uses it.

## The connection keeps dropping

- **Phone screen sleep.** When the phone sleeps, the browser may suspend the
  connection. It reconnects automatically on wake, but disabling auto-lock (or
  tapping the screen occasionally) keeps it stable.
- **Weak Wi-Fi.** Moving far from the router drops the connection. Stay in range.
- **The remote always retries.** A dropped connection shows "Reconnecting" and
  restores itself — you do not need to re-pair manually.

## Media or Zoom commands do not work

- **Media** (Play/Pause, Play Selected) controls embedded video. The relevant
  slide or media object usually has to be selected or playing for the keystroke
  to take effect.
- **Zoom** sends browser-style shortcuts (`Ctrl` + `=` / `-` / `0`). They work
  with web-based slides or PDFs open in a browser, not with native zoom in every
  desktop app.
- Keep the correct window focused before using either group.

## npm install fails

`npm install` compiles the native keyboard module `@nut-tree-fork/nut-js`.

- **Use Node.js 20 or newer** (`node --version`).
- **Build tools.** Native modules need a C/C++ toolchain:
  - **Windows** — install the "Desktop development with C++" workload, or run
    `npm install --global windows-build-tools` in an elevated prompt.
  - **macOS** — install the Xcode Command Line Tools: `xcode-select --install`.
  - **Linux** — install `build-essential` and `python3`.
- Delete `node_modules` and the lockfile cache and retry if a partial install
  left things inconsistent.

## Multiple URLs or QR codes printed

If your laptop has several network interfaces (Wi-Fi, Ethernet, a VPN, virtual
adapters), the server prints one URL and QR code per interface. Use the one that
matches the Wi-Fi network your phone is on — usually a `192.168.x.x` or
`10.x.x.x` address.
