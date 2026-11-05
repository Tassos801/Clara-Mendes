/**
 * Server-only Admin API access token for the storefront's own Admin calls
 * (reviews, newsletter). Never import from client code.
 *
 * Resolution order:
 * 1. SHOPIFY_ADMIN_ACCESS_TOKEN — a static token, used as-is (override).
 * 2. SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET — the Dev Dashboard app's
 *    credentials, exchanged with Shopify's client-credentials grant for a
 *    short-lived token (24 h). The resolved token is cached per isolate
 *    until five minutes before it expires. There is deliberately no shared
 *    in-flight promise: on Oxygen/workerd a request must not await a promise
 *    created by another request, so a request without a fresh cached token
 *    does its own exchange (a rare double exchange on a cold start is fine).
 * 3. Neither — ReviewsNotConfiguredError, which routes turn into a 503 or a
 *    "disabled" status.
 *
 * Mirrors getAdminAccessToken in scripts/lib/admin.mjs.
 */

/** Thrown when Admin access is not configured, so reviews cannot be written. */
export class ReviewsNotConfiguredError extends Error {
  constructor(
    message = 'Reviews are not enabled yet: set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET (or SHOPIFY_ADMIN_ACCESS_TOKEN).',
  ) {
    super(message);
    this.name = 'ReviewsNotConfiguredError';
  }
}

export type AdminTokenEnv = Pick<
  Env,
  | 'PUBLIC_STORE_DOMAIN'
  | 'SHOPIFY_ADMIN_ACCESS_TOKEN'
  | 'SHOPIFY_CLIENT_ID'
  | 'SHOPIFY_CLIENT_SECRET'
>;

type FetchLike = (
  input: string,
  init: {
    body: URLSearchParams;
    headers: Record<string, string>;
    method: string;
    signal?: AbortSignal;
  },
) => Promise<Response>;

/** Refresh this long before Shopify's stated expiry. */
const EXPIRY_MARGIN_SECONDS = 300;
/** Floor for the cache lifetime when Shopify's expires_in is unusable. */
const MIN_CACHE_SECONDS = 60;
const EXCHANGE_TIMEOUT_MS = 10_000;

const cache = new Map<string, {token: string; expiresAt: number}>();

/** True when either a static token or a full credential pair is present. */
export function hasAdminCredentials(env: AdminTokenEnv): boolean {
  return Boolean(
    env.SHOPIFY_ADMIN_ACCESS_TOKEN ||
      (env.SHOPIFY_CLIENT_ID && env.SHOPIFY_CLIENT_SECRET),
  );
}

export async function getAdminAccessToken(
  env: AdminTokenEnv,
  fetchImpl: FetchLike = fetch,
  now: () => number = Date.now,
): Promise<string> {
  if (env.SHOPIFY_ADMIN_ACCESS_TOKEN) return env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  const clientId = env.SHOPIFY_CLIENT_ID;
  const clientSecret = env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new ReviewsNotConfiguredError();

  const storeDomain = env.PUBLIC_STORE_DOMAIN;
  if (!storeDomain) {
    throw new ReviewsNotConfiguredError(
      'Reviews are not enabled yet: PUBLIC_STORE_DOMAIN is not set.',
    );
  }

  const key = `${storeDomain}:${clientId}`;
  const cached = cache.get(key);
  if (cached && now() < cached.expiresAt) return cached.token;

  const entry = await exchange({clientId, clientSecret, storeDomain, fetchImpl, now});
  cache.set(key, entry);
  return entry.token;
}

async function exchange({
  clientId,
  clientSecret,
  storeDomain,
  fetchImpl,
  now,
}: {
  clientId: string;
  clientSecret: string;
  storeDomain: string;
  fetchImpl: FetchLike;
  now: () => number;
}): Promise<{token: string; expiresAt: number}> {
  const startedAt = now();
  const response = await fetchImpl(
    `https://${storeDomain}/admin/oauth/access_token`,
    {
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      method: 'POST',
      ...(typeof AbortSignal !== 'undefined' &&
      typeof AbortSignal.timeout === 'function'
        ? {signal: AbortSignal.timeout(EXCHANGE_TIMEOUT_MS)}
        : {}),
    },
  );

  const body = (await response.json().catch(() => null)) as {
    access_token?: unknown;
    error?: unknown;
    error_description?: unknown;
    errors?: unknown;
    expires_in?: unknown;
  } | null;

  if (!response.ok || typeof body?.access_token !== 'string' || !body.access_token) {
    const details = [body?.error, body?.error_description, body?.errors]
      .filter((part): part is string => typeof part === 'string' && part !== '')
      .join(': ');
    const message = `Admin token exchange failed: HTTP ${response.status}${details ? ` (${details})` : ''}`;
    // Belt and braces: never let the secret reach a log line.
    throw new Error(message.split(clientSecret).join('[redacted]'));
  }

  return {
    token: body.access_token,
    expiresAt: startedAt + cacheLifetimeSeconds(body.expires_in) * 1000,
  };
}

/**
 * Seconds to keep a token: expires_in minus the margin, or, when expires_in
 * is missing, non-numeric or within the margin, half of it (at least 60 s).
 */
function cacheLifetimeSeconds(expiresInRaw: unknown): number {
  const expiresIn =
    typeof expiresInRaw === 'number' || typeof expiresInRaw === 'string'
      ? Number(expiresInRaw)
      : Number.NaN;
  if (Number.isFinite(expiresIn) && expiresIn > EXPIRY_MARGIN_SECONDS) {
    return expiresIn - EXPIRY_MARGIN_SECONDS;
  }
  const usable = Number.isFinite(expiresIn) ? expiresIn : 0;
  return Math.max(MIN_CACHE_SECONDS, Math.floor(usable / 2));
}

/** Test hook: forget cached tokens. */
export function __resetAdminTokenCacheForTests(): void {
  cache.clear();
}
