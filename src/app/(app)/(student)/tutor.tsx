import { SafeAreaView } from 'react-native-safe-area-context';
import { KaiChat } from '@/features/ai-tutor/KaiChat';
import { colors } from '@/theme';

export default function TutorTab() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.iris50 }} edges={['top']}>
      <KaiChat showHistory />
    </SafeAreaView>
  );
}
