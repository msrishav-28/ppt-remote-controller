# Changelog

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-05-22

A production-readiness pass: security hardening, a redesigned interface, tests,
and full documentation.

### Added

- Per-IP pairing brute-force lockout — five wrong PINs lock a device out for
  30 seconds, so the PIN cannot be guessed by flooding attempts.
- WebSocket heartbeat that detects and drops dead connections.
- Graceful server shutdown on `SIGINT` / `SIGTERM`.
- `server-lib.js` — pure, unit-tested server logic separated from I/O.
- Unit test suite using Node's built-in test runner (`npm test`), covering
  protocol consistency, path safety, origin checks, message parsing, rate
  limiting, and the pairing lockout.
- Progressive web app support — web manifest, app icon, and meta tags so the
  remote can be installed to a phone's home screen.
- `.env.example` documenting every configuration variable.
- Automated installer scripts for macOS, Linux (`scripts/install.sh`), and
  Windows (`scripts/install.ps1`) — one command clones, installs, tests, and
  builds.
- Documentation: install, setup, usage, troubleshooting, and architecture
  guides, a contributing guide, a changelog, and an MIT `LICENSE` file.

### Changed

- Redesigned the interface — a premium dark theme with a profile-driven layout
  (Start Show, a Previous/Next hero, and Slides/Media/Zoom command groups).
- Responsive overhaul: verified on phones and tablets in both portrait and
  landscape, with no layout breakage.
- The "Profiles" reference tab is now a clearer "Guide" tab.

### Fixed

- Duplicate command buttons — the Slides commands rendered twice on the remote
  screen.
- Pairing attempts were not rate-limited, leaving the PIN brute-forceable over
  the LAN.
- The presenter timer rebuilt its interval on every tick.
- A stale-socket race that could spawn spurious reconnections.
- The app no longer spans full width on tablets — it caps to a centered column.
- The landscape layout no longer overflows the viewport and hides the top bar.
- Brief disconnects no longer bounce the presenter back to the pairing screen;
  the remote stays visible in a "Reconnecting" state and re-pairs automatically.

### Removed

- The unused `ping` client message type.

### Security

- Added the pairing brute-force lockout described above.
- Added an `X-Content-Type-Options: nosniff` header on served assets.
- Hardened message parsing to reject oversized, non-object, and array payloads.

## [1.0.0] - 2026

### Added

- Initial release — a Wi-Fi WebSocket slide remote: a Node server driving
  keyboard shortcuts, a React phone app, PIN pairing, and Slides / Media / Zoom
  command profiles.
