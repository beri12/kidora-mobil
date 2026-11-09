import { Tabs } from 'expo-router/js-tabs';
import { TabIcon } from '@/components/TabIcon';
import { useT } from '@/i18n';
import { colors, fonts } from '@/theme';

export default function TeacherTabs() {
  const t = useT();
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bgVia }, tabBarActiveTintColor: colors.iris700, tabBarLabelStyle: { fontFamily: fonts.extrabold }, tabBarStyle: { height: 64, paddingBottom: 8 } }}>
      <Tabs.Screen name="teach" options={{ title: t('tabs.home'), tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="classes" options={{ title: t('tabs.classes'), tabBarIcon: ({ focused }) => <TabIcon emoji="🧑‍🎓" focused={focused} /> }} />
      <Tabs.Screen name="library" options={{ title: t('tabs.library'), tabBarIcon: ({ focused }) => <TabIcon emoji="📚" focused={focused} /> }} />
    </Tabs>
  );
}
