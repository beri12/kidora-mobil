import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { learningApi, type LessonContentItem } from '@/api/learning';
import { Button, Card } from '@/components/ui';
import { colors, font, radius, space } from '@/theme';

/** Content types this renderer knows. Anything else shows a notice instead of crashing. */
export const SUPPORTED_TYPES = new Set([
  'HEADING', 'PARAGRAPH', 'TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'RESOURCE', 'CALLOUT',
  'EXAMPLE', 'QUESTION', 'CODE', 'QUIZ', 'ASSIGNMENT', 'EXTERNAL_RESOURCE', 'INTERACTIVE',
]);

function Body({ text }: { text: string | null }) {
  if (!text) return null;
  return <Text style={[font.body, { lineHeight: 25, fontWeight: '500' }]}>{text}</Text>;
}

/** Reports watched time every 10 s; the server caps it at wall-clock time. */
function VideoBlock({ item, onWatched }: { item: LessonContentItem; onWatched: () => void }) {
  const ready = item.video ? item.video.processingStatus === 'READY' && item.video.url : null;
  const src = (item.video ? ready : item.url) || null;
  const last = useRef(item.progress[0]?.lastPositionSec ?? 0);
  const player = useVideoPlayer(src, (p) => {
    p.timeUpdateEventInterval = 10;
    if (last.current > 0) p.currentTime = last.current;
  });

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    const delta = Math.max(0, Math.round(currentTime - last.current));
    last.current = currentTime;
    if (!delta) return;
    learningApi
      .videoProgress(item.id, { positionSec: Math.round(currentTime), watchedDeltaSec: Math.min(delta, 15), durationSeconds: Math.round(player.duration || 0) || undefined })
      .then((r) => {
        if (r.completed) onWatched();
      })
      .catch(() => undefined); // progress is best effort; the next tick resends position
  });

  if (!src) {
    return (
      <Card>
        <Text style={font.body}>🎬 This video is still being prepared. Check back soon.</Text>
      </Card>
    );
  }
  return (
    <View style={{ borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#000', aspectRatio: 16 / 9, marginBottom: space.md }}>
      <VideoView player={player} style={{ flex: 1 }} nativeControls contentFit="contain" accessibilityLabel={item.title || 'Lesson video'} />
    </View>
  );
}

function AudioBlock({ item }: { item: LessonContentItem }) {
  const player = useAudioPlayer(item.url ?? undefined);
  const status = useAudioPlayerStatus(player);
  if (!item.url) return null;
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause audio' : 'Play audio'}
        onPress={() => (status.playing ? player.pause() : (status.didJustFinish && player.seekTo(0), player.play()))}
        style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.iris600, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 24, color: colors.white }}>{status.playing ? '⏸' : '▶️'}</Text>
      </Pressable>
      <Text style={[font.body, { flex: 1 }]}>{item.title || 'Listen'}</Text>
    </Card>
  );
}

function Downloads({ item }: { item: LessonContentItem }) {
  const files = Array.isArray(item.downloadUrls) ? item.downloadUrls : [];
  const all = item.url ? [{ name: item.title || 'Open', url: item.url }, ...files] : files;
  return (
    <Card>
      {item.title ? <Text style={[font.body, { fontWeight: '800', marginBottom: space.xs }]}>📄 {item.title}</Text> : null}
      <Body text={item.body} />
      {all.map((f) => (
        <Button key={f.url} title={f.name} variant="secondary" onPress={() => WebBrowser.openBrowserAsync(f.url)} style={{ marginTop: space.sm }} />
      ))}
    </Card>
  );
}

export function ContentBlock({ item, courseId, onWatched }: { item: LessonContentItem; courseId: string; onWatched: (id: string) => void }) {
  switch (item.type) {
    case 'HEADING':
      return (
        <Text style={[font.h2, { marginTop: space.lg, marginBottom: space.sm }]} accessibilityRole="header">
          {item.title || item.body}
        </Text>
      );
    case 'PARAGRAPH':
    case 'TEXT':
      return (
        <View style={{ marginBottom: space.md }}>
          {item.title && item.type === 'TEXT' ? <Text style={[font.body, { fontWeight: '800', marginBottom: 4 }]}>{item.title}</Text> : null}
          <Body text={item.body} />
        </View>
      );
    case 'IMAGE':
      return item.url ? (
        <View style={{ marginBottom: space.md }}>
          <Image source={item.url} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.line }} contentFit="contain" accessibilityLabel={item.title || 'Lesson picture'} />
          {item.title ? <Text style={[font.small, { textAlign: 'center', marginTop: 4 }]}>{item.title}</Text> : null}
        </View>
      ) : null;
    case 'VIDEO':
      return <VideoBlock item={item} onWatched={() => onWatched(item.id)} />;
    case 'AUDIO':
      return <AudioBlock item={item} />;
    case 'DOCUMENT':
    case 'RESOURCE':
      return <Downloads item={item} />;
    case 'CALLOUT':
      return (
        <Card style={{ backgroundColor: colors.sun300, borderColor: colors.sun400 }}>
          {item.title ? <Text style={[font.body, { fontWeight: '800' }]}>💡 {item.title}</Text> : null}
          <Body text={item.body} />
        </Card>
      );
    case 'EXAMPLE':
    case 'QUESTION':
      return (
        <Card style={{ backgroundColor: colors.iris100 }}>
          <Text style={[font.small, { color: colors.iris700 }]}>{item.type === 'EXAMPLE' ? 'Worked example' : 'Think about it'}</Text>
          {item.title ? <Text style={[font.body, { fontWeight: '800' }]}>{item.title}</Text> : null}
          <Body text={item.body} />
        </Card>
      );
    case 'CODE':
      return (
        <View style={{ backgroundColor: colors.ink, borderRadius: radius.md, padding: space.md, marginBottom: space.md }}>
          <Text style={{ color: '#E0E7FF', fontFamily: 'monospace', fontSize: 14 }}>{item.body}</Text>
        </View>
      );
    case 'QUIZ':
      return item.quizId ? (
        <Card style={{ borderColor: colors.iris300 }}>
          <Text style={[font.body, { fontWeight: '800' }]}>❓ {item.title || 'Quiz time'}</Text>
          <Button title="Start quiz" onPress={() => router.push({ pathname: '/quiz/[quizId]', params: { quizId: item.quizId!, courseId } })} style={{ marginTop: space.sm }} />
        </Card>
      ) : null;
    case 'EXTERNAL_RESOURCE':
      return item.externalUrl ? (
        <Card>
          <Text style={[font.body, { fontWeight: '800' }]}>🔗 {item.title || 'Open resource'}</Text>
          <Button title="Open" variant="secondary" onPress={() => WebBrowser.openBrowserAsync(item.externalUrl!)} style={{ marginTop: space.sm }} />
        </Card>
      ) : null;
    case 'ASSIGNMENT':
      return (
        <Card>
          <Text style={[font.body, { fontWeight: '800' }]}>📝 {item.title || 'Assignment'}</Text>
          <Text style={font.small}>Assignments are handed in on justkidora.com for now.</Text>
        </Card>
      );
    default:
      // INTERACTIVE and future types: show what we can rather than failing the lesson.
      return (
        <Card style={{ borderStyle: 'dashed' }}>
          {item.title ? <Text style={[font.body, { fontWeight: '800' }]}>{item.title}</Text> : null}
          {item.body ? <Body text={item.body} /> : <Text style={font.small}>This activity opens on justkidora.com.</Text>}
        </Card>
      );
  }
}
