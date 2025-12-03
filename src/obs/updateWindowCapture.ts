import {OBSRequestTypes, OBSResponseTypes} from 'obs-websocket-js';
import {ObsClient} from './obsClient';

export interface WindowCaptureUpdateOptions {
  inputName: string;
  displayValue: string | number;
  debug?: boolean;
  displayIndex?: number;
}

function coerceValue(
  currentValue: unknown,
  next: string | number,
  fallbackIndex?: number,
): number | string {
  const nextNum = typeof next === 'number' ? next : Number(next);
  if (typeof currentValue === 'number' || Number.isNaN(currentValue)) {
    if (!Number.isNaN(nextNum)) return nextNum;
    if (typeof fallbackIndex === 'number') return fallbackIndex;
    return 0;
  }
  return typeof next === 'string' ? next : String(next);
}

/**
 * Update the display-target of an existing Display/Screen Capture input.
 *
 * Strategy: fetch current input settings, detect the display selection key by
 * inspecting returned fields for a display-like key, then overlay only that
 * field via SetInputSettings. This avoids hard-coding unverified field names.
 */
export async function updateWindowCapture(
  obs: ObsClient,
  {inputName, displayValue, displayIndex, debug = false}: WindowCaptureUpdateOptions,
): Promise<void> {
  const settingsResponse = await obs.call<
    'GetInputSettings',
    OBSRequestTypes['GetInputSettings'],
    OBSResponseTypes['GetInputSettings']
  >('GetInputSettings', {inputName});

  const inputSettings = settingsResponse.inputSettings as Record<
    string,
    unknown
  >;
  const displayKey = Object.keys(inputSettings).find((key) => {
    const k = key.toLowerCase();
    return k.includes('display') || k.includes('screen') || k.includes('monitor');
  });

  if (!displayKey) {
    throw new Error(
      `Unable to locate display selection field in settings for input '${inputName}'`,
    );
  }

  const currentValue = inputSettings[displayKey];
  const nextValue = coerceValue(currentValue, displayValue, displayIndex);

  if (debug) {
    // eslint-disable-next-line no-console
    console.log('[obs] SetInputSettings payload', {
      inputName,
      key: displayKey,
      currentValue,
      currentType: typeof currentValue,
      nextValue,
      nextType: typeof nextValue,
    });
  }

  await obs.call<
    'SetInputSettings',
    OBSRequestTypes['SetInputSettings'],
    OBSResponseTypes['SetInputSettings']
  >('SetInputSettings', {
    inputName,
    inputSettings: {[displayKey]: nextValue},
    overlay: true,
  });
}
