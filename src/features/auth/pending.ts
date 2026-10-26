import { create } from 'zustand';
import type { Pending } from '@/api/auth';

/** The code step's context, handed from sign-up / sign-in to the verify screen. */
export const usePending = create<{ pending: Pending | null; set: (p: Pending | null) => void }>()((set) => ({
  pending: null,
  set: (pending) => set({ pending }),
}));

/** The 403 bodies from /auth/login carry a fresh pending state under `error`. */
export function pendingFromError(body: unknown): Pending | null {
  const inner = body && typeof body === 'object' ? (body as { error?: unknown }).error : undefined;
  if (!inner || typeof inner !== 'object') return null;
  const e = inner as Record<string, unknown>;
  if (e.code === 'EMAIL_NOT_VERIFIED' && typeof e.email === 'string') {
    return { needsEmailVerification: true, email: e.email, maskedEmail: String(e.maskedEmail ?? e.email), expiresIn: Number(e.expiresIn ?? 600), resendIn: Number(e.resendIn ?? 45) };
  }
  if (e.code === 'PHONE_NOT_VERIFIED' && typeof e.phone === 'string') {
    return { needsPhoneVerification: true, phone: e.phone, maskedPhone: String(e.maskedPhone ?? e.phone), expiresIn: Number(e.expiresIn ?? 300), resendIn: Number(e.resendIn ?? 45) };
  }
  return null;
}
