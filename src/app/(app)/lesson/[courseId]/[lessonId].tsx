import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { learningApi, type LessonPlayer, type RewardOutcome } from '@/api/learning';
import { ApiError } from '@/api/client';
import { Button, Card, ErrorState, Loading, PopIn, ProgressBar } from '@/components/ui';
import { Confetti } from '@/components/Confetti';
import { ContentBlock } from '@/features/lessons/ContentBlock';
import { contentCache } from '@/offline/sqlite-storage';
import { offlineQueue } from '@/offline/sync';
import { colors, font, space } from '@/theme';
import { feedback } from '@/utils/feedback';
import { nowMs } from '@/utils/time';

/**
 * Online first. The cached copy is used only when the request fails for
 * network reasons — never when the server refused access (401/403/404).
 */
async function loadLesson(courseId: string, lessonId: string, signal?: AbortSignal): Promise<LessonPlayer & { offline?: boolean }> {
  const key = `lesson:${courseId}:${lessonId}`;
  try {
    const fresh = await learningApi.lesson(courseId, lessonId, signal);
    contentCache.set(key, fresh).catch(() => undefined);
    return fresh;
  } catch (e) {
    if (e instanceof ApiError && (e.isNetwork || e.isTimeout)) {
      const cached = await contentCache.get<LessonPlayer>(key);
      if (cached) return { ...cached.value, offline: true };
    }
    if (e instanceof ApiError && (e.status === 403 || e.status === 404)) await contentCache.remove(key).catch(() => undefined);
    throw e;
  }
}

type Finish = { kind: 'done'; rewards: RewardOutcome } | { kind: 'queued' };

/** Keyed by lesson so moving to the next lesson starts with fresh state. */
export default function LessonRoute() {
  const { courseId, lessonId } = useLocalSearchParams<{ courseId: string; lessonId: string }>();
  return <LessonScreen key={lessonId} courseId={courseId} lessonId={lessonId} />;
}

function LessonScreen({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const qc = useQueryClient();
  const started = useRef(0);
  const [finish, setFinish] = useState<Finish | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [watched, setWatched] = useState<Set<string>>(new Set());

  const q = useQuery({ queryKey: ['lesson', courseId, lessonId], queryFn: ({ signal }) => loadLesson(courseId, lessonId, signal) });
  useEffect(() => {
    started.current = nowMs();
  }, []);

  if (q.isPending) return <Loading label="Opening your lesson…" />;
  if (q.error) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;
  const { lesson, nav } = q.data;
  const items = [...lesson.contents].sort((a, b) => a.order - b.order);
  const alreadyDone = !!lesson.progress?.completed;

  async function complete() {
    setBusy(true);
    setError('');
    const pending = items.filter((i) => i.type !== 'VIDEO' && i.isRequired && !i.progress[0]?.completed);
    let offline = false;
    for (const item of pending) {
      try {
        await learningApi.completeContent(item.id);
      } catch (e) {
        if (e instanceof ApiError && (e.isNetwork || e.isTimeout)) {
          offline = true;
          // Replayed later with the same idempotency key; the server stays the judge.
          await offlineQueue.enqueue({ id: `content-complete:${item.id}:${randomUUID()}`, kind: 'content.complete', method: 'POST', path: `/learning/content/${item.id}/complete`, body: undefined });
        }
      }
    }
    try {
      if (offline) throw new ApiError('offline', { isNetwork: true });
      const res = await learningApi.completeLesson(lesson.id, (nowMs() - started.current) / 1000);
      feedback.complete();
      setFinish({ kind: 'done', rewards: res.rewards });
      qc.invalidateQueries({ queryKey: ['student'] });
      qc.invalidateQueries({ queryKey: ['course', courseId] });
    } catch (e) {
      if (e instanceof ApiError && (e.isNetwork || e.isTimeout)) setFinish({ kind: 'queued' });
      else setError(e instanceof Error ? e.message : 'Could not finish the lesson.');
    } finally {
      setBusy(false);
    }
  }

  if (finish) {
    const r = finish.kind === 'done' ? finish.rewards : null;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.iris50, padding: space.xl, justifyContent: 'center' }}>
        {r && <Confetti />}
        <PopIn>
          <Text style={{ fontSize: 80, textAlign: 'center' }}>{r ? '🏆' : '📶'}</Text>
        </PopIn>
        <Text style={[font.title, { textAlign: 'center' }]}>{r ? 'Lesson complete!' : 'Saved for later'}</Text>
        {r ? (
          <View style={{ alignItems: 'center', marginVertical: space.lg, gap: 6 }}>
            {r.xp > 0 ? <Text style={[font.h2, { color: colors.sun500 }]}>+{r.xp} XP</Text> : <Text style={font.body}>You already earned this lesson’s XP.</Text>}
            {r.coins > 0 ? <Text style={font.body}>+{r.coins} coins 🪙</Text> : null}
            {r.leveledUp ? <Text style={[font.h2, { color: colors.iris700 }]}>Level up! You’re level {r.newLevel} 🎉</Text> : null}
            {r.unlockedAchievements.map((a) => (
              <Text key={a} style={font.body}>
                🏅 {a}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={[font.body, { textAlign: 'center', marginVertical: space.lg }]}>You’re offline. We’ll send your progress when you’re back online.</Text>
        )}
        {nav.next ? (
          <Button title={`Next: ${nav.next.title}`} onPress={() => router.replace(`/lesson/${courseId}/${nav.next!.id}`)} />
        ) : (
          <Button title="Back to my islands" onPress={() => router.replace('/islands')} />
        )}
        <Button title="Done for now" variant="ghost" onPress={() => router.back()} style={{ marginTop: space.sm }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md }}>
        <Button title="✕" variant="ghost" accessibilityLabel="Close lesson" onPress={() => router.back()} style={{ minHeight: 40, paddingHorizontal: 8 }} />
        <View style={{ flex: 1 }}>
          <ProgressBar value={(nav.index + 1) / Math.max(nav.total, 1)} label={`Lesson ${nav.index + 1} of ${nav.total}`} />
        </View>
        <Button
          title="🦉"
          variant="secondary"
          accessibilityLabel="Ask Kai about this lesson"
          onPress={() => router.push({ pathname: '/kai', params: { lessonId: lesson.id, courseId, title: lesson.title } })}
          style={{ minHeight: 44, paddingHorizontal: 10 }}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl * 2 }}>
        {q.data.offline ? (
          <Card style={{ backgroundColor: '#FEF3C7' }}>
            <Text style={font.small}>You’re offline: showing the copy saved on this phone.</Text>
          </Card>
        ) : null}
        <Text style={font.title}>{lesson.title}</Text>
        {lesson.objectives.length > 0 && (
          <Card style={{ backgroundColor: colors.grass100, borderColor: colors.grass100, marginTop: space.md }}>
            <Text style={[font.body, { fontWeight: '800' }]}>Today you will…</Text>
            {lesson.objectives.map((o) => (
              <Text key={o} style={font.body}>
                • {o}
              </Text>
            ))}
          </Card>
        )}
        <View style={{ marginTop: space.md }}>
          {items.length === 0 && lesson.videoUrl ? (
            <ContentBlock
              courseId={courseId}
              onWatched={() => undefined}
              item={{ id: `${lesson.id}-video`, type: 'VIDEO', order: 0, title: lesson.title, body: null, url: lesson.videoUrl, isRequired: false, durationSeconds: null, downloadUrls: null, quizId: null, assignmentId: null, externalUrl: null, video: null, progress: [] }}
            />
          ) : null}
          {items.map((item) => (
            <ContentBlock key={item.id} item={item} courseId={courseId} onWatched={(id) => setWatched((s) => new Set(s).add(id))} />
          ))}
          {lesson.quiz ? (
            <Card style={{ borderColor: colors.iris300 }}>
              <Text style={[font.body, { fontWeight: '800' }]}>❓ {lesson.quiz.title}</Text>
              <Text style={font.small}>
                {lesson.quiz._count.questions} questions · pass with {lesson.quiz.passingScore}%
              </Text>
              <Button title="Take the quiz" onPress={() => router.push({ pathname: '/quiz/[quizId]', params: { quizId: lesson.quiz!.id, courseId } })} style={{ marginTop: space.sm }} />
            </Card>
          ) : null}
        </View>
        {error ? <Text style={{ color: colors.danger, fontWeight: '700', marginBottom: space.sm }}>{error}</Text> : null}
        <Button
          title={alreadyDone ? 'Finish again' : 'Finish lesson'}
          variant="success"
          busy={busy}
          onPress={complete}
          accessibilityHint={watched.size ? `${watched.size} video watched` : undefined}
          style={{ marginTop: space.lg }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
