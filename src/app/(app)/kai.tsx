import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui';
import { KaiChat } from '@/features/ai-tutor/KaiChat';
import { colors, space } from '@/theme';

/** Opened over a lesson; closing returns to the exact spot, since the lesson stays mounted underneath. */
export default function KaiSheet() {
  const { lessonId, courseId, title } = useLocalSearchParams<{ lessonId?: string; courseId?: string; title?: string }>();
  return (
    <View style={{ flex: 1, backgroundColor: colors.iris50 }}>
      <View style={{ alignItems: 'flex-end', padding: space.sm }}>
        <Button title="Back to lesson" variant="ghost" onPress={() => router.back()} style={{ minHeight: 40 }} />
      </View>
      <KaiChat lessonId={lessonId} courseId={courseId} title={title} />
    </View>
  );
}
