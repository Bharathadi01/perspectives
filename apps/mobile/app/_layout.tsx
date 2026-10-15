import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '../src/components/ui/Toast';
import { tokenStore } from '../src/session/tokenStore';
import { useSession } from '../src/session/sessionStore';
import { theme } from '../src/theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

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
          </Stack>
        </ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
