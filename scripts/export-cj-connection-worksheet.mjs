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
const outputCsvPath = path.join(
  repoRoot,
  'data/cj-products/cj-shopify-connection-worksheet.csv',
);
const outputJsonPath = path.join(
  repoRoot,
  'data/cj-products/cj-shopify-connection-worksheet.json',
);
const outputMdPath = path.join(
  repoRoot,
  'data/cj-products/cj-connection-checklist.md',
);

const SHOPIFY_CLI = 'npm';

const PRODUCT_CONNECTION_QUERY = `#graphql
  query ClaraCjProducts($query: String!) {
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
        variants(first: 100) {
          nodes {
            id
            title
            sku
            inventoryPolicy
            inventoryItem {
              id
              tracked
            }
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

const HEADERS = [
  'Product Handle',
  'Product Title',
  'Product Status',
  'Shopify Product ID',
  'Shopify Product GID',
  'Shopify Admin URL',
  'CJ Source SKU',
  'CJ Product URL',
  'Variant Title',
  'Variant SKU',
  'Shopify Variant ID',
  'Shopify Variant GID',
  'Inventory Item ID',
  'Inventory Item GID',
  'Inventory Tracked',
  'Inventory Policy',
  'Option 1 Name',
  'Option 1 Value',
  'Option 2 Name',
  'Option 2 Value',
  'Option 3 Name',
  'Option 3 Value',
  'CJ Connection Step',
  'Connection Status',
];

function csvEscape(value) {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function gidNumber(gid) {
  return gid?.split('/').pop() ?? '';
}

function adminProductUrl(productId) {
  return `https://admin.shopify.com/store/${adminStoreSlug}/products/${gidNumber(
    productId,
  )}`;
}

let adminStoreSlug = '';

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

function queryForHandles(handles) {
  return handles.map((handle) => `handle:${handle}`).join(' OR ');
}

function optionColumns(selectedOptions) {
  return [0, 1, 2].flatMap((index) => {
    const option = selectedOptions[index];
    return [option?.name ?? '', option?.value ?? ''];
  });
}

function buildRows(products, sourceByHandle) {
  return products.flatMap((product) => {
    const source = sourceByHandle.get(product.handle);
    const sourceSku = product.sourceSku?.value ?? source?.sourceSku ?? '';
    const sourceUrl = product.sourceUrl?.value ?? source?.cjUrl ?? '';

    return product.variants.nodes.map((variant) => {
      const [
        option1Name,
        option1Value,
        option2Name,
        option2Value,
        option3Name,
        option3Value,
      ] = optionColumns(variant.selectedOptions);

      return {
        'Product Handle': product.handle,
        'Product Title': product.title,
        'Product Status': product.status,
        'Shopify Product ID': gidNumber(product.id),
        'Shopify Product GID': product.id,
        'Shopify Admin URL': adminProductUrl(product.id),
        'CJ Source SKU': sourceSku,
        'CJ Product URL': sourceUrl,
        'Variant Title': variant.title,
        'Variant SKU': variant.sku,
        'Shopify Variant ID': gidNumber(variant.id),
        'Shopify Variant GID': variant.id,
        'Inventory Item ID': gidNumber(variant.inventoryItem?.id),
        'Inventory Item GID': variant.inventoryItem?.id ?? '',
        'Inventory Tracked': variant.inventoryItem?.tracked ? 'TRUE' : 'FALSE',
        'Inventory Policy': variant.inventoryPolicy,
        'Option 1 Name': option1Name,
        'Option 1 Value': option1Value,
        'Option 2 Name': option2Name,
        'Option 2 Value': option2Value,
        'Option 3 Name': option3Name,
        'Option 3 Value': option3Value,
        'CJ Connection Step':
          'CJ > Products > Store Products > Unconnected > Connect/Add Automatic Connection',
        'Connection Status': 'needs-cj-connection',
      };
    });
  });
}

function buildChecklist(products, rows) {
  const rowsByHandle = new Map();

  for (const row of rows) {
    const handle = row['Product Handle'];
    const group = rowsByHandle.get(handle) ?? [];
    group.push(row);
    rowsByHandle.set(handle, group);
  }

  return [
    '# CJ Connection Checklist',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Use this in CJ Dropshipping at `Products > Store Products > Unconnected > Connect` or `Add Automatic Connection`.',
    '',
    ...products.flatMap((product, index) => {
      const productRows = rowsByHandle.get(product.handle) ?? [];
      const sourceSku = productRows[0]?.['CJ Source SKU'] ?? '';
      const sourceUrl = productRows[0]?.['CJ Product URL'] ?? '';
      const adminUrl = productRows[0]?.['Shopify Admin URL'] ?? '';

      return [
        `## ${index + 1}. ${product.title}`,
        '',
        `- Handle: \`${product.handle}\``,
        `- Shopify product ID: \`${product.id}\``,
        `- Shopify admin: ${adminUrl}`,
        `- CJ source SKU: \`${sourceSku}\``,
        `- CJ product URL: ${sourceUrl}`,
        `- Variants to connect: ${productRows.length}`,
        '',
        '| Variant | Shopify variant ID | Shopify SKU | Option values | Status |',
        '| --- | --- | --- | --- | --- |',
        ...productRows.map((row) => {
          const options = [
            row['Option 1 Value'],
            row['Option 2 Value'],
            row['Option 3 Value'],
          ]
            .filter(Boolean)
            .join(' / ');

          return `| ${row['Variant Title']} | ${row['Shopify Variant ID']} | \`${row['Variant SKU']}\` | ${options} | ${row['Connection Status']} |`;
        }),
        '',
      ];
    }),
  ].join('\n');
}

async function main() {
  loadDotEnv();

  const batch = JSON.parse(await readFile(batchPath, 'utf8'));
  const store = resolveStore(batch);
  adminStoreSlug =
    process.env.SHOPIFY_ADMIN_STORE_SLUG || store.replace(/\.myshopify\.com$/, '');
  const sourceByHandle = new Map(
    batch.products.map((product) => [product.handle, product]),
  );
  const handles = batch.products.map((product) => product.handle);
  const data = await storeExecute({
    store,
    query: PRODUCT_CONNECTION_QUERY,
    variables: {query: queryForHandles(handles)},
  });
  const productOrder = new Map(handles.map((handle, index) => [handle, index]));
  const products = [...data.products.nodes].sort(
    (a, b) => productOrder.get(a.handle) - productOrder.get(b.handle),
  );
  const rows = buildRows(products, sourceByHandle);
  const missingHandles = handles.filter(
    (handle) => !products.some((product) => product.handle === handle),
  );
  const csv = [
    HEADERS.join(','),
    ...rows.map((row) => HEADERS.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');

  await mkdir(path.dirname(outputCsvPath), {recursive: true});
  await writeFile(outputCsvPath, `${csv}\n`, 'utf8');
  await writeFile(
    outputJsonPath,
    JSON.stringify(
      {
        store,
        generatedAt: new Date().toISOString(),
        productCount: products.length,
        variantCount: rows.length,
        missingHandles,
        rows,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );
  await writeFile(outputMdPath, `${buildChecklist(products, rows)}\n`, 'utf8');

  console.warn(
    `Generated ${rows.length} CJ connection rows for ${products.length} products.`,
  );
  console.warn(`CSV: ${outputCsvPath}`);
  console.warn(`JSON: ${outputJsonPath}`);
  console.warn(`Checklist: ${outputMdPath}`);

  if (missingHandles.length > 0) {
    console.warn(`Missing Shopify products: ${missingHandles.join(', ')}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
