import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import test from 'node:test';
import * as filters from '../app/lib/catalogFilters.ts';
import * as capsules from '../app/lib/capsules.ts';
import * as prints from '../app/lib/printCatalog.ts';

/** A two-collection fixture so the gates are proven on data, not on today's catalog. */
function fixture(released = []) {
  const rooms = ['living-room', 'bedroom', 'study', 'wide-interior'].map(
    (key, index) => ({
      alt: `Room ${index + 1}`,
      backgroundFile: `${key}.png`,
      key,
      placement: {height: 250, left: 10, top: 10, width: 200},
    }),
  );
  const print = (slug, sequence) => ({
    alt: 'Alt',
    description: 'Description.',
    prodigi: {'8x10': {channelProductId: '1', verified: true}},
    released: released.includes(slug),
    releasedSizes: released.includes(slug) ? ['8x10'] : [],
    rooms: structuredClone(rooms),
    sequence,
    shopify: {productId: 'gid://p', variantIds: {'8x10': 'gid://v'}},
    slug,
    title: slug,
  });
  const collection = (slug, title, skuCode, members, variants) => ({
    collectionCopy: 'Copy.',
    note: `${title} note`,
    prints: members.map((member, index) => print(member, index + 1)),
    publications: ['Clara Mendes'],
    seoSuffix: 'Suffix.',
    skuCode,
    slug,
    title,
    variants,
  });
  const small = {
    finish: 'Unframed',
    priceEUR: '29.99',
    providerSku: 'ART-FAP-EMA-8X10',
    size: '8x10',
  };
  const large = {
    finish: 'Unframed',
    priceEUR: '39.99',
    providerSku: 'ART-FAP-EMA-16X20',
    size: '16x20',
  };
  return {
    collections: [
      collection(
        'alpha-set',
        'Alpha Set',
        'AA',
        ['alpha-one', 'alpha-two', 'alpha-three'],
        [small],
      ),
      collection('beta-set', 'Beta Set', 'BB', ['beta-one'], [small, large]),
    ],
  };
}

test('the shipped catalog file is valid and every image it names exists', () => {
  assert.deepEqual(prints.validatePrintCatalog(), []);
  for (const collection of prints.PRINT_CATALOG.collections)
    for (const print of collection.prints)
      assert.ok(
        existsSync(`public${prints.printImagePath(collection, print)}`),
        `missing WebP for ${collection.slug}/${print.slug}`,
      );
});

test('handles, titles and SKUs derive from the entry', () => {
  const [collection] = fixture().collections;
  const second = collection.prints[1];
  assert.equal(prints.printHandle(second), 'alpha-two-art-print');
  assert.equal(
    prints.printProductTitle({title: 'Alpha Two'}),
    'Alpha Two Art Print',
  );
  assert.equal(prints.printSku(collection, second, '8x10'), 'CM-AA-02-8X10');
  assert.equal(
    prints.printImagePath(collection, second),
    '/images/product-art/alpha-set/alpha-two.webp',
  );
  assert.throws(() => prints.printSku(collection, second, '11x14'));
});

test('release admits only released entries and leaves the launch prints sellable', () => {
  const sellable = filters.computeSellableHandles(
    {},
    {},
    fixture(['alpha-one']),
  );
  assert.equal(sellable.has('alpha-one-art-print'), true);
  assert.equal(sellable.has('alpha-two-art-print'), false);
  assert.equal(sellable.has('beta-one-art-print'), false);
  assert.equal(sellable.has('quiet-form-i-art-print'), true);
});

test('accidental Shopify publication cannot list or index a staged print', () => {
  const staged = fixture();
  assert.equal(prints.releasedPrintHandles(staged).length, 0);
  assert.equal(
    prints.isUnreleasedPrintHandle('ALPHA-ONE-ART-PRINT', staged),
    true,
  );
  assert.equal(
    prints.isUnreleasedPrintHandle('quiet-form-i-art-print', staged),
    false,
  );
  assert.equal(
    filters.computeSellableHandles({}, {}, staged).has('alpha-one-art-print'),
    false,
  );
});

test('a staged collection adds no shop filter and never changes the launch capsules', () => {
  assert.equal(capsules.listShopCapsules(fixture()).length, 5);
  assert.equal(capsules.getShopCapsuleBySlug('alpha-set', fixture()), null);
  assert.equal(capsules.CAPSULES.length, 5);
  assert.ok(capsules.CAPSULES.every((capsule) => capsule.handles.length === 3));
});

test('a PDP finds its print-catalog collection only once that print is released', () => {
  const catalog = fixture(['alpha-one', 'alpha-three']);
  assert.equal(
    capsules.findShopCapsuleForHandle('alpha-one-art-print', catalog).slug,
    'alpha-set',
  );
  assert.equal(
    capsules.findShopCapsuleForHandle('ALPHA-THREE-ART-PRINT', catalog).slug,
    'alpha-set',
  );
  assert.equal(
    capsules.findShopCapsuleForHandle('alpha-two-art-print', catalog),
    null,
  );
  assert.equal(
    capsules.findShopCapsuleForHandle('quiet-form-i-art-print', catalog).slug,
    capsules.CAPSULES.find((capsule) =>
      capsule.handles.includes('quiet-form-i-art-print'),
    ).slug,
  );
  assert.equal(capsules.findShopCapsuleForHandle('', catalog), null);
});

test('a partial release filters the right members and links to a real shop URL', () => {
  const catalog = fixture(['alpha-one', 'alpha-three', 'beta-one']);
  assert.equal(capsules.listShopCapsules(catalog).length, 7);
  const alpha = capsules.getShopCapsuleBySlug(' Alpha-Set ', catalog);
  assert.deepEqual(alpha.handles, [
    'alpha-one-art-print',
    'alpha-three-art-print',
  ]);
  assert.equal(capsules.buildCapsuleTagQuery(alpha), 'tag:"Alpha Set"');
  assert.equal(
    capsules.shopCapsulePath('alpha-set'),
    '/collections/all?capsule=alpha-set',
  );
  assert.equal(
    capsules.shopCapsulePath('quiet-form'),
    '/collections/quiet-form',
  );
  assert.equal(capsules.getShopCapsuleBySlug('unknown', catalog), null);

  const alphaCopy = capsules.shopCapsuleDescription(alpha);
  assert.ok(alphaCopy.includes('2 Clara Mendes prints of our own'));
  assert.ok(alphaCopy.endsWith('available unframed in 8 × 10 in.'));
  const betaCopy = capsules.shopCapsuleDescription(
    capsules.getShopCapsuleBySlug('beta-set', catalog),
  );
  assert.ok(betaCopy.includes('1 Clara Mendes print of our own,'));
  assert.ok(betaCopy.endsWith('available unframed in 8 × 10 in.'));
});

test('releasedSizes keeps staged expansion sizes out of consumer copy', () => {
  const catalog = fixture(['beta-one']);
  const [beta] = catalog.collections.slice(1);
  const [print] = beta.prints;

  assert.deepEqual(prints.validatePrintCatalog(catalog), []);
  assert.deepEqual(prints.releasedPrintCollections(catalog)[0].sizeLabels, [
    '8 × 10 in',
  ]);

  print.releasedSizes.push('16x20');
  const problems = prints.validatePrintCatalog(catalog).join('\n');
  assert.match(problems, /Shopify ids for 16x20/);
  assert.match(problems, /verified Prodigi mapping for 16x20/);
});

test('a print may be offered in fewer sizes than its collection', () => {
  const catalog = fixture(['beta-one']);
  const beta = catalog.collections[1];
  const [print] = beta.prints;
  assert.deepEqual(
    prints.printVariants(beta, print).map((variant) => variant.size),
    ['8x10', '16x20'],
  );
  print.sizes = ['8x10'];
  assert.deepEqual(
    prints.printVariants(beta, print).map((variant) => variant.size),
    ['8x10'],
  );
  // Only its own sizes need Shopify ids and a mapping once released.
  assert.deepEqual(prints.validatePrintCatalog(catalog), []);

  print.releasedSizes.push('16x20');
  assert.match(
    prints.validatePrintCatalog(catalog).join('\n'),
    /releasedSizes contains 16x20, not in its sizes/,
  );
  print.releasedSizes = ['8x10'];

  const problems = (sizes) => {
    print.sizes = sizes;
    return prints.validatePrintCatalog(catalog).join('\n');
  };
  assert.match(problems([]), /sizes must list at least one size/);
  assert.match(problems(['8x10', '8x10']), /sizes must not contain duplicates/);
  assert.match(problems(['20x24']), /sizes contains unknown size 20x24/);
});

test('collection copy lists every released size and says when they vary', () => {
  const catalog = fixture(['beta-one']);
  const beta = catalog.collections[1];
  const first = beta.prints[0];
  first.releasedSizes = ['8x10', '16x20'];
  first.shopify.variantIds['16x20'] = 'gid://v16';
  first.prodigi['16x20'] = {channelProductId: '2', verified: true};
  const second = structuredClone(first);
  Object.assign(second, {
    releasedSizes: ['8x10'],
    sequence: 2,
    sizes: ['8x10'],
    slug: 'beta-two',
    title: 'beta-two',
  });
  beta.prints.push(second);
  assert.deepEqual(prints.validatePrintCatalog(catalog), []);
  const capsule = capsules.getShopCapsuleBySlug('beta-set', catalog);
  assert.deepEqual(capsule.sizeLabels, ['8 × 10 in', '16 × 20 in']);
  assert.equal(capsule.sizesVary, true);
  assert.ok(
    capsules
      .shopCapsuleDescription(capsule)
      .endsWith(
        'available unframed in 8 × 10 in and 16 × 20 in (sizes vary by work).',
      ),
  );
  delete second.sizes;
  second.releasedSizes = ['8x10', '16x20'];
  second.shopify.variantIds['16x20'] = 'gid://v16b';
  assert.equal(
    capsules.getShopCapsuleBySlug('beta-set', catalog).sizesVary,
    false,
  );
});

test('the live Sci-fi & Cinema release offers all three sizes', () => {
  const handles = [
    'orbital-silence-art-print',
    'neon-after-rain-art-print',
    'desert-signal-art-print',
    'the-fold-art-print',
  ];
  const capsule = capsules.getShopCapsuleBySlug('scifi-cinema');
  assert.deepEqual(capsule.handles, handles);
  assert.equal(
    capsules.shopCapsuleDescription(capsule),
    'Sci-fi & Cinema — Imagined worlds, cinematic light, and a sense of scale. 4 Clara Mendes prints of our own, available unframed in 8 × 10 in, 16 × 20 in, and 20 × 24 in.',
  );
  const [collection] = prints.PRINT_CATALOG.collections;
  assert.deepEqual(
    collection.prints.map((print) =>
      prints.printSku(collection, print, '8x10'),
    ),
    ['CM-SC-01-8X10', 'CM-SC-02-8X10', 'CM-SC-03-8X10', 'CM-SC-04-8X10'],
  );
  for (const handle of handles) {
    assert.equal(filters.isUnreleasedExtensionHandle(handle), false);
    assert.equal(
      filters.isStoreThemeProduct({
        handle,
        productType: 'Art Prints',
        vendor: 'Clara Mendes',
      }),
      true,
    );
  }
});

test('validation refuses a release without ids or a verified mapping, and bad entries', () => {
  const unmapped = fixture(['alpha-one']);
  unmapped.collections[0].prints[0].prodigi = {'8x10': {verified: false}};
  assert.match(
    prints.validatePrintCatalog(unmapped).join('\n'),
    /verified Prodigi mapping for 8x10/,
  );

  const partial = fixture(['beta-one']);
  partial.collections[1].prints[0].releasedSizes.push('16x20');
  assert.match(
    prints.validatePrintCatalog(partial).join('\n'),
    /Shopify ids for 16x20/,
  );

  const broken = fixture();
  broken.collections[1].skuCode = 'AA';
  broken.collections[1].variants[0].priceEUR = '29';
  broken.collections[0].prints[1].sequence = 1;
  delete broken.collections[0].prints[2].rooms;
  const problems = prints.validatePrintCatalog(broken).join('\n');
  assert.match(problems, /duplicate slug, skuCode or title "AA"/);
  assert.match(problems, /priceEUR must look like/);
  assert.match(problems, /duplicate sequence 1/);
  assert.match(problems, /needs exactly four room scenes/);

  assert.deepEqual(prints.validatePrintCatalog(fixture()), []);
});

test('printOrientationForHandle reads a catalog print by handle, portrait otherwise', () => {
  assert.equal(
    prints.printOrientationForHandle('the-great-wave-off-kanagawa-art-print'),
    'landscape',
  );
  assert.equal(
    prints.printOrientationForHandle('Fireworks-At-Ryogoku-Bridge-Art-Print'),
    'portrait',
  );
  assert.equal(prints.printOrientationForHandle('not-a-print'), 'portrait');
  assert.equal(prints.printOrientationForHandle(null), 'portrait');
});
