#!/usr/bin/env node
/* eslint-disable no-console */

// Shopify taxonomy preflight only. This does not configure or prove Google
// Product Category, MPN, custom-product, publication, or approval state.

import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {resolveAdminClient} from './lib/admin.mjs';
import {envWithAdminDefaults} from './lib/env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const catalog = JSON.parse(
  readFileSync(
    path.join(repoRoot, 'data', 'original-art-catalog.json'),
    'utf8',
  ),
);
const apply = process.argv.includes('--apply');

const EXPECTED_CATEGORY = Object.freeze({
  fullName:
    'Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork',
  id: 'gid://shopify/TaxonomyCategory/hg-3-4-2',
});

const PRODUCTS_QUERY = `#graphql
  query GoogleCommerceProductCategories($first: Int!, $query: String!) {
    products(first: $first, query: $query, sortKey: TITLE) {
      nodes {
        category {
          fullName
          id
        }
        handle
        id
        status
      }
    }
  }
`;

const PRODUCT_UPDATE = `#graphql
  mutation SetGoogleCommerceProductCategory($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product {
        category {
          fullName
          id
        }
        handle
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

function mutationErrors(payload, handle) {
  const errors = payload?.userErrors ?? [];
  if (errors.length) {
    throw new Error(
      `${handle}: ${errors
        .map(
          (error) => `${error.field?.join('.') || 'product'}: ${error.message}`,
        )
        .join('; ')}`,
    );
  }
  if (!payload?.product?.id)
    throw new Error(`${handle}: product update failed`);
}

async function main() {
  if (catalog.length !== 15) {
    throw new Error(`Expected 15 original artworks, found ${catalog.length}.`);
  }

  const adminGraphql = await resolveAdminClient(
    envWithAdminDefaults(),
    apply ? {requiredScope: 'write_products'} : undefined,
  );
  const response = await adminGraphql(PRODUCTS_QUERY, {
    first: 30,
    query: "tag:'Clara Mendes Original' status:active",
  });
  const products = response.data?.products?.nodes ?? [];
  const byHandle = new Map(
    products.map((product) => [product.handle, product]),
  );
  const missing = catalog.filter((item) => !byHandle.has(item.handle));

  if (missing.length || products.length !== catalog.length) {
    throw new Error(
      `Refusing category sync: Shopify returned ${products.length}/15 ACTIVE originals` +
        `${missing.length ? `; missing ${missing.map((item) => item.handle).join(', ')}` : ''}.`,
    );
  }

  const changes = catalog
    .map((item) => byHandle.get(item.handle))
    .filter((product) => product.category?.id !== EXPECTED_CATEGORY.id);

  console.log(
    `${apply ? 'Applying' : 'Previewing'} Shopify taxonomy for 15 ACTIVE originals.`,
  );
  console.log(`${EXPECTED_CATEGORY.id} (${EXPECTED_CATEGORY.fullName})`);

  if (!changes.length) {
    console.log('No category changes are required.');
    return;
  }

  for (const product of changes) {
    console.log(
      `${apply ? 'UPDATE' : 'WOULD UPDATE'}  ${product.handle}: ${
        product.category?.fullName || 'Uncategorized'
      }`,
    );
    if (!apply) continue;

    const update = await adminGraphql(PRODUCT_UPDATE, {
      product: {category: EXPECTED_CATEGORY.id, id: product.id},
    });
    const payload = update.data?.productUpdate;
    mutationErrors(payload, product.handle);
    if (payload.product.category?.id !== EXPECTED_CATEGORY.id) {
      throw new Error(`${product.handle}: category did not persist`);
    }
  }

  console.log(
    `${apply ? 'Updated' : 'Would update'} ${changes.length}/15 original-art products in Shopify only.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

/* eslint-enable no-console */
