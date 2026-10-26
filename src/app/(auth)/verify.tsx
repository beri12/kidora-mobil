import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { authApi } from '@/api/auth';
import { Button, FormError, Screen, Subtitle, Title } from '@/components/ui';
import { CodeInput } from '@/components/CodeInput';
import { usePending } from '@/features/auth/pending';
import { useAuth } from '@/stores/auth';
import { font, space } from '@/theme';

/** The code step for email sign-up (6 digits), SMS sign-up and phone log-in (4 digits). */
export default function Verify() {
  const { mode } = useLocalSearchParams<{ mode?: 'phone-login' }>();
  const pending = usePending((s) => s.pending);
  const setPending = usePending((s) => s.set);
  const accept = useAuth((s) => s.acceptSession);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(pending?.resendIn ?? 45);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  if (!pending) {
    return (
      <Screen>
        <Title>Nothing to verify</Title>
        <Button title="Back to log in" onPress={() => router.replace('/sign-in')} style={{ marginTop: space.xl }} />
      </Screen>
    );
  }

  const sms = 'needsPhoneVerification' in pending;
  const length = sms ? 4 : 6;
  const destination = sms ? pending.maskedPhone : pending.maskedEmail;

  async function verify(value = code) {
    if (value.length !== length || !pending) return;
    setBusy(true);
    setError('');
    try {
      const session =
        'needsPhoneVerification' in pending
          ? mode === 'phone-login'
            ? await authApi.phoneLoginVerify(pending.phone, value)
            : await authApi.verifyPhone(pending.phone, value)
          : await authApi.verifyEmail(pending.email, value);
      setPending(null);
      await accept(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code didn’t work.');
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!pending) return;
    setError('');
    try {
      const next =
        'needsPhoneVerification' in pending
          ? mode === 'phone-login'
            ? await authApi.phoneLogin(pending.phone)
            : await authApi.resendPhone(pending.phone)
          : await authApi.resendEmail(pending.email);
      setPending(next);
      setWait(next.resendIn || 45);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send a new code.');
    }
  }

  return (
    <Screen>
      <Text style={{ fontSize: 52, textAlign: 'center', marginTop: space.xl }}>{sms ? '📱' : '📬'}</Text>
      <Title>{sms ? 'Check your phone' : 'Check your email'}</Title>
      <Subtitle>
        We sent a {length}-digit code to {destination}.{sms ? '' : ' It can take a minute; check spam too.'}
      </Subtitle>
      <FormError>{error}</FormError>
      <CodeInput
        length={length}
        value={code}
        onChange={(v) => {
          setCode(v);
          if (v.length === length) verify(v);
        }}
      />
      <Button title="Verify" busy={busy} disabled={code.length !== length} onPress={() => verify()} style={{ marginTop: space.xl }} />
      <Button title={wait > 0 ? `Resend code in ${wait}s` : 'Send a new code'} variant="ghost" disabled={wait > 0} onPress={resend} style={{ marginTop: space.sm }} />
      <Text style={[font.small, { textAlign: 'center', marginTop: space.md }]}>Wrong details? Go back and edit them.</Text>
    </Screen>
  );
}
