import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { teacherApi } from '@/api/roles';
import { Button, Card, ErrorState, Loading, ProgressBar, SectionTitle, Title } from '@/components/ui';
import { colors, font, space } from '@/theme';

const BUCKET_LABEL = { OVERDUE: '⚠️ Overdue', TODAY: '📌 Today', TOMORROW: '🗓 Tomorrow', UPCOMING: '🗓 Upcoming' } as const;

export default function TeacherHome() {
  const q = useQuery({ queryKey: ['teacher', 'dashboard'], queryFn: teacherApi.dashboard });
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;
  const d = q.data;
  const k = d.kpis;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.iris50 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }} refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title>Hello, {d.profile.name.split(' ')[0]}</Title>
          <Button title="⚙️" variant="ghost" accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={{ minHeight: 40 }} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
          {[
            ['🧑‍🎓', 'Students', k.students.value],
            ['📘', 'Courses', k.coursesTeaching.value],
            ['📝', 'To grade', k.pendingAssignments.value],
            ['📈', 'Avg progress', `${k.averageClassProgress.value}%`],
          ].map(([e, l, v]) => (
            <Card key={String(l)} style={{ width: '48%', marginBottom: 0 }}>
              <Text style={{ fontSize: 22 }}>{e}</Text>
              <Text style={font.h2}>{v}</Text>
              <Text style={font.small}>{l}</Text>
            </Card>
          ))}
        </View>

        <Button title="⬆️ Upload content" onPress={() => router.push('/upload')} style={{ marginTop: space.lg }} />

        {d.tasks.length > 0 && (
          <>
            <SectionTitle>To do</SectionTitle>
            {d.tasks.slice(0, 6).map((t) => (
              <Card key={`${t.type}-${t.id}`}>
                <Text style={font.small}>{BUCKET_LABEL[t.bucket]}</Text>
                <Text style={[font.body, { fontWeight: '800' }]}>{t.title}</Text>
                <Text style={font.small}>{t.className}</Text>
              </Card>
            ))}
          </>
        )}

        {d.topics.length > 0 && (
          <>
            <SectionTitle>Skill gaps</SectionTitle>
            <Card>
              {[...d.topics]
                .sort((a, b) => a.masteryPercent - b.masteryPercent)
                .slice(0, 5)
                .map((t) => (
                  <View key={t.topic} style={{ marginBottom: space.sm }}>
                    <Text style={font.body}>
                      {t.topic} · {t.mastered}/{t.total} mastered
                    </Text>
                    <ProgressBar value={t.masteryPercent / 100} height={10} color={t.masteryPercent < 50 ? colors.coral400 : colors.grass500} />
                  </View>
                ))}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
