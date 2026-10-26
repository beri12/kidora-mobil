/**
 * Public, build-time configuration. Only EXPO_PUBLIC_* values are readable
 * here, and every one of them ships inside the app bundle: nothing secret
 * may ever be added. The API URL is the public Kidora API, never the
 * Docker-internal AI service.
 */
const DEFAULT_API_URL = 'https://api.justkidora.com/api';
const DEFAULT_WEB_URL = 'https://justkidora.com';

function clean(url: string | undefined, fallback: string) {
  const value = (url ?? '').trim().replace(/\/+$/, '');
  return value || fallback;
}

export const env = {
  apiUrl: clean(process.env.EXPO_PUBLIC_API_URL, DEFAULT_API_URL),
  webUrl: clean(process.env.EXPO_PUBLIC_WEB_URL, DEFAULT_WEB_URL),
  scheme: (process.env.EXPO_PUBLIC_APP_SCHEME ?? 'kidora').trim() || 'kidora',
} as const;
