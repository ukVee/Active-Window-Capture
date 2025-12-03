import {EventEmitter} from 'events';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const execFileAsync = promisify(execFile);

export interface DisplayInfo {
  index: number;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  main?: boolean;
  name?: string;
  id?: string;
}

export interface CursorPosition {
  x: number;
  y: number;
}

export interface ActiveDisplayWatcherOptions {
  pollIntervalMs?: number;
  debug?: boolean;
}

type DisplayList = DisplayInfo[];

function parseXrandr(output: string): DisplayList {
  const lines = output.split('\n');
  const displays: DisplayList = [];
  for (const line of lines) {
    const m =
      /^(\S+)\s+connected\s+(primary\s+)?(\d+)x(\d+)\+(\d+)\+(\d+)/.exec(line);
    if (m) {
      const [, name, primary, w, h, x, y] = m;
      displays.push({
        index: displays.length,
        positionX: Number(x),
        positionY: Number(y),
        width: Number(w),
        height: Number(h),
        main: Boolean(primary),
        name,
        id: name,
      });
    }
  }
  return displays;
}

async function getDisplays(): Promise<DisplayList> {
  try {
    const {stdout} = await execFileAsync('xrandr', ['--query', '--current']);
    const parsed = parseXrandr(stdout);
    if (parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[display-watch] xrandr failed, falling back', err);
  }

  // Fallback: single display full HD origin.
  return [
    {
      index: 0,
      positionX: 0,
      positionY: 0,
      width: 1920,
      height: 1080,
      main: true,
      name: 'Display-0',
      id: 'Display-0',
    },
  ];
}

async function getCursor(): Promise<CursorPosition> {
  const {stdout} = await execFileAsync('xdotool', [
    'getmouselocation',
    '--shell',
  ]);
  const lines = stdout.trim().split('\n');
  const map = new Map<string, string>();
  for (const line of lines) {
    const [k, v] = line.split('=');
    if (k && v !== undefined) map.set(k, v);
  }
  const x = Number(map.get('X'));
  const y = Number(map.get('Y'));
  if (Number.isNaN(x) || Number.isNaN(y)) {
    throw new Error(`xdotool returned invalid position: ${stdout}`);
  }
  return {x, y};
}

function findDisplay(displays: DisplayList, cursor: CursorPosition): DisplayInfo {
  const found =
    displays.find(
      (d) =>
        cursor.x >= d.positionX &&
        cursor.x < d.positionX + d.width &&
        cursor.y >= d.positionY &&
        cursor.y < d.positionY + d.height,
    ) ?? displays.find((d) => d.main) ?? displays[0];
  if (!found) {
    throw new Error('No displays detected from systeminformation.graphics()');
  }
  return found;
}

/**
 * Polls cursor position via `xdotool getmouselocation --shell` and emits
 * 'change' when the containing display changes.
 *
 * Requires xdotool to be installed on the host.
 */
export class ActiveDisplayWatcher extends EventEmitter {
  private pollInterval: number;
  private running = false;
  private timer?: NodeJS.Timeout;
  private lastDisplayIndex?: number;
  private displays: DisplayList = [];
  private debug: boolean;

  constructor(options: ActiveDisplayWatcherOptions = {}) {
    super();
    this.pollInterval = options.pollIntervalMs ?? 400;
    this.debug = options.debug ?? false;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.displays = await getDisplays();
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log('[display-watch] displays', this.displays);
    }

    const tick = async () => {
      if (!this.running) return;
      try {
        const cursor = await getCursor();
        const display = findDisplay(this.displays, cursor);
        if (display.index !== this.lastDisplayIndex) {
          this.lastDisplayIndex = display.index;
          if (this.debug) {
            // eslint-disable-next-line no-console
            console.log('[display-watch] change', {cursor, display});
          }
          this.emit('change', display);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[display-watch] poll error', err);
      } finally {
        if (this.running) {
          this.timer = setTimeout(tick, this.pollInterval);
        }
      }
    };

    void tick();
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }
}
