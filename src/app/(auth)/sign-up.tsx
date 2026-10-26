import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { authApi, type SelfSignupRole } from '@/api/auth';
import { Button, Field, FormError, Screen, SectionTitle, Subtitle, Title } from '@/components/ui';
import { RolePicker } from '@/components/RolePicker';
import { usePending } from '@/features/auth/pending';
import { signUpSchema, type SignUpValues } from '@/features/auth/schemas';
import { SocialButtons } from '@/features/auth/SocialButtons';
import { colors, font, space } from '@/theme';
import { zodResolver } from '@/utils/form';

export default function SignUp() {
  const setPending = usePending((s) => s.set);
  const [role, setRole] = useState<SelfSignupRole | null>(null);
  const [formError, setFormError] = useState('');
  const { control, handleSubmit, formState } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setFormError('');
    try {
      const pending = await authApi.register({
        name: v.name.trim(),
        email: v.email.trim(),
        password: v.password,
        role: role ?? undefined,
        phone: v.phone.replace(/[\s()-]/g, '') || undefined,
      });
      setPending(pending);
      router.push('/verify');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Sign-up failed.');
    }
  });

  // React Native events are not DOM events: call the handler without one.
  const submit = () => {
    void onSubmit();
  };

  const field = (name: keyof SignUpValues, label: string, extra: object = {}) => (
    <Controller
      control={control}
      name={name}
      render={({ field: f }) => (
        <Field label={label} value={f.value} onChangeText={f.onChange} onBlur={f.onBlur} error={formState.errors[name]?.message} {...extra} />
      )}
    />
  );

  return (
    <Screen>
      <Title>Create your Kidora account</Title>
      <Subtitle>It takes a minute. A grown-up should help younger learners.</Subtitle>
      <SectionTitle>How will you use Kidora?</SectionTitle>
      <RolePicker value={role} onChange={setRole} />
      <View style={{ marginTop: space.lg }}>
        <FormError>{formError}</FormError>
        {field('name', 'Full name', { autoComplete: 'name', textContentType: 'name' })}
        {field('email', 'Email', { autoCapitalize: 'none', keyboardType: 'email-address', autoComplete: 'email' })}
        {field('phone', 'Phone number (optional)', {
          keyboardType: 'phone-pad',
          autoComplete: 'tel',
          placeholder: '+251 91 122 3344',
          hint: 'Add it to get codes by text message. Leave it blank and we email your code instead.',
        })}
        {field('password', 'Password', { secureTextEntry: true, autoComplete: 'new-password', textContentType: 'newPassword', hint: '8+ characters with a letter and a number' })}
        {field('confirm', 'Confirm password', { secureTextEntry: true, autoComplete: 'new-password' })}
        <Button title="Create account" busy={formState.isSubmitting} onPress={submit} />
      </View>
      <SocialButtons />
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: space.xl }}>
        <Text style={font.body}>Already have an account? </Text>
        <Link href="/sign-in" style={{ color: colors.iris700, fontWeight: '800', fontSize: 16 }}>
          Log in
        </Link>
      </View>
    </Screen>
  );
}
