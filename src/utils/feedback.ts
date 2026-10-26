import * as Haptics from 'expo-haptics';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useReducedMotion } from 'react-native-reanimated';
import { useSettings } from '@/stores/settings';

/**
 * Sounds and haptics that respect the in-app switches. Nothing here throws:
 * some devices have no vibration motor, and a missing sound is never worth
 * interrupting a lesson for.
 */
const SOURCES = {
  correct: require('../../assets/sounds/correct.wav'),
  wrong: require('../../assets/sounds/wrong.wav'),
  complete: require('../../assets/sounds/complete.wav'),
} as const;

const players: Partial<Record<keyof typeof SOURCES, AudioPlayer>> = {};

function play(name: keyof typeof SOURCES) {
  if (!useSettings.getState().soundOn) return;
  try {
    const p = (players[name] ??= createAudioPlayer(SOURCES[name]));
    p.seekTo(0).catch(() => undefined);
    p.play();
  } catch {
    // no audio output available
  }
}

function buzz(fn: () => Promise<void>) {
  if (useSettings.getState().hapticsOn) fn().catch(() => undefined);
}

export const feedback = {
  correct() {
    play('correct');
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  wrong() {
    play('wrong');
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  complete() {
    play('complete');
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  tap() {
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
};

/** True when either the OS or Kidora's own setting asks for less motion. */
export function useCalmMotion() {
  const os = useReducedMotion();
  const app = useSettings((s) => s.reduceMotion);
  return os || app;
}
