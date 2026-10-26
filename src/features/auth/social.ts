import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { env } from '@/config/env';
import { authApi, type Session } from '@/api/auth';
import { ApiError } from '@/api/client';
import { createPkcePair } from '@/utils/pkce';

export type SocialProvider = 'google' | 'facebook';

/** "#code=…&needsRole=1" or "#error=cancelled&provider=google" → fields. */
export function parseCallback(url: string): { code?: string; error?: string } {
  const hash = url.includes('#') ? url.slice(url.indexOf('#') + 1) : url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  const params: Record<string, string> = {};
  for (const part of hash.split('&')) {
    const [k, v = ''] = part.split('=');
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return { code: params.code, error: params.error };
}

/**
 * Google / Facebook sign-in without any client secret in the app:
 *   1. Make a PKCE pair; only the challenge leaves the device.
 *   2. Open the API's own start route in a system auth session
 *      (ASWebAuthenticationSession / Chrome Custom Tabs) with ?client=app.
 *   3. The API returns to kidora://auth/callback#code=… (one-time, 60 s).
 *   4. Trade code + verifier for tokens at POST /auth/oauth/exchange.
 * Requires the API change that adds ?client=app (see docs/mobile/BACKEND_CHANGES.md).
 */
export async function signInWithProvider(provider: SocialProvider): Promise<Session | null> {
  const { verifier, challenge } = await createPkcePair();
  const returnUrl = Linking.createURL('auth/callback', { scheme: env.scheme });
  const start = `${env.apiUrl}/auth/${provider}?client=app&challenge=${encodeURIComponent(challenge)}`;

  const result = await WebBrowser.openAuthSessionAsync(start, returnUrl);
  if (result.type !== 'success') return null; // closed or dismissed: not an error

  const { code, error } = parseCallback(result.url);
  if (error === 'cancelled') return null;
  if (error || !code) {
    throw new ApiError(`${provider === 'google' ? 'Google' : 'Facebook'} sign-in didn't finish. Please try again.`);
  }
  return authApi.oauthExchange(code, verifier);
}
