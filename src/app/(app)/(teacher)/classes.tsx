import { FlatList, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { teacherApi } from '@/api/roles';
import { Card, Empty, ErrorState, Loading, ProgressBar, Title } from '@/components/ui';
import { colors, font, space } from '@/theme';

export default function Classes() {
  const q = useQuery({ queryKey: ['teacher', 'classes'], queryFn: teacherApi.classes });
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.iris50 }} edges={['top']}>
      <FlatList
        contentContainerStyle={{ padding: space.lg }}
        data={q.data}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={<Title>My classes</Title>}
        ListEmptyComponent={<Empty emoji="🏫" title="No classes yet">Your school admin adds you to classes.</Empty>}
        renderItem={({ item: c }) => (
          <Card onPress={() => router.push(`/class/${c.id}`)} accessibilityLabel={`${c.name}, ${c.studentCount} students`}>
            <Text style={font.h2}>{c.name}</Text>
            <Text style={font.small}>
              {[c.grade, c.subject].filter(Boolean).join(' · ')} · {c.studentCount} students
              {c.atRiskCount ? ` · ⚠️ ${c.atRiskCount} need help` : ''}
            </Text>
            <View style={{ marginTop: space.sm }}>
              <ProgressBar value={c.completionPercent / 100} height={10} label="Class completion" />
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
