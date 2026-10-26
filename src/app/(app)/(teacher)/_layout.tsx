import { Tabs } from 'expo-router/js-tabs';
import { TabIcon } from '@/components/TabIcon';
import { colors } from '@/theme';

export default function TeacherTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.iris700, tabBarLabelStyle: { fontWeight: '800' }, tabBarStyle: { height: 64, paddingBottom: 8 } }}>
      <Tabs.Screen name="teach" options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="classes" options={{ title: 'Classes', tabBarIcon: ({ focused }) => <TabIcon emoji="🧑‍🎓" focused={focused} /> }} />
      <Tabs.Screen name="library" options={{ title: 'Library', tabBarIcon: ({ focused }) => <TabIcon emoji="📚" focused={focused} /> }} />
    </Tabs>
  );
}
