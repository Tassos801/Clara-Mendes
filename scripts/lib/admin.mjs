/**
 * Shared Shopify Admin API helpers for catalog scripts. Mirrors the auth
 * flow embedded in sync-original-art-catalog.mjs / audit-original-art-catalog.mjs:
 * client-credentials exchange when SHOPIFY_CLIENT_ID/SECRET are present,
 * otherwise a static SHOPIFY_ADMIN_ACCESS_TOKEN.
 */

import {getRequiredEnv, normalizeShopDomain} from './env.mjs';

export async function getAdminAccessToken({
  clientId,
  clientSecret,
  storeDomain,
  requiredScope,
}) {
  const response = await fetch(
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
  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.access_token) {
    throw new Error(
      `Admin token exchange failed: ${JSON.stringify(body?.errors || body)}`,
    );
  }

  if (requiredScope) {
    const grantedScopes = String(body.scope || '')
      .split(',')
      .map((scope) => scope.trim());
    if (!grantedScopes.includes(requiredScope)) {
      throw new Error(
        `The installed Shopify app is missing the ${requiredScope} access scope.`,
      );
    }
  }

  return body.access_token;
}

/**
 * Throws when a mutation payload carries userErrors, naming the mutation
 * and the field paths so a failed step in a multi-step script is
 * diagnosable from the message alone.
 */
export function mutationErrors(payload, label) {
  const errors = payload?.userErrors ?? [];
  if (!errors.length) return;
  const detail = errors
    .map(
      (error) =>
        `${(error.field ?? []).join('.') || '(root)'}: ${error.message}`,
    )
    .join('; ');
  throw new Error(`${label}: ${detail}`);
}

export function createAdminClient({accessToken, endpoint}) {
  return async (query, variables) => {
    const response = await fetch(endpoint, {
      body: JSON.stringify({query, variables}),
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      method: 'POST',
    });
    const body = await response.json().catch(() => null);

    if (!response.ok || body?.errors) {
      throw new Error(
        `Admin API request failed: ${JSON.stringify(body?.errors || body)}`,
      );
    }

    return body;
  };
}

export async function resolveAdminClient(env, {requiredScope} = {}) {
  const storeDomain = normalizeShopDomain(
    env.SHOPIFY_ADMIN_STORE || getRequiredEnv(env, 'PUBLIC_STORE_DOMAIN'),
  );
  const clientId = String(env.SHOPIFY_CLIENT_ID || '').trim();
  const clientSecret = String(env.SHOPIFY_CLIENT_SECRET || '').trim();
  const accessToken =
    clientId && clientSecret
      ? await getAdminAccessToken({
          clientId,
          clientSecret,
          storeDomain,
          requiredScope,
        })
      : getRequiredEnv(env, 'SHOPIFY_ADMIN_ACCESS_TOKEN');
  const apiVersion = env.SHOPIFY_ADMIN_API_VERSION || '2026-07';

  return createAdminClient({
    accessToken,
    endpoint: `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`,
  });
}
