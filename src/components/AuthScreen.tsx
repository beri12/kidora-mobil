import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors, fonts, space } from '@/theme';
import { KidoraLogo, KidoraStar } from './KidoraLogo';

/** The soft lavender → white → sky background of justkidora.com, behind every screen. */
export function BrandBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="kidoraPage" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.bgFrom} />
            <Stop offset="0.5" stopColor={colors.bgVia} />
            <Stop offset="1" stopColor={colors.bgTo} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#kidoraPage)" />
      </Svg>
    </View>
  );
}

/** The sign-in backdrop: the gradient plus the website's floating learning shapes. */
function Backdrop() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden>
      <BrandBackground />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="kidoraSun" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FDE68A" />
            <Stop offset="1" stopColor="#FDBA74" />
          </LinearGradient>
          <LinearGradient id="kidoraPlum" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#C4B5FD" />
            <Stop offset="1" stopColor="#F0ABFC" />
          </LinearGradient>
        </Defs>
        <Circle cx={width * 0.08} cy={height * 0.66} r={26} fill="url(#kidoraSun)" opacity={0.7} />
        <Circle cx={width * 0.92} cy={height * 0.8} r={30} fill="url(#kidoraPlum)" opacity={0.6} />
      </Svg>
      {/* The floating maths/coding shapes of the website, held still on a phone. */}
      <Text style={[styles.shape, { left: '5%', top: '10%', color: colors.sky300 }]}>+</Text>
      <Text style={[styles.shape, { right: '6%', top: '15%', color: colors.violet300 }]}>÷</Text>
      <Text style={[styles.shape, { left: '12%', bottom: '4%', fontSize: 22, color: colors.emerald300 }]}>{'</>'}</Text>
      <View style={{ position: 'absolute', right: '20%', top: '4%' }}>
        <KidoraStar size={30} />
      </View>
    </View>
  );
}

/**
 * Sign-in, sign-up, codes and password screens: the justkidora.com
 * "centered auth" layout — one white rounded card with the wordmark on top.
 */
export function AuthScreen({ children, logo = true }: { children: ReactNode; logo?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgVia }}>
      <Backdrop />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              {logo && (
                <View style={{ marginBottom: space.lg }}>
                  <KidoraLogo size="md" />
                </View>
              )}
              {children}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space.lg, paddingVertical: space.xxl },
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 28,
    shadowColor: '#3D25AE',
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8,
  },
  shape: { position: 'absolute', fontFamily: fonts.display, fontSize: 36 },
});
