import { Tabs } from 'expo-router/js-tabs';
import { TabIcon } from '@/components/TabIcon';
import { useT } from '@/i18n';
import { colors } from '@/theme';

export default function StudentTabs() {
  const t = useT();
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
      <Tabs.Screen name="home" options={{ title: t('tabs.home'), tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="islands" options={{ title: t('tabs.islands'), tabBarIcon: ({ focused }) => <TabIcon emoji="🏝️" focused={focused} /> }} />
      <Tabs.Screen name="games" options={{ title: t('tabs.games'), tabBarIcon: ({ focused }) => <TabIcon emoji="🎮" focused={focused} /> }} />
      <Tabs.Screen name="tutor" options={{ title: t('tabs.kai'), tabBarIcon: ({ focused }) => <TabIcon emoji="🦉" focused={focused} /> }} />
      <Tabs.Screen name="me" options={{ title: t('tabs.me'), tabBarIcon: ({ focused }) => <TabIcon emoji="⭐" focused={focused} /> }} />
    </Tabs>
  );
}
