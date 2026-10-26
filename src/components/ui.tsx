import { forwardRef, useEffect, type ReactNode } from 'react';
import {
  ActivityIndicator,
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
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
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
export function Button({ title, variant = 'primary', busy, disabled, icon, style, onPress, ...rest }: ButtonProps) {
  const v = VARIANT[variant];
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      disabled={off}
      onPress={(e) => {
        feedback.tap();
        onPress?.(e);
      }}
      style={({ pressed }) => [
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
      ]}
      {...rest}
    >
      {busy ? <ActivityIndicator color={v.fg} /> : icon}
      <Text style={[styles.buttonText, { color: v.fg }]}>{title}</Text>
    </Pressable>
  );
}

/* -------------------------------------------------------------------- card */

export function Card({ children, style, onPress, accessibilityLabel }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }, style]}
    >
      {children}
    </Pressable>
  );
}

/* -------------------------------------------------------------- text field */

interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
}

export const Field = forwardRef<TextInputInstance, FieldProps>(function Field({ label, error, hint, style, ...rest }, ref) {
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor="#94A3B8"
        style={[styles.input, error ? { borderColor: colors.coral500 } : null, style]}
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

export function FormError({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <View style={styles.formError} accessibilityLiveRegion="assertive">
      <Text style={{ color: colors.danger, fontWeight: '700' }}>{children}</Text>
    </View>
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

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.iris600} />
      <Text style={[font.small, { marginTop: space.sm }]}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={{ fontSize: 44 }}>🛰️</Text>
      <Text style={[font.body, { textAlign: 'center', marginVertical: space.md }]}>{message}</Text>
      {onRetry && <Button title="Try again" variant="secondary" onPress={onRetry} />}
    </View>
  );
}

export function Empty({ emoji = '🌱', title, children }: { emoji?: string; title: string; children?: ReactNode }) {
  return (
    <View style={styles.center}>
      <Text style={{ fontSize: 44 }}>{emoji}</Text>
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
  error: { color: colors.danger, fontWeight: '700', marginTop: space.xs },
  formError: { backgroundColor: '#FEF2F2', borderRadius: radius.sm, padding: space.md, marginBottom: space.md },
  track: { backgroundColor: colors.line, overflow: 'hidden', width: '100%' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, minHeight: 240 },
});
