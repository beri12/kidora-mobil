import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { colors } from '@/theme';
import { useCalmMotion } from '@/utils/feedback';

const PALETTE = [colors.iris500, colors.grass500, colors.sun400, colors.coral400, colors.sky500];
const { width: W, height: H } = Dimensions.get('window');

function Piece({ index }: { index: number }) {
  // Deterministic per piece, so re-renders don't reshuffle the burst.
  const seed = (index * 9301 + 49297) % 233280;
  const rand = (n: number) => ((seed * (n + 1)) % 1000) / 1000;
  const x0 = W / 2;
  const dx = (rand(1) - 0.5) * W * 1.1;
  const fall = H * (0.55 + rand(2) * 0.4);
  const spin = (rand(3) - 0.5) * 900;
  const size = 7 + rand(4) * 7;

  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(rand(5) * 180, withTiming(1, { duration: 1400 + rand(6) * 700, easing: Easing.out(Easing.quad) }));
  }, [t]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value * t.value,
    transform: [
      { translateX: x0 + dx * t.value },
      { translateY: H * 0.25 - 140 * Math.sin(Math.PI * Math.min(t.value * 1.6, 1)) + fall * t.value * t.value },
      { rotate: `${spin * t.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: 0, top: 0, width: size, height: size * 1.6, borderRadius: 2, backgroundColor: PALETTE[index % PALETTE.length] },
        style,
      ]}
    />
  );
}

/** A short burst for a finished lesson or game. Renders nothing when motion is reduced. */
export function Confetti({ count = 36 }: { count?: number }) {
  const calm = useCalmMotion();
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  if (calm) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((i) => (
        <Piece key={i} index={i} />
      ))}
    </View>
  );
}
