import { Pressable, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import type { QuizQuestion } from '@/api/quizzes';
import { colors, font, radius, space } from '@/theme';
import { feedback } from '@/utils/feedback';

export type AnswerValue = number | number[] | string | string[] | undefined;

function Option({ label, selected, onPress, marker }: { label: string; selected: boolean; onPress: () => void; marker?: string }) {
  return (
    <Pressable
      accessibilityRole={marker === '☐' || marker === '☑' ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      onPress={() => {
        feedback.tap();
        onPress();
      }}
      style={({ pressed }) => ({
        borderWidth: 2,
        borderBottomWidth: pressed ? 2 : 5,
        marginTop: pressed ? 3 : 0,
        borderColor: selected ? colors.iris500 : colors.line,
        backgroundColor: selected ? colors.iris100 : colors.white,
        borderRadius: radius.md,
        padding: space.md,
        marginBottom: space.sm,
        flexDirection: 'row',
        gap: space.sm,
      })}
    >
      {marker ? <Text style={{ fontSize: 18 }}>{marker}</Text> : null}
      <Text style={[font.body, { flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}

/** Renders one question; `value` is in the shape toAnswer() expects for its type. */
export function QuestionView({ q, value, onChange }: { q: QuizQuestion; value: AnswerValue; onChange: (v: AnswerValue) => void }) {
  const header = (
    <>
      <Text style={[font.h2, { marginBottom: space.md }]}>{q.prompt}</Text>
      {q.imageUrl ? <Image source={q.imageUrl} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, marginBottom: space.md }} contentFit="contain" /> : null}
    </>
  );

  switch (q.type) {
    case 'MULTIPLE_CHOICE':
    case 'TRUE_FALSE': {
      const opts = q.options.length ? q.options : ['True', 'False'];
      return (
        <View>
          {header}
          {opts.map((o, i) => (
            <Option key={i} label={o} selected={value === i} onPress={() => onChange(i)} />
          ))}
        </View>
      );
    }
    case 'MULTIPLE_SELECT': {
      const sel = Array.isArray(value) ? (value as number[]) : [];
      return (
        <View>
          {header}
          <Text style={[font.small, { marginBottom: space.sm }]}>Choose all that are right.</Text>
          {q.options.map((o, i) => {
            const on = sel.includes(i);
            return <Option key={i} label={o} marker={on ? '☑' : '☐'} selected={on} onPress={() => onChange(on ? sel.filter((x) => x !== i) : [...sel, i])} />;
          })}
        </View>
      );
    }
    case 'ORDERING': {
      // Up/down buttons: works with screen readers and big thumbs alike.
      const order = Array.isArray(value) && value.length === q.options.length ? (value as number[]) : q.options.map((_, i) => i);
      const move = (from: number, to: number) => {
        if (to < 0 || to >= order.length) return;
        const next = [...order];
        [next[from], next[to]] = [next[to]!, next[from]!];
        feedback.tap();
        onChange(next);
      };
      return (
        <View>
          {header}
          <Text style={[font.small, { marginBottom: space.sm }]}>Put these in the right order.</Text>
          {order.map((optIndex, pos) => (
            <View key={optIndex} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 2, borderColor: colors.line, padding: space.sm, marginBottom: space.sm }}>
              <Text style={{ width: 28, fontWeight: '800', color: colors.iris700 }}>{pos + 1}.</Text>
              <Text style={[font.body, { flex: 1 }]}>{q.options[optIndex]}</Text>
              <Pressable accessibilityLabel={`Move ${q.options[optIndex]} up`} onPress={() => move(pos, pos - 1)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 20 }}>⬆️</Text>
              </Pressable>
              <Pressable accessibilityLabel={`Move ${q.options[optIndex]} down`} onPress={() => move(pos, pos + 1)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 20 }}>⬇️</Text>
              </Pressable>
            </View>
          ))}
        </View>
      );
    }
    case 'MATCHING': {
      const lefts = q.matchLefts ?? [];
      const rights = q.matchRights ?? [];
      const picks = Array.isArray(value) ? (value as string[]) : lefts.map(() => '');
      return (
        <View>
          {header}
          {lefts.map((l, i) => (
            <View key={l} style={{ marginBottom: space.md }}>
              <Text style={[font.body, { fontWeight: '800' }]}>{l} →</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: 4 }}>
                {rights.map((r) => {
                  const on = picks[i] === r;
                  return (
                    <Pressable
                      key={r}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${l} matches ${r}`}
                      onPress={() => {
                        feedback.tap();
                        const next = [...picks];
                        next[i] = r;
                        onChange(next);
                      }}
                      style={{ paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill, borderWidth: 2, borderColor: on ? colors.iris500 : colors.line, backgroundColor: on ? colors.iris100 : colors.white }}
                    >
                      <Text style={{ fontWeight: '700', color: colors.ink }}>{r}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      );
    }
    default:
      return (
        <View>
          {header}
          <TextInput
            accessibilityLabel="Your answer"
            value={typeof value === 'string' ? value : ''}
            onChangeText={onChange}
            placeholder="Type your answer"
            maxLength={2000}
            multiline
            style={{ minHeight: 90, borderWidth: 2, borderColor: colors.line, borderRadius: radius.md, padding: space.md, fontSize: 17, backgroundColor: colors.white, color: colors.ink }}
          />
        </View>
      );
  }
}

/** Has the learner given something answer-shaped for this question? */
export function isAnswered(q: QuizQuestion, v: AnswerValue): boolean {
  if (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') return typeof v === 'number';
  if (q.type === 'MULTIPLE_SELECT') return Array.isArray(v) && v.length > 0;
  if (q.type === 'ORDERING') return true; // the starting order is itself an answer
  if (q.type === 'MATCHING') return Array.isArray(v) && (v as string[]).every((x) => !!x) && v.length === (q.matchLefts?.length ?? 0);
  return typeof v === 'string' && v.trim().length > 0;
}
