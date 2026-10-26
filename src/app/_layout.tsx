import { useCallback, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AnimatedSplash } from '@/components/AnimatedSplash';
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

  const [splashGone, setSplashGone] = useState(false);
  const hideNativeSplash = useCallback(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);
  const finishSplash = useCallback(() => setSplashGone(true), []);

  useEffect(() => {
    // A keystore that can't be read (e.g. after a reinstall) must not leave
    // the app on its splash screen: start signed out instead.
    bootstrap().catch(() => useAuth.setState({ status: 'signedOut', user: null }));
  }, [bootstrap]);

  useEffect(() => {
    if (status !== 'signedIn') {
      queryClient.clear(); // one account's data never shows for the next
      return;
    }
    return startSync();
  }, [status]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          {status !== 'loading' && (
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.iris50 } }}>
              <Stack.Protected guard={status === 'signedIn'}>
                <Stack.Screen name="(app)" />
              </Stack.Protected>
              <Stack.Protected guard={status !== 'signedIn'}>
                <Stack.Screen name="(auth)" />
              </Stack.Protected>
              <Stack.Screen name="auth/callback" />
            </Stack>
          )}
          {!splashGone && <AnimatedSplash ready={status !== 'loading'} onShown={hideNativeSplash} onDone={finishSplash} />}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
