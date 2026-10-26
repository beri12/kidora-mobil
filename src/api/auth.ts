import { api } from './index';

/** Prisma Role enum. CHILD is a student. */
export type Role = 'CHILD' | 'PARENT' | 'TEACHER' | 'SCHOOL_ADMIN' | 'SCHOOL_LEADER' | 'DISTRICT_ADMIN' | 'SUPER_ADMIN' | 'ADMIN';
export type SelfSignupRole = Exclude<Role, 'SUPER_ADMIN' | 'ADMIN'>;

export interface User {
  id: string;
  email: string | null;
  name: string;
  displayName: string | null;
  role: Role;
  roleConfirmed: boolean;
  phone: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  avatarColor: string;
  avatarUrl: string | null;
  points: number;
  streak: number;
  mfaEnabled: boolean;
  schoolId: string | null;
  districtId: string | null;
  gradeLevel: string | null;
  subscriptionPlan?: string;
  school?: { id: string; name: string; slug: string; joinCode?: string } | null;
  orgRequest?: { id: string; requestedRole: Role; status: 'PENDING' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED'; organizationName: string; decisionNote: string | null } | null;
}

export interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
  /** Absent on /auth/login: use user.roleConfirmed there. */
  needsRole?: boolean;
}

export interface EmailPending {
  needsEmailVerification: true;
  email: string;
  maskedEmail: string;
  expiresIn: number;
  resendIn: number;
}

export interface PhonePending {
  needsPhoneVerification: true;
  phone: string;
  maskedPhone: string;
  expiresIn: number;
  resendIn: number;
}

export type Pending = EmailPending | PhonePending;

export type ForgotResult =
  | { sent: true; channel: 'email'; maskedEmail: string; resendIn: number }
  | { sent: true; channel: 'sms'; maskedPhone: string; maskedEmail: string; resendIn: number };

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: SelfSignupRole;
  phone?: string;
  gradeLevel?: string;
  schoolCode?: string;
}

export interface Providers {
  providers: string[];
  firebase?: { enabled: boolean; providers: string[] };
}

const pub = { auth: false } as const;

export const authApi = {
  login: (email: string, password: string, mfaCode?: string) =>
    api.post<Session>('/auth/login', { email, password, ...(mfaCode ? { mfaCode } : {}) }, pub),
  register: (input: RegisterInput) => api.post<Pending>('/auth/register', input, pub),
  verifyEmail: (email: string, code: string) => api.post<Session>('/auth/email/verify', { email, code }, pub),
  resendEmail: (email: string) => api.post<EmailPending>('/auth/email/resend', { email }, pub),
  verifyPhone: (phone: string, code: string) => api.post<Session>('/auth/phone/verify', { phone, code }, pub),
  resendPhone: (phone: string) => api.post<PhonePending>('/auth/phone/resend', { phone }, pub),
  phoneLogin: (phone: string) => api.post<PhonePending>('/auth/phone/login', { phone }, pub),
  phoneLoginVerify: (phone: string, code: string) => api.post<Session>('/auth/phone/login/verify', { phone, code }, pub),
  forgotPassword: (email: string) => api.post<ForgotResult>('/auth/password/forgot', { email }, pub),
  resetPassword: (email: string, code: string, password: string) => api.post<Session>('/auth/password/reset', { email, code, password }, pub),
  oauthExchange: (code: string, codeVerifier: string) => api.post<Session>('/auth/oauth/exchange', { code, codeVerifier }, pub),
  providers: () => api.get<Providers>('/auth/providers', { auth: false }),
  me: () => api.get<User>('/auth/me'),
  selectRole: (body: { role: SelfSignupRole; name?: string; dateOfBirth?: string; gradeLevel?: string; schoolCode?: string }) =>
    api.post<Session | { needsVerification: true; requestedRole: Role; user: User }>('/auth/role', body),
  logout: () => api.post<{ ok: true }>('/auth/logout'),
};
