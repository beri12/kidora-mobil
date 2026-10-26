import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { colors } from '@/theme';
import { useCalmMotion } from '@/utils/feedback';

const SPLASH = require('../../assets/splash-icon.png');
/** Same width as `imageWidth` of the expo-splash-screen plugin, so the hand-off is seamless. */
const LOGO = 200;
const WORD = 'Kidora'.split('');
const LETTER_COLORS = [colors.iris600, colors.coral500, colors.sun500, colors.grass500, colors.sky500, colors.iris700];
const INTRO_MS = 1700;

function Letter({ char, index, color, calm }: { char: string; index: number; color: string; calm: boolean }) {
  const t = useSharedValue(calm ? 1 : 0);
  useEffect(() => {
    if (calm) return;
    t.value = withDelay(450 + index * 90, withSpring(1, { damping: 8, stiffness: 180 }));
  }, [calm, index, t]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.value * 1.5),
    transform: [{ translateY: (1 - t.value) * 40 }, { scale: 0.4 + t.value * 0.6 }],
  }));
  return <Animated.Text style={[styles.letter, { color }, style]}>{char}</Animated.Text>;
}

function Sparkle({ x, y, size, delay, calm }: { x: number; y: number; size: number; delay: number; calm: boolean }) {
  const t = useSharedValue(calm ? 1 : 0);
  useEffect(() => {
    if (calm) return;
    t.value = withDelay(delay, withSequence(withSpring(1, { damping: 6 }), withRepeat(withTiming(0.75, { duration: 600 }), -1, true)));
  }, [calm, delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.value),
    transform: [{ scale: t.value }, { rotate: `${t.value * 72}deg` }],
  }));
  return <Animated.Text style={[{ position: 'absolute', left: x, top: y, fontSize: size }, style]}>⭐</Animated.Text>;
}

/**
 * Picks up where the native splash leaves off: the same logo at the same size,
 * which then bounces, spells "Kidora" and fades away once the app is ready.
 * With reduced motion it simply fades.
 */
export function AnimatedSplash({ ready, onShown, onDone }: { ready: boolean; onShown: () => void; onDone: () => void }) {
  const calm = useCalmMotion();
  const [introDone, setIntroDone] = useState(calm);
  const logo = useSharedValue(1);
  const tilt = useSharedValue(0);
  const tagline = useSharedValue(calm ? 1 : 0);
  const out = useSharedValue(1);

  useEffect(() => {
    if (calm) return;
    logo.value = withSequence(withTiming(0.86, { duration: 220 }), withSpring(1.08, { damping: 5, stiffness: 140 }), withSpring(1, { damping: 10 }));
    tilt.value = withDelay(400, withSequence(withTiming(-8, { duration: 140 }), withTiming(8, { duration: 180 }), withTiming(-4, { duration: 140 }), withTiming(0, { duration: 120 })));
    tagline.value = withDelay(1100, withTiming(1, { duration: 400 }));
    const t = setTimeout(() => setIntroDone(true), INTRO_MS);
    return () => clearTimeout(t);
  }, [calm, logo, tilt, tagline]);

  useEffect(() => {
    if (!ready || !introDone) return;
    out.value = withTiming(0, { duration: calm ? 200 : 380, easing: Easing.in(Easing.quad) });
    const t = setTimeout(onDone, calm ? 220 : 400);
    return () => clearTimeout(t);
  }, [ready, introDone, calm, out, onDone]);

  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: logo.value }, { rotate: `${tilt.value}deg` }] }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: tagline.value, transform: [{ translateY: (1 - tagline.value) * 10 }] }));
  const rootStyle = useAnimatedStyle(() => ({ opacity: out.value, transform: [{ scale: 1 + (1 - out.value) * 0.15 }] }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, rootStyle]}
      onLayout={onShown}
      pointerEvents={ready && introDone ? 'none' : 'auto'}
      accessible
      accessibilityLabel="Kidora is loading"
    >
      <View style={{ width: LOGO, height: LOGO }}>
        <Animated.View style={logoStyle}>
          <Image source={SPLASH} style={{ width: LOGO, height: LOGO }} contentFit="contain" />
        </Animated.View>
        <Sparkle x={-46} y={8} size={26} delay={700} calm={calm} />
        <Sparkle x={LOGO + 14} y={40} size={20} delay={850} calm={calm} />
        <Sparkle x={LOGO - 6} y={LOGO - 10} size={24} delay={1000} calm={calm} />
      </View>
      <View style={styles.word}>
        {WORD.map((c, i) => (
          <Letter key={i} char={c} index={i} color={LETTER_COLORS[i % LETTER_COLORS.length]!} calm={calm} />
        ))}
      </View>
      <Animated.View style={[styles.taglineWrap, taglineStyle]}>
        <Text style={styles.tagline}>Learn · Play · Grow</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.iris50, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  // The logo stays centred like the native splash; the word sits below it.
  word: { position: 'absolute', top: '50%', marginTop: LOGO / 2 + 24, flexDirection: 'row' },
  letter: { fontSize: 44, fontWeight: '900', letterSpacing: 1 },
  taglineWrap: { position: 'absolute', top: '50%', marginTop: LOGO / 2 + 92 },
  tagline: { fontSize: 16, fontWeight: '700', color: colors.muted, letterSpacing: 0.5 },
});
