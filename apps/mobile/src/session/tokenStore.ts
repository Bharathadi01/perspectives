import type { AuthTokens } from '@perspective/contracts';
import type { TokenStore } from '@perspective/api-client';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'perspective.session.v1';

/**
 * Tokens live in the OS secure store on phones. The web build (development preview) falls back
 * to localStorage, which is not secure storage; the web build is not a release target.
 */
async function read(): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) ?? null;
  return SecureStore.getItemAsync(KEY);
}

async function write(value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (value === null) globalThis.localStorage?.removeItem(KEY);
    else globalThis.localStorage?.setItem(KEY, value);
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(KEY);
  else await SecureStore.setItemAsync(KEY, value);
}

let cache: AuthTokens | null | undefined;

export const tokenStore: TokenStore = {
  async get() {
    if (cache === undefined) {
      const raw = await read();
      cache = raw ? (JSON.parse(raw) as AuthTokens) : null;
    }
    return cache;
  },
  async set(tokens) {
    cache = tokens;
    await write(tokens ? JSON.stringify(tokens) : null);
  },
};
