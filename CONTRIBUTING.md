# Contributing

Thanks for your interest in improving Slide Remote. This is a small project, so
the process is light.

## Getting started

```bash
git clone https://github.com/msrishav-28/ppt-remote-controller.git
cd ppt-remote-controller
npm install
npm run dev
```

`npm run dev` runs the Vite dev server (hot-reload) and the WebSocket backend
together. See the [Setup Guide](docs/SETUP.md) and [Architecture](docs/ARCHITECTURE.md)
for the full picture.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server + backend with hot-reload. |
| `npm run build` | Bundle the web app into `dist/`. |
| `npm start` | Run the production server (serves `dist/`). |
| `npm run typecheck` | TypeScript check (no emit). |
| `npm test` | Run the unit tests. |

## Before opening a pull request

Run all three and make sure they pass:

```bash
npm run typecheck
npm test
npm run build
```

If you changed UI, also verify it in a browser at phone, tablet, and landscape
sizes — and test the real flow: pair, send commands, switch groups.

## Code style

- Match the existing style; the codebase uses no linter or formatter config, so
  keep diffs minimal and consistent with surrounding code.
- TypeScript runs in `strict` mode — avoid `any`.
- Keep comments rare and reserved for non-obvious *why*, not *what*.
- Server logic that can be pure belongs in `server-lib.js` so it stays testable;
  `server.js` is the I/O layer.

## Common changes

- **Adding or changing a command** — follow the steps in
  [Architecture → Adding a command](docs/ARCHITECTURE.md#adding-a-command).
  `npm test` will catch protocol mistakes.
- **Changing the wire protocol** — update `src/types.ts` (client side) and the
  message handling in `server.js` together.

## Reporting bugs

Open an issue at <https://github.com/msrishav-28/ppt-remote-controller/issues>
with your OS, Node version, what you expected, and what happened. The
[Troubleshooting guide](docs/TROUBLESHOOTING.md) covers the most common issues.

## License

By contributing you agree that your contributions are licensed under the
project's [MIT License](LICENSE).
