import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { aiApi, scrubPersonalData, type TutorKind, type TutorMessage } from '@/api/ai';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui';
import { colors, font, radius, space } from '@/theme';
import { nowMs } from '@/utils/time';

const QUICK: { kind: TutorKind; label: string; prompt: string }[] = [
  { kind: 'EXPLAIN', label: 'Explain it simply', prompt: 'Can you explain this in a simple way?' },
  { kind: 'HINT', label: 'Give me a hint', prompt: 'Can I have a hint, not the answer?' },
  { kind: 'PRACTICE', label: 'Practice question', prompt: 'Give me a practice question like this one.' },
];

function Bubble({ m }: { m: TutorMessage }) {
  const mine = m.role === 'user';
  return (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '86%', marginBottom: space.sm }}>
      {!mine && <Text style={[font.small, { color: colors.iris700 }]}>🦉 Kai</Text>}
      <View style={{ backgroundColor: mine ? colors.iris600 : colors.white, borderRadius: radius.md, padding: space.md, borderWidth: mine ? 0 : 2, borderColor: colors.iris100 }}>
        <Text style={{ color: mine ? colors.white : colors.ink, fontSize: 16, lineHeight: 23 }}>{m.content}</Text>
      </View>
    </View>
  );
}

/**
 * Kai through the public API only. The lesson id gives Kai the context of
 * what the learner is reading; the school's daily limit and safety rules are
 * applied on the server. Contact details typed by mistake are scrubbed first.
 */
export function KaiChat({ lessonId, courseId, title, showHistory = false }: { lessonId?: string; courseId?: string; title?: string; showHistory?: boolean }) {
  const history = useQuery({ queryKey: ['kai', 'history'], queryFn: aiApi.history, enabled: showHistory });
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [left, setLeft] = useState<number | null>(null);
  const list = useRef<FlatList<TutorMessage>>(null);

  const all = [...(showHistory ? history.data?.items ?? [] : []), ...messages];

  async function send(raw: string, kind: TutorKind = 'TUTOR') {
    const message = scrubPersonalData(raw.trim());
    if (!message || busy) return;
    setText('');
    setNotice('');
    const mine: TutorMessage = { id: `local-${nowMs()}`, role: 'user', content: message, createdAt: new Date(nowMs()).toISOString() };
    setMessages((m) => [...m, mine]);
    setBusy(true);
    try {
      const res = await aiApi.ask({ message, kind, lessonId, courseId });
      setMessages((m) => [...m, res.reply]);
      setLeft(res.remainingToday);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      setNotice(
        status === 503
          ? 'Kai is resting right now. Try again in a little while, or ask your teacher.'
          : e instanceof Error
            ? e.message
            : 'Kai could not answer just now.',
      );
    } finally {
      setBusy(false);
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <FlatList
        ref={list}
        data={all}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: space.lg }}
        renderItem={({ item }) => <Bubble m={item} />}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
        ListHeaderComponent={
          <View style={{ marginBottom: space.md }}>
            <Text style={{ fontSize: 48, textAlign: 'center' }}>🦉</Text>
            <Text style={[font.h2, { textAlign: 'center' }]}>{title ? `Stuck on "${title}"?` : 'Hi! I’m Kai.'}</Text>
            <Text style={[font.small, { textAlign: 'center' }]}>I give hints first, then explain. Please don’t share your address, phone or passwords.</Text>
          </View>
        }
      />
      {busy && <Text style={[font.small, { paddingHorizontal: space.lg }]}>Kai is thinking…</Text>}
      {notice ? <Text style={{ color: colors.danger, paddingHorizontal: space.lg, fontWeight: '700' }}>{notice}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm }}>
        {QUICK.map((q) => (
          <Pressable
            key={q.kind}
            accessibilityRole="button"
            disabled={busy}
            onPress={() => send(q.prompt, q.kind)}
            style={{ paddingHorizontal: space.md, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.iris100 }}
          >
            <Text style={{ fontWeight: '800', color: colors.iris700 }}>{q.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, padding: space.lg, alignItems: 'flex-end' }}>
        <TextInput
          accessibilityLabel="Your question for Kai"
          value={text}
          onChangeText={setText}
          placeholder="Ask Kai about your lesson…"
          placeholderTextColor="#94A3B8"
          multiline
          maxLength={2000}
          style={{ flex: 1, minHeight: 50, maxHeight: 120, borderWidth: 2, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 16, backgroundColor: colors.white, color: colors.ink }}
        />
        <Button title="Send" busy={busy} disabled={!text.trim()} onPress={() => send(text)} style={{ minHeight: 50 }} />
      </View>
      {left !== null && <Text style={[font.small, { textAlign: 'center', paddingBottom: space.sm }]}>{left} questions left today</Text>}
    </KeyboardAvoidingView>
  );
}
