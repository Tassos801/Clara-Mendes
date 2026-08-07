#!/usr/bin/env node
/* eslint-disable no-console */

import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  envWithAdminDefaults,
  getRequiredEnv,
  normalizeShopDomain,
} from './lib/env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const catalog = JSON.parse(
  readFileSync(
    path.join(repoRoot, 'data', 'original-art-catalog.json'),
    'utf8',
  ),
);
const extensionCatalog = JSON.parse(
  readFileSync(
    path.join(repoRoot, 'data', 'art-product-extensions.json'),
    'utf8',
  ),
);

const PRODUCTS_QUERY = `#graphql
  query AuditOriginalArtProducts($first: Int!, $query: String!) {
    products(first: $first, query: $query, sortKey: TITLE) {
      nodes {
        handle
        media(first: 10) {
          nodes {
            mediaContentType
            status
          }
        }
        status
        title
        variants(first: 20) {
          nodes {
            inventoryItem {
              requiresShipping
              tracked
            }
            price
            sku
            title
          }
        }
      }
    }
    productsCount(query: $query) {
      count
    }
  }
`;

function createAdminClient({accessToken, endpoint}) {
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

async function getAdminAccessToken({clientId, clientSecret, storeDomain}) {
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

  return body.access_token;
}

function validateProduct(product, expected) {
  const issues = [];
  const expectedSku = `${expected.skuPrefix}-8X10`;
  const variants = product?.variants?.nodes ?? [];
  const media = product?.media?.nodes ?? [];

  if (!product) issues.push('missing from Shopify');
  if (product?.status !== 'ACTIVE') {
    issues.push(`status is ${product?.status || 'missing'}, expected ACTIVE`);
  }
  if (variants.length !== 1) {
    issues.push(`${variants.length} variants, expected 1`);
  }
  if (variants[0]?.sku !== expectedSku) {
    issues.push(
      `SKU is ${variants[0]?.sku || 'missing'}, expected ${expectedSku}`,
    );
  }
  if (variants[0]?.price !== '29.00') {
    issues.push(`price is ${variants[0]?.price || 'missing'}, expected 29.00`);
  }
  if (variants[0]?.inventoryItem?.requiresShipping !== true) {
    issues.push('variant is not marked as requiring shipping');
  }
  if (variants[0]?.inventoryItem?.tracked !== false) {
    issues.push('inventory tracking is enabled');
  }
  // 1 = flat art only (pre room-mockup sync); 3 = flat art + the two room
  // mockups added by scripts/generate-room-mockups.mjs + catalog:art:sync.
  const badMedia = media.filter(
    (node) => node?.mediaContentType !== 'IMAGE' || node?.status !== 'READY',
  );
  if (![1, 3].includes(media.length) || badMedia.length) {
    issues.push(
      `${media.length} media (expected 1 or 3), ${badMedia.length} not READY images`,
    );
  }

  return issues;
}

async function main() {
  const env = envWithAdminDefaults();
  const storeDomain = normalizeShopDomain(
    env.SHOPIFY_ADMIN_STORE || getRequiredEnv(env, 'PUBLIC_STORE_DOMAIN'),
  );
  const clientId = String(env.SHOPIFY_CLIENT_ID || '').trim();
  const clientSecret = String(env.SHOPIFY_CLIENT_SECRET || '').trim();
  const accessToken =
    clientId && clientSecret
      ? await getAdminAccessToken({clientId, clientSecret, storeDomain})
      : getRequiredEnv(env, 'SHOPIFY_ADMIN_ACCESS_TOKEN');
  const apiVersion = env.SHOPIFY_ADMIN_API_VERSION || '2026-07';
  const adminGraphql = createAdminClient({
    accessToken,
    endpoint: `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`,
  });
  const body = await adminGraphql(PRODUCTS_QUERY, {
    first: 100,
    query: "tag:'Clara Mendes Original'",
  });
  const products = body.data?.products?.nodes ?? [];
  const productsByHandle = new Map(
    products.map((product) => [product.handle, product]),
  );
  let issueCount = 0;

  console.log(
    `Shopify returned ${body.data?.productsCount?.count ?? products.length} Clara Mendes tagged product(s).`,
  );

  for (const expected of catalog) {
    const product = productsByHandle.get(expected.handle);
    const issues = validateProduct(product, expected);
    issueCount += issues.length;
    console.log(
      `${issues.length ? 'ISSUE' : 'OK'}  ${expected.handle}${
        issues.length ? `: ${issues.join('; ')}` : ''
      }`,
    );
  }

  const unexpected = products.filter(
    (product) =>
      !catalog.some((item) => item.handle === product.handle) &&
      !extensionCatalog.families.some(
        (family) => family.handle === product.handle,
      ),
  );
  if (unexpected.length) {
    issueCount += unexpected.length;
    for (const product of unexpected) {
      console.log(`ISSUE  unexpected tagged product: ${product.handle}`);
    }
  }

  if (issueCount) {
    throw new Error(`Catalog audit failed with ${issueCount} issue(s).`);
  }

  console.log(
    `Original-art catalog audit passed for ${catalog.length}/${catalog.length} ACTIVE products.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

/* eslint-enable no-console */
