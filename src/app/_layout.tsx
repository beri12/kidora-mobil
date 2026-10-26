import { useEffect } from 'react';
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

  useEffect(() => {
    bootstrap().finally(() => SplashScreen.hideAsync().catch(() => undefined));
  }, [bootstrap]);

  useEffect(() => {
    if (status !== 'signedIn') {
      queryClient.clear(); // one account's data never shows for the next
      return;
    }
    return startSync();
  }, [status]);

  if (status === 'loading') return null; // the splash screen stays up

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.iris50 } }}>
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
