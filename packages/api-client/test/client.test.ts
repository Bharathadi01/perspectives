import type { AuthTokens } from '@perspective/contracts';
import { ApiError, TokenStore, createApiClient } from '../src';

function memoryTokens(initial: AuthTokens | null): TokenStore & { value: AuthTokens | null } {
  const store = {
    value: initial,
    async get() {
      return store.value;
    },
    async set(t: AuthTokens | null) {
      store.value = t;
    },
  };
  return store;
}

const tokens: AuthTokens = { accessToken: 'old-access', refreshToken: 'r'.repeat(43), accessTokenExpiresIn: 900 };
const json = (status: number, body: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const exploreBody = {
  daily: { dayKey: '2026-10-16', requiredCount: 3, givenCount: 0, unlocked: false },
  card: null,
  remainingInBatch: 0,
};

describe('api client', () => {
  it('sends the bearer token and an idempotency key on mutations', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const client = createApiClient({
      baseUrl: 'http://api.test/',
      tokens: memoryTokens(tokens),
      newIdempotencyKey: () => 'key-1',
      fetch: (async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        return json(200, exploreBody);
      }) as unknown as typeof fetch,
    });
    await client.explore.skip('00000000-0000-4000-8000-000000000001');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(calls[0].url).toBe('http://api.test/v1/explore/skip');
    expect(headers.authorization).toBe('Bearer old-access');
    expect(headers['idempotency-key']).toBe('key-1');
  });

  it('maps the error envelope to a typed ApiError', async () => {
    const client = createApiClient({
      baseUrl: 'http://api.test',
      tokens: memoryTokens(tokens),
      newIdempotencyKey: () => 'k',
      fetch: (async () =>
        json(403, { error: { code: 'PERSPECTIVE_REQUIRED_BEFORE_CONNECT', message: 'Give them a perspective first.' } })) as unknown as typeof fetch,
    });
    await expect(client.connect.request('00000000-0000-4000-8000-000000000002')).rejects.toMatchObject({
      code: 'PERSPECTIVE_REQUIRED_BEFORE_CONNECT',
      status: 403,
    });
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    const store = memoryTokens(tokens);
    const seen: string[] = [];
    const client = createApiClient({
      baseUrl: 'http://api.test',
      tokens: store,
      newIdempotencyKey: () => 'k',
      fetch: (async (url: string, init: RequestInit) => {
        const auth = (init.headers as Record<string, string>).authorization;
        seen.push(`${url} ${auth ?? ''}`);
        if (url.endsWith('/v1/auth/refresh')) {
          return json(200, { accessToken: 'new-access', refreshToken: 's'.repeat(43), accessTokenExpiresIn: 900 });
        }
        return auth === 'Bearer new-access' ? json(200, exploreBody) : json(401, { error: { code: 'UNAUTHORIZED', message: 'x' } });
      }) as unknown as typeof fetch,
    });
    const result = await client.explore.next();
    expect(result.daily.requiredCount).toBe(3);
    expect(store.value?.accessToken).toBe('new-access');
    expect(seen).toHaveLength(3);
  });

  it('clears the session when the refresh fails', async () => {
    const store = memoryTokens(tokens);
    let expired = false;
    const client = createApiClient({
      baseUrl: 'http://api.test',
      tokens: store,
      newIdempotencyKey: () => 'k',
      onSessionExpired: () => {
        expired = true;
      },
      fetch: (async () => json(401, { error: { code: 'UNAUTHORIZED', message: 'x' } })) as unknown as typeof fetch,
    });
    await expect(client.me.get()).rejects.toBeInstanceOf(ApiError);
    expect(store.value).toBeNull();
    expect(expired).toBe(true);
  });

  it('rejects responses that do not match the contract', async () => {
    const client = createApiClient({
      baseUrl: 'http://api.test',
      tokens: memoryTokens(tokens),
      newIdempotencyKey: () => 'k',
      fetch: (async () => json(200, { daily: 'nope' })) as unknown as typeof fetch,
    });
    await expect(client.explore.next()).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  });

  it('turns network failures into NETWORK_ERROR and resolves media paths', async () => {
    const client = createApiClient({
      baseUrl: 'http://api.test',
      tokens: memoryTokens(null),
      newIdempotencyKey: () => 'k',
      fetch: (async () => {
        throw new TypeError('offline');
      }) as unknown as typeof fetch,
    });
    await expect(client.explore.next()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(client.mediaUrl('/v1/media/x/content?sig=1')).toBe('http://api.test/v1/media/x/content?sig=1');
  });
});
