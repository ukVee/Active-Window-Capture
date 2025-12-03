# Active Display Capture → OBS (TypeScript)

Node/TypeScript service that retargets an existing OBS **Display/Screen Capture** input to the monitor under your mouse cursor and triggers a studio-mode transition for a smooth changeover.

## Prerequisites
- OBS 28+ with built-in WebSocket server enabled (default port `4455`).
- A **Display Capture** input already created and active in your scene collection.
- Node.js 18+ on Linux (tested on Arch).
- `xdotool` available in PATH (used to read cursor position).

## Install
```bash
npm install
```

## Configure
Set environment variables (use `.env` if you prefer):

| Variable | Purpose | Default |
| --- | --- | --- |
| `OBS_WEBSOCKET_URL` | ws endpoint | `ws://127.0.0.1:4455` |
| `OBS_WEBSOCKET_PASSWORD` | obs-websocket password | _empty_ |
| `OBS_WINDOW_CAPTURE_INPUT_NAME` | Name of the existing Display Capture input to retarget | **required** |
| `OBS_TRANSITION_NAME` | Transition to use (e.g. `Fade`) | leave to keep current |
| `OBS_TRANSITION_DURATION_MS` | Transition duration in ms | leave to keep current |
| `ACTIVE_WINDOW_POLL_MS` | Poll interval for cursor/display detection | `400` |

## Run
```bash
# Type-check/build
npm run build

# Dev (ts-node)
npm run dev

# After build
npm start
```

## How it works
1. Connects to OBS via `obs-websocket-js` with RPC v1.
2. Polls the cursor position via `xdotool getmouselocation --shell`.
3. Maps the cursor to a monitor using `systeminformation.graphics()` display rectangles.
4. When the monitor changes:
   - Reads current settings of the configured Display Capture input.
   - Detects the display-selection field from the returned settings (looks for a key containing `display`/`screen`/`monitor`).
   - Overlays just that field via `SetInputSettings`.
   - Triggers a studio-mode transition (`TriggerStudioModeTransition`), optionally changing transition name/duration first.

If the display-selection field cannot be found, the service fails fast with a clear error rather than guessing.

## Notes
- Designed for Linux/X11 with `xdotool`. Wayland may need XWayland for `xdotool` to work.
- Transition triggering requires OBS Studio Mode; if disabled, OBS will return an error and the log will show it.
- All OBS requests use official WebSocket methods (`GetInputSettings`, `SetInputSettings`, `SetCurrentSceneTransition`, `SetCurrentSceneTransitionDuration`, `TriggerStudioModeTransition`).
