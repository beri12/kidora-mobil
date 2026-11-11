import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import Storage from 'expo-sqlite/kv-store';
import type { LanguagePref } from '@/i18n';

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
  /** 'system' follows the phone's language list. */
  language: LanguagePref;
  /** 3D game worlds. Off = the classic 2D boards (lighter on older phones). */
  games3d: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      soundOn: true,
      hapticsOn: true,
      reduceMotion: false,
      dailyGoalMinutes: 10,
      language: 'system',
      games3d: true,
      set: (patch) => set(patch),
    }),
    { name: 'kidora.settings.v1', storage: createJSONStorage(() => Storage) },
  ),
);
