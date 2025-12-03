import {EventSubscription} from 'obs-websocket-js';
import {ActiveDisplayWatcher} from './system/activeDisplay';
import {ObsClient} from './obs/obsClient';
import {updateWindowCapture} from './obs/updateWindowCapture';
import {runTransition} from './anim/animation';

// Environment configuration
const OBS_URL = process.env.OBS_WEBSOCKET_URL ?? 'ws://127.0.0.1:4455';
const OBS_PASSWORD = process.env.OBS_WEBSOCKET_PASSWORD;
const INPUT_NAME_ENV = process.env.OBS_WINDOW_CAPTURE_INPUT_NAME || 'obs_active_plugin';
const TRANSITION_NAME = process.env.OBS_TRANSITION_NAME;
const TRANSITION_DURATION = process.env.OBS_TRANSITION_DURATION_MS
  ? Number(process.env.OBS_TRANSITION_DURATION_MS)
  : undefined;
const POLL_INTERVAL =
  process.env.ACTIVE_WINDOW_POLL_MS !== undefined
    ? Number(process.env.ACTIVE_WINDOW_POLL_MS)
    : 400;
const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true';

if (!INPUT_NAME_ENV) {
  // eslint-disable-next-line no-console
  console.error(
    'OBS_WINDOW_CAPTURE_INPUT_NAME is required (must match an existing Window Capture input in OBS).',
  );
  process.exit(1);
}
const INPUT_NAME = INPUT_NAME_ENV;

async function main(): Promise<void> {
  const obs = new ObsClient();
  await obs.connect({
    url: OBS_URL,
    password: OBS_PASSWORD,
    eventSubscriptions:
      EventSubscription.Inputs |
      EventSubscription.Scenes |
      EventSubscription.SceneItems |
      EventSubscription.Transitions,
  });

  // eslint-disable-next-line no-console
  console.log(`[obs] connected to ${OBS_URL}`);

  const watcher = new ActiveDisplayWatcher({
    pollIntervalMs: POLL_INTERVAL,
    debug: DEBUG,
  });

  let queue = Promise.resolve();

  watcher.on('change', (display) => {
    queue = queue
      .then(async () => {
        const displayValue =
          (display.name && display.name.trim() !== '' && display.name) ||
          (display.id && display.id.trim() !== '' && display.id) ||
          display.index;

        if (DEBUG) {
          // eslint-disable-next-line no-console
          console.log('[obs] updating input', {
            input: INPUT_NAME,
            displayIndex: display.index,
            name: display.name,
            id: display.id,
            chosenValue: displayValue,
            pos: [display.positionX, display.positionY],
            size: [display.width, display.height],
          });
        }
        await updateWindowCapture(obs, {
          inputName: INPUT_NAME,
          displayValue,
          displayIndex: display.index,
          debug: DEBUG,
        });
        await runTransition(obs, {
          transitionName: TRANSITION_NAME,
          transitionDurationMs: TRANSITION_DURATION,
        });
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[obs] update failed', err);
      });
  });

  await watcher.start();

  const shutdown = async () => {
    watcher.stop();
    await obs.disconnect().catch(() => undefined);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error', err);
  process.exit(1);
});
