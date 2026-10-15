import { createApiClient } from '@perspective/api-client';
import * as Crypto from 'expo-crypto';
import { tokenStore } from '../session/tokenStore';
import { useSession } from '../session/sessionStore';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/** The only way the app talks to the server. Components never call fetch or storage directly. */
export const api = createApiClient({
  baseUrl: API_URL,
  tokens: tokenStore,
  newIdempotencyKey: () => Crypto.randomUUID(),
  onSessionExpired: () => useSession.getState().setStatus('signedOut'),
});

export const newKey = (): string => Crypto.randomUUID();
