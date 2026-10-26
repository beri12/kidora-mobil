import { env } from '@/config/env';
import { createApiClient } from './client';
import { secureTokenStore } from './tokens';

type Listener = () => void;
const expiredListeners = new Set<Listener>();

/** The auth store subscribes so a dead refresh token routes back to sign-in. */
export function onSessionExpired(fn: Listener) {
  expiredListeners.add(fn);
  return () => {
    expiredListeners.delete(fn);
  };
}

export const api = createApiClient({
  baseUrl: env.apiUrl,
  tokens: secureTokenStore,
  onSessionExpired: () => expiredListeners.forEach((fn) => fn()),
});

export { ApiError } from './client';
export type { Tokens } from './client';
