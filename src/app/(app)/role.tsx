import { useState } from 'react';
import { Text } from 'react-native';
import { authApi, type SelfSignupRole } from '@/api/auth';
import { Button, Field, FormError, Screen, Subtitle, Title } from '@/components/ui';
import { RolePicker } from '@/components/RolePicker';
import { useAuth } from '@/stores/auth';
import { colors, space } from '@/theme';

/** "How will you use Kidora?" after a social or phone sign-up. Answered once. */
export default function ChooseRole() {
  const accept = useAuth((s) => s.acceptSession);
  const refreshMe = useAuth((s) => s.refreshMe);
  const [role, setRole] = useState<SelfSignupRole | null>(null);
  const [dob, setDob] = useState('');
  const [grade, setGrade] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const isStudent = role === 'CHILD';

  async function save() {
    if (!role) return;
    if (isStudent && (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || !grade.trim())) {
      return setError('Students need a date of birth (YYYY-MM-DD) and a grade.');
    }
    setBusy(true);
    setError('');
    try {
      const res = await authApi.selectRole({ role, ...(isStudent ? { dateOfBirth: dob, gradeLevel: grade.trim() } : {}) });
      if ('needsVerification' in res) {
        // School and district roles are checked by the Kidora team first.
        setNote('Thanks! School and district accounts are verified by the Kidora team. Finish the request on justkidora.com; we will email you when it is approved.');
        await refreshMe();
      } else {
        await accept(res);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your choice.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>How will you use Kidora?</Title>
      <Subtitle>Pick one. This sets up the right home for you.</Subtitle>
      <FormError>{error}</FormError>
      {note ? <Text style={{ color: colors.grass600, fontWeight: '700', marginVertical: space.md }}>{note}</Text> : null}
      <RolePicker value={role} onChange={setRole} />
      {isStudent && (
        <>
          <Field label="Date of birth" placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" value={dob} onChangeText={setDob} style={{ marginTop: space.lg }} />
          <Field label="Grade" placeholder="e.g. Grade 4" value={grade} onChangeText={setGrade} />
        </>
      )}
      <Button title="Continue" busy={busy} disabled={!role} onPress={save} style={{ marginTop: space.lg }} />
    </Screen>
  );
}
