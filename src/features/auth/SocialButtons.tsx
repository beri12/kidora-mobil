import { useState } from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { Button, FormError } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { font, space } from '@/theme';
import { signInWithProvider, type SocialProvider } from './social';

const LABEL: Record<SocialProvider, string> = { google: 'Continue with Google', facebook: 'Continue with Facebook' };
const ICON: Record<SocialProvider, string> = { google: 'G', facebook: 'f' };

/** Only providers the server actually has configured are shown. */
export function SocialButtons() {
  const accept = useAuth((s) => s.acceptSession);
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState('');
  const { data } = useQuery({ queryKey: ['auth-providers'], queryFn: authApi.providers, staleTime: 5 * 60_000 });
  const shown = (['google', 'facebook'] as const).filter((p) => data?.providers.includes(p));
  if (!shown.length) return null;

  async function go(p: SocialProvider) {
    setBusy(p);
    setError('');
    try {
      const session = await signInWithProvider(p);
      if (session) await accept(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ marginTop: space.lg }}>
      <Text style={[font.small, { textAlign: 'center', marginBottom: space.sm }]}>or continue with</Text>
      <FormError>{error}</FormError>
      <View style={{ gap: space.sm }}>
        {shown.map((p) => (
          <Button
            key={p}
            title={LABEL[p]}
            variant="secondary"
            busy={busy === p}
            disabled={busy !== null && busy !== p}
            icon={<Text style={{ fontWeight: '900', fontSize: 18, color: p === 'google' ? '#EA4335' : '#1877F2' }}>{ICON[p]}</Text>}
            onPress={() => go(p)}
          />
        ))}
      </View>
    </View>
  );
}
