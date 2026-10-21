import { z } from 'zod';

/**
 * Push notifications (beta step 5, 2026-10-21). Texts are placeholders for now (product owner): they
 * never contain message or perspective text, only names and short prompts.
 */

export const PushPlatform = z.enum(['ios', 'android']);
export type PushPlatform = z.infer<typeof PushPlatform>;

/** An Expo push token, for example `ExponentPushToken[xxxxxxxx]`. */
export const ExpoPushTokenSchema = z
  .string()
  .trim()
  .max(200)
  .regex(/^Expo(nent)?PushToken\[[^\]]+\]$/, 'Not an Expo push token');

export const RegisterPushTokenInputSchema = z.object({ token: ExpoPushTokenSchema, platform: PushPlatform });
export type RegisterPushTokenInput = z.infer<typeof RegisterPushTokenInputSchema>;

export const RemovePushTokenInputSchema = z.object({ token: ExpoPushTokenSchema });
export type RemovePushTokenInput = z.infer<typeof RemovePushTokenInputSchema>;

/** Where tapping a push takes the person. */
export const PushScreen = z.enum(['explore', 'inbox', 'chat', 'notices', 'account']);
export type PushScreen = z.infer<typeof PushScreen>;

export const PushDataSchema = z.object({ screen: PushScreen, connectionId: z.string().optional() });
export type PushData = z.infer<typeof PushDataSchema>;
