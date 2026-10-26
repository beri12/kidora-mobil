import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { parentApi } from '@/api/roles';
import { Button, Card, Empty, ErrorState, Loading, ProgressBar, SectionTitle, Title } from '@/components/ui';
import { useSelectedChild } from '@/features/parent-child';
import { colors, font, islandTheme, radius, space } from '@/theme';

export default function Family() {
  const childId = useSelectedChild((s) => s.childId);
  const select = useSelectedChild((s) => s.set);
  const q = useQuery({ queryKey: ['parent', 'dashboard', childId], queryFn: () => parentApi.dashboard(childId ?? undefined) });

  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;
  const d = q.data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.iris50 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }} refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title>Family</Title>
          <Button title="⚙️" variant="ghost" accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={{ minHeight: 40 }} />
        </View>

        {d.children.length === 0 ? (
          <Empty emoji="🔗" title="No child linked yet">
            Ask your child’s school for a parent invite code, or link your child on justkidora.com. Only children linked and verified by Kidora appear here.
          </Empty>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: space.md }}>
              {d.children.map((c) => {
                const on = c.id === d.selectedChildId;
                return (
                  <Pressable
                    key={c.id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    onPress={() => select(c.id)}
                    style={{ paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill, backgroundColor: on ? colors.iris600 : colors.white, borderWidth: 2, borderColor: colors.iris200 }}
                  >
                    <Text style={{ fontWeight: '800', color: on ? colors.white : colors.ink }}>{c.displayName || c.name}</Text>
                    {c.grade ? <Text style={{ fontSize: 12, color: on ? colors.iris100 : colors.muted }}>{c.grade}</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            {d.kpis && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {[
                  ['📊', 'Progress', `${d.kpis.overallProgress.value}%`],
                  ['📘', 'Lessons', String(d.kpis.lessonsCompleted.value)],
                  ['✅', 'Quiz average', `${d.kpis.quizAverage.value}%`],
                  ['🔥', 'Streak', `${d.kpis.streak.value} days`],
                ].map(([emoji, label, value]) => (
                  <Card key={label} style={{ width: '48%', marginBottom: 0 }}>
                    <Text style={{ fontSize: 22 }}>{emoji}</Text>
                    <Text style={font.h2}>{value}</Text>
                    <Text style={font.small}>{label}</Text>
                  </Card>
                ))}
              </View>
            )}

            <SectionTitle>This week</SectionTitle>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 6 }} accessibilityLabel={`${d.weeklyActivity.totalMinutes} minutes of learning this week`}>
                {d.weeklyActivity.minutes.map((m, i) => {
                  const max = Math.max(...d.weeklyActivity.minutes, 1);
                  return (
                    <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                      <View style={{ width: '70%', height: Math.max(4, (m / max) * 70), backgroundColor: colors.iris500, borderRadius: 6 }} />
                      <Text style={{ fontSize: 11, color: colors.muted }}>{d.weeklyActivity.labels[i]}</Text>
                    </View>
                  );
                })}
              </View>
              <Text style={[font.small, { marginTop: space.sm }]}>
                {d.weeklyActivity.totalMinutes} min · {d.weeklyActivity.lessons} lessons · {d.weeklyActivity.quizzes} quizzes
              </Text>
            </Card>

            {d.subjectProgress.length > 0 && (
              <>
                <SectionTitle>Subjects</SectionTitle>
                <Card>
                  {d.subjectProgress.map((s) => {
                    const t = islandTheme(s.subject);
                    return (
                      <View key={s.subject} style={{ marginBottom: space.sm }}>
                        <Text style={font.body}>
                          {t.emoji} {s.subject} · {Math.round(s.percent)}%
                        </Text>
                        <ProgressBar value={s.percent / 100} color={t.fg} height={10} />
                      </View>
                    );
                  })}
                </Card>
              </>
            )}

            {(d.insights.strengths.length > 0 || d.insights.needsPractice.length > 0 || d.insights.tip) && (
              <>
                <SectionTitle>Insights</SectionTitle>
                <Card>
                  {d.insights.strengths.map((s) => (
                    <Text key={s} style={font.body}>
                      💪 {s}
                    </Text>
                  ))}
                  {d.insights.needsPractice.map((s) => (
                    <Text key={s} style={font.body}>
                      🎯 Practise: {s}
                    </Text>
                  ))}
                  {d.insights.tip ? <Text style={[font.small, { marginTop: space.sm }]}>💡 {d.insights.tip}</Text> : null}
                </Card>
              </>
            )}

            {d.upcomingAssignments.length > 0 && (
              <>
                <SectionTitle>Coming up</SectionTitle>
                {d.upcomingAssignments.slice(0, 5).map((a) => (
                  <Card key={a.id}>
                    <Text style={[font.body, { fontWeight: '800' }]}>{a.title}</Text>
                    <Text style={font.small}>
                      {[a.subject, a.dueAt ? `due ${new Date(a.dueAt).toLocaleDateString()}` : null, a.status.toLowerCase()].filter(Boolean).join(' · ')}
                    </Text>
                  </Card>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
