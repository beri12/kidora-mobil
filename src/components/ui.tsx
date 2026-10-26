import { forwardRef, useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, space } from '@/theme';
import { feedback, useCalmMotion } from '@/utils/feedback';

/* ------------------------------------------------------------------ screen */

export function Screen({ children, scroll = true, padded = true }: { children: ReactNode; scroll?: boolean; padded?: boolean }) {
  const inner = padded ? styles.padded : undefined;
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={[inner, { paddingBottom: space.xxl }]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text style={font.title} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Subtitle({ children }: { children: ReactNode }) {
  return <Text style={[font.body, { color: colors.muted, marginTop: space.xs }]}>{children}</Text>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={font.h2} accessibilityRole="header">
        {children}
      </Text>
      {action}
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_IN = { damping: 15, stiffness: 400 };
const PRESS_OUT = { damping: 6, stiffness: 300 };

/** A springy squash while pressed. Static when motion is reduced. */
function usePressScale(to = 0.96) {
  const calm = useCalmMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    style,
    in: () => {
      if (!calm) scale.set(withSpring(to, PRESS_IN));
    },
    out: () => {
      scale.set(calm ? 1 : withSpring(1, PRESS_OUT));
    },
  };
}

/* ------------------------------------------------------------------ appear */

/** Fades and rises its children in on mount; `delay` staggers a list. */
export function Appear({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const calm = useCalmMotion();
  const t = useSharedValue(calm ? 1 : 0);
  useEffect(() => {
    if (!calm) t.value = withDelay(delay, withTiming(1, { duration: 320 }));
  }, [calm, delay, t]);
  const anim = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ translateY: (1 - t.value) * 14 }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/* ------------------------------------------------------------------ button */

type Variant = 'primary' | 'secondary' | 'success' | 'ghost' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: Variant;
  busy?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const VARIANT: Record<Variant, { bg: string; fg: string; border?: string; shadow: string }> = {
  primary: { bg: colors.iris600, fg: colors.white, shadow: colors.iris900 },
  secondary: { bg: colors.white, fg: colors.iris700, border: colors.iris200, shadow: colors.iris200 },
  success: { bg: colors.grass500, fg: colors.white, shadow: colors.grass600 },
  ghost: { bg: 'transparent', fg: colors.iris700, shadow: 'transparent' },
  danger: { bg: colors.coral500, fg: colors.white, shadow: '#9F1239' },
};

/** A chunky, pressable button with a "3D" lip that sinks when pressed. */
export function Button({ title, variant = 'primary', busy, disabled, icon, style, onPress, onPressIn, onPressOut, ...rest }: ButtonProps) {
  const v = VARIANT[variant];
  const off = disabled || busy;
  const [pressed, setPressed] = useState(false);
  const squash = usePressScale();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      disabled={off}
      onPress={(e) => {
        feedback.tap();
        onPress?.(e);
      }}
      onPressIn={(e) => {
        setPressed(true);
        squash.in();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        squash.out();
        onPressOut?.(e);
      }}
      style={[
        styles.button,
        {
          backgroundColor: v.bg,
          borderColor: v.border ?? v.bg,
          borderBottomColor: variant === 'ghost' ? 'transparent' : v.shadow,
          borderBottomWidth: pressed || variant === 'ghost' ? 2 : 5,
          marginTop: pressed ? 3 : 0,
          opacity: off ? 0.55 : 1,
        },
        style,
        squash.style,
      ]}
      {...rest}
    >
      {busy ? <BusyDots color={v.fg} /> : icon}
      <Text style={[styles.buttonText, { color: v.fg }]}>{title}</Text>
    </AnimatedPressable>
  );
}

/** Three bouncing dots: a friendlier "working on it" than a spinner. */
function Dot({ color, index, calm }: { color: string; index: number; calm: boolean }) {
  const y = useSharedValue(0);
  useEffect(() => {
    if (calm) return;
    y.value = withDelay(index * 120, withRepeat(withSequence(withTiming(-5, { duration: 260 }), withTiming(0, { duration: 260 })), -1));
  }, [calm, index, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }, style]} />;
}

function BusyDots({ color }: { color: string }) {
  const calm = useCalmMotion();
  return (
    <View style={{ flexDirection: 'row', gap: 4, paddingVertical: 4 }} accessibilityLabel="Working">
      {[0, 1, 2].map((i) => (
        <Dot key={i} index={i} color={color} calm={calm} />
      ))}
    </View>
  );
}

/* -------------------------------------------------------------------- card */

/** A card that slides in when it first appears; tappable cards squash when pressed. */
export function Card({ children, style, onPress, accessibilityLabel, delay = 0 }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string; delay?: number }) {
  const squash = usePressScale(0.97);
  if (!onPress) {
    return (
      <Appear delay={delay} style={[styles.card, style]}>
        {children}
      </Appear>
    );
  }
  return (
    <Appear delay={delay}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => {
          feedback.tap();
          onPress();
        }}
        onPressIn={squash.in}
        onPressOut={squash.out}
        style={[styles.card, style, squash.style]}
      >
        {children}
      </AnimatedPressable>
    </Appear>
  );
}

/* -------------------------------------------------------------- text field */

interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
}

export const Field = forwardRef<TextInputInstance, FieldProps>(function Field({ label, error, hint, style, onFocus, onBlur, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor="#94A3B8"
        style={[styles.input, focused ? styles.inputFocused : null, error ? { borderColor: colors.coral500 } : null, style]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={font.small}>{hint}</Text>
      ) : null}
    </View>
  );
});

/** Shakes in, like a gentle "no", whenever its message changes. */
export function FormError({ children }: { children?: string | null }) {
  const calm = useCalmMotion();
  const x = useSharedValue(0);
  useEffect(() => {
    if (!children || calm) return;
    x.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 70 }), withTiming(-5, { duration: 60 }), withTiming(0, { duration: 50 }));
  }, [children, calm, x]);
  const shake = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  if (!children) return null;
  return (
    <Animated.View style={[styles.formError, shake]} accessibilityLiveRegion="assertive">
      <Text style={{ color: colors.danger, fontWeight: '700' }}>{children}</Text>
    </Animated.View>
  );
}

/* ------------------------------------------------------------ progress bar */

export function ProgressBar({ value, color = colors.grass500, height = 14, label }: { value: number; color?: string; height?: number; label?: string }) {
  const calm = useCalmMotion();
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = calm ? pct : withTiming(pct, { duration: 650 });
  }, [pct, calm, width]);
  const fill = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={[styles.track, { height, borderRadius: height }]}
    >
      <Animated.View style={[{ height, borderRadius: height, backgroundColor: color }, fill]} />
    </View>
  );
}

/* ------------------------------------------------------------- stat pill */

export function Pill({ emoji, value, label, tint = colors.iris100 }: { emoji: string; value: string | number; label: string; tint?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: tint }]} accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
      <Text style={{ fontWeight: '800', color: colors.ink, fontSize: 16 }}>{value}</Text>
    </View>
  );
}

/* ----------------------------------------------------- pop-in (celebrate) */

export function PopIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const calm = useCalmMotion();
  const scale = useSharedValue(calm ? 1 : 0.6);
  useEffect(() => {
    if (calm) return;
    const t = setTimeout(() => {
      scale.value = withSpring(1, { damping: 9, stiffness: 160 });
    }, delay);
    return () => clearTimeout(t);
  }, [calm, delay, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/* ------------------------------------------------- loading / error / empty */

const OWL = require('../../assets/images/kidora-owl.png');

/** Kai the owl, Kidora's mascot, floating gently above a screen's title. */
export function Mascot({ size = 110 }: { size?: number }) {
  const calm = useCalmMotion();
  const y = useSharedValue(0);
  const tilt = useSharedValue(0);
  useEffect(() => {
    if (calm) return;
    y.value = withRepeat(withSequence(withTiming(-8, { duration: 1100 }), withTiming(0, { duration: 1100 })), -1);
    tilt.value = withRepeat(withSequence(withTiming(-4, { duration: 1600 }), withTiming(4, { duration: 1600 })), -1, true);
  }, [calm, y, tilt]);
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { rotate: `${tilt.value}deg` }] }));
  return (
    <PopIn>
      <Animated.View style={[{ alignSelf: 'center', marginTop: space.lg }, float]}>
        <Image source={OWL} style={{ width: size, height: size }} contentFit="contain" accessibilityLabel="Kai the owl" />
      </Animated.View>
    </PopIn>
  );
}

/** Kai the owl hops while a screen loads. */
export function Loading({ label = 'Loading…' }: { label?: string }) {
  const calm = useCalmMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (calm) return;
    y.value = withRepeat(withSequence(withTiming(-14, { duration: 320 }), withSpring(0, { damping: 6, stiffness: 220 })), -1);
  }, [calm, y]);
  const hop = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <View style={styles.center} accessibilityLiveRegion="polite" accessibilityLabel={label}>
      <Animated.View style={hop}>
        <Image source={OWL} style={{ width: 84, height: 84 }} contentFit="contain" accessibilityIgnoresInvertColors />
      </Animated.View>
      <View style={styles.shadow} />
      <Text style={[font.small, { marginTop: space.sm }]}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <PopIn>
        <Text style={{ fontSize: 44 }}>🛰️</Text>
      </PopIn>
      <Text style={[font.body, { textAlign: 'center', marginVertical: space.md }]}>{message}</Text>
      {onRetry && <Button title="Try again" variant="secondary" onPress={onRetry} />}
    </View>
  );
}

export function Empty({ emoji = '🌱', title, children }: { emoji?: string; title: string; children?: ReactNode }) {
  return (
    <View style={styles.center}>
      <PopIn>
        <Text style={{ fontSize: 44 }}>{emoji}</Text>
      </PopIn>
      <Text style={[font.h2, { textAlign: 'center', marginTop: space.sm }]}>{title}</Text>
      {children ? <Text style={[font.small, { textAlign: 'center', marginTop: space.xs }]}>{children}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.iris50 },
  padded: { padding: space.lg },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.xl, marginBottom: space.sm },
  button: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonText: { fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 2,
    borderColor: colors.iris100,
    borderBottomWidth: 4,
    marginBottom: space.md,
  },
  label: { fontWeight: '800', color: colors.ink, marginBottom: space.xs, fontSize: 15 },
  input: {
    minHeight: 52,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontSize: 17,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  inputFocused: { borderColor: colors.iris500, backgroundColor: '#FDFCFF' },
  shadow: { width: 46, height: 8, borderRadius: 4, backgroundColor: colors.iris100, marginTop: 2 },
  error: { color: colors.danger, fontWeight: '700', marginTop: space.xs },
  formError: { backgroundColor: '#FEF2F2', borderRadius: radius.sm, padding: space.md, marginBottom: space.md },
  track: { backgroundColor: colors.line, overflow: 'hidden', width: '100%' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, minHeight: 240 },
});
