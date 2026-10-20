import { z } from 'zod';
import {
  ApiErrorEnvelopeSchema,
  AppealInput,
  AuthTokens,
  AuthTokensSchema,
  ConnectionSchema,
  ConnectRequestResultSchema,
  CreatePostInput,
  CreateReportInput,
  DeleteAccountInput,
  ErrorCode,
  ExploreResponseSchema,
  GivenPerspectiveSchema,
  GivePerspectiveInput,
  GivePerspectiveResultSchema,
  IDEMPOTENCY_HEADER,
  InboxSchema,
  LogInInput,
  MediaUploadResultSchema,
  MessageSchema,
  MyProfileSchema,
  NoticesSchema,
  PerspectiveFeedbackInput,
  PerspectiveFeedbackSchema,
  PostSchema,
  ProfileViewSchema,
  RestrictionSchema,
  SignUpInput,
  UpdatePostInput,
  UpdateProfileInput,
  UploadMediaInput,
} from '@perspective/contracts';

/** A typed failure. Branch on `code`, never on `message`. */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode | 'NETWORK_ERROR',
    message: string,
    readonly status: number,
    readonly details?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface TokenStore {
  get(): Promise<AuthTokens | null>;
  set(tokens: AuthTokens | null): Promise<void>;
}

export interface ApiClientOptions {
  baseUrl: string;
  tokens: TokenStore;
  /** UUID generator for idempotency keys (pass a stable key per user action to make retries safe). */
  newIdempotencyKey: () => string;
  /** Called once a session cannot be refreshed. */
  onSessionExpired?: () => void;
  fetch?: typeof fetch;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface Call<S extends z.ZodTypeAny | null> {
  method: Method;
  path: string;
  body?: unknown;
  schema: S;
  auth?: boolean;
  idempotencyKey?: string;
}

const NoContent = null;

export function createApiClient(options: ApiClientOptions) {
  const doFetch = options.fetch ?? fetch;
  const base = options.baseUrl.replace(/\/$/, '');
  let refreshing: Promise<AuthTokens | null> | null = null;

  async function parseError(res: Response): Promise<ApiError> {
    const json: unknown = await res.json().catch(() => null);
    const parsed = ApiErrorEnvelopeSchema.safeParse(json);
    if (parsed.success) {
      const e = parsed.data.error;
      return new ApiError(e.code, e.message, res.status, e.details, e.requestId);
    }
    return new ApiError('INTERNAL_ERROR', 'Something went wrong. Please try again.', res.status);
  }

  async function refreshTokens(): Promise<AuthTokens | null> {
    const current = await options.tokens.get();
    if (!current) return null;
    const res = await doFetch(`${base}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    if (!res.ok) {
      await options.tokens.set(null);
      options.onSessionExpired?.();
      return null;
    }
    const tokens = AuthTokensSchema.parse(await res.json());
    await options.tokens.set(tokens);
    return tokens;
  }

  /** One refresh at a time, shared by concurrent requests. */
  function refreshOnce(): Promise<AuthTokens | null> {
    refreshing ??= refreshTokens().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function call<S extends z.ZodTypeAny | null>(c: Call<S>): Promise<S extends z.ZodTypeAny ? z.output<S> : void> {
    const send = async (accessToken: string | null): Promise<Response> => {
      const headers: Record<string, string> = { accept: 'application/json' };
      if (c.body !== undefined) headers['content-type'] = 'application/json';
      if (accessToken) headers.authorization = `Bearer ${accessToken}`;
      if (c.method !== 'GET' && c.auth !== false) {
        headers[IDEMPOTENCY_HEADER] = c.idempotencyKey ?? options.newIdempotencyKey();
      }
      try {
        return await doFetch(`${base}${c.path}`, {
          method: c.method,
          headers,
          body: c.body === undefined ? undefined : JSON.stringify(c.body),
        });
      } catch {
        throw new ApiError('NETWORK_ERROR', 'Could not reach Perspective. Check your connection.', 0);
      }
    };

    const tokens = c.auth === false ? null : await options.tokens.get();
    let res = await send(tokens?.accessToken ?? null);
    if (res.status === 401 && c.auth !== false && tokens) {
      const fresh = await refreshOnce();
      if (fresh) res = await send(fresh.accessToken);
    }
    if (!res.ok) throw await parseError(res);
    if (c.schema === null || res.status === 204) {
      return undefined as S extends z.ZodTypeAny ? z.output<S> : void;
    }
    const parsed = c.schema.safeParse(await res.json());
    if (!parsed.success) {
      // The server and the contracts disagree; surface it instead of rendering bad data.
      throw new ApiError('INTERNAL_ERROR', 'Unexpected response from Perspective.', res.status, parsed.error.issues);
    }
    return parsed.data;
  }

  async function storeTokens(tokens: AuthTokens): Promise<AuthTokens> {
    await options.tokens.set(tokens);
    return tokens;
  }

  return {
    /** Absolute URL for a signed media path returned by the API. */
    mediaUrl(path: string): string {
      return path.startsWith('/') ? `${base}${path}` : path;
    },

    auth: {
      signUp: async (input: SignUpInput) =>
        storeTokens(await call({ method: 'POST', path: '/v1/auth/signup', body: input, schema: AuthTokensSchema, auth: false })),
      logIn: async (input: LogInInput) =>
        storeTokens(await call({ method: 'POST', path: '/v1/auth/login', body: input, schema: AuthTokensSchema, auth: false })),
      logOut: async () => {
        const tokens = await options.tokens.get();
        await options.tokens.set(null);
        if (tokens) {
          await call({ method: 'POST', path: '/v1/auth/logout', body: { refreshToken: tokens.refreshToken }, schema: NoContent, auth: false });
        }
      },
    },

    me: {
      get: () => call({ method: 'GET', path: '/v1/me', schema: MyProfileSchema }),
      update: (input: UpdateProfileInput, idempotencyKey?: string) =>
        call({ method: 'PATCH', path: '/v1/me', body: input, schema: MyProfileSchema, idempotencyKey }),
      verifySelfie: (mediaId: string, idempotencyKey?: string) =>
        call({ method: 'POST', path: '/v1/me/selfie-verification', body: { mediaId }, schema: MyProfileSchema, idempotencyKey }),
    },

    media: {
      upload: (input: UploadMediaInput, idempotencyKey?: string) =>
        call({ method: 'POST', path: '/v1/media', body: input, schema: MediaUploadResultSchema, idempotencyKey }),
    },

    posts: {
      create: (input: CreatePostInput, idempotencyKey?: string) =>
        call({ method: 'POST', path: '/v1/me/posts', body: input, schema: PostSchema, idempotencyKey }),
      update: (postId: string, input: UpdatePostInput, idempotencyKey?: string) =>
        call({ method: 'PATCH', path: `/v1/me/posts/${postId}`, body: input, schema: PostSchema, idempotencyKey }),
      reorder: (postIds: string[], idempotencyKey?: string) =>
        call({ method: 'PATCH', path: '/v1/me/posts/reorder', body: { postIds }, schema: z.array(PostSchema), idempotencyKey }),
      remove: (postId: string, idempotencyKey?: string) =>
        call({ method: 'DELETE', path: `/v1/me/posts/${postId}`, schema: NoContent, idempotencyKey }),
    },

    explore: {
      next: () => call({ method: 'GET', path: '/v1/explore', schema: ExploreResponseSchema }),
      skip: (profileId: string, idempotencyKey?: string) =>
        call({ method: 'POST', path: '/v1/explore/skip', body: { profileId }, schema: ExploreResponseSchema, idempotencyKey }),
    },

    profiles: {
      view: (profileId: string) => call({ method: 'GET', path: `/v1/profiles/${profileId}`, schema: ProfileViewSchema }),
    },

    perspectives: {
      give: (input: GivePerspectiveInput, idempotencyKey?: string) =>
        call({ method: 'POST', path: '/v1/perspectives', body: input, schema: GivePerspectiveResultSchema, idempotencyKey }),
      given: () => call({ method: 'GET', path: '/v1/perspectives/given', schema: z.array(GivenPerspectiveSchema) }),
      feedback: (perspectiveId: string, input: PerspectiveFeedbackInput, idempotencyKey?: string) =>
        call({
          method: 'POST',
          path: `/v1/perspectives/${perspectiveId}/feedback`,
          body: input,
          schema: PerspectiveFeedbackSchema,
          idempotencyKey,
        }),
      inbox: () => call({ method: 'GET', path: '/v1/inbox', schema: InboxSchema }),
    },

    connect: {
      request: (receiverId: string, idempotencyKey?: string) =>
        call({ method: 'POST', path: '/v1/connect-requests', body: { receiverId }, schema: ConnectRequestResultSchema, idempotencyKey }),
      accept: (requestId: string, idempotencyKey?: string) =>
        call({ method: 'POST', path: `/v1/connect-requests/${requestId}/accept`, schema: ConnectionSchema, idempotencyKey }),
      decline: (requestId: string, idempotencyKey?: string) =>
        call({ method: 'POST', path: `/v1/connect-requests/${requestId}/decline`, schema: ConnectRequestResultSchema, idempotencyKey }),
      connections: () => call({ method: 'GET', path: '/v1/connections', schema: z.array(ConnectionSchema) }),
      messages: (connectionId: string) =>
        call({ method: 'GET', path: `/v1/connections/${connectionId}/messages`, schema: z.array(MessageSchema) }),
      send: (connectionId: string, text: string, idempotencyKey?: string) =>
        call({ method: 'POST', path: `/v1/connections/${connectionId}/messages`, body: { text }, schema: MessageSchema, idempotencyKey }),
      unmatch: (connectionId: string, idempotencyKey?: string) =>
        call({ method: 'DELETE', path: `/v1/connections/${connectionId}`, schema: NoContent, idempotencyKey }),
      // ---- connected moment ----
      unseen: () => call({ method: 'GET', path: '/v1/connections/unseen', schema: z.array(ConnectionSchema) }),
      markSeen: (connectionIds: string[], idempotencyKey?: string) =>
        call({ method: 'POST', path: '/v1/connections/seen', body: { connectionIds }, schema: NoContent, idempotencyKey }),
    },

    /** For a suspended or banned person: the ban screen and their one appeal per ban. */
    account: {
      restriction: () => call({ method: 'GET', path: '/v1/account/restriction', schema: RestrictionSchema }),
      appeal: (input: AppealInput, idempotencyKey?: string) =>
        call({ method: 'POST', path: '/v1/account/appeal', body: input, schema: RestrictionSchema, idempotencyKey }),
    },

    notices: {
      list: () => call({ method: 'GET', path: '/v1/notices', schema: NoticesSchema }),
      markAllRead: (idempotencyKey?: string) =>
        call({ method: 'POST', path: '/v1/notices/read', schema: NoContent, idempotencyKey }),
    },

    safety: {
      report: (input: CreateReportInput, idempotencyKey?: string) =>
        call({ method: 'POST', path: '/v1/reports', body: input, schema: z.object({ reportId: z.string() }), idempotencyKey }),
      block: (userId: string, idempotencyKey?: string) =>
        call({ method: 'POST', path: `/v1/blocks/${userId}`, schema: NoContent, idempotencyKey }),
      unblock: (userId: string, idempotencyKey?: string) =>
        call({ method: 'DELETE', path: `/v1/blocks/${userId}`, schema: NoContent, idempotencyKey }),
      deleteAccount: async (input: DeleteAccountInput) => {
        await call({ method: 'POST', path: '/v1/account/deletion', body: input, schema: NoContent });
        await options.tokens.set(null);
      },
    },
  };
}

export type PerspectiveApi = ReturnType<typeof createApiClient>;
