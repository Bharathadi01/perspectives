import { z } from 'zod';
import {
  AdminActionInput,
  AdminCaseSchema,
  AdminLoginInput,
  AdminQueueItemSchema,
  AdminSessionSchema,
  ApiErrorEnvelopeSchema,
  AppealDecisionInput,
} from '@perspective/contracts';
import { ApiError } from './client';

export interface AdminClientOptions {
  baseUrl: string;
  /** The admin token from sign-in (kept only for the browser session). */
  getToken: () => string | null;
  /** Called when the admin session has ended (sessions are short and cannot be renewed). */
  onSessionEnded?: () => void;
  fetch?: typeof fetch;
}

/**
 * Client for the admin dashboard (`/v1/admin`, docs/SECURITY.md → Admin access). Separate from the
 * user client: its own token, no refresh, never bundled in the mobile app.
 */
export function createAdminClient(options: AdminClientOptions) {
  const doFetch = options.fetch ?? fetch;
  const base = options.baseUrl.replace(/\/$/, '');

  async function call<S extends z.ZodTypeAny>(method: 'GET' | 'POST', path: string, schema: S, body?: unknown, auth = true): Promise<z.output<S>> {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    const token = auth ? options.getToken() : null;
    if (token) headers.authorization = `Bearer ${token}`;
    let res: Response;
    try {
      res = await doFetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new ApiError('NETWORK_ERROR', 'Could not reach the server.', 0);
    }
    if (!res.ok) {
      const parsed = ApiErrorEnvelopeSchema.safeParse(await res.json().catch(() => null));
      if (res.status === 401 && auth) options.onSessionEnded?.();
      if (parsed.success) throw new ApiError(parsed.data.error.code, parsed.data.error.message, res.status, parsed.data.error.details);
      throw new ApiError('INTERNAL_ERROR', 'Something went wrong.', res.status);
    }
    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) throw new ApiError('INTERNAL_ERROR', 'Unexpected response from the server.', res.status, parsed.error.issues);
    return parsed.data;
  }

  return {
    /** Absolute URL for a signed media path in a case. */
    mediaUrl: (path: string) => (path.startsWith('/') ? `${base}${path}` : path),
    logIn: (input: AdminLoginInput) => call('POST', '/v1/admin/session', AdminSessionSchema, input, false),
    queue: () => call('GET', '/v1/admin/queue', z.array(AdminQueueItemSchema)),
    person: (userId: string) => call('GET', `/v1/admin/people/${userId}`, AdminCaseSchema),
    act: (userId: string, input: AdminActionInput) => call('POST', `/v1/admin/people/${userId}/actions`, AdminCaseSchema, input),
    decideAppeal: (appealId: string, input: AppealDecisionInput) =>
      call('POST', `/v1/admin/appeals/${appealId}/decision`, AdminCaseSchema, input),
  };
}

export type AdminApi = ReturnType<typeof createAdminClient>;
