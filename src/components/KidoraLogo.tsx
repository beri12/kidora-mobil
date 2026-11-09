import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts } from '@/theme';

const SIZES = { sm: 30, md: 44, lg: 60 } as const;

/** The gold star from the justkidora.com wordmark (same path and colours). */
export function KidoraStar({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 1.5l2.9 6.5 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 8.7l7.1-.7z" fill={colors.amber400} stroke={colors.sun500} strokeWidth={1} />
    </Svg>
  );
}

/**
 * The Kidora wordmark as on justkidora.com: "Kidora" in Baloo 2 ExtraBold,
 * iris purple, a gold star in place of the dot on the "i", and
 * "Learn • Play • Grow" beneath.
 */
export function KidoraLogo({ size = 'md', tagline = true }: { size?: keyof typeof SIZES; tagline?: boolean }) {
  const fs = SIZES[size];
  const word = { fontFamily: fonts.display, fontSize: fs, lineHeight: fs * 1.25, color: colors.iris700, letterSpacing: -0.5 };
  const star = fs * 0.4;
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="Kidora. Learn, play, grow." style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <Text style={word}>K</Text>
        <View>
          {/* A dotless "i" (ı) so the star replaces the dot instead of covering it. */}
          <Text style={word}>ı</Text>
          <View style={{ position: 'absolute', left: '50%', top: fs * 0.12, marginLeft: -star / 2 }}>
            <KidoraStar size={star} />
          </View>
        </View>
        <Text style={word}>dora</Text>
      </View>
      {tagline && (
        <Text style={{ fontFamily: fonts.extrabold, fontSize: Math.max(10, fs * 0.3), color: colors.iris700, marginTop: -fs * 0.12 }}>
          Learn <Text style={{ color: colors.sun500 }}>•</Text> Play <Text style={{ color: colors.grass500 }}>•</Text> Grow
        </Text>
      )}
    </View>
  );
}
