/** Kidora's palette, taken from the web app's Tailwind config so both look alike. */
export const colors = {
  iris50: '#F3F0FF',
  iris100: '#E9E3FF',
  iris200: '#D5CBFF',
  iris300: '#B7A6FF',
  iris500: '#6E52F5',
  iris600: '#5B3CF0',
  iris700: '#4B2ED6',
  iris900: '#2A1A78',
  grass100: '#DCFCE7',
  grass500: '#22C55E',
  grass600: '#16A34A',
  sun300: '#FDE68A',
  sun400: '#FACC15',
  sun500: '#F59E0B',
  coral400: '#FB7185',
  coral500: '#F43F5E',
  sky500: '#0EA5E9',
  ink: '#1E1B4B',
  muted: '#64748B',
  line: '#E2E8F0',
  surface: '#F8FAFC',
  white: '#FFFFFF',
  danger: '#DC2626',
} as const;

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const font = {
  title: { fontSize: 26, fontWeight: '800' as const, color: colors.ink },
  h2: { fontSize: 20, fontWeight: '800' as const, color: colors.ink },
  body: { fontSize: 16, fontWeight: '600' as const, color: colors.ink },
  small: { fontSize: 13, fontWeight: '600' as const, color: colors.muted },
};

/** One colour per learning island; unknown subjects fall back to iris. */
export const islandColors: Record<string, { bg: string; fg: string; emoji: string }> = {
  math: { bg: '#E9E3FF', fg: '#4B2ED6', emoji: '🔢' },
  reading: { bg: '#DCFCE7', fg: '#15803D', emoji: '📚' },
  english: { bg: '#DCFCE7', fg: '#15803D', emoji: '📚' },
  science: { bg: '#DBEAFE', fg: '#1D4ED8', emoji: '🔬' },
  coding: { bg: '#FEF3C7', fg: '#B45309', emoji: '💻' },
  art: { bg: '#FFE4E6', fg: '#E11D48', emoji: '🎨' },
};

export function islandTheme(subject: string | null | undefined) {
  const key = (subject ?? '').toLowerCase();
  const hit = Object.keys(islandColors).find((k) => key.includes(k));
  return islandColors[hit ?? ''] ?? { bg: colors.iris100, fg: colors.iris700, emoji: '🏝️' };
}
