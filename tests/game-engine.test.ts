import type { AttemptResult, Challenge } from '@/api/games';
import { currentChallenge, initRound, isRoundOver, roundReducer } from '@/features/games/engine';

const ch = (id: string, order: number): Challenge => ({
  id, order, kind: 'MULTIPLE_CHOICE', setup: { options: ['1', '2'] }, skill: 'add', prompt: '?', speaker: null, hintCount: 1,
});
const res = (p: Partial<AttemptResult>): AttemptResult => ({ correct: false, result: {}, streak: 0, revealed: false, solved: 0, total: 3, ...p });

describe('game round engine', () => {
  const challenges = [ch('c', 3), ch('a', 1), ch('b', 2)];

  it('plays challenges in server order', () => {
    expect(currentChallenge(initRound(challenges))!.id).toBe('a');
  });

  it('counts streaks and resets them on a miss', () => {
    let s = initRound(challenges);
    s = roundReducer(s, { type: 'result', challengeId: 'a', result: res({ correct: true }) });
    s = roundReducer(s, { type: 'next' });
    s = roundReducer(s, { type: 'result', challengeId: 'b', result: res({ correct: true }) });
    expect(s.streak).toBe(2);
    s = roundReducer(s, { type: 'next' });
    s = roundReducer(s, { type: 'result', challengeId: 'c', result: res({ result: { reason: 'Bump!' } }) });
    expect(s.streak).toBe(0);
    expect(s.bestStreak).toBe(2);
    expect(s.feedback).toEqual({ kind: 'wrong', reason: 'Bump!', tries: 1 });
  });

  it('keeps the learner on a challenge after a wrong answer', () => {
    let s = initRound(challenges);
    s = roundReducer(s, { type: 'result', challengeId: 'a', result: res({}) });
    expect(currentChallenge(s)!.id).toBe('a');
    expect(s.done).toEqual([]);
  });

  it('counts a revealed answer as done, so the round can finish', () => {
    let s = initRound([ch('a', 1)]);
    for (let i = 0; i < 2; i++) s = roundReducer(s, { type: 'result', challengeId: 'a', result: res({}) });
    s = roundReducer(s, { type: 'result', challengeId: 'a', result: res({ revealed: true, explanation: 'Because 2+2=4' }) });
    expect(s.feedback).toEqual({ kind: 'revealed', explanation: 'Because 2+2=4' });
    expect(isRoundOver(s)).toBe(true);
  });

  it('never double-counts a challenge', () => {
    let s = initRound(challenges);
    s = roundReducer(s, { type: 'result', challengeId: 'a', result: res({ correct: true }) });
    s = roundReducer(s, { type: 'result', challengeId: 'a', result: res({ correct: true }) });
    expect(s.done).toEqual(['a']);
  });

  it('skips finished challenges when moving on', () => {
    let s = initRound(challenges);
    s = roundReducer(s, { type: 'result', challengeId: 'a', result: res({ correct: true }) });
    s = roundReducer(s, { type: 'next' });
    expect(currentChallenge(s)!.id).toBe('b');
    s = roundReducer(s, { type: 'result', challengeId: 'b', result: res({ correct: true }) });
    s = roundReducer(s, { type: 'next' });
    expect(currentChallenge(s)!.id).toBe('c');
  });

  it('collects hints per challenge', () => {
    let s = initRound(challenges);
    s = roundReducer(s, { type: 'hint', challengeId: 'a', text: 'Count on your fingers' });
    s = roundReducer(s, { type: 'hint', challengeId: 'a', text: 'Start at 2' });
    expect(s.hints.a).toEqual(['Count on your fingers', 'Start at 2']);
  });
});

describe('game round init', () => {
  it('resets everything for a new session', () => {
    let s = initRound([ch('a', 1)]);
    s = roundReducer(s, { type: 'result', challengeId: 'a', result: res({ correct: true }) });
    s = roundReducer(s, { type: 'init', challenges: [ch('x', 1), ch('y', 2)] });
    expect(s.done).toEqual([]);
    expect(s.streak).toBe(0);
    expect(currentChallenge(s)!.id).toBe('x');
  });
});
