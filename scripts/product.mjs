#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * The one command for adding prints. Every step reads data/print-catalog.json,
 * is safe to re-run, defaults to a dry run where it would write to Shopify,
 * and leaves evidence under the launch folder.
 *
 *   npm run product -- status   [collection]
 *   npm run product -- prepare  <collection> [--only a,b]
 *   npm run product -- stage    <collection> [--only a,b] [--apply]
 *   npm run product -- expand   <collection> [--only a,b] [--apply]
 *   npm run product -- handoff  <collection> [--only a,b]
 *   npm run product -- mapped   <collection> --size 8x10 <print>=<prodigi id> ...
 *   npm run product -- release  <collection> [--only a,b] [--apply]
 *   npm run product -- verify   <collection> [--origin https://…]
 *
 * Runbook: docs/add-products-runbook.md
 */

import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {
  PRINT_SIZES,
  printHandle,
  printImagePath,
  printProductTitle,
  printSku,
  validatePrintCatalog,
} from '../app/lib/printCatalog.ts';
import {mutationErrors, resolveAdminClient} from './lib/admin.mjs';
import {getRequiredEnv, loadLocalEnv, normalizeShopDomain} from './lib/env.mjs';
import {
  buildProductSetInput,
  buildReleasedProductUpdateInput,
  buildStagedVariantInput,
  CATALOG_PATH,
  findCollection,
  handoffRows,
  MIN_NATIVE_PPI,
  parseMappings,
  PENDING_TAGS,
  printFileName,
  printStatus,
  REPO_ROOT,
  resolveLocalPaths,
  selectPrints,
  sizeLabel,
  toCsv,
  variantExpansionPlan,
  VENDOR,
} from './lib/product-pipeline.mjs';

const DEFAULT_ORIGIN = 'https://shopclaramendes.com';

const [step = 'status', ...rest] = process.argv.slice(2);
const flags = new Set(
  rest.filter((arg) => arg.startsWith('--') && !arg.includes('=')),
);
const option = (name) => {
  const inline = rest.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = rest.indexOf(`--${name}`);
  return index >= 0 ? rest[index + 1] : undefined;
};
const optionValues = new Set(
  ['only', 'size', 'origin'].map((name) => option(name)).filter(Boolean),
);
const positional = rest.filter(
  (arg) => !arg.startsWith('--') && !optionValues.has(arg),
);
const apply = flags.has('--apply');
const only = option('only')?.split(',').filter(Boolean);

const steps = {expand, handoff, mapped, prepare, release, stage, status, verify};
if (!steps[step]) {
  console.error(
    `Unknown step "${step}". Steps: ${Object.keys(steps).sort().join(', ')}`,
  );
  process.exit(2);
}

const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
const problems = validatePrintCatalog(catalog);
if (problems.length) {
  console.error(
    `data/print-catalog.json is invalid:\n- ${problems.join('\n- ')}`,
  );
  process.exit(1);
}
const local = resolveLocalPaths();

try {
  await steps[step]();
} catch (error) {
  console.error(`\n${step} failed: ${error.message}`);
  process.exit(1);
}

// ---------------------------------------------------------------- steps --

function status() {
  const wanted = positional[0];
  const collections = wanted
    ? [findCollection(catalog, wanted)]
    : catalog.collections;
  for (const collection of collections) {
    console.log(
      `\n${collection.title} (${collection.slug}) — ${describeVariants(collection)}`,
    );
    console.table(
      collection.prints.map((print) => {
        const state = printStatus(collection, print, {
          hasWebImage: existsSync(webImage(collection, print)),
        });
        return {
          print: print.slug,
          staged: state.staged,
          mapped: state.mapped,
          released: state.released,
          next: state.next,
        };
      }),
    );
  }
  console.log(`Launch evidence: ${local.launchRoot}`);
}

function prepare() {
  const {collection, prints, launchDir} = context();
  const plan = {
    collection: collection.slug,
    sourceDir: path.join(launchDir, 'source'),
    printDir: path.join(launchDir, 'print'),
    webDir: path.dirname(webImage(collection, prints[0])),
    reportPath: path.join(launchDir, 'asset-validation.json'),
    prints: prints.map((print) => ({
      slug: print.slug,
      sizes: collection.variants.map((variant) => ({
        key: variant.size,
        fileName: printFileName(print, variant.size),
        ...PRINT_SIZES[variant.size],
      })),
    })),
  };
  mkdirSync(plan.sourceDir, {recursive: true});
  const planPath = path.join(launchDir, 'prepare-plan.json');
  writeJson(planPath, plan);
  execFileSync(
    process.env.PYTHON || 'python',
    [
      path.join(REPO_ROOT, 'scripts/prepare-print-assets.py'),
      '--plan',
      planPath,
    ],
    {stdio: 'inherit'},
  );

  const report = JSON.parse(readFileSync(plan.reportPath, 'utf8'));
  const soft = [];
  for (const file of report.files) {
    const print = collection.prints.find((entry) => entry.slug === file.slug);
    print.source = {
      ...print.source,
      nativeHeight: file.nativeHeight,
      nativeWidth: file.nativeWidth,
      sourceSha256: file.sourceSha256,
    };
    for (const size of file.sizes) {
      if (size.nativePpi < MIN_NATIVE_PPI)
        soft.push(`${file.slug} ${size.size}: ${size.nativePpi} PPI native`);
      if (size.croppedFraction > 0.01)
        soft.push(
          `${file.slug} ${size.size}: fitting crops ${(size.croppedFraction * 100).toFixed(1)}% of the artwork`,
        );
    }
  }
  saveCatalog();
  console.table(
    report.files.flatMap((file) =>
      file.sizes.map((size) => ({
        print: file.slug,
        size: size.size,
        pixels: size.pixels.join('×'),
        nativePpi: size.nativePpi,
        cropped: `${(size.croppedFraction * 100).toFixed(1)}%`,
      })),
    ),
  );
  if (soft.length)
    console.log(
      `\nNeeds the owner's explicit acceptance before release (below ${MIN_NATIVE_PPI} PPI native, or cropped):\n- ${soft.join('\n- ')}`,
    );
  console.log(
    `\nWeb images: ${path.relative(REPO_ROOT, plan.webDir)} (commit these)\nPrint files: ${plan.printDir}`,
  );
}

async function stage() {
  const {collection, prints, launchDir} = context();
  for (const print of prints) {
    assert.ok(
      existsSync(webImage(collection, print)),
      `${print.slug}: run prepare first (no web image)`,
    );
  }
  const plan = prints.map((print) => ({
    print,
    input: buildProductSetInput(collection, print),
  }));
  const admin = await adminClient();
  const before = await vendorProducts(admin);
  const existing = new Map(before.map((product) => [product.handle, product]));

  const actions = plan.map(({print, input}) => {
    const found = existing.get(input.handle);
    if (!found) return {print, input, action: 'create'};
    const skus = found.variants.nodes.map((variant) => variant.sku).sort();
    assert.deepEqual(
      skus,
      input.variants.map((variant) => variant.sku).sort(),
      `${input.handle} already exists in Shopify with different SKUs — resolve by hand.`,
    );
    return {print, input, found, action: 'present'};
  });
  console.table(
    actions.map(({input, found, action}) => ({
      handle: input.handle,
      action: action === 'create' ? 'create Draft' : `already ${found.status}`,
      skus: input.variants.map((variant) => variant.sku).join(' '),
      prices: input.variants.map((variant) => variant.price).join(' '),
    })),
  );

  if (!apply) {
    console.log(
      'Dry run — nothing written to Shopify. Re-run with --apply to create the Drafts.',
    );
    return;
  }

  const created = [];
  for (const entry of actions.filter(
    (candidate) => candidate.action === 'create',
  )) {
    const {print, input} = entry;
    const resourceUrl = await uploadImage(
      admin,
      webImage(collection, print),
      `cm-${collection.slug}-${print.slug}.webp`,
    );
    const result = await admin(
      `mutation StagePrint($input: ProductSetInput!) {
        productSet(input: $input, synchronous: true) {
          product { id handle status variants(first: 10) { nodes { id sku price selectedOptions { name value } } } }
          userErrors { code field message }
        }
      }`,
      {
        input: {
          ...input,
          files: [
            {
              alt: print.alt,
              contentType: 'IMAGE',
              filename: `cm-${collection.slug}-${print.slug}.webp`,
              originalSource: resourceUrl,
            },
          ],
        },
      },
    );
    mutationErrors(result.data.productSet, `Create ${input.handle}`);
    const product = result.data.productSet.product;
    assert.equal(product.status, 'DRAFT');
    assert.equal(
      product.handle,
      input.handle,
      'Shopify changed the handle — a product with this handle may already exist.',
    );
    entry.found = product;
    created.push(product.handle);
    console.log(`CREATED DRAFT ${product.handle} ${product.id}`);
    recordIds(collection, [entry]);
    saveCatalog();
  }

  // Nothing else in the catalogue may move because of a launch.
  const after = await vendorProducts(admin);
  const planned = new Set(plan.map(({input}) => input.handle));
  for (const old of before) {
    if (planned.has(old.handle)) continue;
    assert.deepEqual(
      after.find((product) => product.id === old.id),
      old,
      `Existing product changed during staging: ${old.handle}`,
    );
  }
  recordIds(collection, actions);
  saveCatalog();
  writeJson(path.join(launchDir, `stage-${stamp()}.json`), {
    created,
    existingProductsChecked: before.filter(
      (product) => !planned.has(product.handle),
    ).length,
    existingProductsUnchanged: true,
    products: after.filter((product) => planned.has(product.handle)),
  });
  console.log(
    `\nStaged ${created.length} new Draft(s); ids written to data/print-catalog.json. Next: handoff.`,
  );
}

async function expand() {
  const {collection, prints, launchDir} = context();
  const admin = await adminClient();
  const before = await vendorProducts(admin);
  const byHandle = new Map(before.map((product) => [product.handle, product]));
  const work = prints.map((print) => {
    assert.equal(
      print.released,
      true,
      `${print.slug}: expand is only for an already released print`,
    );
    const product = byHandle.get(printHandle(print));
    assert.ok(product, `${print.slug}: Shopify product not found`);
    assert.equal(
      product.status,
      'ACTIVE',
      `${print.slug}: expected ACTIVE before expansion`,
    );
    return {
      plan: variantExpansionPlan(collection, print, product),
      print,
      product,
    };
  });

  console.table(
    work.flatMap(({plan, print}) =>
      plan.map((row) => ({
        print: print.slug,
        size: row.variant.size,
        sku: row.sku,
        price: row.variant.priceEUR,
        action: row.action === 'create' ? 'stage unavailable' : 'preserve',
      })),
    ),
  );
  if (!apply) {
    console.log(
      'Dry run — nothing written. Re-run with --apply to stage only the missing variants.',
    );
    return;
  }

  let created = 0;
  for (const entry of work) {
    const missing = entry.plan.filter((row) => row.action === 'create');
    if (!missing.length) continue;
    const result = await admin(
      `mutation ExpandPrint($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkCreate(productId: $productId, variants: $variants) {
          productVariants { id sku price selectedOptions { name value } inventoryItem { requiresShipping tracked } inventoryPolicy }
          userErrors { code field message }
        }
      }`,
      {
        productId: entry.product.id,
        variants: missing.map(buildStagedVariantInput),
      },
    );
    const payload = result.data.productVariantsBulkCreate;
    mutationErrors(payload, `Expand ${entry.print.slug}`);
    assert.equal(
      payload.productVariants.length,
      missing.length,
      `${entry.print.slug}: Shopify created an unexpected variant count`,
    );
    created += payload.productVariants.length;
  }

  const after = await vendorProducts(admin);
  const scoped = new Set(prints.map(printHandle));
  for (const old of before) {
    const current = after.find((product) => product.id === old.id);
    assert.ok(current, `Shopify product disappeared: ${old.handle}`);
    if (!scoped.has(old.handle)) {
      assert.deepEqual(current, old, `Unrelated product changed: ${old.handle}`);
      continue;
    }
    for (const oldVariant of old.variants.nodes) {
      assert.deepEqual(
        current.variants.nodes.find((variant) => variant.id === oldVariant.id),
        oldVariant,
        `${old.handle}: existing variant changed during expansion`,
      );
    }
  }
  const scopedAfter = after.filter((product) => scoped.has(product.handle));
  for (const {print} of work) {
    const product = scopedAfter.find(
      (candidate) => candidate.handle === printHandle(print),
    );
    const plan = variantExpansionPlan(collection, print, product);
    assert.ok(plan.every((row) => row.action === 'present'));
    recordIds(collection, [{found: product, print}]);
  }
  saveCatalog();
  writeJson(path.join(launchDir, `expand-${stamp()}.json`), {
    before: before.filter((product) => scoped.has(product.handle)),
    after: scopedAfter,
    created,
    unrelatedProductsChecked: before.filter(
      (product) => !scoped.has(product.handle),
    ).length,
    unrelatedProductsUnchanged: true,
  });
  console.log(
    `\nStaged ${created} unavailable variant(s); existing variants and unrelated products are unchanged.`,
  );
}

function handoff() {
  const {collection, prints, launchDir} = context();
  const printDir = path.join(launchDir, 'print');
  for (const print of prints)
    assert.ok(
      print.shopify?.productId,
      `${print.slug}: run stage --apply first (no Shopify ids)`,
    );
  const rows = handoffRows(collection, prints, {
    printDir,
    sha256: (file) => {
      assert.ok(
        existsSync(file),
        `Missing print file ${file} — run prepare first.`,
      );
      return createHash('sha256').update(readFileSync(file)).digest('hex');
    },
  });
  writeFileSync(path.join(launchDir, 'prodigi-handoff.csv'), toCsv(rows));
  writeFileSync(
    path.join(launchDir, 'prodigi-handoff.md'),
    [
      `# Prodigi mapping — ${collection.title}`,
      '',
      'Prodigi dashboard → Sales channels → Clara Mendes → Products. For every row:',
      'product SKU as listed, **Standard** shipping, print area **100% full bleed**,',
      'image quality **Excellent**, fulfilment **automatic**. Then record the channel',
      'product id with `npm run product -- mapped`.',
      '',
      '| Print | Size | Shopify SKU | Prodigi SKU | Print file | Mapped |',
      '| --- | --- | --- | --- | --- | --- |',
      ...rows.map(
        (row) =>
          `| ${row.print} | ${row.size} | ${row.sku} | ${row.providerSku} | ${path.basename(row.printFile)} | ${row.verified ? `yes (${row.prodigiChannelProductId})` : 'no'} |`,
      ),
      '',
      `Print files: \`${printDir.replaceAll('\\', '/')}\``,
      '',
      'Known dashboard traps (docs/add-products-runbook.md §Prodigi): upload from the',
      'Image library page, not the editor modal; both modals drop the first typed',
      'search; confirm the shipping select took by reloading.',
      '',
    ].join('\n'),
  );
  console.table(
    rows.map(({print, size, sku, providerSku, verified}) => ({
      print,
      size,
      sku,
      providerSku,
      verified,
    })),
  );
  console.log(`Handoff written to ${launchDir}`);
}

function mapped() {
  const {collection} = context({needsLaunchDir: false});
  const size =
    option('size') ??
    (collection.variants.length === 1 ? collection.variants[0].size : null);
  assert.ok(size, 'This collection has several sizes — pass --size <size>.');
  assert.ok(
    collection.variants.some((variant) => variant.size === size),
    `${collection.slug} has no ${size} variant`,
  );
  for (const {slug, id} of parseMappings(collection, positional.slice(1))) {
    const print = collection.prints.find((entry) => entry.slug === slug);
    print.prodigi = {
      ...print.prodigi,
      [size]: {
        channelProductId: id,
        verified: true,
        verifiedAt: new Date().toISOString().slice(0, 10),
      },
    };
    console.log(`${slug} ${size} → Prodigi channel product ${id}`);
  }
  saveCatalog();
}

async function release() {
  const {collection, prints, launchDir} = context();
  for (const print of prints) {
    const state = printStatus(collection, print);
    assert.ok(state.staged, `${print.slug}: not staged`);
    assert.ok(
      state.mapped,
      `${print.slug}: every size needs a verified Prodigi mapping before release`,
    );
  }
  const admin = await adminClient();
  const read = async () =>
    (
      await admin(
        `query ReleaseRead($ids: [ID!]!) {
          nodes(ids: $ids) { ... on Product { id handle status tags descriptionHtml seo { title description } variants(first: 10) { nodes { id sku price inventoryPolicy inventoryItem { tracked } } } } }
        }`,
        {ids: prints.map((print) => print.shopify.productId)},
      )
    ).data.nodes;

  const before = await read();
  const work = prints.map((print) => {
    const product = before.find((node) => node?.id === print.shopify.productId);
    assert.ok(
      product,
      `${print.slug}: Shopify product ${print.shopify.productId} not found`,
    );
    assert.equal(product.handle, printHandle(print));
    for (const variant of collection.variants) {
      const live = product.variants.nodes.find(
        (node) => node.id === print.shopify.variantIds[variant.size],
      );
      assert.ok(live, `${print.slug}: variant ${variant.size} not found`);
      assert.equal(live.sku, printSku(collection, print, variant.size));
      assert.equal(
        live.price,
        variant.priceEUR,
        `${print.slug} ${variant.size}: Shopify price differs from the catalog`,
      );
    }
    return {
      print,
      product,
      untrack: product.variants.nodes.filter(
        (node) => node.inventoryItem.tracked || node.inventoryPolicy !== 'DENY',
      ),
      untag: product.tags.filter((tag) => PENDING_TAGS.includes(tag)),
      activate: product.status !== 'ACTIVE',
    };
  });
  console.table(
    work.map(({print, product, untrack, untag, activate}) => ({
      print: print.slug,
      status: product.status,
      untrackVariants: untrack.length,
      removeTags: untag.length,
      activate,
      flipReleased: !print.released,
      releaseSizes: collection.variants
        .map((variant) => variant.size)
        .filter((size) => !(print.releasedSizes ?? []).includes(size))
        .join(' '),
    })),
  );
  if (!apply) {
    console.log('Dry run — nothing written. Re-run with --apply to release.');
    return;
  }

  for (const {print, product, untrack, untag, activate} of work) {
    if (untrack.length) {
      const result = await admin(
        `mutation Untrack($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) { userErrors { field message } }
        }`,
        {
          productId: product.id,
          variants: untrack.map((node) => ({
            id: node.id,
            inventoryItem: {tracked: false},
            inventoryPolicy: 'DENY',
          })),
        },
      );
      mutationErrors(
        result.data.productVariantsBulkUpdate,
        `Untrack ${print.slug}`,
      );
    }
    if (untag.length) {
      const result = await admin(
        `mutation Untag($id: ID!, $tags: [String!]!) { tagsRemove(id: $id, tags: $tags) { userErrors { field message } } }`,
        {id: product.id, tags: untag},
      );
      mutationErrors(result.data.tagsRemove, `Untag ${print.slug}`);
    }
    if (activate) {
      const result = await admin(
        `mutation Activate($product: ProductUpdateInput!) { productUpdate(product: $product) { product { id status } userErrors { field message } } }`,
        {product: {id: product.id, status: 'ACTIVE'}},
      );
      mutationErrors(result.data.productUpdate, `Activate ${print.slug}`);
    }
    const copy = await admin(
      `mutation UpdateReleasedPrintCopy($product: ProductUpdateInput!) {
        productUpdate(product: $product) {
          product { id descriptionHtml seo { title description } }
          userErrors { field message }
        }
      }`,
      {
        product: buildReleasedProductUpdateInput(
          collection,
          print,
          product.id,
        ),
      },
    );
    mutationErrors(copy.data.productUpdate, `Update copy ${print.slug}`);
  }

  const publication = await publish(
    admin,
    collection,
    work.map(({product}) => product.id),
  );
  const after = await read();
  for (const product of after) {
    assert.equal(product.status, 'ACTIVE');
    assert.ok(!product.tags.some((tag) => PENDING_TAGS.includes(tag)));
    assert.ok(
      product.variants.nodes.every(
        (node) => node.inventoryItem.tracked === false,
      ),
    );
    const print = prints.find(
      (candidate) => printHandle(candidate) === product.handle,
    );
    const expected = buildReleasedProductUpdateInput(
      collection,
      print,
      product.id,
    );
    assert.equal(product.descriptionHtml, expected.descriptionHtml);
    assert.deepEqual(product.seo, expected.seo);
  }

  const storefront = await storefrontProducts(prints);
  const unavailable = [];
  for (const print of prints) {
    const entry = storefront.find(
      (candidate) => candidate.handle === printHandle(print),
    );
    if (!entry?.availableForSale) unavailable.push(printHandle(print));
    for (const variant of collection.variants) {
      const live = entry?.variants.find(
        (candidate) => candidate.sku === printSku(collection, print, variant.size),
      );
      if (
        !live?.availableForSale ||
        Number(live.price.amount) !== Number(variant.priceEUR) ||
        live.price.currencyCode !== 'EUR'
      ) {
        unavailable.push(`${print.slug}/${variant.size}`);
      }
    }
  }
  writeJson(path.join(launchDir, `release-${stamp()}.json`), {
    before,
    after,
    publication,
    storefront,
  });

  if (unavailable.length) {
    console.log(
      `\nActive in Shopify, but not yet sellable through the Storefront API: ${unavailable.join(', ')}.\n` +
        (publication.manual
          ? `Publish by hand — Admin → Products → filter tag "${collection.title}" → select all → ⋯ → Include in sales channels → ${collection.publications.join(' + ')} — then re-run this command.`
          : 'Re-run this command in a minute; publication can lag.') +
        '\n`released` was NOT flipped.',
    );
    process.exit(1);
  }
  for (const print of prints) {
    print.released = true;
    print.releasedSizes = collection.variants.map((variant) => variant.size);
  }
  saveCatalog();
  console.log(
    '\nReleased in Shopify and every catalog size is sellable through the Storefront API. `releasedSizes` written — commit data/print-catalog.json, merge the PR, then run verify.',
  );
}

async function verify() {
  const {collection, launchDir} = context();
  const origin = (option('origin') ?? DEFAULT_ORIGIN).replace(/\/$/, '');
  const released = collection.prints.filter((print) => print.released);
  const staged = collection.prints.filter((print) => !print.released);
  const checks = [];
  const check = (subject, name, ok, detail = '') =>
    checks.push({subject, check: name, ok: Boolean(ok), detail});

  const storefront = await storefrontProducts(released);
  for (const print of released) {
    const entry = storefront.find(
      (candidate) => candidate.handle === printHandle(print),
    );
    check(
      print.slug,
      'storefront: available for sale',
      entry?.availableForSale,
    );
    for (const variant of collection.variants) {
      const live = entry?.variants.find(
        (node) => node.sku === printSku(collection, print, variant.size),
      );
      check(
        print.slug,
        `storefront: ${variant.size} at €${variant.priceEUR}`,
        live?.availableForSale &&
          Number(live.price.amount) === Number(variant.priceEUR),
        live
          ? `${live.price.amount} ${live.price.currencyCode}`
          : 'variant missing',
      );
    }
    const first = entry?.variants[0];
    if (first) {
      const cart = await addToCart(first.id);
      check(
        print.slug,
        'cart: add to cart',
        cart.quantity === 1 && !cart.errors.length,
        cart.errors.join('; ') || `subtotal ${cart.subtotal}`,
      );
    }
  }

  const sitemap = await sitemapProductUrls(origin);
  const shopPage = await page(
    `${origin}/collections/all?capsule=${collection.slug}`,
  );
  if (released.length)
    check(
      collection.slug,
      'shop filter: page loads',
      shopPage.status === 200,
      `HTTP ${shopPage.status}`,
    );
  for (const print of released) {
    const handle = printHandle(print);
    const pdp = await page(`${origin}/products/${handle}`);
    check(
      print.slug,
      'PDP: 200 with title',
      pdp.status === 200 &&
        pdp.body.includes(htmlText(printProductTitle(print))),
      `HTTP ${pdp.status}${pdp.status >= 300 && pdp.status < 400 ? ' — is the release PR merged and deployed?' : ''}`,
    );
    check(
      print.slug,
      'sitemap: listed',
      sitemap.some((url) => url.endsWith(`/products/${handle}`)),
    );
    check(
      print.slug,
      'shop filter: listed',
      shopPage.body.includes(`/products/${handle}`),
    );
  }
  for (const print of staged) {
    const handle = printHandle(print);
    const pdp = await page(`${origin}/products/${handle}`);
    check(
      print.slug,
      'staged: PDP not served',
      pdp.status !== 200,
      `HTTP ${pdp.status}`,
    );
    check(
      print.slug,
      'staged: not in sitemap',
      !sitemap.some((url) => url.endsWith(`/products/${handle}`)),
    );
  }

  console.table(
    checks.map(({subject, check: name, ok, detail}) => ({
      subject,
      check: name,
      result: ok ? 'PASS' : 'FAIL',
      detail,
    })),
  );
  const failed = checks.filter((entry) => !entry.ok);
  writeJson(path.join(launchDir, `verify-${stamp()}.json`), {
    origin,
    passed: checks.length - failed.length,
    failed: failed.length,
    checks,
  });
  console.log(
    `${checks.length - failed.length}/${checks.length} checks passed against ${origin}. Screenshots of the shop filter, one PDP and the cart are still owed (runbook §Verify).`,
  );
  if (failed.length) process.exit(1);
}

// -------------------------------------------------------------- helpers --

function context({needsLaunchDir = true} = {}) {
  const slug = positional[0];
  if (!slug) throw new Error(`Usage: npm run product -- ${step} <collection>`);
  const collection = findCollection(catalog, slug);
  const launchDir = path.join(local.launchRoot, collection.slug);
  if (needsLaunchDir) mkdirSync(launchDir, {recursive: true});
  return {collection, launchDir, prints: selectPrints(collection, only)};
}

function describeVariants(collection) {
  return collection.variants
    .map(
      (variant) =>
        `${sizeLabel(variant.size)} €${variant.priceEUR} → ${variant.providerSku}`,
    )
    .join(', ');
}

function webImage(collection, print) {
  return path.join(REPO_ROOT, 'public', printImagePath(collection, print));
}

function saveCatalog() {
  writeJson(CATALOG_PATH, catalog);
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function htmlText(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/** Later directories fill gaps only; the process environment always wins. */
function mergedEnv(fileNames) {
  const env = {};
  for (const dir of [...local.envDirs].reverse())
    for (const fileName of fileNames)
      Object.assign(env, loadLocalEnv(fileName, dir));
  return {...env, ...process.env};
}

function adminClient() {
  return resolveAdminClient(mergedEnv(['.env', '.env.shopify-admin.local']), {
    requiredScope: 'write_products',
  });
}

async function vendorProducts(admin) {
  const products = [];
  let cursor = null;
  do {
    const {data} = await admin(
      `query VendorProducts($search: String!, $cursor: String) {
        products(first: 50, after: $cursor, query: $search, sortKey: ID) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id title handle vendor status productType tags
            variants(first: 40) { nodes { id sku price inventoryPolicy selectedOptions { name value } inventoryItem { tracked requiresShipping } } }
          }
        }
      }`,
      {cursor, search: `vendor:"${VENDOR}"`},
    );
    products.push(...data.products.nodes);
    cursor = data.products.pageInfo.hasNextPage
      ? data.products.pageInfo.endCursor
      : null;
  } while (cursor);
  return products;
}

/** Writes Shopify ids from a product read onto the catalog entries. */
function recordIds(collection, actions) {
  for (const {print, found} of actions) {
    if (!found) continue;
    const variantIds = {};
    for (const variant of collection.variants) {
      const live = found.variants.nodes.find(
        (node) => node.sku === printSku(collection, print, variant.size),
      );
      if (live) variantIds[variant.size] = live.id;
    }
    print.shopify = {productId: found.id, variantIds};
  }
}

async function uploadImage(admin, file, filename) {
  const staged = await admin(
    `mutation StageUpload($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } userErrors { field message } }
    }`,
    {
      input: [
        {
          filename,
          httpMethod: 'POST',
          mimeType: 'image/webp',
          resource: 'PRODUCT_IMAGE',
        },
      ],
    },
  );
  mutationErrors(staged.data.stagedUploadsCreate, `Stage upload ${filename}`);
  const [target] = staged.data.stagedUploadsCreate.stagedTargets;
  const form = new FormData();
  for (const parameter of target.parameters)
    form.append(parameter.name, parameter.value);
  form.append(
    'file',
    new Blob([readFileSync(file)], {type: 'image/webp'}),
    filename,
  );
  const uploaded = await fetch(target.url, {body: form, method: 'POST'});
  if (!uploaded.ok)
    throw new Error(
      `Image upload failed for ${filename}: HTTP ${uploaded.status}`,
    );
  await uploaded.body?.cancel();
  return target.resourceUrl;
}

/**
 * Publishing needs read_publications + write_publications on the Admin token.
 * Without them this reports `manual: true` and `release` prints the Admin
 * clicks instead of failing half-way.
 */
async function publish(admin, collection, productIds) {
  let publications;
  try {
    publications = (
      await admin(
        `query Publications { publications(first: 50) { nodes { id name } } }`,
      )
    ).data.publications.nodes;
  } catch (error) {
    return {
      manual: true,
      reason: `cannot read publications (${error.message.slice(0, 120)})`,
    };
  }
  const targets = collection.publications.map((name) => {
    const found = publications.find((publication) => publication.name === name);
    if (!found)
      throw new Error(
        `No sales channel named "${name}". Found: ${publications.map((p) => p.name).join(', ')}`,
      );
    return found;
  });
  try {
    for (const id of productIds) {
      const result = await admin(
        `mutation Publish($id: ID!, $input: [PublicationInput!]!) { publishablePublish(id: $id, input: $input) { userErrors { field message } } }`,
        {id, input: targets.map((target) => ({publicationId: target.id}))},
      );
      mutationErrors(result.data.publishablePublish, `Publish ${id}`);
    }
  } catch (error) {
    return {
      manual: true,
      reason: `cannot publish (${error.message.slice(0, 120)})`,
    };
  }
  return {manual: false, publishedTo: targets.map((target) => target.name)};
}

async function storefront(query, variables) {
  const env = mergedEnv(['.env']);
  const domain = normalizeShopDomain(
    getRequiredEnv(env, 'PUBLIC_STORE_DOMAIN'),
  );
  const response = await fetch(
    `https://${domain}/api/${env.SHOPIFY_STOREFRONT_API_VERSION || '2026-04'}/graphql.json`,
    {
      body: JSON.stringify({query, variables}),
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': getRequiredEnv(
          env,
          'PUBLIC_STOREFRONT_API_TOKEN',
        ),
      },
      method: 'POST',
    },
  );
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.errors)
    throw new Error(
      `Storefront API failed: ${JSON.stringify(body?.errors ?? response.status)}`,
    );
  return body.data;
}

async function storefrontProducts(prints) {
  const results = [];
  for (const print of prints) {
    const handle = printHandle(print);
    const data = await storefront(
      `query VerifyProduct($handle: String!) {
        product(handle: $handle) { handle availableForSale variants(first: 10) { nodes { id sku availableForSale price { amount currencyCode } } } }
      }`,
      {handle},
    );
    results.push({
      handle,
      availableForSale: data.product?.availableForSale === true,
      variants: data.product?.variants.nodes ?? [],
    });
  }
  return results;
}

/** Creates a throwaway cart; no checkout is started and nothing is ordered. */
async function addToCart(merchandiseId) {
  const data = await storefront(
    `mutation VerifyCart($lines: [CartLineInput!]!) {
      cartCreate(input: {lines: $lines}) {
        cart { totalQuantity cost { subtotalAmount { amount currencyCode } } }
        userErrors { message }
        warnings { message }
      }
    }`,
    {lines: [{merchandiseId, quantity: 1}]},
  );
  const result = data.cartCreate;
  return {
    errors: [...result.userErrors, ...result.warnings].map(
      (entry) => entry.message,
    ),
    quantity: result.cart?.totalQuantity ?? 0,
    subtotal: result.cart
      ? `${result.cart.cost.subtotalAmount.amount} ${result.cart.cost.subtotalAmount.currencyCode}`
      : '',
  };
}

async function page(url) {
  const response = await fetch(url, {
    headers: {'User-Agent': 'clara-mendes-product-verify'},
    redirect: 'manual',
  });
  return {
    body: response.status === 200 ? await response.text() : '',
    status: response.status,
  };
}

async function sitemapProductUrls(origin) {
  const locs = (xml) =>
    [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
      match[1].replaceAll('&amp;', '&'),
    );
  const index = await page(`${origin}/sitemap.xml`);
  const urls = [];
  for (const child of locs(index.body).filter((url) =>
    url.includes('/sitemap/products/'),
  ))
    urls.push(...locs((await page(child)).body));
  return urls;
}

/* eslint-enable no-console */
