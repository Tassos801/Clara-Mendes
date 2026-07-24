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
    path.join(repoRoot, 'data', 'art-product-extensions.json'),
    'utf8',
  ),
);

const PRODUCTS_QUERY = `#graphql
  query AuditArtProductExtensions($first: Int!, $query: String!) {
    products(first: $first, query: $query, sortKey: TITLE) {
      nodes {
        handle
        media(first: 20) {
          nodes {
            mediaContentType
            status
          }
        }
        status
        title
        variants(first: 100) {
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

function expectedVariantCount(family) {
  if (family.collectionVariant) return 1;
  if (family.deviceOptions) {
    return catalog.capsuleOrder.length * catalog.deviceVariants.length;
  }
  return catalog.capsuleOrder.length;
}

function validateProduct(product, family) {
  const issues = [];
  const variants = product?.variants?.nodes ?? [];
  const media = product?.media?.nodes ?? [];
  const expectedCount = expectedVariantCount(family);

  if (!product) issues.push('missing from Shopify');
  if (product?.status !== 'DRAFT') {
    issues.push(`status is ${product?.status || 'missing'}, expected DRAFT`);
  }
  if (variants.length !== expectedCount) {
    issues.push(`${variants.length} variants, expected ${expectedCount}`);
  }
  const unexpectedPrices = variants.filter(
    (variant) => variant.price !== family.price,
  );
  if (unexpectedPrices.length) {
    issues.push(`${unexpectedPrices.length} variants have an unexpected price`);
  }
  const badInventory = variants.filter(
    (variant) =>
      variant.inventoryItem?.requiresShipping !== true ||
      variant.inventoryItem?.tracked !== false,
  );
  if (badInventory.length) {
    issues.push(
      `${badInventory.length} variants have incorrect inventory flags`,
    );
  }
  const invalidMedia = media.filter(
    (item) => item.mediaContentType !== 'IMAGE' || item.status !== 'READY',
  );
  if (!media.length || invalidMedia.length) {
    issues.push(
      `${media.length} media items with ${invalidMedia.length} not READY images`,
    );
  }
  return issues;
}

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
    query: "tag:'Art for Everyday Living'",
  });
  const products = body.data?.products?.nodes ?? [];
  const byHandle = new Map(
    products.map((product) => [product.handle, product]),
  );
  let issueCount = 0;

  console.log(
    `Shopify returned ${
      body.data?.productsCount?.count ?? products.length
    } art-product extension(s).`,
  );

  for (const family of catalog.families) {
    const issues = validateProduct(byHandle.get(family.handle), family);
    issueCount += issues.length;
    console.log(
      `${issues.length ? 'ISSUE' : 'OK'}  ${family.handle}${
        issues.length ? `: ${issues.join('; ')}` : ''
      }`,
    );
  }

  const unexpected = products.filter(
    (product) =>
      !catalog.families.some((family) => family.handle === product.handle),
  );
  for (const product of unexpected) {
    issueCount += 1;
    console.log(`ISSUE  unexpected tagged product: ${product.handle}`);
  }

  if (issueCount) {
    throw new Error(
      `Extension catalog audit failed with ${issueCount} issue(s).`,
    );
  }

  console.log(
    `Extension catalog audit passed for ${catalog.families.length}/${catalog.families.length} products.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

/* eslint-enable no-console */
