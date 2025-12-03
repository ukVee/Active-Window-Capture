import {OBSRequestTypes, OBSResponseTypes} from 'obs-websocket-js';
import {ObsClient} from '../obs/obsClient';

export interface AnimationOptions {
  transitionName?: string;
  transitionDurationMs?: number;
  autoEnableStudioMode?: boolean;
}

/**
 * Performs a studio-mode transition using OBS' verified requests:
 * - SetCurrentSceneTransition (optional)
 * - SetCurrentSceneTransitionDuration (optional)
 * - TriggerStudioModeTransition (required)
 */
export async function runTransition(
  obs: ObsClient,
  opts: AnimationOptions = {},
): Promise<void> {
  const {transitionName, transitionDurationMs, autoEnableStudioMode = true} =
    opts;

  if (autoEnableStudioMode) {
    const {studioModeEnabled} = await obs.call<
      'GetStudioModeEnabled',
      OBSRequestTypes['GetStudioModeEnabled'],
      OBSResponseTypes['GetStudioModeEnabled']
    >('GetStudioModeEnabled');
    if (!studioModeEnabled) {
      await obs.call<
        'SetStudioModeEnabled',
        OBSRequestTypes['SetStudioModeEnabled'],
        OBSResponseTypes['SetStudioModeEnabled']
      >('SetStudioModeEnabled', {studioModeEnabled: true});
    }
  }

  if (transitionName) {
    await obs.call<
      'SetCurrentSceneTransition',
      OBSRequestTypes['SetCurrentSceneTransition'],
      OBSResponseTypes['SetCurrentSceneTransition']
    >('SetCurrentSceneTransition', {transitionName});
  }

  if (typeof transitionDurationMs === 'number') {
    await obs.call<
      'SetCurrentSceneTransitionDuration',
      OBSRequestTypes['SetCurrentSceneTransitionDuration'],
      OBSResponseTypes['SetCurrentSceneTransitionDuration']
    >('SetCurrentSceneTransitionDuration', {
      transitionDuration: transitionDurationMs,
    });
  }

  await obs.call<
    'TriggerStudioModeTransition',
    OBSRequestTypes['TriggerStudioModeTransition'],
    OBSResponseTypes['TriggerStudioModeTransition']
  >('TriggerStudioModeTransition');
}
