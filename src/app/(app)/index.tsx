import { Redirect } from 'expo-router';
import { areaFor, useAuth } from '@/stores/auth';

/** Lands each role on its own home. The server still checks every request. */
export default function Home() {
  const role = useAuth((s) => s.user?.role);
  const area = areaFor(role);
  if (area === 'student') return <Redirect href="/home" />;
  if (area === 'teacher') return <Redirect href="/teach" />;
  if (area === 'school') return <Redirect href="/school" />;
  return <Redirect href="/family" />;
}
