/**
 * The one HTTP client every API module goes through.
 *
 * - Bearer access token on every authenticated call.
 * - Single-flight refresh: when several requests hit 401 at once, exactly one
 *   POST /auth/refresh runs and the others wait for it, then each retries once.
 * - A failed refresh clears the session and tells the app (onSessionExpired),
 *   which routes to sign-in.
 * - Timeouts and caller cancellation through AbortController.
 * - Retries only for idempotent reads (GET), and only on network errors or
 *   5xx. Writes (quiz submissions, game attempts, payments, upload finalize)
 *   are never retried here: a lost response must not turn into a duplicate.
 * - Every failure becomes an ApiError with the server's message, so screens
 *   never have to parse response bodies themselves.
 */

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenStore {
  get(): Promise<Tokens | null>;
  set(tokens: Tokens): Promise<void>;
  clear(): Promise<void>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly body: unknown;
  readonly isNetwork: boolean;
  readonly isTimeout: boolean;

  constructor(message: string, opts: { status?: number; code?: string; body?: unknown; isNetwork?: boolean; isTimeout?: boolean } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = opts.status ?? 0;
    this.code = opts.code;
    this.body = opts.body;
    this.isNetwork = opts.isNetwork ?? false;
    this.isTimeout = opts.isTimeout ?? false;
  }
}

export type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  body?: unknown;
  query?: Query;
  /** false for public routes (login, register, providers…). */
  auth?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Extra attempts for a GET. Ignored for every other method. */
  retries?: number;
  headers?: Record<string, string>;
}

export interface ApiClientConfig {
  baseUrl: string;
  tokens: TokenStore;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  onSessionExpired?: () => void;
  /** Backoff between GET retries; tests pass 0. */
  retryDelayMs?: number;
}

/**
 * Kidora's global exception filter wraps Nest's response:
 *   { statusCode, path, timestamp, error: { statusCode, message, code?, ...extra } | "plain message" }
 * The inner object is what carries `message`, `code` and extras such as the
 * EMAIL_NOT_VERIFIED pending state. Plain Nest bodies (no wrapper) are
 * accepted too.
 */
export function errorDetail(body: unknown): Record<string, unknown> | string | undefined {
  if (!body || typeof body !== 'object') return typeof body === 'string' ? body : undefined;
  const inner = (body as { error?: unknown }).error;
  if (inner && typeof inner === 'object') return inner as Record<string, unknown>;
  if (typeof inner === 'string' && !('message' in body)) return inner;
  return body as Record<string, unknown>;
}

export function messageFromBody(body: unknown, fallback: string): string {
  const d = errorDetail(body);
  if (typeof d === 'string') return d.trim() && d.length < 300 ? d : fallback;
  const m = d?.message;
  if (typeof m === 'string' && m.trim()) return m;
  if (Array.isArray(m) && m.length && typeof m[0] === 'string') return m.join('\n');
  return fallback;
}

function codeFromBody(body: unknown): string | undefined {
  const d = errorDetail(body);
  return d && typeof d === 'object' && typeof d.code === 'string' ? d.code : undefined;
}

function buildUrl(base: string, path: string, query?: Query) {
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `${url}?${qs}` : url;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createApiClient(config: ApiClientConfig) {
  const doFetch = config.fetchImpl ?? fetch;
  const defaultTimeout = config.timeoutMs ?? 20_000;
  const retryDelay = config.retryDelayMs ?? 600;
  let refreshing: Promise<Tokens | null> | null = null;

  async function raw(method: string, path: string, opts: RequestOptions, token: string | null): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new ApiError('timeout', { isTimeout: true })), opts.timeoutMs ?? defaultTimeout);
    const onCallerAbort = () => controller.abort(opts.signal?.reason);
    if (opts.signal) {
      if (opts.signal.aborted) controller.abort(opts.signal.reason);
      else opts.signal.addEventListener('abort', onCallerAbort);
    }

    const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;
    const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
    if (opts.body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      return await doFetch(buildUrl(config.baseUrl, path, opts.query), {
        method,
        headers,
        body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
        signal: controller.signal,
      });
    } catch (e) {
      if (controller.signal.aborted && !opts.signal?.aborted) {
        throw new ApiError('The server took too long to answer. Check your connection and try again.', { isTimeout: true });
      }
      if (opts.signal?.aborted) throw e; // the caller cancelled: let them see their own AbortError
      throw new ApiError("Can't reach Kidora. Check your internet connection.", { isNetwork: true });
    } finally {
      clearTimeout(timeout);
      opts.signal?.removeEventListener('abort', onCallerAbort);
    }
  }

  async function parse(res: Response): Promise<unknown> {
    if (res.status === 204) return undefined;
    const text = await res.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  /** One refresh for everyone; null means the session is over. */
  function refreshTokens(): Promise<Tokens | null> {
    if (!refreshing) {
      refreshing = (async () => {
        const current = await config.tokens.get();
        if (!current?.refreshToken) return null;
        try {
          const res = await raw('POST', '/auth/refresh', { body: { refreshToken: current.refreshToken } }, null);
          if (!res.ok) return null;
          const body = (await parse(res)) as Partial<Tokens> | undefined;
          if (!body?.accessToken) return null;
          const next = { accessToken: body.accessToken, refreshToken: body.refreshToken ?? current.refreshToken };
          await config.tokens.set(next);
          return next;
        } catch {
          // Offline is not "logged out": keep the tokens, fail this request.
          // (Refresh tokens are single use and replaying a spent one revokes
          // every session, which is why only one refresh is ever in flight.)
          return current;
        }
      })().finally(() => {
        refreshing = null;
      });
    }
    return refreshing;
  }

  async function endSession() {
    await config.tokens.clear();
    config.onSessionExpired?.();
  }

  async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const useAuth = opts.auth !== false;
    const maxAttempts = method === 'GET' ? 1 + (opts.retries ?? 2) : 1;

    for (let attempt = 1; ; attempt++) {
      try {
        let token = useAuth ? (await config.tokens.get())?.accessToken ?? null : null;
        // A refresh already in flight: wait for it rather than sending a token we know is stale.
        if (useAuth && refreshing) token = (await refreshing)?.accessToken ?? token;

        let res = await raw(method, path, opts, token);

        if (res.status === 401 && useAuth && token) {
          const next = await refreshTokens();
          if (!next || next.accessToken === token) {
            if (!next) await endSession();
            const body = await parse(res);
            throw new ApiError(messageFromBody(body, 'Please sign in again.'), { status: 401, body });
          }
          res = await raw(method, path, opts, next.accessToken);
          if (res.status === 401) {
            await endSession();
            const body = await parse(res);
            throw new ApiError(messageFromBody(body, 'Please sign in again.'), { status: 401, body });
          }
        }

        const body = await parse(res);
        if (!res.ok) {
          const code = codeFromBody(body);
          throw new ApiError(messageFromBody(body, `Request failed (${res.status}).`), { status: res.status, code, body });
        }
        return body as T;
      } catch (e) {
        const retryable = e instanceof ApiError && (e.isNetwork || e.isTimeout || e.status >= 500);
        if (!retryable || attempt >= maxAttempts || opts.signal?.aborted) throw e;
        if (retryDelay) await sleep(retryDelay * attempt);
      }
    }
  }

  return {
    request,
    get: <T>(path: string, opts?: Omit<RequestOptions, 'body'>) => request<T>('GET', path, opts),
    post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('POST', path, { ...opts, body }),
    put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PUT', path, { ...opts, body }),
    patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PATCH', path, { ...opts, body }),
    delete: <T>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, opts),
    refreshTokens,
    url: (path: string, query?: Query) => buildUrl(config.baseUrl, path, query),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
