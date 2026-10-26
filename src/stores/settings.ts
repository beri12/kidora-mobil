import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import Storage from 'expo-sqlite/kv-store';

/**
 * Per-device preferences. Nothing sensitive: tokens live in SecureStore and
 * the server owns progress, XP and access.
 */
interface SettingsState {
  soundOn: boolean;
  hapticsOn: boolean;
  /** On top of the OS setting: a child or parent may want calmer screens. */
  reduceMotion: boolean;
  dailyGoalMinutes: number;
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      soundOn: true,
      hapticsOn: true,
      reduceMotion: false,
      dailyGoalMinutes: 10,
      set: (patch) => set(patch),
    }),
    { name: 'kidora.settings.v1', storage: createJSONStorage(() => Storage) },
  ),
);
