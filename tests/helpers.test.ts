import { ApiError } from '@/api/client';
import { scrubPersonalData } from '@/api/ai';
import { pendingFromError } from '@/features/auth/pending';
import { parseCallback } from '@/features/auth/social';
import { classify } from '@/offline/sync';
import { areaFor } from '@/stores/auth';
import { base64Url, toBase64Url } from '@/utils/pkce';

describe('role-aware navigation', () => {
  it('sends each role to its own area', () => {
    expect(areaFor('CHILD')).toBe('student');
    expect(areaFor('PARENT')).toBe('parent');
    expect(areaFor('TEACHER')).toBe('teacher');
    expect(areaFor('SCHOOL_LEADER')).toBe('school');
    expect(areaFor('SCHOOL_ADMIN')).toBe('school');
    expect(areaFor('DISTRICT_ADMIN')).toBe('school');
  });
  it('falls back to the least-privileged area for unknown roles', () => {
    expect(areaFor(undefined)).toBe('parent');
    expect(areaFor('SOMETHING_NEW' as never)).toBe('parent');
  });
});

describe('PKCE encoding', () => {
  it('encodes RFC 4648 base64url without padding', () => {
    expect(base64Url(new Uint8Array([]))).toBe('');
    expect(base64Url(new Uint8Array([0xfb]))).toBe('-w');
    expect(base64Url(new Uint8Array([0xfb, 0xff]))).toBe('-_8');
    expect(base64Url(new TextEncoder().encode('hello'))).toBe('aGVsbG8');
  });
  it('makes a 43-character verifier from 32 bytes', () => {
    expect(base64Url(new Uint8Array(32).fill(7))).toHaveLength(43);
  });
  it('converts standard base64 digests', () => {
    expect(toBase64Url('ab+/cd==')).toBe('ab-_cd');
  });
});

describe('OAuth callback parsing', () => {
  it('reads the one-time code from the fragment', () => {
    expect(parseCallback('kidora://auth/callback#code=abc123&needsRole=1')).toEqual({ code: 'abc123', error: undefined });
  });
  it('reads a cancelled or failed sign-in', () => {
    expect(parseCallback('kidora://auth/callback#error=cancelled&provider=google').error).toBe('cancelled');
    expect(parseCallback('kidora://auth/callback').code).toBeUndefined();
  });
});

describe('verification state from a login refusal', () => {
  it('reads an email code step from the wrapped error', () => {
    const body = { statusCode: 403, error: { code: 'EMAIL_NOT_VERIFIED', email: 'a@b.co', maskedEmail: 'a***@b.co', resendIn: 30 } };
    expect(pendingFromError(body)).toMatchObject({ needsEmailVerification: true, email: 'a@b.co', resendIn: 30 });
  });
  it('reads an SMS code step', () => {
    const body = { error: { code: 'PHONE_NOT_VERIFIED', phone: '+251911223344', maskedPhone: '+2519•••344' } };
    expect(pendingFromError(body)).toMatchObject({ needsPhoneVerification: true, phone: '+251911223344' });
  });
  it('ignores other errors', () => {
    expect(pendingFromError({ error: { message: 'Invalid credentials' } })).toBeNull();
    expect(pendingFromError('nope')).toBeNull();
  });
});

describe('Kai privacy', () => {
  it('removes emails and phone numbers before a question leaves the phone', () => {
    expect(scrubPersonalData('my mum is abebe@mail.com call +251 911 223 344')).toBe('my mum is [email] call [number]');
  });
  it('keeps maths intact', () => {
    expect(scrubPersonalData('what is 12 - 3 - 4 - 5?')).toBe('what is 12 - 3 - 4 - 5?');
    expect(scrubPersonalData('1/2 + 3/4')).toBe('1/2 + 3/4');
  });
  it('caps the length the server accepts', () => {
    expect(scrubPersonalData('a'.repeat(5000))).toHaveLength(2000);
  });
});

describe('offline sync decisions', () => {
  it('retries what might work later', () => {
    expect(classify(new ApiError('x', { isNetwork: true }))).toBe('retry');
    expect(classify(new ApiError('x', { isTimeout: true }))).toBe('retry');
    expect(classify(new ApiError('x', { status: 503 }))).toBe('retry');
    expect(classify(new ApiError('x', { status: 429 }))).toBe('retry');
  });
  it('drops what the server refused for good (access revoked, gone)', () => {
    expect(classify(new ApiError('x', { status: 403 }))).toBe('drop');
    expect(classify(new ApiError('x', { status: 404 }))).toBe('drop');
    expect(classify(new ApiError('x', { status: 400 }))).toBe('drop');
  });
});
