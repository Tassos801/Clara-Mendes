import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  FEED_COLUMNS,
  META_COUNTRY_COLUMNS,
  merchantFeedRows,
  merchantFeedTsv,
  metaCountryFeedTsv,
} from '../app/lib/merchantFeed.ts';
import {
  FEED_EU_COUNTRIES,
  FEED_INTERNATIONAL_COUNTRIES,
  SHIPPING_COLUMN,
} from '../app/lib/merchantFeedShipping.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');

let next = 0;
const variant = (sku, options, amount = '26.99', extra = {}) => ({
  id: `gid://shopify/ProductVariant/${++next}`,
  sku,
  availableForSale: true,
  price: {amount, currencyCode: 'EUR'},
  selectedOptions: Object.entries(options).map(([name, value]) => ({
    name,
    value,
  })),
  image: {url: `https://cdn.example/${sku}.jpg`},
  ...extra,
});
const product = (handle, title, productType, tags, variants, extra = {}) => ({
  handle,
  title,
  productType,
  tags,
  description: '  A   line\nof copy. ',
  featuredImage: {url: `https://cdn.example/${handle}.jpg`},
  variants: {nodes: variants},
  ...extra,
});
const APPROVED = {
  storefrontApproved: {type: 'boolean', value: 'true'},
  fulfillmentVerified: {type: 'boolean', value: 'true'},
};
// Prices as a US-market (USD) read returns them.
const inUsd = (catalog) =>
  catalog.map((p) => ({
    ...p,
    variants: {
      nodes: p.variants.nodes.map((v) => ({
        ...v,
        price: {...v.price, currencyCode: 'USD'},
      })),
    },
  }));

const STUDIO = 'Clara Mendes Original';
const MUSEUM = ['Museum Reproduction', 'Katsushika Hokusai'];
const CATALOG = [
  product(
    'quiet-form-i-art-print',
    'Quiet Form I Art Print',
    'Art Prints',
    [STUDIO],
    [
      variant('CM-QF-01-8X10', {Size: '8 × 10 in', Presentation: 'Unframed'}),
      variant(
        'CM-QF-01-16X20',
        {Size: '16 × 20 in', Presentation: 'Unframed'},
        '35.99',
        {availableForSale: false},
      ),
    ],
  ),
  product(
    'fine-art-postcard',
    'Fine Art Postcard',
    'Postcards',
    [STUDIO],
    [variant('CM-QF-POST-7X5', {Artwork: 'Quiet Form'}, '5.4')],
  ),
  product(
    'your-sky-star-map',
    'Your Sky',
    'Personalised Art',
    [STUDIO],
    [
      variant(
        'CM-SKY-8X10-UNF',
        {Size: '8 × 10 in', Finish: 'Unframed'},
        '35.99',
      ),
      variant(
        'CM-SKY-8X10-NAT',
        {Size: '8 × 10 in', Finish: 'Natural frame'},
        '89.99',
      ),
    ],
  ),
  product(
    'blush-arc-pastel-plant-pot',
    'Blush Arc Ceramic Plant Pot',
    'Plant Pots',
    [STUDIO],
    [variant('CM-POT-BLUSH', {Size: '90 x 102 mm'})],
  ),
  product(
    'the-great-wave-off-kanagawa-hanger-print',
    'The Great Wave off Kanagawa Hanger Print',
    'Hanger Prints',
    MUSEUM,
    [
      variant(
        'CM-FW-01-HANG-A3-BLK',
        {Size: 'A3 (42 × 29.7 cm)', Hanger: 'Black'},
        '39.99',
      ),
    ],
  ),
  product(
    'the-great-wave-off-kanagawa-framed-print',
    'The Great Wave off Kanagawa Framed Art Print',
    'Framed Art',
    MUSEUM,
    [variant('CM-FW-01-CFP16X20', {Size: '16 × 20 in'}, '89.1')],
  ),
  product(
    'the-great-wave-off-kanagawa-mug',
    'The Great Wave off Kanagawa Mug',
    'Mugs',
    MUSEUM,
    [variant('CM-FW-01-MUG11-PF', {Size: '11 oz'}, '24.99')],
  ),
  product(
    'the-great-wave-off-kanagawa-cushion',
    'The Great Wave off Kanagawa Cushion',
    'Cushions',
    MUSEUM,
    [
      variant(
        'CM-FW-01-CUSH18-C',
        {Size: '18 × 18 in', Filling: 'Cover only'},
        '44.99',
      ),
      variant(
        'CM-FW-01-CUSH18-I',
        {Size: '18 × 18 in', Filling: 'With insert'},
        '64.99',
      ),
    ],
  ),
  product(
    'the-great-wave-off-kanagawa-phone-case',
    'The Great Wave off Kanagawa Phone Case',
    'Phone Cases',
    MUSEUM,
    [variant('CM-FW-01-CASE-IPHONE-13', {Device: 'iPhone 13'}, '35.99')],
  ),
  product(
    'quiet-current-studio-tank',
    'Studio Tank',
    'Studio Top',
    ['Activewear', 'Made to order', 'Quiet Current'],
    [variant('CM-QC-121-MM-XS', {Colour: 'Moss / Mist', Size: 'XS'}, '55')],
  ),
  product(
    'counter-diagonal-hoodie',
    'Counter-Diagonal Hoodie',
    'Hoodies',
    ['clara-mendes-clothing', 'Counter-Diagonal', 'Made to order'],
    [
      variant('CD-HOOD-M', {Size: 'M', Color: 'Bone'}, '58.49'),
      variant('CD-HOOD-L', {Size: 'L', Color: 'Bone'}, '58.49'),
    ],
    APPROVED,
  ),
  product(
    'counter-diagonal-cap',
    'Counter-Diagonal Cap',
    'Hats',
    ['clara-mendes-clothing', 'Counter-Diagonal', 'Made to order'],
    [variant('CD-CAP', {Color: 'Black'}, '29.99')],
    APPROVED,
  ),
  // Clothing without the storefront approvals never reaches a feed.
  product(
    'counter-diagonal-draft-tee',
    'Counter-Diagonal Tee',
    'T-Shirts',
    ['clara-mendes-clothing', 'Counter-Diagonal'],
    [variant('CD-TEE-M', {Size: 'M'}, '29.99')],
  ),
];
const EU_QUOTES = {
  mug: '4.84',
  'cushion-cover': '4.48',
  'cushion-insert': '12.39',
  blanket: '6.55',
  'apparel:quiet-current-studio-tank': '4.95',
  'apparel:counter-diagonal-hoodie': '6.71',
  'apparel:counter-diagonal-cap': '4.59',
};
const PRINTFUL_EUR = {
  market: 'CY',
  includeUs: true,
  quotes: {
    eu: EU_QUOTES,
    cyprus: {...EU_QUOTES, 'apparel:quiet-current-studio-tank': '3.99'},
  },
};

const parse = (tsv) =>
  tsv
    .replace(/\n$/, '')
    .split('\n')
    .map((line) => line.split('\t'));
const byId = (tsv) => {
  const [header, ...rows] = parse(tsv);
  return Object.fromEntries(
    rows.map((cells) => [
      cells[0],
      {
        ...Object.fromEntries(FEED_COLUMNS.map((c, i) => [c, cells[i]])),
        shipping: cells.slice(FEED_COLUMNS.length).filter(Boolean),
        header,
      },
    ]),
  );
};
const rate = (item, country) =>
  item.shipping.find((s) => s.startsWith(`${country}:`));

test('the fixed feed lists every fixed-rate line and nothing else', () => {
  const ids = merchantFeedRows(CATALOG, 'fixed').map((r) => r.id);
  assert.deepEqual(ids, [
    'CM-QF-01-8X10',
    'CM-QF-POST-7X5',
    'CM-SKY-8X10-UNF',
    'CM-SKY-8X10-NAT',
    'CM-POT-BLUSH',
    'CM-FW-01-HANG-A3-BLK',
    'CM-FW-01-CFP16X20',
  ]);
});

test('the Printful feed lists mugs, cushions, blankets and listed clothing', () => {
  const rows = merchantFeedRows(CATALOG, 'printful');
  assert.deepEqual(
    rows.map((r) => [r.id, r.line, r.quoteKey]),
    [
      ['CM-FW-01-MUG11-PF', 'mug', 'mug'],
      ['CM-FW-01-CUSH18-C', 'cushion-cover', 'cushion-cover'],
      ['CM-FW-01-CUSH18-I', 'cushion-insert', 'cushion-insert'],
      ['CM-QC-121-MM-XS', 'apparel', 'apparel:quiet-current-studio-tank'],
      ['CD-HOOD-M', 'apparel', 'apparel:counter-diagonal-hoodie'],
      ['CD-HOOD-L', 'apparel', 'apparel:counter-diagonal-hoodie'],
      ['CD-CAP', 'apparel', 'apparel:counter-diagonal-cap'],
    ],
  );
});

test('clothing carries the apparel attributes and its capsule label', () => {
  const items = byId(
    merchantFeedTsv(merchantFeedRows(CATALOG, 'printful'), PRINTFUL_EUR),
  );
  const hoodie = items['CD-HOOD-M'];
  assert.equal(hoodie.title, 'Counter-Diagonal Hoodie — M, Bone');
  assert.equal(hoodie.item_group_id, 'counter-diagonal-hoodie');
  assert.equal(
    hoodie.link,
    'https://shopclaramendes.com/products/counter-diagonal-hoodie?country=CY&Size=M&Color=Bone',
  );
  assert.equal(hoodie.size, 'M');
  assert.equal(hoodie.color, 'Bone');
  assert.equal(hoodie.gender, 'unisex');
  assert.equal(hoodie.age_group, 'adult');
  assert.equal(hoodie.custom_label_0, 'Counter-Diagonal');
  assert.equal(
    hoodie.google_product_category,
    'Apparel & Accessories > Clothing > Shirts & Tops',
  );
  assert.equal(items['CD-CAP'].title, 'Counter-Diagonal Cap — Black');
  assert.equal(
    items['CD-CAP'].google_product_category,
    'Apparel & Accessories > Clothing Accessories > Hats',
  );
  const tank = items['CM-QC-121-MM-XS'];
  assert.equal(tank.gender, 'female');
  assert.equal(tank.color, 'Moss / Mist');
  assert.equal(tank.custom_label_0, 'Quiet Current');
  assert.equal(
    tank.google_product_category,
    'Apparel & Accessories > Clothing > Activewear',
  );
  // Art keeps the new columns empty.
  assert.equal(items['CM-FW-01-MUG11-PF'].custom_label_0, '');
  assert.equal(items['CM-FW-01-MUG11-PF'].gender, '');
  assert.equal(items['CD-TEE-M'], undefined);
});

test('titles, links and attributes match the manual uploads', () => {
  const items = byId(merchantFeedTsv(merchantFeedRows(CATALOG, 'fixed')));
  const print = items['CM-QF-01-8X10'];
  assert.equal(print.title, 'Quiet Form I Art Print — 8 × 10 in');
  assert.equal(
    print.link,
    'https://shopclaramendes.com/products/quiet-form-i-art-print?country=CY&Size=8+%C3%97+10+in&Presentation=Unframed',
  );
  assert.equal(print.price, '26.99 EUR');
  assert.equal(print.description, 'A line of copy.');
  assert.equal(print.identifier_exists, 'no');
  assert.equal(items['CM-QF-POST-7X5'].title, 'Fine Art Postcard — Quiet Form');
  assert.equal(items['CM-QF-POST-7X5'].price, '5.40 EUR');
  assert.equal(
    items['CM-SKY-8X10-NAT'].title,
    'Your Sky Personalised Star Map — 8 × 10 in, Natural frame',
  );
  assert.equal(items['CM-SKY-8X10-NAT'].material, 'Natural wood frame');
  const hanger = items['CM-FW-01-HANG-A3-BLK'];
  assert.equal(
    hanger.title,
    'The Great Wave off Kanagawa Hanger Print by Hokusai — A3 (42 × 29.7 cm), black hanger',
  );
  assert.equal(hanger.color, 'Black');
  assert.equal(
    hanger.material,
    'Archival matte paper with black wooden hanger',
  );
});

test('fixed lines carry checkout rates and the page promise', () => {
  const items = byId(merchantFeedTsv(merchantFeedRows(CATALOG, 'fixed')));
  const print = items['CM-QF-01-8X10'];
  // 26 EU + 70 Merchant Center countries outside it (the 2026-10-29 upload).
  assert.equal(FEED_EU_COUNTRIES.length, 26);
  assert.equal(new Set(FEED_INTERNATIONAL_COUNTRIES).size, 70);
  assert.equal(print.shipping.length, 96);
  assert.equal(rate(print, 'CY'), 'CY:3.99 EUR:2:4:5:10');
  assert.equal(rate(print, 'DE'), 'DE:16.00 EUR:2:4:5:10');
  assert.equal(rate(print, 'NO'), 'NO:9.99 EUR:2:4:7:20');
  assert.equal(rate(print, 'TR'), 'TR:9.99 EUR:2:4:7:20');
  assert.equal(rate(print, 'US'), 'US:17.99 EUR:2:4:7:20');
  assert.equal(rate(print, 'IL'), 'IL:39.99 EUR:2:4:7:20');
  assert.equal(rate(print, 'KR'), undefined);
  // Postcards: letter post, EU only.
  assert.deepEqual(
    items['CM-QF-POST-7X5'].shipping,
    FEED_EU_COUNTRIES.map((c) => `${c}:2.90 EUR:2:4:5:10`),
  );
  // Framed (and framed Your Sky): no US delivery.
  assert.equal(rate(items['CM-FW-01-CFP16X20'], 'US'), undefined);
  assert.equal(rate(items['CM-SKY-8X10-NAT'], 'JP'), 'JP:29.99 EUR:2:4:7:20');
  assert.equal(rate(items['CM-SKY-8X10-UNF'], 'US'), 'US:17.99 EUR:2:4:7:20');
  assert.equal(rate(items['CM-POT-BLUSH'], 'DE'), 'DE:6.99 EUR:2:4:5:10');
  assert.equal(rate(items['CM-POT-BLUSH'], 'US'), undefined);
});

test('Printful lines ship in the EU only, at the quoted rate and Printful windows', () => {
  const items = byId(
    merchantFeedTsv(merchantFeedRows(CATALOG, 'printful'), PRINTFUL_EUR),
  );
  const mug = items['CM-FW-01-MUG11-PF'];
  assert.deepEqual(
    mug.shipping,
    FEED_EU_COUNTRIES.map((c) => `${c}:4.84 EUR:3:6:5:10`),
  );
  assert.equal(
    mug.google_product_category,
    'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs',
  );
  assert.equal(
    items['CM-FW-01-CUSH18-I'].title,
    'The Great Wave off Kanagawa Cushion by Hokusai — 18 × 18 in, with insert',
  );
  assert.equal(rate(items['CM-FW-01-CUSH18-I'], 'DE'), 'DE:12.39 EUR:3:8:5:10');
  assert.equal(rate(items['CM-FW-01-CUSH18-C'], 'CY'), 'CY:4.48 EUR:3:8:5:10');
  // A profile that prices Cyprus apart (Quiet Current) keeps both rates.
  const tank = items['CM-QC-121-MM-XS'];
  assert.equal(rate(tank, 'CY'), 'CY:3.99 EUR:3:8:5:10');
  assert.equal(rate(tank, 'DE'), 'DE:4.95 EUR:3:8:5:10');
  assert.equal(rate(tank, 'US'), undefined);
  assert.equal(rate(items['CD-HOOD-L'], 'FR'), 'FR:6.71 EUR:3:8:5:10');
});

test('a Printful item without a Cyprus quote is not listed in Cyprus', () => {
  const rows = merchantFeedRows(CATALOG, 'printful');
  const {cyprus, ...rest} = PRINTFUL_EUR.quotes;
  const noCap = {...cyprus};
  delete noCap['apparel:counter-diagonal-cap'];
  const items = byId(
    merchantFeedTsv(rows, {...PRINTFUL_EUR, quotes: {...rest, cyprus: noCap}}),
  );
  assert.equal(rate(items['CD-CAP'], 'CY'), undefined);
  assert.equal(items['CD-CAP'].shipping.length, 25);
  assert.equal(rate(items['CD-HOOD-M'], 'CY'), 'CY:6.71 EUR:3:8:5:10');
});

test('the EUR feeds drop the US once the US market sells in USD', () => {
  const rows = merchantFeedRows(CATALOG, 'fixed');
  const before = byId(merchantFeedTsv(rows, {market: 'CY', includeUs: true}));
  const after = byId(merchantFeedTsv(rows, {market: 'CY', includeUs: false}));
  const print = after['CM-QF-01-8X10'];
  assert.equal(rate(print, 'US'), undefined);
  assert.equal(print.shipping.length, 95);
  // Every other country and rate stays exactly as it was.
  for (const [id, item] of Object.entries(before))
    assert.deepEqual(
      after[id].shipping,
      item.shipping.filter((cell) => !cell.startsWith('US:')),
    );
  assert.equal(rate(after['CM-QF-01-8X10'], 'CA'), 'CA:17.99 EUR:2:4:7:20');
});

test('the USD feeds list the US only, at quoted US rates and ?country=US links', () => {
  const catalog = inUsd(CATALOG);
  const fixed = merchantFeedRows(catalog, 'fixed', 'US');
  assert.deepEqual(
    [...new Set(fixed.map((r) => r.quoteKey))],
    [
      'print:Art Prints',
      'card:Postcards',
      'print:Personalised Art',
      'framed:Personalised Art',
      'pot:Plant Pots',
      'print:Hanger Prints',
      'framed:Framed Art',
    ],
  );
  // The server drops rows Shopify can't deliver to the US (no quote).
  const quotes = {
    'print:Art Prints': '12.99',
    'print:Personalised Art': '12.99',
    'print:Hanger Prints': '12.99',
  };
  const shipping = fixed.filter((r) => quotes[r.quoteKey]);
  const items = byId(merchantFeedTsv(shipping, {market: 'US', quotes}));
  const print = items['CM-QF-01-8X10'];
  assert.equal(print.price, '26.99 USD');
  assert.deepEqual(print.shipping, ['US:12.99 USD:2:4:7:15']);
  assert.equal(
    print.link,
    'https://shopclaramendes.com/products/quiet-form-i-art-print?country=US&Size=8+%C3%97+10+in&Presentation=Unframed',
  );
  assert.deepEqual(Object.keys(items).sort(), [
    'CM-FW-01-HANG-A3-BLK',
    'CM-QF-01-8X10',
    'CM-SKY-8X10-UNF',
  ]);

  const printful = merchantFeedRows(catalog, 'printful', 'US');
  const us = byId(
    merchantFeedTsv(printful, {
      market: 'US',
      quotes: {
        mug: '5.99',
        'cushion-cover': '5.49',
        'cushion-insert': '13.49',
        'apparel:quiet-current-studio-tank': '5.49',
        'apparel:counter-diagonal-hoodie': '8.79',
        'apparel:counter-diagonal-cap': '4.69',
      },
    }),
  );
  assert.deepEqual(us['CD-HOOD-M'].shipping, ['US:8.79 USD:3:8:7:15']);
  assert.equal(us['CD-HOOD-M'].price, '58.49 USD');
  assert.equal(us['CD-HOOD-M'].custom_label_0, 'Counter-Diagonal');
  assert.match(us['CD-HOOD-M'].link, /\?country=US&Size=M&Color=Bone$/);
});

test('the USD feeds refuse prices that are not in USD', () => {
  assert.throws(
    () => merchantFeedRows(CATALOG, 'fixed', 'US'),
    /US prices are in EUR, not USD/,
  );
  assert.throws(
    () => merchantFeedRows(inUsd(CATALOG), 'printful', 'CY'),
    /CY prices are in USD, not EUR/,
  );
  const rows = merchantFeedRows(inUsd(CATALOG), 'fixed', 'US');
  assert.throws(
    () => merchantFeedTsv(rows, {market: 'US', quotes: {}}),
    /No US checkout rate for print:Art Prints/,
  );
});

test('the Meta country feed overrides price, link and availability by id', () => {
  const catalog = inUsd(CATALOG);
  const options = {withUnavailable: true};
  const tsv = metaCountryFeedTsv(
    [
      ...merchantFeedRows(catalog, 'fixed', 'US', options),
      ...merchantFeedRows(catalog, 'printful', 'US', options),
    ],
    'US',
  );
  const [header, ...rows] = parse(tsv);
  assert.deepEqual(header, [...META_COUNTRY_COLUMNS]);
  const byKey = Object.fromEntries(rows.map((r) => [r[0], r]));
  assert.deepEqual(byKey['CD-HOOD-M'], [
    'CD-HOOD-M',
    'US',
    '58.49 USD',
    'https://shopclaramendes.com/products/counter-diagonal-hoodie?country=US&Size=M&Color=Bone',
    'in stock',
  ]);
  // Not for sale in the US market: listed, but out of stock for US viewers.
  assert.equal(byKey['CM-QF-01-16X20'][4], 'out of stock');
  assert.equal(byKey['CD-TEE-M'], undefined);
  for (const row of rows) assert.equal(row.length, header.length);
});

test('a Printful row without a quoted rate fails instead of guessing', () => {
  assert.throws(
    () => merchantFeedTsv(merchantFeedRows(CATALOG, 'printful')),
    /No checkout rate for mug/,
  );
});

test('the fixed feed has no Printful items, so no clothing', () => {
  const ids = merchantFeedRows(CATALOG, 'fixed').map((r) => r.id);
  assert.ok(!ids.some((id) => id.startsWith('CD-') || id.startsWith('CM-QC')));
});

test('every row has the header width and no stray tabs', () => {
  const [header, ...rows] = parse(
    merchantFeedTsv(merchantFeedRows(CATALOG, 'fixed')),
  );
  assert.deepEqual(header.slice(0, FEED_COLUMNS.length), [...FEED_COLUMNS]);
  assert.ok(
    header.slice(FEED_COLUMNS.length).every((c) => c === SHIPPING_COLUMN),
  );
  for (const row of rows) assert.equal(row.length, header.length);
});

test('the routes answer 503 rather than an empty feed, each for its market', () => {
  const server = read('app/lib/merchantFeed.server.ts');
  assert.match(server, /status: 503/);
  assert.match(server, /market: FeedMarket = 'CY'/);
  const route = (name) => read(`app/routes/feeds.${name}[.txt].tsx`);
  assert.match(route('google-merchant'), /storefront, 'fixed'\)/);
  assert.match(route('google-merchant-printful'), /storefront, 'printful'\)/);
  assert.match(route('google-merchant-us'), /'fixed', 'US'\)/);
  assert.match(route('google-merchant-printful-us'), /'printful', 'US'\)/);
  assert.match(route('meta-country-us'), /'meta-country',\s+'US',?\s*\)/);
});
