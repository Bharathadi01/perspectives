import { ApiError } from '@perspective/api-client';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '../src/components/ui/Toast';
import { configurePushDisplay, usePushNavigation } from '../src/push/push';
import { tokenStore } from '../src/session/tokenStore';
import { useSession } from '../src/session/sessionStore';
import { theme } from '../src/theme';

/** A suspended or banned person can only see the ban screen (decided 2026-10-20). */
const isRestricted = (err: unknown) => err instanceof ApiError && (err.code === 'ACCOUNT_SUSPENDED' || err.code === 'ACCOUNT_BANNED');
const toBanScreen = (err: unknown) => {
  if (isRestricted(err)) router.replace('/restricted');
};

configurePushDisplay();

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: toBanScreen }),
  mutationCache: new MutationCache({ onError: toBanScreen }),
  defaultOptions: { queries: { retry: (count, err) => !isRestricted(err) && count < 1, staleTime: 30_000 } },
});

/** Tell react-query when the app returns to the foreground, so open queries (like new connections) refresh. */
function useAppFocus() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => focusManager.setFocused(state === 'active'));
    return () => sub.remove();
  }, []);
}

function useBootstrapSession() {
  const setStatus = useSession((s) => s.setStatus);
  useEffect(() => {
    tokenStore
      .get()
      .then((tokens) => setStatus(tokens ? 'signedIn' : 'signedOut'))
      .catch((err: unknown) => {
        console.warn('Could not read the saved session', err);
        setStatus('signedOut');
      });
  }, [setStatus]);
}

export default function RootLayout() {
  useBootstrapSession();
  useAppFocus();
  usePushNavigation();
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          >
            <Stack.Screen name="give/[postId]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="post/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="connected" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
          </Stack>
        </ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
