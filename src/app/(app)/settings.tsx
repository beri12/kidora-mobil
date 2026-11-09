import { Alert, Switch, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { env } from '@/config/env';
import { Button, Card, Screen, SectionTitle } from '@/components/ui';
import { LANGUAGES, useT, type LanguagePref } from '@/i18n';
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

const LANGUAGE_CHOICES = ['system', ...(Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[])] as const satisfies readonly LanguagePref[];

export default function Settings() {
  const t = useT();
  const s = useSettings();
  const user = useAuth((x) => x.user);
  const signOut = useAuth((x) => x.signOut);

  return (
    <Screen>
      <Stack.Screen options={{ title: t('settings.title') }} />
      <SectionTitle>{t('settings.feel')}</SectionTitle>
      <Card>
        <Row label={t('settings.sounds')} hint={t('settings.soundsHint')} value={s.soundOn} onChange={(v) => s.set({ soundOn: v })} />
        <Row label={t('settings.vibration')} hint={t('settings.vibrationHint')} value={s.hapticsOn} onChange={(v) => s.set({ hapticsOn: v })} />
        <Row label={t('settings.calm')} hint={t('settings.calmHint')} value={s.reduceMotion} onChange={(v) => s.set({ reduceMotion: v })} />
      </Card>

      <SectionTitle>{t('settings.language')}</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }} accessibilityRole="radiogroup">
        {LANGUAGE_CHOICES.map((code) => (
          <Button
            key={code}
            // Each language names itself, so a reader can find their own language whatever is selected.
            title={code === 'system' ? t('settings.languageSystem') : LANGUAGES[code].label}
            variant={s.language === code ? 'primary' : 'secondary'}
            accessibilityRole="radio"
            accessibilityState={{ selected: s.language === code }}
            onPress={() => s.set({ language: code })}
            style={{ flexGrow: 1, paddingHorizontal: 8 }}
          />
        ))}
      </View>

      <SectionTitle>{t('settings.dailyGoal')}</SectionTitle>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {[5, 10, 15, 20].map((m) => (
          <Button
            key={m}
            title={t('settings.minutes', { n: m })}
            variant={s.dailyGoalMinutes === m ? 'primary' : 'secondary'}
            onPress={() => s.set({ dailyGoalMinutes: m })}
            style={{ flex: 1, paddingHorizontal: 4 }}
          />
        ))}
      </View>

      <SectionTitle>{t('settings.account')}</SectionTitle>
      <Card>
        <Text style={font.body}>{user?.name}</Text>
        <Text style={font.small}>{user?.email ?? user?.phone ?? ''}</Text>
      </Card>
      <Button title={t('settings.privacy')} variant="ghost" onPress={() => WebBrowser.openBrowserAsync(`${env.webUrl}/privacy`)} />
      <Button title={t('settings.terms')} variant="ghost" onPress={() => WebBrowser.openBrowserAsync(`${env.webUrl}/terms`)} />
      <Button
        title={t('settings.logout')}
        variant="danger"
        style={{ marginTop: space.lg }}
        onPress={() =>
          Alert.alert(t('settings.logoutTitle'), t('settings.logoutBody'), [
            { text: t('settings.cancel'), style: 'cancel' },
            { text: t('settings.logout'), style: 'destructive', onPress: () => void signOut() },
          ])
        }
      />
    </Screen>
  );
}
