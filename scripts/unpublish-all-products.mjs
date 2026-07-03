#!/usr/bin/env node
/* eslint-disable no-console */

import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  envWithLocalDefaults,
  getRequiredEnv,
  normalizeShopDomain,
} from './lib/env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_PATH = path.join(__dirname, 'unpublished-products-backup.json');

const PRODUCTS_QUERY = `#graphql
  query ActiveProducts($cursor: String) {
    products(first: 100, after: $cursor, query: "status:active") {
      nodes {
        id
        handle
        title
        status
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const PRODUCT_UPDATE_MUTATION = `#graphql
  mutation UnpublishProduct($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        handle
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Fallback list is queried explicitly to confirm a status:active count of 0.
const ACTIVE_COUNT_QUERY = `#graphql
  query ActiveProductsCount {
    productsCount(query: "status:active") {
      count
    }
  }
`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createAdminClient({endpoint, accessToken}) {
  return async function adminGraphql(query, variables = {}) {
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

// Respect leaky-bucket rate limits: back off when the available budget is low.
async function throttle(extensions) {
  const throttleStatus = extensions?.cost?.throttleStatus;
  if (!throttleStatus) {
    await sleep(200);
    return;
  }

  const {currentlyAvailable, restoreRate} = throttleStatus;
  if (currentlyAvailable < 200) {
    const waitMs = Math.ceil(((200 - currentlyAvailable) / restoreRate) * 1000);
    await sleep(Math.max(waitMs, 250));
  } else {
    await sleep(200);
  }
}

async function fetchAllActiveProducts(adminGraphql) {
  const products = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const body = await adminGraphql(PRODUCTS_QUERY, {cursor});
    const page = body.data.products;

    for (const node of page.nodes) {
      products.push({id: node.id, handle: node.handle, title: node.title});
    }

    hasNextPage = page.pageInfo.hasNextPage;
    cursor = page.pageInfo.endCursor;

    console.log(`Fetched ${products.length} active products so far...`);
    await throttle(body.extensions);
  }

  return products;
}

async function setStatus(adminGraphql, id, status) {
  const body = await adminGraphql(PRODUCT_UPDATE_MUTATION, {
    input: {id, status},
  });
  const result = body.data.productUpdate;
  await throttle(body.extensions);
  return {userErrors: result?.userErrors ?? [], product: result?.product};
}

async function runUnpublish({adminGraphql, dryRun}) {
  const products = await fetchAllActiveProducts(adminGraphql);
  console.log(`\nFound ${products.length} ACTIVE products.`);

  if (dryRun) {
    console.log('\n--dry-run: the following products WOULD be set to DRAFT:\n');
    for (const product of products) {
      console.log(`  ${product.handle}  |  ${product.title}  |  ${product.id}`);
    }
    console.log(
      `\n--dry-run complete. ${products.length} products would change. No backup written, nothing mutated.`,
    );
    return;
  }

  // Save the restore list BEFORE mutating anything.
  writeFileSync(
    BACKUP_PATH,
    JSON.stringify(
      {savedAt: new Date().toISOString(), count: products.length, products},
      null,
      2,
    ) + '\n',
    'utf8',
  );
  console.log(`\nBackup written to ${BACKUP_PATH} (${products.length} products).`);

  let updated = 0;
  const failures = [];

  for (const product of products) {
    try {
      const {userErrors} = await setStatus(adminGraphql, product.id, 'DRAFT');
      if (userErrors.length) {
        failures.push({product, userErrors});
        console.error(
          `  FAILED ${product.handle}: ${JSON.stringify(userErrors)}`,
        );
      } else {
        updated += 1;
        console.log(`  DRAFT  ${product.handle}  (${updated}/${products.length})`);
      }
    } catch (error) {
      failures.push({product, error: error.message});
      console.error(`  ERROR  ${product.handle}: ${error.message}`);
    }
  }

  console.log(
    `\nDone. Set ${updated}/${products.length} products to DRAFT. ${failures.length} failures.`,
  );
  if (failures.length) {
    console.error('Failures:', JSON.stringify(failures, null, 2));
  }
}

async function runRestore({adminGraphql}) {
  if (!existsSync(BACKUP_PATH)) {
    throw new Error(`Backup file not found: ${BACKUP_PATH}`);
  }

  const backup = JSON.parse(readFileSync(BACKUP_PATH, 'utf8'));
  const products = backup.products ?? [];
  console.log(
    `Restoring ${products.length} products from backup (saved ${backup.savedAt}) to ACTIVE...`,
  );

  let restored = 0;
  const failures = [];

  for (const product of products) {
    try {
      const {userErrors} = await setStatus(adminGraphql, product.id, 'ACTIVE');
      if (userErrors.length) {
        failures.push({product, userErrors});
        console.error(
          `  FAILED ${product.handle}: ${JSON.stringify(userErrors)}`,
        );
      } else {
        restored += 1;
        console.log(
          `  ACTIVE ${product.handle}  (${restored}/${products.length})`,
        );
      }
    } catch (error) {
      failures.push({product, error: error.message});
      console.error(`  ERROR  ${product.handle}: ${error.message}`);
    }
  }

  console.log(
    `\nDone. Restored ${restored}/${products.length} products to ACTIVE. ${failures.length} failures.`,
  );
  if (failures.length) {
    console.error('Failures:', JSON.stringify(failures, null, 2));
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');
  const restore = args.has('--restore');

  const env = envWithLocalDefaults();
  const storeDomain = normalizeShopDomain(
    getRequiredEnv(env, 'PUBLIC_STORE_DOMAIN'),
  );
  const accessToken = getRequiredEnv(env, 'SHOPIFY_ADMIN_ACCESS_TOKEN');
  const apiVersion = env.SHOPIFY_ADMIN_API_VERSION || '2025-01';
  const endpoint = `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`;
  const adminGraphql = createAdminClient({endpoint, accessToken});

  if (restore) {
    await runRestore({adminGraphql});
    return;
  }

  await runUnpublish({adminGraphql, dryRun});

  if (!dryRun) {
    // Verify the store now has zero ACTIVE products.
    try {
      const body = await adminGraphql(ACTIVE_COUNT_QUERY);
      const count = body.data?.productsCount?.count;
      console.log(`\nVerification: productsCount(status:active) = ${count}`);
    } catch (error) {
      console.warn(`Verification query failed: ${error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

/* eslint-enable no-console */
