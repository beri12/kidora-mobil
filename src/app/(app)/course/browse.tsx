import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { learningApi } from '@/api/learning';
import { Card, Empty, ErrorState, Field, Loading } from '@/components/ui';
import { colors, font, islandTheme, space } from '@/theme';
import { useDebounced } from '@/hooks/useDebounced';

export default function Browse() {
  const [search, setSearch] = useState('');
  const term = useDebounced(search.trim(), 350);
  const q = useQuery({ queryKey: ['browse', term], queryFn: () => learningApi.browse({ search: term || undefined, pageSize: 30 }) });

  return (
    <View style={{ flex: 1, backgroundColor: colors.iris50, padding: space.lg }}>
      <Stack.Screen options={{ headerShown: true, title: 'Find a course' }} />
      <Field label="Search" placeholder="Fractions, reading, space…" value={search} onChangeText={setSearch} returnKeyType="search" />
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState message={q.error.message} onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          data={q.data.items}
          keyExtractor={(c) => c.id}
          ListEmptyComponent={<Empty emoji="🔎" title="No courses found" />}
          renderItem={({ item: c }) => {
            const t = islandTheme(c.subject);
            return (
              <Card onPress={() => router.push(`/course/${c.id}`)} accessibilityLabel={c.title}>
                <Text style={[font.body, { fontWeight: '800' }]}>
                  {t.emoji} {c.title}
                </Text>
                <Text style={font.small}>
                  {c.subject} · {c.totalLessons} lessons{c.enrolled ? ' · Joined' : ''}
                  {c.access === 'PREMIUM' ? ' · Premium' : ''}
                </Text>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}
