import { useState } from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { Button, FormError } from '@/components/ui';
import { useT } from '@/i18n';
import { useAuth } from '@/stores/auth';
import { font, fonts, space } from '@/theme';
import { appSocialProviders } from './providers';
import { signInWithProvider, type SocialProvider } from './social';

const ICON: Record<SocialProvider, string> = { google: 'G', facebook: 'f' };

/** Only providers the server has configured AND can return to the app are shown. */
export function SocialButtons() {
  const t = useT();
  const accept = useAuth((s) => s.acceptSession);
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState('');
  const { data } = useQuery({ queryKey: ['auth-providers'], queryFn: authApi.providers, staleTime: 5 * 60_000 });
  const shown = appSocialProviders(data);
  if (!shown.length) return null;

  async function go(p: SocialProvider) {
    setBusy(p);
    setError('');
    try {
      const session = await signInWithProvider(p);
      if (session) await accept(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('social.failed'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ marginTop: space.lg }}>
      <Text style={[font.small, { textAlign: 'center', marginBottom: space.sm }]}>{t('social.or')}</Text>
      <FormError>{error}</FormError>
      <View style={{ gap: space.sm }}>
        {shown.map((p) => (
          <Button
            key={p}
            title={t(p === 'google' ? 'social.google' : 'social.facebook')}
            variant="secondary"
            busy={busy === p}
            disabled={busy !== null && busy !== p}
            icon={<Text style={{ fontFamily: fonts.black, fontSize: 18, color: p === 'google' ? '#EA4335' : '#1877F2' }}>{ICON[p]}</Text>}
            onPress={() => go(p)}
          />
        ))}
      </View>
    </View>
  );
}
