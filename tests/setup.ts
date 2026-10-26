// Native-only modules have no JS implementation under Jest; give them inert stand-ins.
jest.mock('expo-audio', () => {
  const player = { play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(() => Promise.resolve()) };
  return {
    createAudioPlayer: jest.fn(() => player),
    useAudioPlayer: jest.fn(() => player),
    useAudioPlayerStatus: jest.fn(() => ({ playing: false, didJustFinish: false })),
  };
});

jest.mock('expo-video', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useVideoPlayer: jest.fn(() => ({ currentTime: 0, duration: 0, play: jest.fn(), pause: jest.fn(), addListener: jest.fn(() => ({ remove: jest.fn() })) })),
    VideoView: View,
  };
});

jest.mock('expo-sqlite/kv-store', () => {
  const mem = new Map<string, string>();
  const store = {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => void mem.set(k, v),
    removeItem: async (k: string) => void mem.delete(k),
  };
  return { __esModule: true, default: store, Storage: store, AsyncStorage: store };
});

// Reanimated 4.7's own mock still runs its native initialiser under jest-expo,
// so tests use this minimal stand-in for the APIs the app uses: animations
// jump straight to their final value.
jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  const now = <T,>(v: T) => v;
  const shared = <T,>(initial: T) => {
    const box = { value: initial, get: () => box.value, set: (v: T) => { box.value = v; } };
    return box;
  };
  return {
    __esModule: true,
    default: { View: RN.View, Text: RN.Text, ScrollView: RN.ScrollView },
    useSharedValue: shared,
    useAnimatedStyle: (fn: () => object) => fn(),
    useReducedMotion: () => false,
    withTiming: now,
    withSpring: now,
    withDelay: (_d: number, v: unknown) => v,
    withRepeat: now,
    withSequence: (...vs: unknown[]) => vs[vs.length - 1],
    Easing: { out: () => undefined, quad: undefined },
  };
});
