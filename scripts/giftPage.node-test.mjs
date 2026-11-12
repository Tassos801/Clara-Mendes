import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  bandFor,
  bandHeading,
  bandLimits,
  GIFT_HANDLES,
  GIFT_PAGE_COPY,
  GIFT_PRODUCT_TYPES,
  GIFT_SECTIONS,
  GIFTS_PATH,
  giftProductQuery,
  groupGifts,
  roundLimit,
} from '../app/lib/giftPage.ts';
import {CUSTOM_SITEMAP_PATHS} from '../app/lib/sitemap.ts';
import {LINE_RAIL_ENTRIES} from '../app/lib/lineRail.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');

const eur = (amount) => ({amount: String(amount), currencyCode: 'EUR'});
const usd = (amount) => ({amount: String(amount), currencyCode: 'USD'});

test('museum home pieces lead the edit; handles are unique', () => {
  assert.deepEqual(
    GIFT_SECTIONS.slice(0, 3).map((section) => section.key),
    ['blankets', 'mugs', 'cushions'],
  );
  assert.equal(GIFT_HANDLES[0], 'the-great-wave-off-kanagawa-blanket');
  assert.equal(new Set(GIFT_HANDLES).size, GIFT_HANDLES.length);
});

test('the query spans every curated handle type', () => {
  const query = giftProductQuery();
  for (const type of GIFT_PRODUCT_TYPES)
    assert.ok(query.includes(`product_type:"${type}"`));
  const catalog = JSON.parse(read('data/art-product-catalog.json'));
  const typeByFamily = {
    blanket: 'Blankets',
    'printful-mug': 'Mugs',
    cushion: 'Cushions',
    'framed-print': 'Framed Art',
    'phone-case': 'Phone Cases',
    'hanger-print': 'Hanger Prints',
    canvas: 'Canvas Art',
    'metal-print': 'Metal Prints',
    'greeting-card': 'Cards',
  };
  // Every curated museum product exists in the catalog, released, of a queried type.
  for (const handle of GIFT_HANDLES) {
    const product = catalog.products.find((p) => p.handle === handle);
    if (!product) continue; // studio prints, nooks, Your Sky, the tough case
    assert.equal(product.released, true, `${handle} released`);
    assert.ok(
      GIFT_PRODUCT_TYPES.includes(typeByFamily[product.family]),
      handle,
    );
  }
});

test('limits: EUR 30/60; other currencies convert by the price ratio', () => {
  assert.deepEqual(bandLimits('EUR', []), [30, 60]);
  // Live US prices: €64.99 → $74, €24.99 → $29, €44.99 → $51.
  assert.deepEqual(
    bandLimits('USD', [74 / 64.99, 29 / 24.99, 51 / 44.99]),
    [35, 70],
  );
  assert.deepEqual(bandLimits('USD', []), [30, 60]);
  assert.equal(roundLimit(127.5), 130);
  assert.equal(roundLimit(11700), 12000);
});

test('bands: under, middle (inclusive), over', () => {
  assert.equal(bandFor(29.99, [30, 60]), 'under');
  assert.equal(bandFor(30, [30, 60]), 'middle');
  assert.equal(bandFor(60, [30, 60]), 'middle');
  assert.equal(bandFor(64.99, [30, 60]), 'over');
  assert.equal(bandHeading('under', [30, 60], 'EUR'), 'Under €30');
  assert.equal(bandHeading('middle', [35, 70], 'USD'), '$35 to $70');
  assert.equal(bandHeading('over', [30, 60], 'EUR'), 'Over €60');
});

test('grouping keeps curated order, drops strays and unpriced, skips empty bands', () => {
  const products = [
    {handle: 'the-great-wave-off-kanagawa-mug', price: eur(24.99)},
    {handle: 'the-great-wave-off-kanagawa-blanket', price: eur(64.99)},
    {handle: 'not-a-gift', price: eur(10)},
    {handle: 'fireworks-at-ryogoku-bridge-blanket', price: eur(64.99)},
    {handle: 'the-great-wave-off-kanagawa-cushion', price: null},
  ];
  const bands = groupGifts(products);
  assert.deepEqual(
    bands.map((band) => band.key),
    ['under', 'over'],
  );
  assert.deepEqual(
    bands[1].products.map((p) => p.handle),
    [
      'the-great-wave-off-kanagawa-blanket',
      'fireworks-at-ryogoku-bridge-blanket',
    ],
  );
  assert.equal(bands[0].heading, 'Under €30');
});

test('US buyer: dollar bands from the live price ratio', () => {
  const bands = groupGifts([
    {
      handle: 'the-great-wave-off-kanagawa-mug',
      price: usd(29),
      eurPrice: eur(24.99),
    },
    {
      handle: 'the-great-wave-off-kanagawa-cushion',
      price: usd(51),
      eurPrice: eur(44.99),
    },
    {
      handle: 'the-great-wave-off-kanagawa-blanket',
      price: usd(74),
      eurPrice: eur(64.99),
    },
  ]);
  assert.deepEqual(
    bands.map((band) => band.heading),
    ['Under $35', '$35 to $70', 'Over $70'],
  );
});

test('copy: no urgency, no guarantee, no timers', () => {
  const text = JSON.stringify(GIFT_PAGE_COPY).toLowerCase();
  for (const banned of [
    'hurry',
    'last chance',
    'guaranteed',
    'countdown',
    'only today',
    'original art',
  ]) {
    assert.ok(!text.includes(banned), banned);
  }
  assert.doesNotMatch(text, /(^|[^a-z])ai([^a-z]|$)/);
  assert.ok(GIFT_PAGE_COPY.seoTitle.length + ' | Clara Mendes'.length <= 62);
  assert.ok(GIFT_PAGE_COPY.metaDescription.length <= 155);
});

test('findable: sitemap, footer and the homepage rail', () => {
  assert.equal(GIFTS_PATH, '/gifts');
  assert.ok(CUSTOM_SITEMAP_PATHS.includes('/gifts'));
  assert.match(
    read('app/components/ClaraShell.tsx'),
    /<Link to="\/gifts">Gifts<\/Link>/,
  );
  assert.equal(LINE_RAIL_ENTRIES[1].key, 'gifts');
});

test('the route filters to buyable products and hides Christmas after the season', () => {
  const route = read('app/routes/gifts.tsx');
  assert.match(route, /filterDemoProducts\(products\)/);
  assert.match(route, /!nothingBuyable\(product\)/);
  assert.match(route, /season === 'open'/);
  assert.match(route, /requestToday\(request\)/);
  assert.doesNotMatch(route, /setInterval|countdown/i);
});
