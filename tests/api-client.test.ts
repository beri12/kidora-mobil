import { ApiError, createApiClient, type Tokens, type TokenStore } from '@/api/client';

function memoryStore(initial: Tokens | null): TokenStore & { value: Tokens | null } {
  const store = {
    value: initial,
    async get() { return store.value; },
    async set(t: Tokens) { store.value = t; },
    async clear() { store.value = null; },
  };
  return store;
}

const json = (status: number, body: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

function setup(handler: Handler, tokens: Tokens | null = { accessToken: 'old', refreshToken: 'r1' }) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = jest.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return handler(url, init);
  }) as unknown as typeof fetch;
  const store = memoryStore(tokens);
  const expired = jest.fn();
  const client = createApiClient({ baseUrl: 'https://api.test/api', tokens: store, fetchImpl, onSessionExpired: expired, retryDelayMs: 0, timeoutMs: 200 });
  return { client, calls, store, expired };
}

const auth = (init: RequestInit) => (init.headers as Record<string, string>).Authorization;

describe('api client', () => {
  it('sends the bearer token and parses JSON', async () => {
    const { client, calls } = setup(() => json(200, { ok: true }));
    await expect(client.get('/auth/me')).resolves.toEqual({ ok: true });
    expect(calls[0]!.url).toBe('https://api.test/api/auth/me');
    expect(auth(calls[0]!.init)).toBe('Bearer old');
  });

  it('builds query strings and skips empty values', async () => {
    const { client, calls } = setup(() => json(200, []));
    await client.get('/learning/browse', { query: { q: 'math & more', page: 2, subject: undefined, grade: '' } });
    expect(calls[0]!.url).toBe('https://api.test/api/learning/browse?q=math%20%26%20more&page=2');
  });

  it('refreshes once for many concurrent 401s, then retries each request', async () => {
    let refreshes = 0;
    const { client, calls, store } = setup(async (url, init) => {
      if (url.endsWith('/auth/refresh')) {
        refreshes++;
        await new Promise((r) => setTimeout(r, 10));
        return json(200, { accessToken: 'new', refreshToken: 'r2' });
      }
      return auth(init) === 'Bearer new' ? json(200, { url }) : json(401, { message: 'Unauthorized' });
    });

    const results = await Promise.all([client.get('/a'), client.get('/b'), client.get('/c')]);

    expect(refreshes).toBe(1);
    expect(results).toHaveLength(3);
    expect(store.value).toEqual({ accessToken: 'new', refreshToken: 'r2' });
    const refreshCall = calls.find((c) => c.url.endsWith('/auth/refresh'))!;
    expect(JSON.parse(refreshCall.init.body as string)).toEqual({ refreshToken: 'r1' });
  });

  it('ends the session when the refresh token is rejected', async () => {
    const { client, store, expired } = setup((url) => (url.endsWith('/auth/refresh') ? json(401, { message: 'Invalid refresh token' }) : json(401, {})));
    await expect(client.get('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(store.value).toBeNull();
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it('does not attach a token or refresh on public calls', async () => {
    const { client, calls } = setup(() => json(401, { message: 'Invalid credentials' }));
    await expect(client.post('/auth/login', { email: 'a@b.c', password: 'x' }, { auth: false })).rejects.toMatchObject({
      status: 401,
      message: 'Invalid credentials',
    });
    expect(calls).toHaveLength(1);
    expect(auth(calls[0]!.init)).toBeUndefined();
  });

  it("reads message and code from Kidora's wrapped error body", async () => {
    const { client } = setup(() =>
      json(403, {
        statusCode: 403,
        path: '/api/auth/login',
        timestamp: '2026-10-26T00:00:00Z',
        error: { statusCode: 403, code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email.', email: 'a@b.c' },
      }),
    );
    const err = (await client.post('/auth/login', {}, { auth: false }).catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('EMAIL_NOT_VERIFIED');
    expect(err.message).toBe('Please verify your email.');
  });

  it('reads a bare-string error (the OTP and game 429s)', async () => {
    const { client } = setup(() => json(429, { statusCode: 429, path: '/x', timestamp: 't', error: 'Please wait 30s before requesting another code' }));
    await expect(client.post('/auth/email/resend', {}, { auth: false })).rejects.toThrow('Please wait 30s before requesting another code');
  });

  it('joins class-validator message arrays', async () => {
    const { client } = setup(() =>
      json(400, { statusCode: 400, path: '/x', timestamp: 't', error: { statusCode: 400, message: ['email must be an email', 'password is too short'] } }),
    );
    await expect(client.post('/auth/register', {}, { auth: false })).rejects.toThrow('email must be an email\npassword is too short');
  });

  it('retries a GET on a 5xx but never retries a POST', async () => {
    let gets = 0;
    let posts = 0;
    const { client } = setup((_url, init) => {
      if (init.method === 'GET') return ++gets < 3 ? json(503, {}) : json(200, { ok: 1 });
      posts++;
      return json(503, {});
    });
    await expect(client.get('/games')).resolves.toEqual({ ok: 1 });
    expect(gets).toBe(3);
    await expect(client.post('/games/sessions/s1/attempt', { answer: 1 })).rejects.toMatchObject({ status: 503 });
    expect(posts).toBe(1);
  });

  it('turns a network failure into a friendly ApiError', async () => {
    const { client } = setup(() => {
      throw new TypeError('Network request failed');
    });
    await expect(client.post('/x')).rejects.toMatchObject({ isNetwork: true });
  });

  it('times out a request that never answers', async () => {
    const { client } = setup(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    await expect(client.post('/slow')).rejects.toMatchObject({ isTimeout: true });
  });
});
