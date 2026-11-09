import type { Providers } from '@/api/auth';

export type SocialProvider = 'google' | 'facebook';
const KNOWN: readonly SocialProvider[] = ['google', 'facebook'];

/**
 * Which social buttons the app may show.
 *
 * A provider being configured (`providers`) is not enough: an API without the
 * app-return change redirects to the website after Google/Facebook, so the
 * app would open a browser that can never come back. Only providers the API
 * says it can return to the app with a PKCE-bound code are offered.
 */
export function appSocialProviders(data: Providers | undefined): SocialProvider[] {
  const app = data?.appClient;
  if (!data || !app?.pkce || !Array.isArray(app.providers)) return [];
  return KNOWN.filter((p) => data.providers.includes(p) && app.providers.includes(p));
}
