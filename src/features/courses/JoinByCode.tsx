import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { learningApi, type JoinByCodeResult } from '@/api/learning';
import { Button, Card, Field, FormError } from '@/components/ui';
import { useT } from '@/i18n';
import { useAuth } from '@/stores/auth';
import { colors, font, space } from '@/theme';
import { isAccessCodeShape, normalizeAccessCode } from './accessCode';

/** "Have a code from your teacher?" Student accounts only; the server enforces the same. */
export function JoinByCode() {
  const t = useT();
  const role = useAuth((s) => s.user?.role);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [joined, setJoined] = useState<JoinByCodeResult | null>(null);

  const join = useMutation({
    mutationFn: learningApi.joinByCode,
    onSuccess: (res) => {
      setJoined(res);
      setCode('');
      void qc.invalidateQueries({ queryKey: ['student'] });
      void qc.invalidateQueries({ queryKey: ['browse'] });
      void qc.invalidateQueries({ queryKey: ['course', res.course.id] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : t('join.badFormat')),
  });

  if (role !== 'CHILD') return null;

  if (!open) {
    return <Button title={t('join.entry')} variant="ghost" onPress={() => setOpen(true)} style={{ marginBottom: space.sm }} />;
  }

  const submit = () => {
    setError('');
    setJoined(null);
    const normalized = normalizeAccessCode(code);
    if (!isAccessCodeShape(normalized)) {
      setError(t('join.badFormat'));
      return;
    }
    join.mutate(normalized);
  };

  return (
    <Card style={{ marginBottom: space.md }}>
      <Text style={[font.body, { fontWeight: '800' }]} accessibilityRole="header">
        {t('join.title')}
      </Text>
      <Text style={[font.small, { marginBottom: space.sm }]}>{t('join.hint')}</Text>
      <FormError>{error}</FormError>
      {joined && (
        <Text style={[font.body, { color: colors.grass600, marginBottom: space.sm }]} accessibilityLiveRegion="polite">
          {t(joined.alreadyEnrolled ? 'join.already' : 'join.joined', { title: joined.course.title })}
        </Text>
      )}
      <Field
        label={t('join.label')}
        placeholder="CPP-7K4M9X"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={32}
        value={code}
        onChangeText={setCode}
        onSubmitEditing={submit}
        returnKeyType="go"
      />
      {joined ? (
        <Button title={t('join.open')} onPress={() => router.push(`/course/${joined.course.id}`)} />
      ) : (
        <Button title={t('join.submit')} busy={join.isPending} onPress={submit} />
      )}
    </Card>
  );
}
