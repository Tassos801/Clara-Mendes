/**
 * Pure helpers for scripts/product.mjs — everything that can be decided from
 * data/print-catalog.json without touching the network, so it is covered by
 * scripts/productPipeline.node-test.mjs.
 */

import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  PRINT_SIZES,
  printHandle,
  printProductTitle,
  printSku,
} from '../../app/lib/printCatalog.ts';

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
export const CATALOG_PATH = path.join(REPO_ROOT, 'data/print-catalog.json');

export const VENDOR = 'Clara Mendes';
export const PRODUCT_TYPE = 'Art Prints';
/** Removed by `release`; their presence marks a draft as not yet sellable. */
export const PENDING_TAGS = [
  'Prodigi Mapping Pending',
  'Print File Review Pending',
];
const BASE_TAGS = [
  'Clara Mendes Original',
  'Wall Art',
  'Art Print',
  '4:5 Ratio',
];

/** Below this native resolution the owner must accept the softness explicitly. */
export const MIN_NATIVE_PPI = 150;

export function findCollection(catalog, slug) {
  const collection = catalog.collections.find((entry) => entry.slug === slug);
  if (!collection) {
    const known = catalog.collections.map((entry) => entry.slug).join(', ');
    throw new Error(
      `Unknown collection "${slug}". Known: ${known || '(none)'}`,
    );
  }
  return collection;
}

export function selectPrints(collection, only) {
  if (!only?.length) return collection.prints;
  const unknown = only.filter(
    (slug) => !collection.prints.some((print) => print.slug === slug),
  );
  if (unknown.length)
    throw new Error(
      `Unknown print(s) in ${collection.slug}: ${unknown.join(', ')}`,
    );
  return collection.prints.filter((print) => only.includes(print.slug));
}

export function sizeLabel(size) {
  return PRINT_SIZES[size].label;
}

/** "8 × 10 in" → "8 × 10", for prose that ends in "inch". */
function bareSize(size) {
  return sizeLabel(size).replace(/ in$/, '');
}

export function sizeBullet(collection) {
  const sizes = collection.variants.map((variant) => bareSize(variant.size));
  if (sizes.length === 1) return `Unframed ${sizes[0]} inch portrait print`;
  const list =
    sizes.length === 2
      ? sizes.join(' and ')
      : `${sizes.slice(0, -1).join(', ')}, and ${sizes.at(-1)}`;
  return `Unframed portrait print in ${list} inch sizes`;
}

const escapeHtml = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

export function printFileName(print, size) {
  return `${print.slug}-${size}-300dpi.jpg`;
}

/**
 * Reconcile the catalog's ordered size list with one existing Shopify product.
 * Existing variants are never replaced: a conflict aborts before any mutation.
 */
export function variantExpansionPlan(collection, print, product) {
  const handle = printHandle(print);
  if (!product?.id || product.handle !== handle) {
    throw new Error(`${handle}: Shopify product identity does not match`);
  }

  const expected = new Map(
    collection.variants.map((variant) => [
      printSku(collection, print, variant.size),
      variant,
    ]),
  );
  const existingBySku = new Map();
  for (const node of product.variants?.nodes ?? []) {
    if (!expected.has(node.sku)) {
      throw new Error(`${handle}: unexpected SKU ${node.sku || '(missing)'}`);
    }
    if (existingBySku.has(node.sku)) {
      throw new Error(`${handle}: duplicate SKU ${node.sku}`);
    }
    existingBySku.set(node.sku, node);
  }

  return collection.variants.map((variant) => {
    const sku = printSku(collection, print, variant.size);
    const existing = existingBySku.get(sku);
    if (existing) {
      const selected = new Map(
        (existing.selectedOptions ?? []).map((option) => [
          option.name,
          option.value,
        ]),
      );
      const issues = [];
      if (selected.get('Size') !== sizeLabel(variant.size))
        issues.push(`Size is ${selected.get('Size') || 'missing'}`);
      if (selected.get('Finish') !== variant.finish)
        issues.push(`Finish is ${selected.get('Finish') || 'missing'}`);
      if (existing.price !== variant.priceEUR)
        issues.push(`price is ${existing.price}`);
      if (existing.inventoryPolicy !== 'DENY')
        issues.push(`inventory policy is ${existing.inventoryPolicy}`);
      if (existing.inventoryItem?.requiresShipping !== true)
        issues.push('does not require shipping');
      if (issues.length) {
        throw new Error(`${handle} ${sku}: ${issues.join('; ')}`);
      }
    }
    return {action: existing ? 'present' : 'create', existing, sku, variant};
  });
}

export function buildStagedVariantInput(row) {
  return {
    inventoryItem: {
      requiresShipping: true,
      sku: row.sku,
      tracked: true,
    },
    inventoryPolicy: 'DENY',
    optionValues: [
      {name: sizeLabel(row.variant.size), optionName: 'Size'},
      {name: row.variant.finish, optionName: 'Finish'},
    ],
    price: row.variant.priceEUR,
    taxable: true,
  };
}

/** The ProductSetInput for a new Draft, minus the uploaded image file. */
export function buildProductSetInput(collection, print) {
  const finishes = [...new Set(collection.variants.map((v) => v.finish))];
  return {
    descriptionHtml: [
      `<p>${escapeHtml(print.description)}</p>`,
      `<p>${escapeHtml(collection.collectionCopy)}</p>`,
      `<ul><li>200gsm enhanced matte fine-art paper</li><li>Giclée printed with archival pigment inks</li><li>${sizeBullet(collection)}</li></ul>`,
      '<p>Printed to order. Frame not included. Screen and print colours can vary slightly.</p>',
    ].join('\n'),
    handle: printHandle(print),
    productOptions: [
      {
        name: 'Size',
        position: 1,
        values: collection.variants.map((v) => ({name: sizeLabel(v.size)})),
      },
      {name: 'Finish', position: 2, values: finishes.map((name) => ({name}))},
    ],
    productType: PRODUCT_TYPE,
    seo: {
      description: `${print.description} ${collection.seoSuffix}`,
      title: `${printProductTitle(print)} | ${VENDOR}`,
    },
    status: 'DRAFT',
    tags: [
      ...BASE_TAGS.slice(0, 3),
      collection.title,
      BASE_TAGS[3],
      ...PENDING_TAGS,
    ],
    title: printProductTitle(print),
    variants: collection.variants.map((variant) => ({
      // Tracked at zero with DENY keeps a Draft unbuyable even if it is
      // activated by accident; `release` switches tracking off.
      inventoryItem: {requiresShipping: true, tracked: true},
      inventoryPolicy: 'DENY',
      optionValues: [
        {name: sizeLabel(variant.size), optionName: 'Size'},
        {name: variant.finish, optionName: 'Finish'},
      ],
      price: variant.priceEUR,
      sku: printSku(collection, print, variant.size),
      taxable: true,
    })),
    vendor: VENDOR,
  };
}

export function buildReleasedProductUpdateInput(collection, print, id) {
  const staged = buildProductSetInput(collection, print);
  return {
    descriptionHtml: staged.descriptionHtml,
    id,
    seo: staged.seo,
  };
}

/** Where a print stands and the one command that moves it forward. */
export function printStatus(collection, print, {hasWebImage = true} = {}) {
  const sizes = collection.variants.map((variant) => variant.size);
  const staged =
    Boolean(print.shopify?.productId) &&
    sizes.every((size) => print.shopify?.variantIds?.[size]);
  const mapped = sizes.every(
    (size) =>
      print.prodigi?.[size]?.verified &&
      print.prodigi?.[size]?.channelProductId,
  );
  const allSizesReleased = sizes.every((size) =>
    (print.releasedSizes ?? []).includes(size),
  );
  let next = 'verify';
  if (!hasWebImage) next = 'prepare';
  else if (!print.shopify?.productId) next = 'stage';
  else if (!staged) next = print.released ? 'expand' : 'stage';
  else if (!mapped) next = 'handoff → map in Prodigi → mapped';
  else if (!print.released || !allSizesReleased) next = 'media → release';
  return {mapped, next, released: print.released === true, staged};
}

export function handoffRows(collection, prints, {printDir, sha256}) {
  return prints.flatMap((print) =>
    collection.variants.map((variant) => {
      const file = path.join(printDir, printFileName(print, variant.size));
      return {
        print: print.title,
        sku: printSku(collection, print, variant.size),
        shopifyProductId: print.shopify?.productId ?? '',
        shopifyVariantId: print.shopify?.variantIds?.[variant.size] ?? '',
        size: sizeLabel(variant.size),
        finish: variant.finish,
        providerSku: variant.providerSku,
        printFile: file.replaceAll('\\', '/'),
        sha256: sha256(file),
        prodigiChannelProductId:
          print.prodigi?.[variant.size]?.channelProductId ?? '',
        verified: print.prodigi?.[variant.size]?.verified === true,
      };
    }),
  );
}

export function toCsv(rows) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
  return (
    [
      keys.map(quote).join(','),
      ...rows.map((row) => keys.map((key) => quote(row[key])).join(',')),
    ].join('\r\n') + '\r\n'
  );
}

/** `slug=channelProductId` pairs from the command line. */
export function parseMappings(collection, pairs) {
  if (!pairs.length)
    throw new Error(
      'Pass at least one <print-slug>=<prodigi channel product id>.',
    );
  return pairs.map((pair) => {
    const [slug, id] = pair.split('=');
    if (!collection.prints.some((print) => print.slug === slug))
      throw new Error(`Unknown print "${slug}" in ${collection.slug}`);
    if (!/^\d+$/.test(id ?? ''))
      throw new Error(
        `"${pair}": the Prodigi channel product id must be digits`,
      );
    return {id, slug};
  });
}

/**
 * Machine-local paths, because credentials and launch evidence live outside
 * any one worktree. Lookup order for each: environment variable, then
 * ~/.clara-mendes.json ({"envDir": "...", "launchDir": "..."}), then the main
 * worktree of this repository.
 */
export function resolveLocalPaths(env = process.env) {
  let config = {};
  const configPath = path.join(homedir(), '.clara-mendes.json');
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, 'utf8'));
    } catch {
      throw new Error(`${configPath} is not valid JSON.`);
    }
  }
  const main = mainWorktree();
  return {
    envDirs: [
      env.CLARA_ENV_DIR,
      config.envDir,
      process.cwd(),
      REPO_ROOT,
      main,
    ].filter((dir, index, all) => dir && all.indexOf(dir) === index),
    launchRoot:
      env.CLARA_LAUNCH_DIR ||
      config.launchDir ||
      path.join(main ?? REPO_ROOT, 'output', 'launches'),
  };
}

function mainWorktree() {
  try {
    const listing = execFileSync('git', ['worktree', 'list', '--porcelain'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const first = listing
      .split(/\r?\n/)
      .find((line) => line.startsWith('worktree '));
    return first ? path.resolve(first.slice('worktree '.length)) : null;
  } catch {
    return null;
  }
}

/**
 * Shopify reformats stored HTML (it re-indents list items), so readbacks are
 * compared with inter-tag whitespace removed rather than byte for byte.
 */
export function normalizeHtml(html) {
  return String(html ?? '')
    .replace(/>\s+</g, '><')
    .trim();
}
