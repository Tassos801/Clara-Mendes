/* eslint-disable no-console */
import {execFile} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const batchPath = path.join(repoRoot, 'data/cj-products/launch-batch.json');
const outputPath = path.join(
  repoRoot,
  'data/cj-products/shopify-product-audit-report.json',
);
const SHOPIFY_CLI = 'npm';

const PRODUCT_AUDIT_QUERY = `#graphql
  query ClaraCjProductAudit($query: String!) {
    products(first: 20, query: $query) {
      nodes {
        id
        handle
        title
        status
        tags
        sourceSku: metafield(namespace: "cjdropshipping", key: "source_sku") {
          value
        }
        sourceUrl: metafield(namespace: "cjdropshipping", key: "source_url") {
          value
        }
        mediaCount {
          count
        }
        resourcePublicationsCount {
          count
        }
        resourcePublications(first: 10) {
          nodes {
            isPublished
            publication {
              id
              catalog {
                title
              }
            }
          }
        }
        variants(first: 100) {
          nodes {
            id
            title
            sku
            price
            compareAtPrice
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
`;

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

function parseCliJson(output) {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');

  if (start === -1 || end === -1) {
    throw new Error(`Shopify CLI did not return JSON: ${output}`);
  }

  return JSON.parse(output.slice(start, end + 1));
}

async function storeExecute({store, query, variables}) {
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

  const {stdout, stderr} = await execFileAsync(SHOPIFY_CLI, args, {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 10,
  });

  if (stderr.trim()) process.stderr.write(stderr);
  return parseCliJson(stdout);
}

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

function expectedVariants(product) {
  return cartesian(product.options).map((optionValues) => {
    const defaults = defaultsFor(product, optionValues);

    return {
      sku: [
        'CM',
        product.sourceSku,
        ...optionValues.map((option) => slug(option.value)),
      ].join('-'),
      title: optionValues.map((option) => option.value).join(' / '),
      price: defaults.price,
      compareAtPrice: defaults.compareAtPrice,
    };
  });
}

function normalizeMoney(value) {
  return Number(value ?? 0).toFixed(2);
}

function queryForHandles(handles) {
  return handles.map((handle) => `handle:${handle}`).join(' OR ');
}

function auditProduct(sourceProduct, shopifyProduct) {
  if (!shopifyProduct) {
    const missingVariants = expectedVariants(sourceProduct).map(
      (variant) => variant.sku,
    );

    return {
      handle: sourceProduct.handle,
      title: sourceProduct.title,
      id: null,
      status: 'missing',
      mediaCount: 0,
      publicationCount: 0,
      publications: [],
      expectedVariantCount: missingVariants.length,
      actualVariantCount: 0,
      missingVariants,
      extraVariants: [],
      priceMismatches: [],
      warnings: [],
      issues: ['missing_product'],
    };
  }

  const issues = [];
  const warnings = [];
  const expected = expectedVariants(sourceProduct);
  const mediaCount = shopifyProduct.mediaCount?.count ?? 0;
  const liveVariantsBySku = new Map(
    shopifyProduct.variants.nodes.map((variant) => [variant.sku, variant]),
  );
  const expectedSkuSet = new Set(expected.map((variant) => variant.sku));
  const missingVariants = expected
    .filter((variant) => !liveVariantsBySku.has(variant.sku))
    .map((variant) => variant.sku);
  const extraVariants = shopifyProduct.variants.nodes
    .filter((variant) => !expectedSkuSet.has(variant.sku))
    .map((variant) => variant.sku);
  const priceMismatches = expected.flatMap((variant) => {
    const liveVariant = liveVariantsBySku.get(variant.sku);
    if (!liveVariant) return [];

    const mismatches = [];

    if (normalizeMoney(liveVariant.price) !== normalizeMoney(variant.price)) {
      mismatches.push({
        sku: variant.sku,
        field: 'price',
        expected: normalizeMoney(variant.price),
        actual: normalizeMoney(liveVariant.price),
      });
    }

    if (
      normalizeMoney(liveVariant.compareAtPrice) !==
      normalizeMoney(variant.compareAtPrice)
    ) {
      mismatches.push({
        sku: variant.sku,
        field: 'compareAtPrice',
        expected: normalizeMoney(variant.compareAtPrice),
        actual: normalizeMoney(liveVariant.compareAtPrice),
      });
    }

    return mismatches;
  });

  if (shopifyProduct.title !== sourceProduct.title) issues.push('title_mismatch');
  if (shopifyProduct.sourceSku?.value !== sourceProduct.sourceSku) {
    issues.push('source_sku_mismatch');
  }
  if (shopifyProduct.sourceUrl?.value !== sourceProduct.cjUrl) {
    issues.push('source_url_mismatch');
  }
  if (missingVariants.length > 0) issues.push('missing_variants');
  if (extraVariants.length > 0) issues.push('extra_variants');
  if (priceMismatches.length > 0) issues.push('price_mismatches');
  if (shopifyProduct.resourcePublicationsCount.count === 0) {
    issues.push('not_published');
  }
  if (mediaCount === 0) {
    issues.push('missing_product_media');
  } else if (mediaCount < 3) {
    warnings.push('low_product_media_count');
  }

  return {
    handle: sourceProduct.handle,
    title: shopifyProduct.title,
    id: shopifyProduct.id,
    status: shopifyProduct.status,
    mediaCount,
    publicationCount: shopifyProduct.resourcePublicationsCount.count,
    publications: shopifyProduct.resourcePublications.nodes.map((publication) => ({
      id: publication.publication.id,
      title: publication.publication.catalog?.title ?? '',
      isPublished: publication.isPublished,
    })),
    expectedVariantCount: expected.length,
    actualVariantCount: shopifyProduct.variants.nodes.length,
    missingVariants,
    extraVariants,
    priceMismatches,
    warnings,
    issues,
  };
}

async function main() {
  loadDotEnv();

  const batch = JSON.parse(await readFile(batchPath, 'utf8'));
  const store = resolveStore(batch);
  const handles = batch.products.map((product) => product.handle);
  const data = await storeExecute({
    store,
    query: PRODUCT_AUDIT_QUERY,
    variables: {query: queryForHandles(handles)},
  });
  const shopifyProductsByHandle = new Map(
    data.products.nodes.map((product) => [product.handle, product]),
  );
  const products = batch.products.map((product) =>
    auditProduct(product, shopifyProductsByHandle.get(product.handle)),
  );
  const summary = {
    productCount: products.length,
    missingProductCount: products.filter((product) =>
      product.issues.includes('missing_product'),
    ).length,
    activeProductCount: products.filter((product) => product.status === 'ACTIVE')
      .length,
    publishedProductCount: products.filter(
      (product) => product.publicationCount > 0,
    ).length,
    productIssueCount: products.filter((product) => product.issues.length > 0)
      .length,
    productWarningCount: products.filter(
      (product) => product.warnings.length > 0,
    ).length,
    imageWarningCount: products.filter((product) =>
      product.warnings.includes('low_product_media_count'),
    ).length,
    variantIssueCount: products.reduce(
      (sum, product) =>
        sum +
        (product.missingVariants?.length ?? 0) +
        (product.extraVariants?.length ?? 0) +
        (product.priceMismatches?.length ?? 0),
      0,
    ),
  };
  const report = {
    store,
    generatedAt: new Date().toISOString(),
    summary,
    products,
  };

  await mkdir(path.dirname(outputPath), {recursive: true});
  await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(
    `Audited ${summary.productCount} products on ${store}: ${summary.activeProductCount} active, ${summary.publishedProductCount} published, ${summary.productIssueCount} with issues, ${summary.productWarningCount} with warnings.`,
  );
  console.log(`Variant issues: ${summary.variantIssueCount}`);
  console.log(`Report: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

/* eslint-enable no-console */
