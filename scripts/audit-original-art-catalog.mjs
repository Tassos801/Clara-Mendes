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
  ALL_SIZES,
  BASE_SIZE,
  EXPANSION_SIZES,
  expectedOriginalArtMediaCount,
  expectedSku,
  inspectOriginalArtProduct,
  variantForSize,
} from './lib/original-art-size-plan.mjs';
import {expectedMockupAlts} from './lib/room-mockup-scenes.mjs';

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
            alt
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

  if (!product) issues.push('missing from Shopify');
  if (product?.status !== 'ACTIVE') {
    issues.push(`status is ${product?.status || 'missing'}, expected ACTIVE`);
  }
  if (variants.length !== ALL_SIZES.length) {
    issues.push(`${variants.length} variants, expected ${ALL_SIZES.length}`);
  }
  issues.push(
    ...inspectOriginalArtProduct(product, expected, {
      allowLegacyBasePrice: true,
      requiredActiveExpansionSizes: EXPANSION_SIZES,
    }).issues.filter(
      (issue) =>
        issue.endsWith('variant is missing') || issue.endsWith('must be ACTIVE'),
    ),
  );
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
  for (const size of EXPANSION_SIZES) {
    const variant = variantForSize(product, size.label);
    if (!variant) continue;
    if (variant.sku !== expectedSku(expected, size)) {
      issues.push(
        `${size.label} SKU is ${variant.sku || 'missing'}, expected ${expectedSku(expected, size)}`,
      );
    }
    if (variant.price !== size.price) {
      issues.push(
        `${size.label} price is ${variant.price || 'missing'}, expected ${size.price}`,
      );
    }
    if (variant.inventoryPolicy !== 'DENY') {
      issues.push(`${size.label} inventory policy is not DENY`);
    }
    if (variant.inventoryItem?.requiresShipping !== true) {
      issues.push(`${size.label} variant does not require shipping`);
    }
  }
  const expectedMediaCount = expectedOriginalArtMediaCount();
  const expectedMediaAlts = [
    expected.alt,
    ...expectedMockupAlts(expected.shortTitle),
  ];
  const actualMediaAlts = new Set(media.map((node) => node?.alt));
  const missingMediaAlts = expectedMediaAlts.filter(
    (alt) => !actualMediaAlts.has(alt),
  );
  const badMedia = media.filter(
    (node) => node?.mediaContentType !== 'IMAGE' || node?.status !== 'READY',
  );
  if (media.length !== expectedMediaCount || badMedia.length) {
    issues.push(
      `${media.length} media (expected ${expectedMediaCount}), ${badMedia.length} not READY images`,
    );
  }
  if (missingMediaAlts.length) {
    issues.push(`${missingMediaAlts.length} expected media alt(s) missing`);
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
