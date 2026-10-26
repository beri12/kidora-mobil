import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { authApi } from '@/api/auth';
import { Button, Field, FormError, Screen, Subtitle, Title } from '@/components/ui';
import { CodeInput } from '@/components/CodeInput';
import { passwordSchema } from '@/features/auth/schemas';
import { useAuth } from '@/stores/auth';
import { space } from '@/theme';

export default function Reset() {
  const { email = '', channel, masked } = useLocalSearchParams<{ email: string; channel: 'sms' | 'email'; masked: string }>();
  const accept = useAuth((s) => s.acceptSession);
  const length = channel === 'sms' ? 4 : 6;
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function reset() {
    const pw = passwordSchema.safeParse(password);
    if (!pw.success) return setError(pw.error.issues[0]?.message ?? 'Choose a stronger password');
    setBusy(true);
    setError('');
    try {
      await accept(await authApi.resetPassword(email, code, password));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reset the password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Choose a new password</Title>
      <Subtitle>
        Enter the {length}-digit code we sent to {masked || email}.
      </Subtitle>
      <FormError>{error}</FormError>
      <CodeInput length={length} value={code} onChange={setCode} />
      <Field label="New password" secureTextEntry autoComplete="new-password" value={password} onChangeText={setPassword} hint="8+ characters with a letter and a number" style={{ marginTop: space.lg }} />
      <Button title="Save and log in" busy={busy} disabled={code.length !== length} onPress={reset} />
    </Screen>
  );
}
