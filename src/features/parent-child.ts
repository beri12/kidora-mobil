import { create } from 'zustand';

/** Which linked child the parent is looking at. The server re-checks the link on every request. */
export const useSelectedChild = create<{ childId: string | null; set: (id: string) => void }>()((set) => ({
  childId: null,
  set: (childId) => set({ childId }),
}));
