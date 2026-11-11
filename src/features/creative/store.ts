import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import Storage from 'expo-sqlite/kv-store';
import { sanitize, type Build } from './build';

/**
 * The child's Creative World build and finished challenges, kept on this
 * device only. No personal data, nothing sent to the server, no XP.
 */
interface CreativeState {
  blocks: Build;
  done: string[];
  setBlocks: (b: Build) => void;
  markDone: (id: string) => void;
  reset: () => void;
}

export const useCreative = create<CreativeState>()(
  persist(
    (set) => ({
      blocks: [],
      done: [],
      setBlocks: (blocks) => set({ blocks }),
      markDone: (id) => set((s) => (s.done.includes(id) ? s : { done: [...s.done, id] })),
      reset: () => set({ blocks: [] }),
    }),
    {
      name: 'kidora.creative.v1',
      storage: createJSONStorage(() => Storage),
      merge: (saved, current) => {
        const s = (saved ?? {}) as Partial<CreativeState>;
        return { ...current, blocks: sanitize(s.blocks), done: Array.isArray(s.done) ? s.done.filter((d) => typeof d === 'string') : [] };
      },
    },
  ),
);
