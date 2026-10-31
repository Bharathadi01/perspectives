import { Fraunces_500Medium_Italic } from '@expo-google-fonts/fraunces/500Medium_Italic';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { ApiError } from '@perspective/api-client';
import { useFonts } from 'expo-font';
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

/** The editorial look's fonts (theme.editorial.fonts), bundled with the app: only the weights in use. */
const FONTS = {
  Fraunces_600SemiBold,
  Fraunces_500Medium_Italic,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
};

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
  const [fontsLoaded, fontError] = useFonts(FONTS);
  if (fontError) console.warn('Could not load the app fonts; using the system font', fontError);
  // Wait for the bundled fonts (fast, no network); if they fail, carry on with the system font.
  if (!fontsLoaded && !fontError) return null;
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
            <Stack.Screen name="(auth)/splash" options={{ animation: 'fade' }} />
            <Stack.Screen name="(auth)/welcome" options={{ animation: 'fade' }} />
            <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="post/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="filters" options={{ presentation: 'modal' }} />
            <Stack.Screen name="connected" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
          </Stack>
        </ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
