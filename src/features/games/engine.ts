import type { AttemptResult, Challenge } from '@/api/games';

/**
 * The client side of a game round, kept pure so it is easy to test. It only
 * tracks what the screen needs (which challenge is showing, feedback, the
 * streak to cheer about). Correctness, scoring, XP and the bonus are decided
 * by the server; nothing here can change them.
 */
export type Feedback =
  | { kind: 'none' }
  | { kind: 'correct'; explanation?: string }
  | { kind: 'wrong'; reason?: string; tries: number }
  | { kind: 'revealed'; explanation?: string };

export interface RoundState {
  challenges: Challenge[];
  index: number;
  /** Challenge ids the server counts as done (solved or revealed). */
  done: string[];
  tries: Record<string, number>;
  streak: number;
  bestStreak: number;
  feedback: Feedback;
  hints: Record<string, string[]>;
}

export type RoundAction =
  | { type: 'init'; challenges: Challenge[] }
  | { type: 'result'; challengeId: string; result: AttemptResult }
  | { type: 'hint'; challengeId: string; text: string }
  | { type: 'next' };

export function initRound(challenges: Challenge[]): RoundState {
  const sorted = [...challenges].sort((a, b) => a.order - b.order);
  return { challenges: sorted, index: 0, done: [], tries: {}, streak: 0, bestStreak: 0, feedback: { kind: 'none' }, hints: {} };
}

export function roundReducer(s: RoundState, a: RoundAction): RoundState {
  switch (a.type) {
    case 'init':
      return initRound(a.challenges);
    case 'result': {
      const tries = (s.tries[a.challengeId] ?? 0) + 1;
      const base = { ...s, tries: { ...s.tries, [a.challengeId]: tries } };
      if (a.result.correct) {
        const streak = s.streak + 1;
        return {
          ...base,
          done: s.done.includes(a.challengeId) ? s.done : [...s.done, a.challengeId],
          streak,
          bestStreak: Math.max(s.bestStreak, streak),
          feedback: { kind: 'correct', explanation: a.result.explanation },
        };
      }
      if (a.result.revealed) {
        return {
          ...base,
          done: s.done.includes(a.challengeId) ? s.done : [...s.done, a.challengeId],
          streak: 0,
          feedback: { kind: 'revealed', explanation: a.result.explanation },
        };
      }
      return { ...base, streak: 0, feedback: { kind: 'wrong', reason: a.result.result?.reason, tries } };
    }
    case 'hint':
      return { ...s, hints: { ...s.hints, [a.challengeId]: [...(s.hints[a.challengeId] ?? []), a.text] } };
    case 'next': {
      // The next challenge not yet done; wraps once so a skipped one comes back.
      const n = s.challenges.length;
      for (let step = 1; step <= n; step++) {
        const i = (s.index + step) % n;
        if (!s.done.includes(s.challenges[i]!.id)) return { ...s, index: i, feedback: { kind: 'none' } };
      }
      return { ...s, feedback: { kind: 'none' } };
    }
  }
}

export const isRoundOver = (s: RoundState) => s.done.length >= s.challenges.length;
export const currentChallenge = (s: RoundState) => s.challenges[s.index];
