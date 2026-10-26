import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { teacherApi } from '@/api/roles';
import { Button, Card, Empty, ErrorState, Field, Loading, Title } from '@/components/ui';
import { useDebounced } from '@/hooks/useDebounced';
import { colors, font, space } from '@/theme';

const KIND_EMOJI: Record<string, string> = { video: '🎬', document: '📄', image: '🖼️', audio: '🎧', other: '📦' };

export default function Library() {
  const [search, setSearch] = useState('');
  const term = useDebounced(search.trim(), 350);
  const q = useQuery({ queryKey: ['teacher', 'resources', term], queryFn: () => teacherApi.resources({ search: term || undefined }) });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.iris50 }} edges={['top']}>
      <FlatList
        contentContainerStyle={{ padding: space.lg }}
        data={q.data?.items ?? []}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={
          <View>
            <Title>Content library</Title>
            <Button title="⬆️ Upload content" onPress={() => router.push('/upload')} style={{ marginVertical: space.md }} />
            <Field label="Search your files" value={search} onChangeText={setSearch} />
            {q.isPending && <Loading />}
            {q.error && <ErrorState message={q.error.message} onRetry={() => q.refetch()} />}
          </View>
        }
        ListEmptyComponent={q.isPending || q.error ? undefined : <Empty emoji="📚" title="Your library is empty">Upload a worksheet, picture, audio clip or lesson video.</Empty>}
        renderItem={({ item: r }) => (
          <Card onPress={() => WebBrowser.openBrowserAsync(r.url)} accessibilityLabel={`Open ${r.name}`}>
            <Text style={[font.body, { fontWeight: '800' }]}>
              {KIND_EMOJI[r.kind] ?? '📦'} {r.name}
            </Text>
            <Text style={font.small}>
              {r.lesson ? `In lesson: ${r.lesson.title}` : 'Not attached to a lesson (students can’t see it)'}
              {r.sizeBytes ? ` · ${(r.sizeBytes / 1024 / 1024).toFixed(1)} MB` : ''}
            </Text>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
