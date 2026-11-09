import { Redirect } from 'expo-router';
import { areaFor, useAuth } from '@/stores/auth';

/**
 * The app always opens at "/". This screen lives outside the signed-in and
 * signed-out groups so "/" exists in both states (inside `(app)` it vanished
 * while signed out, which showed Expo Router's "Unmatched Route" on launch).
 * It only decides where to go; the server still checks every request.
 */
export default function Index() {
  const status = useAuth((s) => s.status);
  const needsRole = useAuth((s) => s.needsRole);
  const role = useAuth((s) => s.user?.role);

  if (status !== 'signedIn') return <Redirect href="/sign-in" />;
  if (needsRole) return <Redirect href="/role" />;
  const area = areaFor(role);
  if (area === 'student') return <Redirect href="/home" />;
  if (area === 'teacher') return <Redirect href="/teach" />;
  if (area === 'school') return <Redirect href="/school" />;
  return <Redirect href="/family" />;
}
