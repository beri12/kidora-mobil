import { Text } from 'react-native';

/** Emoji tab icons: no icon font to load, readable at any size. */
export function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 26 : 22, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>;
}
