import { useState } from 'react';
import { router } from 'expo-router';
import { authApi } from '@/api/auth';
import { Button, Field, FormError, Screen, Subtitle, Title } from '@/components/ui';
import { usePending } from '@/features/auth/pending';
import { space } from '@/theme';

export default function PhoneLogin() {
  const setPending = usePending((s) => s.set);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setError('');
    try {
      setPending(await authApi.phoneLogin(phone.replace(/[\s()-]/g, '')));
      router.push({ pathname: '/verify', params: { mode: 'phone-login' } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send a code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Log in with your phone</Title>
      <Subtitle>We text a 4-digit code to the number on your Kidora account.</Subtitle>
      <FormError>{error}</FormError>
      <Field label="Phone number" keyboardType="phone-pad" autoComplete="tel" placeholder="+251 91 122 3344" value={phone} onChangeText={setPhone} style={{ marginTop: space.lg }} />
      <Button title="Text me a code" busy={busy} disabled={phone.replace(/\D/g, '').length < 8} onPress={send} />
    </Screen>
  );
}
