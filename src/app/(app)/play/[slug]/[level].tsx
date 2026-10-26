import { useEffect, useReducer, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { gamesApi, type AttemptResult, type GameSession, type SessionSummary } from '@/api/games';
import { ApiError } from '@/api/client';
import { Button, Card, ErrorState, Loading, PopIn, ProgressBar } from '@/components/ui';
import { Confetti } from '@/components/Confetti';
import { ChoiceChallenge, CodePathChallenge, LaunchChallenge } from '@/features/games/challenges';
import { currentChallenge, initRound, isRoundOver, roundReducer } from '@/features/games/engine';
import { colors, font, space } from '@/theme';
import { feedback } from '@/utils/feedback';

function Summary({ s, slug, onReplay }: { s: SessionSummary; slug: string; onReplay: () => void }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.iris50, padding: space.xl, justifyContent: 'center' }}>
      {s.stars > 0 && <Confetti />}
      <PopIn>
        <Text style={{ fontSize: 56, textAlign: 'center' }} accessibilityLabel={`${s.stars} of 3 stars`}>
          {'⭐'.repeat(s.stars)}
          {'☆'.repeat(Math.max(0, 3 - s.stars))}
        </Text>
      </PopIn>
      <Text style={[font.title, { textAlign: 'center' }]}>Level complete!</Text>
      <View style={{ alignItems: 'center', marginVertical: space.lg, gap: 6 }}>
        <Text style={[font.h2, { color: colors.sun500 }]}>+{s.xpEarned} XP</Text>
        <Text style={font.body}>
          {Math.round(s.accuracy)}% first-try accuracy · best streak {s.bestStreak}
        </Text>
        {s.bonus ? <Text style={font.body}>🎁 Bonus: {s.bonus.label}</Text> : null}
        {s.badge ? (
          <Text style={font.body}>
            {s.badge.glyph} New badge: {s.badge.name}
          </Text>
        ) : null}
        {s.xpEarned === 0 ? <Text style={[font.small, { textAlign: 'center' }]}>Take your time on each question to earn XP.</Text> : null}
      </View>
      {s.nextLevel ? <Button title="Next level" onPress={() => router.replace(`/play/${slug}/${s.nextLevel}`)} /> : null}
      <Button title="Play again" variant="secondary" onPress={onReplay} style={{ marginTop: space.sm }} />
      <Button title="Back to games" variant="ghost" onPress={() => router.replace(`/game/${slug}`)} style={{ marginTop: space.sm }} />
    </SafeAreaView>
  );
}

export default function Play() {
  const { slug, level } = useLocalSearchParams<{ slug: string; level: string }>();
  const qc = useQueryClient();
  const [session, setSession] = useState<GameSession | null>(null);
  const [error, setError] = useState('');
  const [round, dispatch] = useReducer(roundReducer, initRound([]));
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [attempt, setAttempt] = useState(0);
  const starting = useRef<string | null>(null);

  // One session per (level, attempt); guards against double mounts starting two.
  useEffect(() => {
    const key = `${slug}:${level}:${attempt}`;
    if (starting.current === key) return;
    starting.current = key;
    setSession(null);
    setSummary(null);
    setError('');
    gamesApi
      .start(slug, Number(level))
      .then((s) => {
        dispatch({ type: 'init', challenges: s.challenges });
        setSession(s);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not start the game.'));
  }, [slug, level, attempt]);

  if (error) return <ErrorState message={error} onRetry={() => router.back()} />;
  if (!session) return <Loading label="Getting the game ready…" />;
  if (summary) return <Summary s={summary} slug={slug} onReplay={() => setAttempt((a) => a + 1)} />;

  const ch = currentChallenge(round);
  if (!ch) return <Loading label="Scoring…" />;
  const locked = round.feedback.kind === 'correct' || round.feedback.kind === 'revealed' || busy;

  async function submit(answer: unknown): Promise<AttemptResult | null> {
    if (!session || !ch) return null;
    setNote('');
    try {
      const r = await gamesApi.attempt(session.sessionId, ch.id, answer);
      if (r.correct) feedback.correct();
      else feedback.wrong();
      dispatch({ type: 'result', challengeId: ch.id, result: r });
      return r;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Already solved on the server (e.g. a retried request): just move on.
        dispatch({ type: 'result', challengeId: ch.id, result: { correct: true, result: {}, streak: round.streak, revealed: false, solved: 0, total: 0 } });
        return null;
      }
      setNote(e instanceof Error ? e.message : 'That answer could not be checked. Try again.');
      return null;
    }
  }

  async function hint() {
    if (!session || !ch) return;
    try {
      const h = await gamesApi.hint(session.sessionId, ch.id);
      dispatch({ type: 'hint', challengeId: ch.id, text: h.text });
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'No hint right now.');
    }
  }

  /** Called from "See results": the server scores the level (idempotent if tapped twice). */
  async function finishLevel() {
    if (!session) return;
    setBusy(true);
    try {
      const s = await gamesApi.complete(session.sessionId);
      feedback.complete();
      setSummary(s);
      qc.invalidateQueries({ queryKey: ['games'] });
      qc.invalidateQueries({ queryKey: ['student'] });
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Could not finish the level.');
    } finally {
      setBusy(false);
    }
  }

  function quit() {
    Alert.alert('Leave the game?', 'Your progress in this level will not be saved.', [
      { text: 'Keep playing', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  const hints = round.hints[ch.id] ?? [];
  const fb = round.feedback;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md }}>
        <Button title="✕" variant="ghost" accessibilityLabel="Leave game" onPress={quit} style={{ minHeight: 40, paddingHorizontal: 8 }} />
        <View style={{ flex: 1 }}>
          <ProgressBar value={round.done.length / Math.max(round.challenges.length, 1)} label={`${round.done.length} of ${round.challenges.length} done`} />
        </View>
        <Text style={{ fontWeight: '800', color: colors.sun500 }} accessibilityLabel={`Streak ${round.streak}`}>
          🔥 {round.streak}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}>
        <Text style={font.small}>
          {session.game.name} · {session.level.name}
        </Text>
        {ch.speaker ? <Text style={[font.small, { color: colors.iris700 }]}>{ch.speaker} says:</Text> : null}
        <Text style={[font.h2, { marginVertical: space.md }]}>{ch.prompt}</Text>

        {/* keyed by challenge: each one starts with a fresh board */}
        {ch.kind === 'MULTIPLE_CHOICE' && <ChoiceChallenge key={ch.id} challenge={ch} onSubmit={submit} locked={locked} />}
        {ch.kind === 'CODE_PATH' && <CodePathChallenge key={ch.id} challenge={ch} onSubmit={submit} locked={locked} />}
        {ch.kind === 'PHYSICS_LAUNCH' && <LaunchChallenge key={ch.id} challenge={ch} onSubmit={submit} locked={locked} />}
        {!['MULTIPLE_CHOICE', 'CODE_PATH', 'PHYSICS_LAUNCH'].includes(ch.kind) && (
          <Card>
            <Text style={font.body}>This challenge type needs a newer version of the app.</Text>
          </Card>
        )}

        {hints.map((h, i) => (
          <Card key={i} style={{ backgroundColor: colors.sun300, borderColor: colors.sun300, marginTop: space.md }}>
            <Text style={font.body}>💡 {h}</Text>
          </Card>
        ))}
        {note ? <Text style={{ color: colors.danger, marginTop: space.md }}>{note}</Text> : null}
      </ScrollView>

      <View style={{ padding: space.lg, borderTopWidth: 2, borderColor: colors.iris100, backgroundColor: fb.kind === 'correct' ? colors.grass100 : fb.kind === 'wrong' ? '#FFE4E6' : fb.kind === 'revealed' ? colors.sun300 : colors.white }}>
        {fb.kind === 'correct' && <Text style={[font.h2, { color: colors.grass600 }]}>Great job! 🎉</Text>}
        {fb.kind === 'wrong' && <Text style={[font.body, { color: colors.coral500, fontWeight: '800' }]}>{fb.reason ?? 'Not quite. Try again!'}</Text>}
        {fb.kind === 'revealed' && <Text style={[font.body, { fontWeight: '800' }]}>Here’s how it works:</Text>}
        {(fb.kind === 'correct' || fb.kind === 'revealed') && fb.explanation ? <Text style={[font.body, { marginTop: 4 }]}>{fb.explanation}</Text> : null}
        {fb.kind === 'correct' || fb.kind === 'revealed' ? (
          <Button title={isRoundOver(round) ? 'See results' : 'Continue'} variant="success" busy={busy} onPress={() => (isRoundOver(round) ? void finishLevel() : dispatch({ type: 'next' }))} style={{ marginTop: space.md }} />
        ) : (
          <Button title={`Hint (${hints.length}/${ch.hintCount + 1})`} variant="secondary" disabled={hints.length > ch.hintCount} onPress={hint} style={{ marginTop: fb.kind === 'wrong' ? space.md : 0 }} />
        )}
      </View>
    </SafeAreaView>
  );
}
