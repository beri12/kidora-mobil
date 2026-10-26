import { api } from './index';

export type TutorKind = 'TUTOR' | 'EXPLAIN' | 'PRACTICE' | 'HINT' | 'MISTAKE' | 'RECOMMEND';

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

/**
 * Kai goes through the public, authenticated LMS route (the same one the
 * web student area uses). The app never talks to the internal AI service:
 * the API adds the lesson context, applies the school's daily limit and
 * the safety rules, and returns 503 when the provider is down.
 */
export const aiApi = {
  ask: (body: { message: string; kind?: TutorKind; lessonId?: string; courseId?: string }) =>
    api.post<{ reply: TutorMessage; remainingToday: number }>('/lms/ai/tutor', body, { timeoutMs: 45_000 }),
  history: () => api.get<{ items: TutorMessage[]; total: number }>('/lms/ai/tutor/history'),
};

/** Kai only needs the question; strip anything that looks like contact details first. */
export function scrubPersonalData(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    // Phone-like runs only (9+ digits): "12 - 3 - 4" is maths, not a number to hide.
    .replace(/\+?\d[\d\s().-]{7,}\d/g, (m) => (m.replace(/\D/g, '').length >= 9 ? '[number]' : m))
    .slice(0, 2000);
}
