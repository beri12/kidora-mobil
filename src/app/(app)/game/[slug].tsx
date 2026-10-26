import { Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '@/api/games';
import { Card, ErrorState, Loading, Screen, Subtitle, Title } from '@/components/ui';
import { colors, font, islandTheme, space } from '@/theme';

export default function GameLevels() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const q = useQuery({ queryKey: ['games', 'detail', slug], queryFn: () => gamesApi.detail(slug) });
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;
  const g = q.data;
  const t = islandTheme(g.subject);

  return (
    <Screen>
      <Stack.Screen options={{ title: g.name }} />
      <Text style={{ fontSize: 48 }}>{t.emoji}</Text>
      <Title>{g.name}</Title>
      <Subtitle>{g.description || g.tagline}</Subtitle>
      <View style={{ marginTop: space.lg }}>
        {g.levels.map((l) => (
          <Card
            key={l.order}
            onPress={l.unlocked ? () => router.push(`/play/${g.slug}/${l.order}`) : undefined}
            accessibilityLabel={`Level ${l.order}, ${l.name}. ${l.unlocked ? (l.completed ? `${l.stars} stars` : 'Ready') : 'Locked'}`}
            style={{ opacity: l.unlocked ? 1 : 0.55, borderColor: l.completed ? colors.sun400 : colors.iris100 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: l.unlocked ? t.fg : colors.line, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.white, fontSize: 22, fontWeight: '900' }}>{l.unlocked ? l.order : '🔒'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[font.body, { fontWeight: '800' }]}>{l.name}</Text>
                <Text style={font.small}>{l.learningObjective}</Text>
                <Text style={font.small}>
                  {l.challenges} challenges · {l.xp} XP
                </Text>
              </View>
              <Text style={{ fontSize: 16 }}>{l.completed ? '⭐'.repeat(l.stars) || '✓' : ''}</Text>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
