import { Alert, Switch, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { env } from '@/config/env';
import { Button, Card, Screen, SectionTitle } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { useSettings } from '@/stores/settings';
import { colors, font, space } from '@/theme';

function Row({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm }}>
      <View style={{ flex: 1 }}>
        <Text style={[font.body, { fontWeight: '800' }]}>{label}</Text>
        <Text style={font.small}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} trackColor={{ true: colors.iris500 }} />
    </View>
  );
}

export default function Settings() {
  const s = useSettings();
  const user = useAuth((x) => x.user);
  const signOut = useAuth((x) => x.signOut);

  return (
    <Screen>
      <SectionTitle>Feel</SectionTitle>
      <Card>
        <Row label="Sounds" hint="Cheers and clicks in games" value={s.soundOn} onChange={(v) => s.set({ soundOn: v })} />
        <Row label="Vibration" hint="A little buzz for right and wrong answers" value={s.hapticsOn} onChange={(v) => s.set({ hapticsOn: v })} />
        <Row label="Calm motion" hint="Fewer animations and no confetti" value={s.reduceMotion} onChange={(v) => s.set({ reduceMotion: v })} />
      </Card>

      <SectionTitle>Daily goal</SectionTitle>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {[5, 10, 15, 20].map((m) => (
          <Button key={m} title={`${m} min`} variant={s.dailyGoalMinutes === m ? 'primary' : 'secondary'} onPress={() => s.set({ dailyGoalMinutes: m })} style={{ flex: 1, paddingHorizontal: 4 }} />
        ))}
      </View>

      <SectionTitle>Account</SectionTitle>
      <Card>
        <Text style={font.body}>{user?.name}</Text>
        <Text style={font.small}>{user?.email ?? user?.phone ?? ''}</Text>
      </Card>
      <Button title="Privacy policy" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(`${env.webUrl}/privacy`)} />
      <Button title="Terms" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(`${env.webUrl}/terms`)} />
      <Button
        title="Log out"
        variant="danger"
        style={{ marginTop: space.lg }}
        onPress={() =>
          Alert.alert('Log out?', 'Lessons saved on this phone for offline use will be removed.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log out', style: 'destructive', onPress: () => void signOut() },
          ])
        }
      />
    </Screen>
  );
}
