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
import {
  BASE_SIZE,
  LARGE_SIZE,
  expectedSku,
  releaseState,
  variantForSize,
} from './lib/original-art-size-plan.mjs';

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
            availableForSale
            inventoryItem {
              requiresShipping
              tracked
            }
            inventoryPolicy
            inventoryQuantity
            price
            selectedOptions {
              name
              value
            }
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
  const variants = product?.variants?.nodes ?? [];
  const media = product?.media?.nodes ?? [];
  const baseVariant = variantForSize(product, BASE_SIZE.label);
  const largeVariant = variantForSize(product, LARGE_SIZE.label);

  if (!product) issues.push('missing from Shopify');
  if (product?.status !== 'ACTIVE') {
    issues.push(`status is ${product?.status || 'missing'}, expected ACTIVE`);
  }
  if (![1, 2].includes(variants.length)) {
    issues.push(`${variants.length} variants, expected 1 or 2`);
  }
  if (baseVariant?.sku !== expectedSku(expected, BASE_SIZE)) {
    issues.push(
      `${BASE_SIZE.label} SKU is ${baseVariant?.sku || 'missing'}, expected ${expectedSku(expected, BASE_SIZE)}`,
    );
  }
  if (![BASE_SIZE.legacyPrice, BASE_SIZE.price].includes(baseVariant?.price)) {
    issues.push(
      `${BASE_SIZE.label} price is ${baseVariant?.price || 'missing'}, expected ${BASE_SIZE.legacyPrice} or ${BASE_SIZE.price}`,
    );
  }
  if (baseVariant?.inventoryItem?.requiresShipping !== true) {
    issues.push(`${BASE_SIZE.label} variant does not require shipping`);
  }
  if (baseVariant?.inventoryItem?.tracked !== false) {
    issues.push(`${BASE_SIZE.label} inventory tracking is enabled`);
  }
  if (largeVariant) {
    if (largeVariant.sku !== expectedSku(expected)) {
      issues.push(
        `${LARGE_SIZE.label} SKU is ${largeVariant.sku || 'missing'}, expected ${expectedSku(expected)}`,
      );
    }
    if (largeVariant.price !== LARGE_SIZE.price) {
      issues.push(
        `${LARGE_SIZE.label} price is ${largeVariant.price || 'missing'}, expected ${LARGE_SIZE.price}`,
      );
    }
    if (largeVariant.inventoryPolicy !== 'DENY') {
      issues.push(`${LARGE_SIZE.label} inventory policy is not DENY`);
    }
    if (largeVariant.inventoryItem?.requiresShipping !== true) {
      issues.push(`${LARGE_SIZE.label} variant does not require shipping`);
    }
    if (!['STAGED', 'ACTIVE'].includes(releaseState(largeVariant))) {
      issues.push(`${LARGE_SIZE.label} release state is unsafe`);
    }
  }
  // 1 = flat only; 3 = flat + existing 8x10 scenes; 5 = flat + both sizes.
  const badMedia = media.filter(
    (node) => node?.mediaContentType !== 'IMAGE' || node?.status !== 'READY',
  );
  if (![1, 3, 5].includes(media.length) || badMedia.length) {
    issues.push(
      `${media.length} media (expected 1, 3, or 5), ${badMedia.length} not READY images`,
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
