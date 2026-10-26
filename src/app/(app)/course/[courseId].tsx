import { Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { learningApi } from '@/api/learning';
import { Button, Card, ErrorState, Loading, ProgressBar, Screen, SectionTitle, Subtitle, Title } from '@/components/ui';
import { colors, font, islandTheme, space } from '@/theme';

export default function CourseScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['course', courseId], queryFn: () => learningApi.course(courseId) });
  const enroll = useMutation({
    mutationFn: () => learningApi.enroll(courseId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course', courseId] }),
  });

  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;
  const c = q.data;
  const t = islandTheme(c.subject?.name);
  const lessons = c.sections.flatMap((s) => s.lessons);
  const next = lessons.find((l) => l.id === c.enrollment?.lastLessonId && !l.completed) ?? lessons.find((l) => !l.completed);

  return (
    <Screen>
      <Stack.Screen options={{ title: c.title }} />
      <Text style={{ fontSize: 44 }}>{t.emoji}</Text>
      <Title>{c.title}</Title>
      {c.shortDescription ? <Subtitle>{c.shortDescription}</Subtitle> : null}
      <Text style={[font.small, { marginTop: space.sm }]}>
        {c.totals.lessons} lessons · about {c.totals.estimatedMinutes} min
      </Text>

      {c.enrolled ? (
        <View style={{ marginTop: space.md }}>
          <ProgressBar value={(c.enrollment?.progressPercent ?? 0) / 100} color={t.fg} label="Course progress" />
          {next && <Button title={`Continue: ${next.title}`} onPress={() => router.push(`/lesson/${c.id}/${next.id}`)} style={{ marginTop: space.md }} />}
        </View>
      ) : c.accessDecision.allowed ? (
        <Button title="Join this course" busy={enroll.isPending} onPress={() => enroll.mutate()} style={{ marginTop: space.lg }} />
      ) : (
        <Card style={{ marginTop: space.lg }}>
          <Text style={font.body}>{c.accessDecision.message ?? 'This course is not available on your account yet.'}</Text>
        </Card>
      )}
      {enroll.error ? <Text style={{ color: colors.danger, marginTop: space.sm }}>{enroll.error.message}</Text> : null}

      {c.sections.map((s) => (
        <View key={s.id}>
          <SectionTitle>{s.title}</SectionTitle>
          {s.lessons.map((l) => (
            <Card
              key={l.id}
              onPress={l.locked ? undefined : () => router.push(`/lesson/${c.id}/${l.id}`)}
              accessibilityLabel={`${l.title}${l.completed ? ', completed' : ''}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, opacity: l.locked ? 0.6 : 1 }}
            >
              <Text style={{ fontSize: 22 }}>{l.completed ? '✅' : l.locked ? '🔒' : l.type === 'GAME' ? '🎮' : l.type === 'QUIZ' ? '❓' : '📖'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[font.body, { fontWeight: '800' }]}>{l.title}</Text>
                <Text style={font.small}>{l.estimatedMin} min</Text>
              </View>
            </Card>
          ))}
        </View>
      ))}
    </Screen>
  );
}
