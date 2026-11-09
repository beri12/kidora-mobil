import { Tabs } from 'expo-router/js-tabs';
import { TabIcon } from '@/components/TabIcon';
import { useT } from '@/i18n';
import { colors, fonts } from '@/theme';

export default function ParentTabs() {
  const t = useT();
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bgVia }, tabBarActiveTintColor: colors.iris700, tabBarLabelStyle: { fontFamily: fonts.extrabold }, tabBarStyle: { height: 64, paddingBottom: 8 } }}>
      <Tabs.Screen name="family" options={{ title: t('tabs.family'), tabBarIcon: ({ focused }) => <TabIcon emoji="👪" focused={focused} /> }} />
      <Tabs.Screen name="activity" options={{ title: t('tabs.activity'), tabBarIcon: ({ focused }) => <TabIcon emoji="📈" focused={focused} /> }} />
    </Tabs>
  );
}
