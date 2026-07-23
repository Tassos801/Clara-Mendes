#!/usr/bin/env node
/* eslint-disable no-console */

import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  envWithLocalDefaults,
  getRequiredEnv,
  normalizeShopDomain,
} from './lib/env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const catalogPath = path.join(repoRoot, 'data', 'original-art-catalog.json');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const baseUrl = (
  process.env.PRODUCT_ART_BASE_URL ||
  'https://shopclaramendes.com/images/product-art'
).replace(/\/+$/, '');

const sizes = [{label: '8 × 10 in', skuSuffix: '8X10', price: '29.00'}];

const UPSERT_PRODUCT = `#graphql
  mutation UpsertOriginalArtProduct(
    $identifier: ProductSetIdentifiers
    $input: ProductSetInput!
  ) {
    productSet(identifier: $identifier, input: $input, synchronous: true) {
      product {
        id
        handle
        status
        title
        media(first: 3) {
          nodes {
            alt
            mediaContentType
            status
          }
        }
        variants(first: 10) {
          nodes {
            id
            price
            sku
            title
          }
        }
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;

function imageUrlFor(item) {
  const relativePath = item.image.replace(/^\/images\/product-art\//, '');
  return `${baseUrl}/${relativePath}`;
}

function localArtPathFor(item) {
  const relativePath = item.image.replace(/^\/images\/product-art\//, '');
  return path.join(repoRoot, 'public', 'images', 'product-art', relativePath);
}

function descriptionHtmlFor(item) {
  return [
    `<p>${item.description}</p>`,
    '<p>An original Clara Mendes composition designed to work alone or as part of its coordinated three-print capsule.</p>',
    '<ul>',
    '<li>Unframed portrait art print</li>',
    '<li>Printed to order in a 4:5 format</li>',
    '<li>First edition size: 8 × 10 inches</li>',
    '</ul>',
    '<p>Frame not included. Screen and print colours can vary slightly.</p>',
  ].join('');
}

function productInputFor(item) {
  const file = {
    alt: item.alt,
    contentType: 'IMAGE',
    filename: item.fileName,
    originalSource: imageUrlFor(item),
  };

  return {
    descriptionHtml: descriptionHtmlFor(item),
    files: [file],
    handle: item.handle,
    productOptions: [
      {
        name: 'Size',
        position: 1,
        values: sizes.map((size) => ({name: size.label})),
      },
    ],
    productType: 'Art Prints',
    seo: {
      description: `${item.description} Original unframed wall art from Clara Mendes.`,
      title: `${item.shortTitle} Art Print | Clara Mendes`,
    },
    status: 'DRAFT',
    tags: [
      'Clara Mendes Original',
      'Wall Art',
      'Art Print',
      item.capsule,
      '4:5 Ratio',
    ],
    title: item.title,
    variants: sizes.map((size) => ({
      file,
      inventoryItem: {
        requiresShipping: true,
        tracked: false,
      },
      inventoryPolicy: 'DENY',
      optionValues: [{name: size.label, optionName: 'Size'}],
      price: size.price,
      sku: `${item.skuPrefix}-${size.skuSuffix}`,
      taxable: true,
    })),
    vendor: 'Clara Mendes',
  };
}

function validateLocalAssets() {
  const missing = catalog
    .map((item) => localArtPathFor(item))
    .filter((filePath) => !existsSync(filePath));

  if (missing.length) {
    throw new Error(
      `Missing ${missing.length} public art asset(s):\n${missing
        .map((filePath) => `  ${filePath}`)
        .join('\n')}`,
    );
  }
}

async function assertRemoteImages() {
  for (const item of catalog) {
    const url = imageUrlFor(item);
    // Oxygen can reject HEAD while still serving the same static asset on GET.
    // Use a range GET so the guard matches Shopify's actual image request.
    const response = await fetch(url, {
      method: 'GET',
      headers: {Range: 'bytes=0-0'},
      redirect: 'follow',
    });
    if (!response.ok) {
      throw new Error(
        `Product image is not publicly reachable (${response.status}): ${url}`,
      );
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      throw new Error(
        `Product image returned an unexpected content type (${contentType || 'missing'}): ${url}`,
      );
    }
    await response.body?.cancel();
    console.log(`  IMAGE OK  ${item.handle}`);
  }
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

async function main() {
  validateLocalAssets();

  console.log(
    `${apply ? 'Applying' : 'Previewing'} ${catalog.length} original-art products.`,
  );
  console.log(`Image base URL: ${baseUrl}`);

  for (const item of catalog) {
    console.log(
      `  ${item.handle} | ${sizes
        .map((size) => `${size.label} $${size.price}`)
        .join(' | ')}`,
    );
  }

  if (!apply) {
    console.log(
      '\nDry run complete. Use --apply only after the public images are deployed and a current Admin API token is available.',
    );
    return;
  }

  console.log('\nChecking deployed image URLs...');
  await assertRemoteImages();

  const env = envWithLocalDefaults();
  const storeDomain = normalizeShopDomain(
    getRequiredEnv(env, 'PUBLIC_STORE_DOMAIN'),
  );
  const accessToken = getRequiredEnv(env, 'SHOPIFY_ADMIN_ACCESS_TOKEN');
  const apiVersion = env.SHOPIFY_ADMIN_API_VERSION || '2026-07';
  const endpoint = `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`;
  const adminGraphql = createAdminClient({accessToken, endpoint});

  let synced = 0;
  for (const item of catalog) {
    const body = await adminGraphql(UPSERT_PRODUCT, {
      identifier: {handle: item.handle},
      input: productInputFor(item),
    });
    const result = body.data?.productSet;

    if (result?.userErrors?.length) {
      throw new Error(
        `${item.handle}: ${JSON.stringify(result.userErrors, null, 2)}`,
      );
    }

    if (!result?.product || result.product.status !== 'DRAFT') {
      throw new Error(
        `${item.handle}: Shopify did not return a DRAFT product.`,
      );
    }

    synced += 1;
    console.log(
      `  DRAFT  ${result.product.handle} (${synced}/${catalog.length})`,
    );
  }

  console.log(
    `\nCreated or updated ${synced}/${catalog.length} original-art products as DRAFT.`,
  );
  console.log(
    'They were intentionally not published. Connect the sampled print provider and verify fulfillment before activation.',
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

/* eslint-enable no-console */
