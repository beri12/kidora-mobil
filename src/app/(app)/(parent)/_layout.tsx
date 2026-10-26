import { Tabs } from 'expo-router/js-tabs';
import { TabIcon } from '@/components/TabIcon';
import { colors } from '@/theme';

export default function ParentTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.iris700, tabBarLabelStyle: { fontWeight: '800' }, tabBarStyle: { height: 64, paddingBottom: 8 } }}>
      <Tabs.Screen name="family" options={{ title: 'Family', tabBarIcon: ({ focused }) => <TabIcon emoji="👪" focused={focused} /> }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity', tabBarIcon: ({ focused }) => <TabIcon emoji="📈" focused={focused} /> }} />
    </Tabs>
  );
}
