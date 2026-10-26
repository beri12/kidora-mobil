import { Stack } from 'expo-router';
import { useAuth } from '@/stores/auth';
import { colors } from '@/theme';

export const unstable_settings = { initialRouteName: 'index' };

export default function AppLayout() {
  const needsRole = useAuth((s) => s.needsRole);
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.iris50 } }}>
      <Stack.Protected guard={needsRole}>
        <Stack.Screen name="role" />
      </Stack.Protected>
      <Stack.Protected guard={!needsRole}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(parent)" />
        <Stack.Screen name="(teacher)" />
        <Stack.Screen name="(school)" />
        <Stack.Screen name="course/[courseId]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="lesson/[courseId]/[lessonId]" />
        <Stack.Screen name="quiz/[quizId]" />
        <Stack.Screen name="game/[slug]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="play/[slug]/[level]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="kai" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings' }} />
      </Stack.Protected>
    </Stack>
  );
}
