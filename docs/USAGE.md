# Usage Guide

How to use Slide Remote during a presentation. If you have not installed it yet,
start with the [Setup Guide](SETUP.md).

- [Before your talk](#before-your-talk)
- [Pairing](#pairing)
- [The Remote screen](#the-remote-screen)
- [Command groups](#command-groups)
- [The presenter timer](#the-presenter-timer)
- [The Guide screen](#the-guide-screen)
- [Connection status](#connection-status)
- [Tips for live use](#tips-for-live-use)

## Before your talk

1. On the laptop, run `npm start` and leave the terminal open.
2. Open your presentation (PowerPoint, Keynote, Google Slides, a PDF, etc.).
3. Pair your phone (below) and do a quick test — advance a slide and go back.
4. Click your presentation window so it has keyboard focus, then start your talk.

## Pairing

Slide Remote uses a short PIN so only your phone can drive the slides.

- **Scan the QR code** printed in the terminal — the PIN is built into the link,
  so the remote pairs the moment the page loads.
- **Or type the URL** `http://<laptop-ip>:3000` and enter the 4-digit PIN shown
  in the terminal.

The PIN changes every time you start the server. If you enter it wrong five
times, that device is locked out for 30 seconds — just wait and try again.

If the connection drops mid-talk, the remote reconnects and re-pairs on its own;
you stay on the remote screen with the controls briefly disabled.

## The Remote screen

The **Remote** tab is the screen you use while presenting:

| Element | What it does |
| --- | --- |
| **Start Show** | Begins the slideshow from the first slide (`F5`). |
| **Previous Slide** | Goes back one slide (`←`). |
| **Next Slide** | Advances one slide (`→`) — the large highlighted button. |
| **Command group strip** | Switches the lower buttons between Slides, Media, and Zoom. |
| **Timer** | A presenter stopwatch (see below). |

Previous and Next are the two large buttons in the middle — sized for
glance-free, thumb-friendly tapping while you focus on the audience. Every tap
gives a short vibration and an on-screen flash so you know it registered.

## Command groups

The strip below the main buttons switches between three groups. Previous, Next,
and Start Show are always available regardless of the selected group.

### Slides

| Button | Shortcut | Effect |
| --- | --- | --- |
| Black | `B` | Blanks the screen to black (and back). |
| White | `W` | Blanks the screen to white (and back). |
| End | `Esc` | Ends the slideshow. |

### Media

| Button | Shortcut | Effect |
| --- | --- | --- |
| Play / Pause | `Space` | Plays or pauses an embedded video. |
| Play Selected | `Enter` | Plays the currently selected media object. |

### Zoom

| Button | Shortcut | Effect |
| --- | --- | --- |
| Zoom In | `Ctrl` + `=` | Zooms the view in. |
| Zoom Out | `Ctrl` + `-` | Zooms the view out. |
| Reset Zoom | `Ctrl` + `0` | Resets zoom to 100%. |

> **Media and Zoom depend on what is focused.** Presentation apps handle
> embedded video and zooming differently. Keep the relevant slide, video, or
> browser window focused before using these. Zoom commands are browser-style
> shortcuts and work best with web-based slides or PDFs in a browser.

## The presenter timer

The timer at the bottom of the Remote screen is a simple stopwatch to help you
pace your talk.

- **Start / Pause** — toggles the stopwatch.
- **Reset** — sets it back to `00:00`.

The timer runs entirely on the phone and is independent of your slides — it does
not start or stop with the presentation.

## The Guide screen

The **Guide** tab is a reference card. It lists every command and the keyboard
shortcut it sends, grouped by Slides, Media, and Zoom. Use it to check what a
button does — it sends nothing itself.

## Connection status

The pill in the top-right corner shows the live connection state:

| State | Meaning |
| --- | --- |
| **Connecting** | Reaching the laptop server. |
| **Connected** | Reached the server, not yet paired. |
| **Paired** | Paired and ready — controls are live. |
| **Reconnecting** | Connection dropped; trying to restore it. |
| **No server** | The laptop server cannot be reached. |

Controls only work in the **Paired** state. If the pill is not green, see
[Troubleshooting](TROUBLESHOOTING.md).

## Tips for live use

- **Keep the presentation window focused.** Slide Remote sends keystrokes to
  whatever window is active on the laptop. If you click another app, commands
  go there instead.
- **Add it to your home screen.** In your phone browser, choose "Add to Home
  Screen" — Slide Remote then opens full-screen like a native app.
- **Test before you start.** Advance and reverse a slide once while paired.
- **Lock screen rotation** on your phone if you do not want the layout to flip.
- **Dim your phone**, don't sleep it. If the screen sleeps, the connection may
  drop; it will reconnect, but a quick tap to wake the phone first is smoother.
- **Stay on the same Wi-Fi.** Walking out of range disconnects the remote.
