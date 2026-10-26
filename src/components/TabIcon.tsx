import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { useCalmMotion } from '@/utils/feedback';

/** Emoji tab icons: no icon font to load, readable at any size. The chosen tab hops. */
export function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  const calm = useCalmMotion();
  const scale = useSharedValue(focused ? 1.18 : 1);
  const y = useSharedValue(0);
  useEffect(() => {
    if (calm) {
      scale.value = focused ? 1.18 : 1;
      return;
    }
    scale.value = withSpring(focused ? 1.18 : 1, { damping: 7, stiffness: 220 });
    if (focused) y.value = withSequence(withSpring(-6, { damping: 12, stiffness: 400 }), withSpring(0, { damping: 6, stiffness: 200 }));
  }, [focused, calm, scale, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scale: scale.value }] }));
  return <Animated.Text style={[{ fontSize: 22, opacity: focused ? 1 : 0.6 }, style]}>{emoji}</Animated.Text>;
}
