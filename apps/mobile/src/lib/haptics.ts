import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Touch feedback. Web has no haptics, and a refusal here must never interrupt
 * what the person was doing, so every call is guarded and swallowed.
 */
function run(fire: () => Promise<void>): void {
  if (Platform.OS === 'web') return;
  fire().catch((err: unknown) => console.warn('Haptic failed', err));
}

/** A card lifts, a sheet opens. */
export function tap(): void {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** A card lands in a new slot. */
export function thud(): void {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** A segment or option changes. */
export function selection(): void {
  run(() => Haptics.selectionAsync());
}

export function success(): void {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** A rule refused the action (for example the first card must be a photo). */
export function warn(): void {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
