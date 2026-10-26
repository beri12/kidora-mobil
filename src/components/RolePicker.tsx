import { Pressable, Text, View } from 'react-native';
import type { SelfSignupRole } from '@/api/auth';
import { colors, radius, space } from '@/theme';
import { feedback } from '@/utils/feedback';

export const ROLE_CHOICES: { role: SelfSignupRole; emoji: string; label: string; hint: string }[] = [
  { role: 'CHILD', emoji: '🧒', label: 'Student', hint: 'Learn, play and earn XP' },
  { role: 'PARENT', emoji: '👪', label: 'Parent', hint: "Follow your child's learning" },
  { role: 'TEACHER', emoji: '🧑‍🏫', label: 'Teacher', hint: 'Classes, content and progress' },
  { role: 'SCHOOL_LEADER', emoji: '🏫', label: 'School leader', hint: 'Needs verification by Kidora' },
];

export function RolePicker({ value, onChange }: { value: SelfSignupRole | null; onChange: (r: SelfSignupRole) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }} accessibilityRole="radiogroup">
      {ROLE_CHOICES.map((c) => {
        const on = value === c.role;
        return (
          <Pressable
            key={c.role}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${c.label}. ${c.hint}`}
            onPress={() => {
              feedback.tap();
              onChange(c.role);
            }}
            style={{
              width: '48%',
              padding: space.md,
              borderRadius: radius.md,
              borderWidth: 2,
              borderColor: on ? colors.iris600 : colors.iris100,
              backgroundColor: on ? colors.iris100 : colors.white,
            }}
          >
            <Text style={{ fontSize: 28 }}>{c.emoji}</Text>
            <Text style={{ fontWeight: '800', color: colors.ink, fontSize: 16 }}>{c.label}</Text>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600' }}>{c.hint}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
