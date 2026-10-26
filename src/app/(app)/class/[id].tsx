import { FlatList, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { teacherApi, type TeacherStudent } from '@/api/roles';
import { Card, ErrorState, Loading, ProgressBar } from '@/components/ui';
import { colors, font, space } from '@/theme';

const HEALTH: Record<TeacherStudent['health'], { label: string; color: string }> = {
  ON_TRACK: { label: 'On track', color: colors.grass600 },
  NEEDS_SUPPORT: { label: 'Needs support', color: colors.sun500 },
  AT_RISK: { label: 'At risk', color: colors.coral500 },
};

export default function ClassDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['teacher', 'class', id], queryFn: () => teacherApi.classDetail(id) });
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;
  const c = q.data;
  return (
    <View style={{ flex: 1, backgroundColor: colors.iris50 }}>
      <Stack.Screen options={{ headerShown: true, title: c.name }} />
      <FlatList
        contentContainerStyle={{ padding: space.lg }}
        data={c.students}
        keyExtractor={(s) => s.id}
        ListHeaderComponent={
          <Text style={[font.small, { marginBottom: space.md }]}>
            {c.studentCount} students · average score {Math.round(c.averageScore)}% · {Math.round(c.completionPercent)}% complete
          </Text>
        }
        renderItem={({ item: s }) => (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[font.body, { fontWeight: '800', flex: 1 }]}>{s.name}</Text>
              <Text style={{ color: HEALTH[s.health].color, fontWeight: '800' }}>{HEALTH[s.health].label}</Text>
            </View>
            <Text style={font.small}>Average {Math.round(s.averageScore)}%</Text>
            <ProgressBar value={s.progressPercent / 100} height={10} label={`${s.name} progress`} />
          </Card>
        )}
      />
    </View>
  );
}
