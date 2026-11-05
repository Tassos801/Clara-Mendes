import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  FEED_COLUMNS,
  merchantFeedRows,
  merchantFeedTsv,
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
const product = (handle, title, productType, tags, variants) => ({
  handle,
  title,
  productType,
  tags,
  description: '  A   line\nof copy. ',
  featuredImage: {url: `https://cdn.example/${handle}.jpg`},
  variants: {nodes: variants},
});

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
    ['Activewear'],
    [variant('CM-QC-121-MM-XS', {Colour: 'Moss / Mist', Size: 'XS'}, '55')],
  ),
];
const PRINTFUL_RATES = {
  mug: '4.84',
  'cushion-cover': '4.48',
  'cushion-insert': '12.39',
  blanket: '6.55',
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

test('the Printful feed lists only mugs, cushions and blankets', () => {
  const rows = merchantFeedRows(CATALOG, 'printful');
  assert.deepEqual(
    rows.map((r) => [r.id, r.line]),
    [
      ['CM-FW-01-MUG11-PF', 'mug'],
      ['CM-FW-01-CUSH18-C', 'cushion-cover'],
      ['CM-FW-01-CUSH18-I', 'cushion-insert'],
    ],
  );
});

test('titles, links and attributes match the manual uploads', () => {
  const items = byId(merchantFeedTsv(merchantFeedRows(CATALOG, 'fixed')));
  const print = items['CM-QF-01-8X10'];
  assert.equal(print.title, 'Quiet Form I Art Print — 8 × 10 in');
  assert.equal(
    print.link,
    'https://shopclaramendes.com/products/quiet-form-i-art-print?Size=8+%C3%97+10+in&Presentation=Unframed',
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
    merchantFeedTsv(merchantFeedRows(CATALOG, 'printful'), PRINTFUL_RATES),
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
});

test('a Printful row without a quoted rate fails instead of guessing', () => {
  assert.throws(
    () => merchantFeedTsv(merchantFeedRows(CATALOG, 'printful')),
    /No checkout rate for mug/,
  );
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

test('the routes answer 503 rather than an empty feed, and read the CY market', () => {
  const server = read('app/lib/merchantFeed.server.ts');
  assert.match(server, /status: 503/);
  assert.match(server, /country: 'CY'/);
  assert.match(read('app/routes/feeds.google-merchant[.txt].tsx'), /'fixed'/);
  assert.match(
    read('app/routes/feeds.google-merchant-printful[.txt].tsx'),
    /'printful'/,
  );
});
