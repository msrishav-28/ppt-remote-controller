# Presentation Remote

A phone-friendly WebSocket remote for controlling slides on your laptop over the same Wi-Fi network.

## Run

```bash
npm install
npm run build
npm start
```

Open the printed `http://<your-laptop-ip>:3000` URL on your phone, or scan the QR code printed in the terminal. The URL includes a short pairing PIN for the current server session.

For development:

```bash
npm run dev
```

Open the Vite URL on your phone. The React app will connect back to the Node WebSocket server on port `3000`.

## Commands

| Phone command | Key sent |
| --- | --- |
| Start Show | `F5` |
| Prev | `ArrowLeft` |
| Next | `ArrowRight` |
| Blank Screen | `B` |
| White Screen | `W` |
| End Show | `Escape` |
| Play / Pause | `Space` |
| Play Selected | `Enter` |
| Zoom In | `Ctrl` + `=` |
| Zoom Out | `Ctrl` + `-` |
| Reset Zoom | `Ctrl` + `0` |

Media and zoom controls are profile-based because presentation apps handle embedded videos and zoom shortcuts differently. Keep the relevant slide, video, or browser window focused before tapping commands.

## Security

- The server generates a fresh PIN on startup.
- Phones must pair before commands are accepted.
- Unknown commands and rapid command bursts are rejected.
- Set `CONTROL_PIN=1234` to use a fixed PIN during testing.
- Set `DRY_RUN_KEYS=1` to validate WebSocket commands without pressing laptop keys.

## Notes

- Keep the phone and laptop on the same Wi-Fi network.
- On Windows, allow Node.js through Windows Firewall if prompted.
- On macOS, grant Accessibility permission to the terminal app that runs the server.
- Keep your presentation window focused so it receives the simulated keypresses.
