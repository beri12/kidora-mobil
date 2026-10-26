import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { studentApi, type WorldIsland, type WorldNode } from '@/api/learning';
import { Button, Empty, ErrorState, Loading, ProgressBar, Title } from '@/components/ui';
import { LessonNode } from '@/features/student/LessonNode';
import { colors, font, islandTheme, radius, space } from '@/theme';

const ISLAND_SUBJECT: Record<string, string> = {
  MATH_ISLAND: 'math',
  READING_FOREST: 'reading',
  SCIENCE_PLANET: 'science',
  CODING_CITY: 'coding',
  ART_VALLEY: 'art',
  HISTORY_WORLD: 'history',
};

/** Zig-zag like a trail: 0, +55, 0, -55 … */
const OFFSETS = [0, 55, 0, -55];

function openNode(course: WorldNode, node: WorldNode) {
  if (node.status === 'LOCKED') {
    Alert.alert('Not yet!', 'Finish the stop before this one to unlock it.');
    return;
  }
  if (node.type === 'LESSON' || node.type === 'CHALLENGE') router.push(`/lesson/${course.id}/${node.id}`);
  else router.push(`/course/${course.id}`);
}

function IslandPath({ island }: { island: WorldIsland }) {
  const theme = islandTheme(ISLAND_SUBJECT[island.key]);
  if (!island.nodes.length) {
    return (
      <Empty emoji={theme.emoji} title={`${island.name} is waiting`}>
        Join a {island.name.toLowerCase()} course to start this island.
      </Empty>
    );
  }
  return (
    <View>
      {island.nodes.map((course) => {
        let i = 0;
        return (
          <View key={course.id} style={{ marginBottom: space.xl }}>
            <Pressable onPress={() => router.push(`/course/${course.id}`)} accessibilityRole="button" accessibilityLabel={`Course ${course.title}`}>
              <View style={{ backgroundColor: theme.fg, borderRadius: radius.md, padding: space.md }}>
                <Text style={{ color: colors.white, fontWeight: '800', fontSize: 18 }}>{course.title}</Text>
              </View>
            </Pressable>
            {(course.children ?? []).map((section) => (
              <View key={section.id}>
                {section.type === 'SECTION' && (
                  <Text style={[font.small, { textAlign: 'center', marginTop: space.md }]}>{section.title}</Text>
                )}
                {(section.type === 'SECTION' ? section.children ?? [] : [section]).map((node) => (
                  <LessonNode key={node.id} node={node} color={theme.fg} offset={OFFSETS[i++ % OFFSETS.length]!} onPress={() => openNode(course, node)} />
                ))}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

export default function Islands() {
  const q = useQuery({ queryKey: ['student', 'world'], queryFn: studentApi.world });
  const [selected, setSelected] = useState<string | null>(null);
  const worlds = useMemo(() => q.data?.worlds ?? [], [q.data]);
  const current = worlds.find((w) => w.key === selected) ?? worlds.find((w) => w.nodes.length) ?? worlds[0];

  if (q.isPending) return <Loading label="Loading your islands…" />;
  if (q.error) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.iris50 }} edges={['top']}>
      <View style={{ padding: space.lg, paddingBottom: 0 }}>
        <Title>Learning islands</Title>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: space.md }}>
          {worlds.map((w) => {
            const t = islandTheme(ISLAND_SUBJECT[w.key]);
            const on = w.key === current?.key;
            return (
              <Pressable
                key={w.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setSelected(w.key)}
                style={{ paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill, backgroundColor: on ? t.fg : t.bg, minWidth: 110 }}
              >
                <Text style={{ fontWeight: '800', color: on ? colors.white : t.fg }}>
                  {t.emoji} {w.name}
                </Text>
                <ProgressBar value={w.progress / 100} color={on ? colors.white : t.fg} height={6} />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}>
        {current ? <IslandPath island={current} /> : <Empty title="No islands yet" />}
        <Button title="Find more courses" variant="secondary" onPress={() => router.push('/course/browse')} />
      </ScrollView>
    </SafeAreaView>
  );
}
