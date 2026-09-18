import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildProductSetInput,
  findCollection,
  handoffRows,
  parseMappings,
  PENDING_TAGS,
  printStatus,
  selectPrints,
  sizeBullet,
  toCsv,
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
  assert.equal(printStatus(collection, mapped).next, 'release');
  assert.equal(
    printStatus(collection, {...mapped, released: true}).next,
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
