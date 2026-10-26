import { useState } from 'react';
import { router } from 'expo-router';
import { authApi } from '@/api/auth';
import { Button, Field, FormError, Screen, Subtitle, Title } from '@/components/ui';
import { emailSchema } from '@/features/auth/schemas';
import { space } from '@/theme';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    const ok = emailSchema.safeParse(email);
    if (!ok.success) return setError(ok.error.issues[0]?.message ?? 'Enter your email');
    setBusy(true);
    setError('');
    try {
      const res = await authApi.forgotPassword(ok.data);
      router.push({
        pathname: '/reset',
        params: { email: ok.data, channel: res.channel, masked: res.channel === 'sms' ? res.maskedPhone : res.maskedEmail },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the reset code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Forgot your password?</Title>
      <Subtitle>Enter your email. We send a reset code to the phone or email on your account.</Subtitle>
      <FormError>{error}</FormError>
      <Field label="Email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} style={{ marginTop: space.lg }} />
      <Button title="Send reset code" busy={busy} onPress={send} />
    </Screen>
  );
}
