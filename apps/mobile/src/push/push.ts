import { PushDataSchema } from '@perspective/contracts';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { api } from '../api/client';

/**
 * Push notifications (beta step 5). They only work in an Expo development build on a real device
 * with an Expo project id (`eas init`); in Expo Go, the simulator and the web preview this quietly
 * does nothing.
 */

let registeredToken: string | null = null;

/** Show pushes as a banner even while the app is open. */
export function configurePushDisplay(): void {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

async function devicePushToken(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn('Push notifications are off: no Expo project id. Run `eas init` in apps/mobile.');
    return null;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Perspective', importance: Notifications.AndroidImportance.DEFAULT });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return null;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

/** Asks for permission once the person is signed in, and tells the server about this device. */
export function usePushRegistration(enabled: boolean): void {
  const tried = useRef(false);
  useEffect(() => {
    if (!enabled || tried.current) return;
    tried.current = true;
    devicePushToken()
      .then(async (token) => {
        if (!token || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;
        await api.push.register({ token, platform: Platform.OS });
        registeredToken = token;
      })
      .catch((err: unknown) => console.warn('Could not register for push notifications', err));
  }, [enabled]);
}

/** On sign-out, this device stops getting pushes for the account. */
export async function unregisterPush(): Promise<void> {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  try {
    await api.push.remove(token);
  } catch (err) {
    console.warn('Could not remove the push token', err);
  }
}

/** Tapping a push opens the screen it is about. */
export function usePushNavigation(): void {
  const last = Platform.OS === 'web' ? null : Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!last || handled.current === last.notification.request.identifier) return;
    handled.current = last.notification.request.identifier;
    const parsed = PushDataSchema.safeParse(last.notification.request.content.data);
    if (!parsed.success) return;
    const d = parsed.data;
    switch (d.screen) {
      case 'explore':
        router.push('/(tabs)/explore');
        break;
      case 'inbox':
        router.push('/(tabs)/inbox');
        break;
      case 'chat':
        if (d.connectionId) router.push({ pathname: '/chat/[id]', params: { id: d.connectionId } });
        else router.push('/(tabs)/connections');
        break;
      case 'notices':
        router.push('/me/notices');
        break;
      case 'account':
        router.push('/restricted');
        break;
    }
  }, [last]);
}
