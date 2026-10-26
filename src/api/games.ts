import { api } from './index';
import type { World } from './learning';

export type Dir = 'N' | 'E' | 'S' | 'W';
export type Move = 'F' | 'L' | 'R';

export interface GameSummaryItem {
  slug: string;
  name: string;
  tagline: string;
  world: World;
  subject: string;
  minGrade: number;
  maxGrade: number;
  levels: number;
  completedLevels: number;
  progress: number;
  xpAvailable: number;
}

export interface GameLevel {
  order: number;
  name: string;
  intro: string;
  learningObjective: string;
  difficulty: number;
  challenges: number;
  xp: number;
  completed: boolean;
  stars: 0 | 1 | 2 | 3;
  unlocked: boolean;
}

export interface GameDetail extends Omit<GameSummaryItem, 'levels' | 'completedLevels' | 'progress' | 'xpAvailable'> {
  description: string;
  levels: GameLevel[];
}

export type ChallengeSetup =
  | { kind: 'MULTIPLE_CHOICE'; setup: { options: string[] } }
  | { kind: 'CODE_PATH'; setup: { size: number; start: [number, number]; dir: Dir; goal: [number, number]; walls: [number, number][]; items: [number, number][]; maxBlocks: number } }
  | { kind: 'PHYSICS_LAUNCH'; setup: { gravity: number; target: [number, number]; power: [number, number]; angle: [number, number] } };

export type Challenge = ChallengeSetup & {
  id: string;
  order: number;
  skill: string;
  prompt: string;
  speaker: string | null;
  hintCount: number;
};

export interface GameSession {
  sessionId: string;
  game: { slug: string; name: string; world: World; subject: string };
  level: { order: number; name: string; intro: string; learningObjective: string; xpPerCorrect: number; xpReward: number; isLast: boolean };
  challenges: Challenge[];
}

export interface AttemptResult {
  correct: boolean;
  result: { path?: { x: number; y: number; dir: Dir }[]; collected?: number; distance?: number; reason?: string };
  streak: number;
  explanation?: string;
  /** The answer was revealed after repeated misses; the challenge counts as done. */
  revealed: boolean;
  solved: number;
  total: number;
  mastery?: { skill: string; value: number };
}

export interface SessionSummary {
  completed: boolean;
  accuracy: number;
  stars: number;
  xpEarned: number;
  bestStreak: number;
  bonus: { index: number; label: string; xp: number; coins: number } | null;
  bonusWheel: string[];
  badge: { name: string; glyph: string } | null;
  nextLevel: number | null;
}

export interface Recommendation {
  game: string;
  gameName: string;
  level: number;
  levelName: string;
  skill?: string;
  mastery?: number;
  reason: string;
  minutes: number;
}

const id = encodeURIComponent;

/**
 * Every answer is checked and scored on the server; the app never sends XP.
 * Writes are never retried automatically (the client only retries GETs):
 * a duplicate attempt would be rejected with 409 anyway.
 */
export const gamesApi = {
  list: () => api.get<GameSummaryItem[]>('/games'),
  detail: (slug: string) => api.get<GameDetail>(`/games/${id(slug)}`),
  progress: () => api.get<{ levelsCompleted: number; xpFromGames: number; skills: { subject: string; skill: string; mastery: number }[] }>('/games/progress'),
  recommendations: () => api.get<Recommendation[]>('/games/recommendations'),
  start: (slug: string, level: number) => api.post<GameSession>(`/games/${id(slug)}/sessions`, { level }),
  attempt: (sessionId: string, challengeId: string, answer: unknown) =>
    api.post<AttemptResult>(`/games/sessions/${id(sessionId)}/attempt`, { challengeId, answer }),
  hint: (sessionId: string, challengeId: string) =>
    api.post<{ step: number; of: number; text: string; workedExample: boolean }>(`/games/sessions/${id(sessionId)}/hint`, { challengeId }),
  /** Idempotent on the server: calling it again returns the same summary. */
  complete: (sessionId: string) => api.post<SessionSummary>(`/games/sessions/${id(sessionId)}/complete`),
  summary: (sessionId: string) => api.get<SessionSummary>(`/games/sessions/${id(sessionId)}`),
};
