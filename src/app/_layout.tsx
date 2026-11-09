import { useEffect } from 'react';
import { Baloo2_700Bold } from '@expo-google-fonts/baloo-2/700Bold';
import { Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2/800ExtraBold';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { Nunito_900Black } from '@expo-google-fonts/nunito/900Black';
import { useFonts } from 'expo-font';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { startSync } from '@/offline/sync';
import { useAuth } from '@/stores/auth';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

// The API client already retries idempotent GETs; React Query must not add more.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false }, mutations: { retry: false } },
});

export default function RootLayout() {
  const status = useAuth((s) => s.status);
  const bootstrap = useAuth((s) => s.bootstrap);
  // The justkidora.com fonts, one family per weight (see theme `fonts`). Only
  // the weights the app uses are bundled. A font that fails to load must not
  // block the app: it falls back to the system font.
  const [fontsLoaded, fontError] = useFonts({
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status !== 'loading' && fontsReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [status, fontsReady]);

  useEffect(() => {
    if (status !== 'signedIn') {
      queryClient.clear(); // one account's data never shows for the next
      return;
    }
    return startSync();
  }, [status]);

  if (status === 'loading' || !fontsReady) return null; // the splash screen stays up

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.iris50 } }}>
            <Stack.Screen name="index" />
            <Stack.Protected guard={status === 'signedIn'}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
            <Stack.Protected guard={status !== 'signedIn'}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
            <Stack.Screen name="auth/callback" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
