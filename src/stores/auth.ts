import { create } from 'zustand';
import Storage from 'expo-sqlite/kv-store';
import { onSessionExpired } from '@/api';
import { authApi, type Role, type Session, type User } from '@/api/auth';
import { ApiError } from '@/api/client';
import { secureTokenStore } from '@/api/tokens';
import { contentCache } from '@/offline/sqlite-storage';

/**
 * The signed-in user. Tokens live only in SecureStore (see api/tokens.ts).
 * A small copy of the profile (no tokens) is kept so the right home screen
 * can open while offline; the server re-confirms it on the next /auth/me.
 */
type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: Status;
  user: User | null;
  /** True after social/phone sign-up until "How will you use Kidora?" is answered. */
  needsRole: boolean;
  bootstrap: () => Promise<void>;
  acceptSession: (s: Session) => Promise<void>;
  refreshMe: () => Promise<void>;
  signOut: () => Promise<void>;
}

const PROFILE_KEY = 'kidora.profile.v1';

function cacheProfile(user: User | null) {
  if (!user) return Storage.removeItem(PROFILE_KEY).catch(() => undefined);
  const { id, name, displayName, role, roleConfirmed, avatarColor, avatarUrl, schoolId } = user;
  return Storage.setItem(PROFILE_KEY, JSON.stringify({ id, name, displayName, role, roleConfirmed, avatarColor, avatarUrl, schoolId })).catch(() => undefined);
}

export const useAuth = create<AuthState>()((set, get) => ({
  status: 'loading',
  user: null,
  needsRole: false,

  async bootstrap() {
    const tokens = await secureTokenStore.get();
    if (!tokens) return set({ status: 'signedOut', user: null });
    try {
      const user = await authApi.me();
      await cacheProfile(user);
      set({ status: 'signedIn', user, needsRole: !user.roleConfirmed });
    } catch (e) {
      if (e instanceof ApiError && (e.isNetwork || e.isTimeout || e.status >= 500)) {
        // Offline start (or the API is down): open with the cached profile;
        // the server decides later. Only a refused session signs out.
        const raw = await Storage.getItem(PROFILE_KEY).catch(() => null);
        if (raw) {
          const user = JSON.parse(raw) as User;
          return set({ status: 'signedIn', user, needsRole: !user.roleConfirmed });
        }
      }
      await secureTokenStore.clear();
      set({ status: 'signedOut', user: null });
    }
  },

  async acceptSession(s) {
    await secureTokenStore.set({ accessToken: s.accessToken, refreshToken: s.refreshToken });
    // /auth/login omits needsRole; the user row says it either way.
    const needsRole = s.needsRole ?? !s.user.roleConfirmed;
    set({ status: 'signedIn', user: s.user, needsRole });
    await cacheProfile(s.user);
    get().refreshMe().catch(() => undefined); // school / subscription details
  },

  async refreshMe() {
    const user = await authApi.me();
    await cacheProfile(user);
    set({ user, needsRole: !user.roleConfirmed });
  },

  async signOut() {
    await authApi.logout().catch(() => undefined); // revokes refresh tokens server-side when online
    await secureTokenStore.clear();
    await cacheProfile(null);
    await contentCache.clear().catch(() => undefined); // cached lessons belong to that account
    set({ status: 'signedOut', user: null, needsRole: false });
  },
}));

onSessionExpired(() => {
  cacheProfile(null);
  useAuth.setState({ status: 'signedOut', user: null, needsRole: false });
});

/** Which home a role lands on. The server enforces permissions; this only picks screens. */
export type Area = 'student' | 'parent' | 'teacher' | 'school';

export function areaFor(role: Role | undefined): Area {
  switch (role) {
    case 'CHILD':
      return 'student';
    case 'TEACHER':
      return 'teacher';
    case 'SCHOOL_ADMIN':
    case 'SCHOOL_LEADER':
    case 'DISTRICT_ADMIN':
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return 'school';
    default:
      return 'parent';
  }
}
