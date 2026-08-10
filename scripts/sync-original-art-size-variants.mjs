#!/usr/bin/env node
/* eslint-disable no-console */

import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
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
  inspectOriginalArtProduct,
  multiSizeDescription,
  releaseState,
} from './lib/original-art-size-plan.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const catalog = JSON.parse(
  readFileSync(
    path.join(repoRoot, 'data', 'original-art-catalog.json'),
    'utf8',
  ),
);
const manifestPath = path.join(
  repoRoot,
  'output',
  'product-art',
  'print-16x20-300dpi',
  'manifest.json',
);

const PRODUCTS_QUERY = `#graphql
  query OriginalArtSizeVariants($first: Int!, $query: String!) {
    products(first: $first, query: $query, sortKey: TITLE) {
      nodes {
        descriptionHtml
        handle
        id
        options {
          id
          name
          optionValues {
            id
            name
          }
          position
        }
        status
        title
        variants(first: 20) {
          nodes {
            availableForSale
            id
            inventoryItem {
              id
              requiresShipping
              sku
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
  }
`;

const CREATE_VARIANT = `#graphql
  mutation CreateOriginalArtSizeVariant(
    $productId: ID!
    $variants: [ProductVariantsBulkInput!]!
  ) {
    productVariantsBulkCreate(productId: $productId, variants: $variants) {
      productVariants {
        id
        inventoryItem {
          id
          requiresShipping
          sku
          tracked
        }
        price
        selectedOptions {
          name
          value
        }
        sku
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;

const UPDATE_VARIANT = `#graphql
  mutation UpdateOriginalArtSizeVariant(
    $productId: ID!
    $variants: [ProductVariantsBulkInput!]!
  ) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        availableForSale
        id
        inventoryItem {
          id
          requiresShipping
          sku
          tracked
        }
        price
        sku
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;

const UPDATE_DESCRIPTION = `#graphql
  mutation UpdateOriginalArtSizeDescription($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product {
        descriptionHtml
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

function usage() {
  console.log(`Usage:
  node scripts/sync-original-art-size-variants.mjs
  node scripts/sync-original-art-size-variants.mjs --stage
  node scripts/sync-original-art-size-variants.mjs --activate --prodigi-confirmed=${LARGE_SIZE.prodigiSku}
  node scripts/sync-original-art-size-variants.mjs --pause

Default mode is a read-only live audit. --stage creates the larger variants
with tracked zero inventory, so they cannot be purchased while Prodigi is
configured. It also changes the existing ${BASE_SIZE.label} price from ${BASE_SIZE.legacyPrice}
to ${BASE_SIZE.price}; the ${LARGE_SIZE.label} price is fixed at ${LARGE_SIZE.price}. --activate makes the
larger variants sellable only after explicit Prodigi confirmation. --pause
returns all larger variants to the unavailable state.`);
}

function argumentValue(name) {
  const prefix = `${name}=`;
  return process.argv
    .slice(2)
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length);
}

function actionFromArguments() {
  const selected = ['stage', 'activate', 'pause'].filter((name) =>
    process.argv.includes(`--${name}`),
  );
  if (selected.length > 1) {
    throw new Error('Choose only one of --stage, --activate, or --pause.');
  }
  return selected[0] ?? 'audit';
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function validateAssets() {
  if (!existsSync(manifestPath)) {
    throw new Error(
      `Missing 16x20 manifest. Run python scripts/prepare-original-art-size-assets.py first: ${manifestPath}`,
    );
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (
    manifest.prodigiSku !== LARGE_SIZE.prodigiSku ||
    manifest.target?.width !== 4800 ||
    manifest.target?.height !== 6000 ||
    manifest.target?.dpi !== 300
  ) {
    throw new Error(
      'The 16x20 manifest has unexpected product specifications.',
    );
  }
  if (manifest.files?.length !== catalog.length) {
    throw new Error(
      `Expected ${catalog.length} manifest records, found ${manifest.files?.length ?? 0}.`,
    );
  }

  const byHandle = new Map(
    manifest.files.map((record) => [record.handle, record]),
  );
  for (const item of catalog) {
    const record = byHandle.get(item.handle);
    if (!record) throw new Error(`${item.handle}: manifest record is missing.`);
    if (record.shopifySku !== expectedSku(item)) {
      throw new Error(`${item.handle}: manifest Shopify SKU is incorrect.`);
    }
    if (
      record.output?.width !== 4800 ||
      record.output?.height !== 6000 ||
      record.output?.dpi?.[0] !== 300 ||
      record.output?.dpi?.[1] !== 300
    ) {
      throw new Error(
        `${item.handle}: manifest image dimensions are incorrect.`,
      );
    }

    const outputPath = path.resolve(repoRoot, record.output.path);
    if (!existsSync(outputPath)) {
      throw new Error(
        `${item.handle}: generated file is missing: ${outputPath}`,
      );
    }
    if (sha256(outputPath) !== record.output.sha256) {
      throw new Error(`${item.handle}: generated file hash does not match.`);
    }
  }

  console.log(
    `Assets: ${manifest.files.length}/15 files match the 4800x6000 manifest.`,
  );
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

async function adminConnection() {
  const env = envWithAdminDefaults();
  const storeDomain = normalizeShopDomain(
    env.SHOPIFY_ADMIN_STORE || getRequiredEnv(env, 'PUBLIC_STORE_DOMAIN'),
  );
  const clientId = String(env.SHOPIFY_CLIENT_ID || '').trim();
  const clientSecret = String(env.SHOPIFY_CLIENT_SECRET || '').trim();
  let accessToken;

  if (clientId && clientSecret) {
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
      throw new Error('Admin token exchange failed.');
    }
    const scopes = String(body.scope || '')
      .split(',')
      .map((scope) => scope.trim());
    if (!scopes.includes('write_products')) {
      throw new Error('The installed Shopify app is missing write_products.');
    }
    accessToken = body.access_token;
  } else {
    accessToken = getRequiredEnv(env, 'SHOPIFY_ADMIN_ACCESS_TOKEN');
  }

  const apiVersion = env.SHOPIFY_ADMIN_API_VERSION || '2026-07';
  return {
    adminGraphql: createAdminClient({
      accessToken,
      endpoint: `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`,
    }),
    storeDomain,
  };
}

async function fetchCatalog(adminGraphql) {
  const body = await adminGraphql(PRODUCTS_QUERY, {
    first: 100,
    query: "tag:'Clara Mendes Original'",
  });
  const wanted = new Set(catalog.map((item) => item.handle));
  const products = (body.data?.products?.nodes ?? []).filter((product) =>
    wanted.has(product.handle),
  );
  const byHandle = new Map(
    products.map((product) => [product.handle, product]),
  );

  if (products.length !== catalog.length || byHandle.size !== catalog.length) {
    throw new Error(
      `Shopify returned ${products.length}/${catalog.length} original-art products.`,
    );
  }

  return byHandle;
}

function validateCatalog(
  productsByHandle,
  {allowLegacyBasePrice = false} = {},
) {
  let issueCount = 0;
  const rows = [];

  for (const item of catalog) {
    const product = productsByHandle.get(item.handle);
    const inspection = inspectOriginalArtProduct(product, item, {
      allowLegacyBasePrice,
    });
    const knownLabels = new Set([BASE_SIZE.label, LARGE_SIZE.label]);
    const unexpectedVariants = (product.variants?.nodes ?? []).filter(
      (variant) =>
        !(variant.selectedOptions ?? []).some(
          (option) => option.name === 'Size' && knownLabels.has(option.value),
        ),
    );
    if (product.options?.length !== 1) {
      inspection.issues.push(
        `${product.options?.length ?? 0} product options found; expected Size only`,
      );
    }
    if (unexpectedVariants.length) {
      inspection.issues.push(
        `${unexpectedVariants.length} unexpected variant(s) found`,
      );
    }

    const state = releaseState(inspection.largeVariant);
    if (state === 'INVALID') {
      inspection.issues.push(
        `${LARGE_SIZE.label} is neither safely STAGED nor sellable ACTIVE`,
      );
    }
    issueCount += inspection.issues.length;
    rows.push({inspection, item, product, state});
    console.log(
      `${inspection.issues.length ? 'ISSUE' : state.padEnd(7)} ${item.handle}${
        inspection.issues.length ? `: ${inspection.issues.join('; ')}` : ''
      }`,
    );
  }

  if (issueCount) {
    throw new Error(`Catalog validation failed with ${issueCount} issue(s).`);
  }
  return rows;
}

function mutationErrors(payload, handle) {
  const errors = payload?.userErrors ?? [];
  if (errors.length) {
    throw new Error(`${handle}: ${JSON.stringify(errors)}`);
  }
}

async function stageVariants(adminGraphql, rows) {
  for (const {inspection, item, product, state} of rows) {
    if (!['MISSING', 'STAGED'].includes(state)) {
      throw new Error(
        `${item.handle}: expected MISSING or STAGED before --stage, found ${state}.`,
      );
    }

    if (state === 'MISSING') {
      const body = await adminGraphql(CREATE_VARIANT, {
        productId: product.id,
        variants: [
          {
            inventoryItem: {
              requiresShipping: true,
              sku: expectedSku(item),
              tracked: true,
            },
            inventoryPolicy: 'DENY',
            optionValues: [{name: LARGE_SIZE.label, optionName: 'Size'}],
            price: LARGE_SIZE.price,
            taxable: true,
          },
        ],
      });
      const payload = body.data?.productVariantsBulkCreate;
      mutationErrors(payload, item.handle);
      if (payload?.productVariants?.length !== 1) {
        throw new Error(`${item.handle}: Shopify did not create one variant.`);
      }
      console.log(`  STAGED ${item.handle} (${expectedSku(item)})`);
    } else {
      console.log(`  NOOP   ${item.handle} larger size is already staged.`);
    }

    if (inspection.baseVariant.price === BASE_SIZE.price) {
      console.log(
        `  NOOP   ${item.handle} base price is already ${BASE_SIZE.price}.`,
      );
      continue;
    }
    const update = await adminGraphql(UPDATE_VARIANT, {
      productId: product.id,
      variants: [{id: inspection.baseVariant.id, price: BASE_SIZE.price}],
    });
    mutationErrors(update.data?.productVariantsBulkUpdate, item.handle);
    console.log(
      `  PRICE  ${item.handle} ${BASE_SIZE.legacyPrice} -> ${BASE_SIZE.price}`,
    );
  }
}

async function updateDescription(adminGraphql, product, item) {
  const updated = multiSizeDescription(product.descriptionHtml);
  if (!updated.changed) return;

  const body = await adminGraphql(UPDATE_DESCRIPTION, {
    product: {descriptionHtml: updated.html, id: product.id},
  });
  mutationErrors(body.data?.productUpdate, item.handle);
  console.log(`  COPY   ${item.handle}`);
}

async function setVariantTracking(adminGraphql, rows, {tracked}) {
  for (const {inspection, item, product} of rows) {
    if (!inspection.largeVariant) {
      throw new Error(
        `${item.handle}: ${LARGE_SIZE.label} variant is missing.`,
      );
    }
    if (inspection.largeVariant.inventoryItem?.tracked === tracked) {
      console.log(
        `  NOOP   ${item.handle} is already ${tracked ? 'staged' : 'active'}.`,
      );
    } else {
      const body = await adminGraphql(UPDATE_VARIANT, {
        productId: product.id,
        variants: [
          {
            id: inspection.largeVariant.id,
            inventoryItem: {
              requiresShipping: true,
              sku: expectedSku(item),
              tracked,
            },
            inventoryPolicy: 'DENY',
            price: LARGE_SIZE.price,
            taxable: true,
          },
        ],
      });
      mutationErrors(body.data?.productVariantsBulkUpdate, item.handle);
      console.log(
        `  ${tracked ? 'PAUSED' : 'ACTIVE'} ${item.handle} (${expectedSku(item)})`,
      );
    }

    if (!tracked) {
      await updateDescription(adminGraphql, product, item);
    }
  }
}

async function verifyFinalState(adminGraphql, expectedState) {
  console.log('\nRead-back verification:');
  const rows = validateCatalog(await fetchCatalog(adminGraphql));
  const wrong = rows.filter(({state}) => state !== expectedState);
  if (wrong.length) {
    throw new Error(
      `Expected all variants to be ${expectedState}; ${wrong.length} did not match.`,
    );
  }
  console.log(`Verified ${rows.length}/15 variants in ${expectedState} state.`);
}

async function main() {
  if (process.argv.includes('--help')) {
    usage();
    return;
  }

  const action = actionFromArguments();
  if (argumentValue('--price')) {
    throw new Error(
      `--price is no longer accepted; approved prices are ${BASE_SIZE.price} and ${LARGE_SIZE.price}.`,
    );
  }
  if (
    action === 'activate' &&
    argumentValue('--prodigi-confirmed') !== LARGE_SIZE.prodigiSku
  ) {
    throw new Error(
      `--activate requires --prodigi-confirmed=${LARGE_SIZE.prodigiSku}.`,
    );
  }

  validateAssets();
  const {adminGraphql, storeDomain} = await adminConnection();
  console.log(
    `${action.toUpperCase()} ${catalog.length} original-art products on ${storeDomain}.
Approved prices: ${BASE_SIZE.label} ${BASE_SIZE.price}; ${LARGE_SIZE.label} ${LARGE_SIZE.price}.
Prodigi product: ${LARGE_SIZE.prodigiSku} (${LARGE_SIZE.label}).`,
  );
  const rows = validateCatalog(await fetchCatalog(adminGraphql), {
    allowLegacyBasePrice: ['audit', 'stage'].includes(action),
  });

  if (action === 'audit') {
    const counts = rows.reduce((result, row) => {
      result[row.state] = (result[row.state] ?? 0) + 1;
      return result;
    }, {});
    console.log(`Read-only audit complete: ${JSON.stringify(counts)}.`);
    return;
  }
  if (action === 'stage') {
    await stageVariants(adminGraphql, rows);
    await verifyFinalState(adminGraphql, 'STAGED');
    console.log(
      `All ${LARGE_SIZE.label} variants are unavailable. Configure and verify every SKU in Prodigi before --activate.`,
    );
    return;
  }
  if (action === 'pause') {
    await setVariantTracking(adminGraphql, rows, {tracked: true});
    await verifyFinalState(adminGraphql, 'STAGED');
    return;
  }

  for (const row of rows) {
    if (!['STAGED', 'ACTIVE'].includes(row.state)) {
      throw new Error(
        `${row.item.handle}: expected STAGED or ACTIVE before --activate, found ${row.state}.`,
      );
    }
  }
  await setVariantTracking(adminGraphql, rows, {tracked: false});
  await verifyFinalState(adminGraphql, 'ACTIVE');
  console.log(
    `All 15 products now offer ${BASE_SIZE.label} and ${LARGE_SIZE.label}.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

/* eslint-enable no-console */
