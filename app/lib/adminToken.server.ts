/**
 * Server-only Admin API access token for the storefront's own Admin calls
 * (reviews, newsletter). Never import from client code.
 *
 * Resolution order:
 * 1. SHOPIFY_ADMIN_ACCESS_TOKEN — a static token, used as-is (override).
 * 2. SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET — the Dev Dashboard app's
 *    credentials, exchanged with Shopify's client-credentials grant for a
 *    short-lived token (24 h). The token is cached per isolate until five
 *    minutes before it expires; concurrent callers share one exchange.
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
  init: {body: URLSearchParams; headers: Record<string, string>; method: string},
) => Promise<Response>;

/** Refresh this long before Shopify's stated expiry. */
const EXPIRY_MARGIN_SECONDS = 300;

const cache = new Map<string, {token: string; expiresAt: number}>();
const inFlight = new Map<string, Promise<{token: string; expiresAt: number}>>();

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

  let pending = inFlight.get(key);
  if (!pending) {
    pending = exchange({clientId, clientSecret, storeDomain, fetchImpl, now})
      .then((entry) => {
        cache.set(key, entry);
        return entry;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  return (await pending).token;
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

  const expiresIn = Number(body.expires_in);
  const lifetimeSeconds = Number.isFinite(expiresIn)
    ? Math.max(0, expiresIn - EXPIRY_MARGIN_SECONDS)
    : 0;
  return {token: body.access_token, expiresAt: startedAt + lifetimeSeconds * 1000};
}

/** Test hook: forget cached and in-flight tokens. */
export function __resetAdminTokenCacheForTests(): void {
  cache.clear();
  inFlight.clear();
}
