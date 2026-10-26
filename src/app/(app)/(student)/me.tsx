import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '@/api/learning';
import { rewardsApi } from '@/api/rewards';
import { Button, Card, Empty, ProgressBar, SectionTitle, Title } from '@/components/ui';
import { StatsBar } from '@/features/student/StatsBar';
import { useClaimQuest } from '@/features/student/useQuests';
import { useAuth } from '@/stores/auth';
import { colors, font, space } from '@/theme';

export default function Me() {
  const user = useAuth((s) => s.user);
  const wallet = useQuery({ queryKey: ['student', 'wallet'], queryFn: rewardsApi.wallet });
  const quests = useQuery({ queryKey: ['student', 'quests'], queryFn: studentApi.quests });
  const achievements = useQuery({ queryKey: ['student', 'achievements'], queryFn: studentApi.achievements });
  const badges = useQuery({ queryKey: ['student', 'badges'], queryFn: studentApi.badges });
  const claim = useClaimQuest();
  const refreshing = wallet.isRefetching || quests.isRefetching;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.iris50 }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => [wallet, quests, achievements, badges].forEach((q) => void q.refetch())} />}
      >
        <Title>{user?.displayName || user?.name}</Title>
        {wallet.data ? (
          <View style={{ marginTop: space.md }}>
            <StatsBar streak={user?.streak ?? 0} xp={wallet.data.xp} coins={wallet.data.coins} level={wallet.data.level} />
            <Text style={[font.small, { marginTop: space.sm }]}>Longest streak: {wallet.data.longestStreak} days · Gems: {wallet.data.gems} 💎</Text>
          </View>
        ) : null}

        <SectionTitle>Quests</SectionTitle>
        {quests.data?.length ? (
          quests.data.map((qst) => (
            <Card key={qst.id}>
              <Text style={[font.body, { fontWeight: '800' }]}>{qst.title}</Text>
              <Text style={font.small}>{qst.description}</Text>
              <View style={{ marginVertical: space.sm }}>
                <ProgressBar value={qst.target ? qst.progress / qst.target : 0} color={colors.sun500} height={10} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={font.small}>
                  +{qst.rewardXP} XP · +{qst.rewardCoins} 🪙
                </Text>
                {qst.completed && !qst.claimed ? (
                  <Button title="Claim" variant="success" busy={claim.isPending && claim.variables === qst.id} onPress={() => claim.mutate(qst.id)} style={{ minHeight: 40 }} />
                ) : qst.claimed ? (
                  <Text style={{ color: colors.grass600, fontWeight: '800' }}>Claimed ✓</Text>
                ) : null}
              </View>
            </Card>
          ))
        ) : (
          <Empty emoji="🗺️" title="No quests right now" />
        )}

        <SectionTitle>Achievements</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {(achievements.data ?? []).map((a) => (
            <View
              key={a.id}
              accessible
              accessibilityLabel={`${a.title}. ${a.unlockedAt ? 'Unlocked' : `${a.progress} of ${a.requirement}`}`}
              style={{ width: '48%', backgroundColor: colors.white, borderRadius: 16, padding: space.md, borderWidth: 2, borderColor: a.unlockedAt ? colors.sun400 : colors.iris100, opacity: a.unlockedAt ? 1 : 0.7 }}
            >
              <Text style={{ fontSize: 28 }}>{a.unlockedAt ? '🏅' : '🔒'}</Text>
              <Text style={[font.body, { fontWeight: '800' }]} numberOfLines={2}>
                {a.title}
              </Text>
              {!a.unlockedAt && <ProgressBar value={a.requirement ? a.progress / a.requirement : 0} height={8} color={colors.iris500} />}
            </View>
          ))}
        </View>

        {badges.data && badges.data.length > 0 && (
          <>
            <SectionTitle>Badges</SectionTitle>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
              {badges.data.map((b) => (
                <View key={b.id} style={{ alignItems: 'center', width: 80, opacity: b.earnedAt ? 1 : 0.35 }} accessible accessibilityLabel={`${b.name}${b.earnedAt ? '' : ', not earned yet'}`}>
                  <Text style={{ fontSize: 36 }}>{b.glyph}</Text>
                  <Text style={[font.small, { textAlign: 'center' }]} numberOfLines={2}>
                    {b.name}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Button title="Settings" variant="secondary" onPress={() => router.push('/settings')} style={{ marginTop: space.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}
