import { useRef } from 'react';
import { Pressable, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { colors, radius, space } from '@/theme';

/** One hidden input drawn as boxes: paste and SMS autofill both work. */
export function CodeInput({ length, value, onChange }: { length: number; value: string; onChange: (v: string) => void }) {
  const ref = useRef<TextInputInstance>(null);
  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel={`${length}-digit code`} accessibilityHint="Enter the code we sent you">
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm }}>
        {Array.from({ length }, (_, i) => (
          <View
            key={i}
            style={{
              width: 46,
              height: 58,
              borderRadius: radius.sm,
              borderWidth: 2,
              borderColor: i === value.length ? colors.iris600 : colors.line,
              backgroundColor: colors.white,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.ink }}>{value[i] ?? ''}</Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={length === 4 ? 'sms-otp' : 'one-time-code'}
        maxLength={length}
        autoFocus
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />
    </Pressable>
  );
}
