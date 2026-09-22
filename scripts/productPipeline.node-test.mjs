import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildStagedVariantInput,
  buildProductSetInput,
  buildReleasedProductUpdateInput,
  findCollection,
  handoffRows,
  parseMappings,
  PENDING_TAGS,
  printStatus,
  selectPrints,
  sizeBullet,
  toCsv,
  variantExpansionPlan,
} from './lib/product-pipeline.mjs';

const collection = {
  collectionCopy: 'From the "Alpha" collection.',
  note: 'Note',
  prints: [
    {
      alt: 'Alt one',
      description: 'Cats & <dogs>.',
      released: false,
      sequence: 1,
      slug: 'alpha-one',
      title: 'Alpha One',
    },
    {
      alt: 'Alt two',
      description: 'Two.',
      released: false,
      sequence: 2,
      slug: 'alpha-two',
      title: 'Alpha Two',
    },
  ],
  publications: ['Clara Mendes'],
  seoSuffix: 'Suffix.',
  skuCode: 'AA',
  slug: 'alpha-set',
  title: 'Alpha Set',
  variants: [
    {
      finish: 'Unframed',
      priceEUR: '29.99',
      providerSku: 'ART-FAP-EMA-8X10',
      size: '8x10',
    },
    {
      finish: 'Unframed',
      priceEUR: '39.99',
      providerSku: 'ART-FAP-EMA-16X20',
      size: '16x20',
    },
  ],
};

test('a Draft is built entirely from the catalog entry', () => {
  const input = buildProductSetInput(collection, collection.prints[0]);
  assert.equal(input.status, 'DRAFT');
  assert.equal(input.handle, 'alpha-one-art-print');
  assert.equal(input.title, 'Alpha One Art Print');
  assert.deepEqual(
    input.variants.map((variant) => [variant.sku, variant.price]),
    [
      ['CM-AA-01-8X10', '29.99'],
      ['CM-AA-01-16X20', '39.99'],
    ],
  );
  assert.deepEqual(
    input.productOptions[0].values.map((value) => value.name),
    ['8 × 10 in', '16 × 20 in'],
  );
  assert.deepEqual(input.productOptions[1].values, [{name: 'Unframed'}]);
  // The capsule tag drives the storefront shop filter (buildCapsuleTagQuery).
  assert.ok(input.tags.includes('Alpha Set'));
  for (const tag of PENDING_TAGS) assert.ok(input.tags.includes(tag));
  assert.ok(input.descriptionHtml.includes('Cats &amp; &lt;dogs&gt;.'));
  assert.ok(input.descriptionHtml.includes('&quot;Alpha&quot;'));
});

test('a staged Draft cannot be bought even if it is activated by accident', () => {
  for (const variant of buildProductSetInput(collection, collection.prints[0])
    .variants) {
    assert.equal(variant.inventoryItem.tracked, true);
    assert.equal(variant.inventoryPolicy, 'DENY');
  }
});

test('size copy matches the number of sizes offered', () => {
  const sizes = (...keys) => ({variants: keys.map((size) => ({size}))});
  assert.equal(
    sizeBullet(sizes('8x10')),
    'Unframed 8 × 10 inch portrait print',
  );
  assert.equal(
    sizeBullet(sizes('8x10', '16x20')),
    'Unframed portrait print in 8 × 10 and 16 × 20 inch sizes',
  );
  assert.equal(
    sizeBullet(sizes('8x10', '16x20', '20x24')),
    'Unframed portrait print in 8 × 10, 16 × 20, and 20 × 24 inch sizes',
  );
});

test('status names the single next step', () => {
  const [print] = collection.prints;
  assert.equal(
    printStatus(collection, print, {hasWebImage: false}).next,
    'prepare',
  );
  assert.equal(printStatus(collection, print).next, 'stage');

  const staged = {
    ...print,
    shopify: {productId: 'p', variantIds: {'8x10': 'a', '16x20': 'b'}},
  };
  assert.match(printStatus(collection, staged).next, /^handoff/);

  const expanding = {
    ...print,
    released: true,
    releasedSizes: ['8x10'],
    shopify: {productId: 'p', variantIds: {'8x10': 'a'}},
  };
  assert.equal(printStatus(collection, expanding).next, 'expand');

  // One mapped size out of two is not mapped.
  const half = {
    ...staged,
    prodigi: {'8x10': {channelProductId: '1', verified: true}},
  };
  assert.equal(printStatus(collection, half).mapped, false);

  const mapped = {
    ...half,
    prodigi: {
      ...half.prodigi,
      '16x20': {channelProductId: '2', verified: true},
    },
  };
  assert.equal(printStatus(collection, mapped).next, 'media → release');
  assert.equal(
    printStatus(collection, {
      ...mapped,
      released: true,
      releasedSizes: ['8x10', '16x20'],
    }).next,
    'verify',
  );
});

test('selection and mapping arguments reject anything not in the catalog', () => {
  const catalog = {collections: [collection]};
  assert.equal(findCollection(catalog, 'alpha-set'), collection);
  assert.throws(() => findCollection(catalog, 'beta'), /Known: alpha-set/);
  assert.equal(selectPrints(collection).length, 2);
  assert.deepEqual(
    selectPrints(collection, ['alpha-two']).map((print) => print.slug),
    ['alpha-two'],
  );
  assert.throws(() => selectPrints(collection, ['gamma']), /Unknown print/);

  assert.deepEqual(parseMappings(collection, ['alpha-one=123']), [
    {id: '123', slug: 'alpha-one'},
  ]);
  assert.throws(() => parseMappings(collection, []), /at least one/);
  assert.throws(() => parseMappings(collection, ['gamma=1']), /Unknown print/);
  assert.throws(
    () => parseMappings(collection, ['alpha-one=12a']),
    /must be digits/,
  );
});

test('the Prodigi handoff has one row per print and size, with file hashes', () => {
  const rows = handoffRows(collection, collection.prints, {
    printDir: 'C:\\launch\\print',
    sha256: (file) => `sha:${file.split(/[\\/]/).at(-1)}`,
  });
  assert.equal(rows.length, 4);
  assert.equal(rows[1].sku, 'CM-AA-01-16X20');
  assert.equal(rows[1].providerSku, 'ART-FAP-EMA-16X20');
  assert.equal(rows[1].printFile, 'C:/launch/print/alpha-one-16x20-300dpi.jpg');
  assert.equal(rows[1].sha256, 'sha:alpha-one-16x20-300dpi.jpg');
  assert.equal(rows[1].verified, false);

  const csv = toCsv([{a: 'x"y', b: 1}]);
  assert.equal(csv, '"a","b"\r\n"x""y","1"\r\n');
});

test('released product copy is derived without changing status or identity', () => {
  const input = buildReleasedProductUpdateInput(
    collection,
    collection.prints[0],
    'gid://shopify/Product/1',
  );
  assert.equal(input.id, 'gid://shopify/Product/1');
  assert.equal(input.status, undefined);
  assert.equal(input.handle, undefined);
  assert.match(input.descriptionHtml, /8 × 10 and 16 × 20 inch sizes/);
  assert.match(input.descriptionHtml, /Frame not included/);
  assert.equal(input.seo.title, 'Alpha One Art Print | Clara Mendes');
});

test('existing released products expand without replacing the live base variant', () => {
  const expanded = structuredClone(collection);
  expanded.variants.push({
    finish: 'Unframed',
    priceEUR: '49.99',
    providerSku: 'GLOBAL-FAP-20X24',
    size: '20x24',
  });
  const product = {
    handle: 'alpha-one-art-print',
    id: 'gid://shopify/Product/1',
    variants: {
      nodes: [
        {
          id: 'gid://shopify/ProductVariant/8',
          inventoryItem: {requiresShipping: true, tracked: false},
          inventoryPolicy: 'DENY',
          price: '29.99',
          selectedOptions: [
            {name: 'Size', value: '8 × 10 in'},
            {name: 'Finish', value: 'Unframed'},
          ],
          sku: 'CM-AA-01-8X10',
        },
      ],
    },
  };

  const plan = variantExpansionPlan(expanded, expanded.prints[0], product);
  assert.deepEqual(
    plan.map((row) => [row.variant.size, row.action, row.existing?.id]),
    [
      ['8x10', 'present', 'gid://shopify/ProductVariant/8'],
      ['16x20', 'create', undefined],
      ['20x24', 'create', undefined],
    ],
  );

  const conflicting = structuredClone(product);
  conflicting.variants.nodes.push({
    ...conflicting.variants.nodes[0],
    id: 'gid://shopify/ProductVariant/bad',
    sku: 'OTHER-SKU',
  });
  assert.throws(
    () => variantExpansionPlan(expanded, expanded.prints[0], conflicting),
    /unexpected SKU OTHER-SKU/,
  );

  assert.deepEqual(buildStagedVariantInput(plan[1]), {
    inventoryItem: {
      requiresShipping: true,
      sku: 'CM-AA-01-16X20',
      tracked: true,
    },
    inventoryPolicy: 'DENY',
    optionValues: [
      {name: '16 × 20 in', optionName: 'Size'},
      {name: 'Unframed', optionName: 'Finish'},
    ],
    price: '39.99',
    taxable: true,
  });
});
