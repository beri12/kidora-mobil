import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { authApi } from '@/api/auth';
import { ApiError } from '@/api/client';
import { Button, Field, FormError, Mascot, Screen, Subtitle, Title } from '@/components/ui';
import { pendingFromError, usePending } from '@/features/auth/pending';
import { signInSchema, type SignInValues } from '@/features/auth/schemas';
import { SocialButtons } from '@/features/auth/SocialButtons';
import { useAuth } from '@/stores/auth';
import { colors, font, space } from '@/theme';
import { zodResolver } from '@/utils/form';

export default function SignIn() {
  const accept = useAuth((s) => s.acceptSession);
  const setPending = usePending((s) => s.set);
  const [formError, setFormError] = useState('');
  const [mfa, setMfa] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError('');
    try {
      await accept(await authApi.login(email.trim(), password, mfa ?? undefined));
    } catch (e) {
      if (e instanceof ApiError) {
        const pending = pendingFromError(e.body);
        if (pending) {
          setPending(pending);
          router.push('/verify');
          return;
        }
        if (e.message === 'MFA_REQUIRED') {
          setMfa('');
          setFormError('Enter the 6-digit code from your authenticator app.');
          return;
        }
      }
      setFormError(e instanceof Error ? e.message : 'Sign-in failed.');
    }
  });
  // React Native events are not DOM events: call the handler without one.
  const submit = () => {
    void onSubmit();
  };

  return (
    <Screen>
      <Mascot />
      <Title>Welcome back to Kidora</Title>
      <Subtitle>Log in to keep learning.</Subtitle>
      <View style={{ marginTop: space.xl }}>
        <FormError>{formError}</FormError>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Field label="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress"
              value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={formState.errors.email?.message} />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <Field label="Password" secureTextEntry autoComplete="password" textContentType="password"
              value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={formState.errors.password?.message} onSubmitEditing={submit} />
          )}
        />
        {mfa !== null && (
          <Field label="Authenticator code" keyboardType="number-pad" maxLength={6} value={mfa} onChangeText={setMfa} autoFocus />
        )}
        <Link href="/forgot" style={{ color: colors.iris700, fontWeight: '800', marginBottom: space.md, textAlign: 'right' }}>
          Forgot password?
        </Link>
        <Button title="Log in" busy={formState.isSubmitting} onPress={submit} />
        <Button title="Log in with a phone code" variant="ghost" onPress={() => router.push('/phone')} style={{ marginTop: space.sm }} />
      </View>
      <SocialButtons />
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: space.xl }}>
        <Text style={font.body}>New to Kidora? </Text>
        <Link href="/sign-up" style={{ color: colors.iris700, fontWeight: '800', fontSize: 16 }}>
          Create an account
        </Link>
      </View>
    </Screen>
  );
}
