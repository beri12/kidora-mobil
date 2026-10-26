import { Redirect } from 'expo-router';

/**
 * kidora://auth/callback is normally captured by the in-app browser session
 * (features/auth/social.ts). If Android hands the link to the app instead,
 * land somewhere sensible rather than on "page not found".
 */
export default function OAuthCallback() {
  return <Redirect href="/" />;
}
