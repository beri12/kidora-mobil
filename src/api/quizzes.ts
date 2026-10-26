import { api } from './index';
import type { RewardOutcome } from './learning';

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MULTIPLE_SELECT' | 'SHORT_ANSWER' | 'MATCHING' | 'ORDERING';

export interface QuizQuestion {
  id: string;
  prompt: string;
  type: QuestionType | string;
  options: string[];
  points: number;
  imageUrl: string | null;
  hint: string | null;
  matchLefts?: string[];
  matchRights?: string[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  timeLimitSec: number | null;
  maxAttempts: number;
  kind: 'LESSON' | 'PRACTICE' | 'FINAL_EXAM';
  questions: QuizQuestion[];
  attempts: { id: string; status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'EXPIRED'; attemptNo: number; percent: number | null }[];
}

/** One answer per question, in the format the grader expects for its type. */
export interface QuizAnswer {
  questionId: string;
  selected?: number[];
  answerText?: string;
}

export interface QuizResult {
  attemptId: string;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  needsManual: boolean;
  outcome: RewardOutcome;
  review: { questionId: string; correct: boolean | null; pointsAwarded: number; explanation: string | null; correctAnswer: number | number[] | string | null }[];
}

export const quizApi = {
  get: (quizId: string) => api.get<Quiz>(`/lms/quizzes/${encodeURIComponent(quizId)}`),
  /** Returns the in-progress attempt if there is one, so calling twice is safe. */
  start: (quizId: string) => api.post<{ id: string; status: string; attemptNo: number }>(`/lms/quizzes/${encodeURIComponent(quizId)}/attempts`),
  /** Never retried automatically: a second submit of the same attempt is a 400. */
  submit: (attemptId: string, answers: QuizAnswer[]) =>
    api.post<QuizResult>(`/lms/attempts/${encodeURIComponent(attemptId)}/submit`, { answers }),
};

/** Build the grader's answer format from what the learner picked. */
export function toAnswer(q: QuizQuestion, value: number | number[] | string | string[] | undefined): QuizAnswer {
  switch (q.type) {
    case 'MULTIPLE_CHOICE':
    case 'TRUE_FALSE':
      return { questionId: q.id, selected: typeof value === 'number' ? [value] : [] };
    case 'MULTIPLE_SELECT':
      return { questionId: q.id, selected: Array.isArray(value) ? (value as number[]) : [] };
    case 'ORDERING':
      // Untouched means "the order shown", which is a real answer.
      return { questionId: q.id, selected: Array.isArray(value) ? (value as number[]) : q.options.map((_, i) => i) };
    case 'MATCHING':
      // The chosen right-hand TEXT for each left item, in left order.
      return { questionId: q.id, answerText: JSON.stringify(Array.isArray(value) ? value : []) };
    default:
      return { questionId: q.id, answerText: typeof value === 'string' ? value : '' };
  }
}
