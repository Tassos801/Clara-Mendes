/* eslint-disable no-console */
import {execFile} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const batchPath = path.join(repoRoot, 'data/cj-products/launch-batch.json');
const reportPath = path.join(repoRoot, 'data/cj-products/shopify-live-publish-report.json');

const SHOPIFY_CLI = 'npm';

const live = process.argv.includes('--live');
const handlesArg = process.argv.find((arg) => arg.startsWith('--handles='));

const PRODUCT_LOOKUP = `#graphql
  query ProductByHandle($query: String!) {
    products(first: 1, query: $query) {
      nodes {
        id
        handle
        title
        status
        mediaCount {
          count
        }
      }
    }
  }
`;

const PRODUCT_SET = `#graphql
  mutation UpsertProduct(
    $productSet: ProductSetInput!
    $synchronous: Boolean!
    $identifier: ProductSetIdentifiers
  ) {
    productSet(
      synchronous: $synchronous
      input: $productSet
      identifier: $identifier
    ) {
      product {
        id
        title
        handle
        status
        variants(first: 100) {
          nodes {
            id
            sku
            price
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const PUBLISH_PRODUCT = `#graphql
  mutation PublishProduct($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      publishable {
        availablePublicationsCount {
          count
        }
        resourcePublicationsCount {
          count
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

function cartesian(options) {
  return options.reduce(
    (rows, option) =>
      rows.flatMap((row) =>
        option.values.map((value) => [
          ...row,
          {
            name: option.name,
            value,
          },
        ]),
      ),
    [[]],
  );
}

function slug(value) {
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function defaultsFor(product, optionValues) {
  const bySize = optionValues.find((option) => option.name === 'Size')?.value;
  const byStyle = optionValues.find((option) => option.name === 'Style')?.value;

  if (bySize && product.variantDefaultsBySize?.[bySize]) {
    return product.variantDefaultsBySize[bySize];
  }

  if (byStyle && product.variantDefaultsByStyle?.[byStyle]) {
    return product.variantDefaultsByStyle[byStyle];
  }

  return product.variantDefaults ?? {};
}

function loadDotEnv() {
  const envPath = path.join(repoRoot, '.env');

  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;

    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

function resolveStore(batch) {
  const configuredStore =
    process.env.SHOPIFY_STORE ||
    process.env.SHOPIFY_ADMIN_STORE_DOMAIN ||
    batch.adminStoreDomain ||
    batch.storeDomain ||
    process.env.PUBLIC_STORE_DOMAIN;
  const expectedAdminStore = batch.adminStoreDomain || batch.storeDomain;

  if (!configuredStore) {
    throw new Error(
      'Missing Shopify Admin store domain. Set SHOPIFY_STORE, SHOPIFY_ADMIN_STORE_DOMAIN, or add adminStoreDomain to launch-batch.json.',
    );
  }

  if (expectedAdminStore && configuredStore !== expectedAdminStore) {
    throw new Error(
      `Store mismatch: launch-batch.json targets ${expectedAdminStore} for Admin operations, but the environment targets ${configuredStore}. Set SHOPIFY_STORE=${expectedAdminStore} if this is intentional.`,
    );
  }

  return configuredStore;
}

function resolveProductStatus(batch) {
  const status = String(batch.status ?? 'draft').toUpperCase();
  const allowedStatuses = new Set(['ACTIVE', 'DRAFT', 'ARCHIVED']);

  if (!allowedStatuses.has(status)) {
    throw new Error(
      `Unsupported product status "${batch.status}". Use active, draft, or archived.`,
    );
  }

  return status;
}

function resolvePublicationIds(batch) {
  if (!batch.published) return null;

  const publicationIds =
    batch.publicationIds ??
    (process.env.SHOPIFY_PUBLICATION_ID
      ? [process.env.SHOPIFY_PUBLICATION_ID]
      : []);

  if (publicationIds.length === 0) {
    throw new Error(
      'publicationIds or SHOPIFY_PUBLICATION_ID is required when launch-batch.json has "published": true.',
    );
  }

  return publicationIds;
}

function selectedProducts(batch) {
  if (!handlesArg) return batch.products;

  const handles = new Set(
    handlesArg
      .replace('--handles=', '')
      .split(',')
      .map((handle) => handle.trim())
      .filter(Boolean),
  );
  const products = batch.products.filter((product) => handles.has(product.handle));
  const missingHandles = [...handles].filter(
    (handle) => !batch.products.some((product) => product.handle === handle),
  );

  if (missingHandles.length > 0) {
    throw new Error(`Unknown product handle(s): ${missingHandles.join(', ')}`);
  }

  return products;
}

function buildProductSet(product, productStatus, existing) {
  const variants = cartesian(product.options).map((optionValues, index) => {
    const defaults = defaultsFor(product, optionValues);
    return {
      optionValues: optionValues.map((option) => ({
        optionName: option.name,
        name: option.value,
      })),
      price: defaults.price,
      compareAtPrice: defaults.compareAtPrice,
      sku: [
        'CM',
        product.sourceSku,
        ...optionValues.map((option) => slug(option.value)),
      ].join('-'),
      inventoryPolicy: 'CONTINUE',
      taxable: true,
      position: index + 1,
      inventoryItem: {
        tracked: false,
        cost: defaults.cost,
        measurement: {
          weight: {
            value: defaults.grams,
            unit: 'GRAMS',
          },
        },
      },
    };
  });

  const productSet = {
    title: product.title,
    handle: product.handle,
    descriptionHtml: `${product.bodyHtml}<p><small>Supplier reference: ${product.sourceSku}</small></p>`,
    productType: product.type,
    tags: product.tags,
    vendor: product.vendor,
    status: productStatus,
    seo: {
      title: product.seoTitle,
      description: product.seoDescription,
    },
    metafields: [
      {
        namespace: 'cjdropshipping',
        key: 'source_url',
        type: 'url',
        value: product.cjUrl,
      },
      {
        namespace: 'cjdropshipping',
        key: 'source_sku',
        type: 'single_line_text_field',
        value: product.sourceSku,
      },
    ],
    productOptions: product.options.map((option, index) => ({
      name: option.name,
      position: index + 1,
      values: option.values.map((value) => ({name: value})),
    })),
    variants,
  };

  if (
    product.imageUrls?.length > 0 &&
    (!existing || existing.mediaCount.count === 0)
  ) {
    productSet.files = product.imageUrls.map((imageUrl, index) => {
      const extension = new URL(imageUrl).pathname.split('.').pop() || 'jpg';
      return {
        originalSource: imageUrl,
        contentType: 'IMAGE',
        alt: `${product.title} product image ${index + 1}`,
        filename: `${product.handle}-${index + 1}.${extension}`,
      };
    });
  }

  return productSet;
}

function parseCliJson(output) {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error(`Shopify CLI did not return JSON: ${output}`);
  }
  return JSON.parse(output.slice(start, end + 1));
}

async function storeExecute({store, query, variables, allowMutations = false}) {
  const args = [
    'exec',
    '--yes',
    '@shopify/cli@latest',
    '--',
    'store',
    'execute',
    '--store',
    store,
    '--query',
    query,
    '--variables',
    JSON.stringify(variables),
  ];

  if (allowMutations) args.push('--allow-mutations');

  const {stdout, stderr} = await execFileAsync(SHOPIFY_CLI, args, {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 10,
  });

  if (stderr.trim()) process.stderr.write(stderr);
  return parseCliJson(stdout);
}

async function findExistingProduct(store, handle) {
  const data = await storeExecute({
    store,
    query: PRODUCT_LOOKUP,
    variables: {query: `handle:${handle}`},
  });
  return data.products.nodes[0] ?? null;
}

async function upsertProduct({store, product, existing, productStatus}) {
  const productSet = buildProductSet(
    product,
    existing?.status ?? productStatus,
    existing,
  );
  const identifier = existing?.id ? {id: existing.id} : null;

  const data = await storeExecute({
    store,
    query: PRODUCT_SET,
    variables: {
      productSet,
      synchronous: true,
      identifier,
    },
    allowMutations: true,
  });

  const result = data.productSet;
  if (result.userErrors.length > 0) {
    throw new Error(
      `${product.handle}: ${result.userErrors
        .map((error) => `${error.field?.join('.') ?? 'input'} ${error.message}`)
        .join('; ')}`,
    );
  }

  return result.product;
}

async function publishProduct({store, productId, publicationIds}) {
  const data = await storeExecute({
    store,
    query: PUBLISH_PRODUCT,
    variables: {
      id: productId,
      input: publicationIds.map((publicationId) => ({publicationId})),
    },
    allowMutations: true,
  });

  const result = data.publishablePublish;
  if (result.userErrors.length > 0) {
    throw new Error(
      `${productId}: ${result.userErrors
        .map((error) => `${error.field?.join('.') ?? 'input'} ${error.message}`)
        .join('; ')}`,
    );
  }

  return result.publishable;
}

async function main() {
  loadDotEnv();

  const batch = JSON.parse(await readFile(batchPath, 'utf8'));
  const store = resolveStore(batch);
  const productStatus = resolveProductStatus(batch);
  const publicationIds = resolvePublicationIds(batch);
  const publicationMode = publicationIds
    ? `and published to ${publicationIds.length} publication(s)`
    : 'and left unpublished';
  const products = selectedProducts(batch);

  if (!live) {
    console.log(
      `Dry run: ${products.length} products would be created as ${productStatus} manual-fulfillment products, or updated while preserving existing product status, on ${store} ${publicationMode}.`,
    );
    for (const product of products) {
      console.log(
        `- ${product.title} (${cartesian(product.options).length} variants) -> ${product.handle}`,
      );
    }
    console.log('Run with --live only after explicit approval.');
    return;
  }

  const report = {
    store,
    publicationIds,
    createdAt: new Date().toISOString(),
    fulfillmentMode: 'manual',
    productStatus,
    products: [],
  };

  for (const product of products) {
    console.log(`Listing ${product.title}...`);
    const existing = await findExistingProduct(store, product.handle);
    const shopifyProduct = await upsertProduct({
      store,
      product,
      existing,
      productStatus,
    });
    const publication = publicationIds
      ? await publishProduct({
          store,
          productId: shopifyProduct.id,
          publicationIds,
        })
      : null;
    report.products.push({
      handle: shopifyProduct.handle,
      title: shopifyProduct.title,
      id: shopifyProduct.id,
      status: shopifyProduct.status,
      variants: shopifyProduct.variants.nodes.length,
      publication,
      mode: existing ? 'updated' : 'created',
    });
  }

  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`Live publish report written to ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

/* eslint-enable no-console */
