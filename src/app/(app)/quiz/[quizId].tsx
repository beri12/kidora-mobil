import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { quizApi, toAnswer, type QuizResult } from '@/api/quizzes';
import { Button, Card, ErrorState, Loading, PopIn, ProgressBar } from '@/components/ui';
import { Confetti } from '@/components/Confetti';
import { isAnswered, QuestionView, type AnswerValue } from '@/features/quiz/QuestionView';
import { colors, font, space } from '@/theme';
import { feedback } from '@/utils/feedback';

export default function QuizScreen() {
  const { quizId } = useLocalSearchParams<{ quizId: string; courseId?: string }>();
  const qc = useQueryClient();
  const quiz = useQuery({ queryKey: ['quiz', quizId], queryFn: () => quizApi.get(quizId), staleTime: 0 });
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const submitting = useRef(false);

  useEffect(() => {
    if (left === null || result) return;
    if (left <= 0) {
      submit();
      return;
    }
    const t = setTimeout(() => setLeft((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [left, result]); // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    setBusy(true);
    setError('');
    try {
      const a = await quizApi.start(quizId); // returns the open attempt if there is one
      setAttemptId(a.id);
      if (quiz.data?.timeLimitSec) setLeft(quiz.data.timeLimitSec);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the quiz.');
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!attemptId || !quiz.data || submitting.current) return; // one submission per attempt
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const res = await quizApi.submit(attemptId, quiz.data.questions.map((q) => toAnswer(q, answers[q.id])));
      if (res.passed) feedback.correct();
      else feedback.wrong();
      setResult(res);
      qc.invalidateQueries({ queryKey: ['student'] });
      qc.invalidateQueries({ queryKey: ['lesson'] });
    } catch (e) {
      submitting.current = false; // a network failure may be retried by the learner, not automatically
      setError(e instanceof Error ? e.message : 'Could not submit. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (quiz.isPending) return <Loading />;
  if (quiz.error) return <ErrorState message={quiz.error.message} onRetry={() => quiz.refetch()} />;
  const z = quiz.data;
  const used = z.attempts.filter((a) => a.status !== 'IN_PROGRESS').length;

  if (result) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.iris50 }}>
        {result.passed && <Confetti />}
        <ScrollView contentContainerStyle={{ padding: space.lg }}>
          <PopIn>
            <Text style={{ fontSize: 72, textAlign: 'center' }}>{result.passed ? '🌟' : '💪'}</Text>
          </PopIn>
          <Text style={[font.title, { textAlign: 'center' }]}>{result.passed ? 'You passed!' : 'Nice try!'}</Text>
          <Text style={[font.h2, { textAlign: 'center', color: colors.iris700, marginVertical: space.sm }]}>
            {Math.round(result.percent)}% · {result.score}/{result.maxScore}
          </Text>
          {result.outcome.xp > 0 && <Text style={[font.body, { textAlign: 'center', color: colors.sun500 }]}>+{result.outcome.xp} XP</Text>}
          {result.needsManual && <Text style={[font.small, { textAlign: 'center' }]}>Your teacher will mark the written answers.</Text>}
          {z.questions.map((q, i) => {
            const r = result.review.find((x) => x.questionId === q.id);
            return (
              <Card key={q.id} style={{ borderColor: r?.correct ? colors.grass500 : r?.correct === false ? colors.coral400 : colors.line }}>
                <Text style={[font.body, { fontWeight: '800' }]}>
                  {r?.correct ? '✅' : r?.correct === false ? '❌' : '⏳'} {i + 1}. {q.prompt}
                </Text>
                {r?.explanation ? <Text style={[font.small, { marginTop: 4 }]}>{r.explanation}</Text> : null}
              </Card>
            );
          })}
          <Button title="Back to the lesson" onPress={() => router.back()} style={{ marginTop: space.md }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!attemptId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.iris50, padding: space.xl, justifyContent: 'center' }}>
        <Text style={{ fontSize: 64, textAlign: 'center' }}>❓</Text>
        <Text style={[font.title, { textAlign: 'center' }]}>{z.title}</Text>
        <Text style={[font.body, { textAlign: 'center', marginVertical: space.md }]}>
          {z.questions.length} questions{z.timeLimitSec ? ` · ${Math.round(z.timeLimitSec / 60)} min` : ''} · attempt {used + 1} of {z.maxAttempts}
        </Text>
        {error ? <Text style={{ color: colors.danger, textAlign: 'center', marginBottom: space.md }}>{error}</Text> : null}
        <Button title="Start" busy={busy} disabled={used >= z.maxAttempts} onPress={start} />
        <Button title="Not now" variant="ghost" onPress={() => router.back()} style={{ marginTop: space.sm }} />
      </SafeAreaView>
    );
  }

  const q = z.questions[index]!;
  const last = index === z.questions.length - 1;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={{ padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <ProgressBar value={(index + 1) / z.questions.length} label={`Question ${index + 1} of ${z.questions.length}`} />
        </View>
        {left !== null && <Text style={{ fontWeight: '800', color: left < 30 ? colors.coral500 : colors.ink }}>⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</Text>}
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg }}>
        <QuestionView q={q} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
        {q.hint ? <Text style={[font.small, { marginTop: space.sm }]}>💡 Hint: {q.hint}</Text> : null}
        {error ? <Text style={{ color: colors.danger, marginTop: space.md }}>{error}</Text> : null}
      </ScrollView>
      <View style={{ padding: space.lg, flexDirection: 'row', gap: space.sm }}>
        {index > 0 && <Button title="Back" variant="secondary" onPress={() => setIndex(index - 1)} style={{ flex: 1 }} />}
        {last ? (
          <Button title="Submit" variant="success" busy={busy} onPress={submit} style={{ flex: 2 }} />
        ) : (
          <Button title="Next" disabled={!isAnswered(q, answers[q.id])} onPress={() => setIndex(index + 1)} style={{ flex: 2 }} />
        )}
      </View>
    </SafeAreaView>
  );
}
