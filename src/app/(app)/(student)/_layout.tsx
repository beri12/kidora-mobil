import { Tabs } from 'expo-router/js-tabs';
import { TabIcon } from '@/components/TabIcon';
import { colors } from '@/theme';

export default function StudentTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.iris700,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontWeight: '800', fontSize: 12 },
        tabBarStyle: { height: 64, paddingBottom: 8, borderTopColor: colors.iris100 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="islands" options={{ title: 'Islands', tabBarIcon: ({ focused }) => <TabIcon emoji="🏝️" focused={focused} /> }} />
      <Tabs.Screen name="games" options={{ title: 'Games', tabBarIcon: ({ focused }) => <TabIcon emoji="🎮" focused={focused} /> }} />
      <Tabs.Screen name="tutor" options={{ title: 'Kai', tabBarIcon: ({ focused }) => <TabIcon emoji="🦉" focused={focused} /> }} />
      <Tabs.Screen name="me" options={{ title: 'Me', tabBarIcon: ({ focused }) => <TabIcon emoji="⭐" focused={focused} /> }} />
    </Tabs>
  );
}
