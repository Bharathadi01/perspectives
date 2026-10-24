import { createAdminClient } from '@perspective/api-client/admin';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const KEY = 'perspective-admin-session';

/**
 * The admin session lives only in this browser tab (sessionStorage), never in the mobile app.
 * Admin sessions are short (8 hours) and cannot be renewed: sign in again when it ends.
 */
export const session = {
  get(): { token: string; email: string } | null {
    try {
      const raw = globalThis.sessionStorage?.getItem(KEY);
      return raw ? (JSON.parse(raw) as { token: string; email: string }) : null;
    } catch {
      return null;
    }
  },
  set(value: { token: string; email: string } | null): void {
    try {
      if (value) globalThis.sessionStorage?.setItem(KEY, JSON.stringify(value));
      else globalThis.sessionStorage?.removeItem(KEY);
    } catch {
      // Storage blocked: the session simply does not survive a reload.
    }
  },
};

export const adminApi = createAdminClient({
  baseUrl: API_URL,
  getToken: () => session.get()?.token ?? null,
  onSessionEnded: () => {
    session.set(null);
    if (typeof window !== 'undefined') window.location.assign('/login');
  },
});
