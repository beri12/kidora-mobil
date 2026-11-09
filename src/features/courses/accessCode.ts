/**
 * Mirrors normalizeCode() and the format check in the API's
 * course-access.service.ts. Checking the shape on the phone first matters:
 * the server counts every wrong code (including typos) toward a 10-per-hour
 * limit per student, and a child should not lock themselves out with a typo.
 */
const RANDOM_PART = 6;
const SHAPE = /^[A-Z0-9]{2,4}-[A-Z0-9]{6}$/;

export function normalizeAccessCode(raw: string): string {
  const s = String(raw ?? '').toUpperCase().replace(/[\s_]/g, '').replace(/[^A-Z0-9-]/g, '');
  if (s.includes('-')) return s;
  return s.length > RANDOM_PART ? `${s.slice(0, -RANDOM_PART)}-${s.slice(-RANDOM_PART)}` : s;
}

export function isAccessCodeShape(code: string): boolean {
  return SHAPE.test(code);
}
