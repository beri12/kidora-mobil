import { FlatList, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '@/api/games';
import { Card, Empty, ErrorState, Loading, ProgressBar, Subtitle, Title } from '@/components/ui';
import { colors, font, islandTheme, space } from '@/theme';

export default function Games() {
  const q = useQuery({ queryKey: ['games', 'list'], queryFn: gamesApi.list });
  if (q.isPending) return <Loading label="Loading games…" />;
  if (q.error) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.iris50 }} edges={['top']}>
      <FlatList
        contentContainerStyle={{ padding: space.lg }}
        data={q.data}
        keyExtractor={(g) => g.slug}
        ListHeaderComponent={
          <View style={{ marginBottom: space.md }}>
            <Title>Learning games</Title>
            <Subtitle>Every game is real practice. Answers are checked by Kidora, and XP comes from learning.</Subtitle>
          </View>
        }
        ListEmptyComponent={<Empty emoji="🎮" title="No games yet" />}
        renderItem={({ item: g }) => {
          const t = islandTheme(g.subject);
          return (
            <Card onPress={() => router.push(`/game/${g.slug}`)} accessibilityLabel={`${g.name}. ${g.completedLevels} of ${g.levels} levels done`} style={{ backgroundColor: t.bg, borderColor: t.bg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Text style={{ fontSize: 40 }}>{t.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[font.h2, { color: t.fg }]}>{g.name}</Text>
                  <Text style={font.small}>{g.tagline}</Text>
                  <Text style={[font.small, { marginTop: 4 }]}>
                    Grades {g.minGrade}–{g.maxGrade} · {g.completedLevels}/{g.levels} levels · up to {g.xpAvailable} XP
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: space.sm }}>
                <ProgressBar value={g.progress / 100} color={t.fg} height={10} />
              </View>
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}
