import { View } from 'react-native';
import { Pill } from '@/components/ui';
import { colors, space } from '@/theme';

export function StatsBar({ streak, xp, coins, level }: { streak: number; xp: number; coins: number; level: number }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      <Pill emoji="🔥" value={streak} label="day streak" tint="#FFEDD5" />
      <Pill emoji="⚡" value={xp} label="XP" tint={colors.sun300} />
      <Pill emoji="🪙" value={coins} label="coins" tint="#FEF9C3" />
      <Pill emoji="🏅" value={`Lv ${level}`} label="level" tint={colors.iris100} />
    </View>
  );
}
