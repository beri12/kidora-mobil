import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { parentApi } from '@/api/roles';
import { Card, Empty, ErrorState, Loading, Title } from '@/components/ui';
import { useSelectedChild } from '@/features/parent-child';
import { colors, font, space } from '@/theme';

export default function Activity() {
  const selected = useSelectedChild((s) => s.childId);
  const children = useQuery({ queryKey: ['parent', 'children'], queryFn: parentApi.children });
  const childId = selected ?? children.data?.[0]?.id ?? null;
  const q = useQuery({ queryKey: ['parent', 'activity', childId], queryFn: () => parentApi.activity(childId!), enabled: !!childId });

  if (children.isPending || (childId && q.isPending)) return <Loading />;
  const error = children.error ?? q.error;
  if (error) return <ErrorState message={error.message} onRetry={() => void q.refetch()} />;
  const child = children.data?.find((c) => c.id === childId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.iris50 }} edges={['top']}>
      <FlatList
        contentContainerStyle={{ padding: space.lg }}
        data={q.data?.items ?? []}
        keyExtractor={(a) => a.id}
        ListHeaderComponent={<Title>{child ? `${child.displayName || child.name}'s activity` : 'Activity'}</Title>}
        ListEmptyComponent={<Empty emoji="📭" title="Nothing yet" />}
        renderItem={({ item: a }) => (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[font.body, { flex: 1, fontWeight: '700' }]}>{a.title}</Text>
              {a.xpDelta > 0 ? <Text style={{ color: colors.sun500, fontWeight: '800' }}>+{a.xpDelta} XP</Text> : null}
            </View>
            <Text style={font.small}>{new Date(a.createdAt).toLocaleString()}</Text>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
