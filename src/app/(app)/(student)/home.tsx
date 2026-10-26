import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { studentApi, type Quest } from '@/api/learning';
import { gamesApi } from '@/api/games';
import { Button, Card, ErrorState, Loading, PopIn, ProgressBar, SectionTitle } from '@/components/ui';
import { StatsBar } from '@/features/student/StatsBar';
import { useClaimQuest } from '@/features/student/useQuests';
import { useAuth } from '@/stores/auth';
import { colors, font, islandTheme, radius, space } from '@/theme';

function QuestCard({ quest }: { quest: Quest }) {
  const claim = useClaimQuest();
  const pct = quest.target ? quest.progress / quest.target : 0;
  return (
    <Card>
      <Text style={font.small}>{quest.kind === 'DAILY' ? 'Daily quest' : 'Quest'}</Text>
      <Text style={[font.body, { fontWeight: '800', marginVertical: 4 }]}>{quest.title}</Text>
      <ProgressBar value={pct} color={colors.sun500} label={`${quest.progress} of ${quest.target}`} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm }}>
        <Text style={font.small}>
          {quest.progress}/{quest.target} · +{quest.rewardXP} XP · +{quest.rewardCoins} 🪙
        </Text>
        {quest.completed && !quest.claimed && (
          <Button title="Claim" variant="success" busy={claim.isPending} onPress={() => claim.mutate(quest.id)} style={{ minHeight: 40 }} />
        )}
        {quest.claimed && <Text style={{ color: colors.grass600, fontWeight: '800' }}>Claimed ✓</Text>}
      </View>
      {claim.error ? <Text style={{ color: colors.danger, marginTop: 4 }}>{claim.error.message}</Text> : null}
    </Card>
  );
}

export default function StudentHome() {
  const name = useAuth((s) => s.user?.displayName || s.user?.name || '');
  const dash = useQuery({ queryKey: ['student', 'dashboard'], queryFn: studentApi.dashboard });
  const recs = useQuery({ queryKey: ['games', 'recommendations'], queryFn: gamesApi.recommendations });

  if (dash.isPending) return <Loading />;
  if (dash.error) return <ErrorState message={dash.error.message} onRetry={() => dash.refetch()} />;
  const d = dash.data;
  const adv = d.adventure;
  const theme = islandTheme(adv?.course.subject);
  const today = d.streakWeek.find((w) => w.isToday);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.iris50 }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}
        refreshControl={<RefreshControl refreshing={dash.isRefetching} onRefresh={() => void dash.refetch()} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: d.profile.avatarColor || colors.iris300, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 28 }}>🦊</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={font.small}>Welcome back</Text>
            <Text style={font.title} numberOfLines={1}>
              {(d.profile.displayName || name).split(' ')[0]}!
            </Text>
          </View>
        </View>
        <StatsBar streak={d.profile.streak} xp={d.profile.xp} coins={d.profile.coins} level={d.profile.level} />

        <View style={{ marginTop: space.md }}>
          <Text style={font.small}>
            Level {d.profile.level} · {d.profile.xp}/{d.profile.xpForNextLevel} XP
          </Text>
          <ProgressBar value={d.profile.xpForNextLevel ? d.profile.xp / d.profile.xpForNextLevel : 0} color={colors.iris500} label="Progress to next level" />
        </View>

        <View style={{ flexDirection: 'row', gap: 6, marginTop: space.md }} accessibilityLabel="This week's learning days">
          {d.streakWeek.map((w) => (
            <View key={w.date} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 18 }}>{w.done ? '🔥' : '⚪'}</Text>
              <Text style={[font.small, w.isToday && { color: colors.iris700, fontWeight: '800' }]}>{w.day}</Text>
            </View>
          ))}
        </View>
        {today && !today.done ? <Text style={[font.small, { marginTop: 4 }]}>One lesson today keeps your streak going.</Text> : null}

        {adv ? (
          <>
            <SectionTitle>Continue learning</SectionTitle>
            <PopIn>
              <Card
                style={{ backgroundColor: theme.bg, borderColor: theme.bg }}
                accessibilityLabel={`Continue ${adv.course.title}`}
                onPress={() => (adv.lesson ? router.push(`/lesson/${adv.course.id}/${adv.lesson.id}`) : router.push(`/course/${adv.course.id}`))}
              >
                <Text style={{ fontSize: 34 }}>{theme.emoji}</Text>
                <Text style={[font.h2, { color: theme.fg }]}>{adv.course.title}</Text>
                {adv.lesson ? (
                  <Text style={font.body}>
                    Lesson {adv.lesson.order} of {adv.lesson.total}: {adv.lesson.title} · +{adv.lesson.xpReward} XP
                  </Text>
                ) : null}
                <View style={{ marginTop: space.sm }}>
                  <ProgressBar value={adv.progressPercent / 100} color={theme.fg} label="Course progress" />
                </View>
              </Card>
            </PopIn>
          </>
        ) : (
          <Card onPress={() => router.push('/islands')}>
            <Text style={font.h2}>Start your first adventure 🚀</Text>
            <Text style={font.small}>Pick an island and your first lesson.</Text>
          </Card>
        )}

        {d.dailyQuest && (
          <>
            <SectionTitle>Today’s quest</SectionTitle>
            <QuestCard quest={d.dailyQuest} />
          </>
        )}

        {recs.data && recs.data.length > 0 && (
          <>
            <SectionTitle>Practice for you</SectionTitle>
            {recs.data.slice(0, 3).map((r) => (
              <Card key={`${r.game}-${r.level}`} onPress={() => router.push(`/play/${r.game}/${r.level}`)} accessibilityLabel={`Play ${r.gameName}`}>
                <Text style={[font.body, { fontWeight: '800' }]}>
                  🎯 {r.gameName} · {r.levelName}
                </Text>
                <Text style={font.small}>
                  {r.reason} · about {r.minutes} min
                </Text>
              </Card>
            ))}
          </>
        )}

        {d.courses.length > 0 && (
          <>
            <SectionTitle>My courses</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }}>
              {d.courses.map((c) => {
                const t = islandTheme(c.subject);
                return (
                  <Card key={c.id} style={{ width: 200, backgroundColor: t.bg, borderColor: t.bg }} onPress={() => router.push(`/course/${c.id}`)} accessibilityLabel={c.title}>
                    <Text style={{ fontSize: 26 }}>{t.emoji}</Text>
                    <Text style={[font.body, { fontWeight: '800' }]} numberOfLines={2}>
                      {c.title}
                    </Text>
                    <Text style={font.small}>
                      {c.lessonsCompleted}/{c.totalLessons} lessons
                    </Text>
                    <ProgressBar value={c.progressPercent / 100} color={t.fg} height={10} />
                  </Card>
                );
              })}
            </ScrollView>
          </>
        )}

        {d.leaderboard.entries.length > 0 && (
          <>
            <SectionTitle>This week’s top learners</SectionTitle>
            <Card>
              {d.leaderboard.entries.map((e) => (
                <View
                  key={e.userId}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderRadius: radius.sm, backgroundColor: e.isMe ? colors.iris100 : 'transparent', paddingHorizontal: 6 }}
                >
                  <Text style={{ width: 30, fontWeight: '800', color: colors.ink }}>{e.rank}</Text>
                  <Text style={[font.body, { flex: 1 }]} numberOfLines={1}>
                    {e.displayName}
                    {e.isMe ? ' (you)' : ''}
                  </Text>
                  <Text style={{ fontWeight: '800', color: colors.iris700 }}>{e.xp} XP</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        <Button title="Ask Kai a question 🦉" variant="secondary" onPress={() => router.push('/kai')} style={{ marginTop: space.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}
