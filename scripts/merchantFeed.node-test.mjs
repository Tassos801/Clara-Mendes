import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {
  FEED_COLUMNS,
  FEED_CURRENCY,
  META_COUNTRY_COLUMNS,
  hasFeedShipping,
  merchantFeedRows,
  merchantFeedTsv,
  metaCountryFeedTsv,
} from '../app/lib/merchantFeed.ts';
import {
  FEED_EU_COUNTRIES,
  FEED_EXCHANGE_ALLOWANCE_PERCENT,
  FEED_INTERNATIONAL_COUNTRIES,
  FIXED_RATES,
  SHIPPING_COLUMN,
  feedAmount,
  usFixedRate,
} from '../app/lib/merchantFeedShipping.ts';
import {
  PRINTFUL_SHIPPING_FEES,
  US_FIXED_SHIPPING_FEES,
} from '../app/lib/printfulShippingFees.ts';

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

// What the feeds state for the fee table's rows: a EUR fee follows the
// dollar between rebuilds, so it carries the allowance; a USD fee is exact.
const FEES = PRINTFUL_SHIPPING_FEES;
const euFee = (group) => feedAmount({...FEES[group].EU, about: true});
const usFee = (group) => FEES[group].US.amount;
const EU = {market: 'CY', includeUs: true};
const US = {market: 'US'};

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
  // Activewear listed through its approvals (the retired Quiet Current
  // tank, below, never reaches a feed).
  product(
    'studio-tank-fixture',
    'Studio Tank',
    'Studio Top',
    ['clara-mendes-clothing', 'Activewear', 'Made to order'],
    [variant('CM-QC-121-MM-XS', {Colour: 'Moss / Mist', Size: 'XS'}, '55')],
    APPROVED,
  ),
  product(
    'quiet-current-studio-tank',
    'Quiet Current Studio Tank',
    'Studio Top',
    ['Activewear', 'Made to order', 'Quiet Current'],
    [variant('CM-QC-RETIRED', {Colour: 'Moss / Mist', Size: 'XS'}, '55')],
    APPROVED,
  ),
  product(
    'counter-diagonal-premium-hoodie',
    'Counter-Diagonal Premium Hoodie',
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
  // A garment type the fee table has no shipping group for yet.
  product(
    'counter-diagonal-dress',
    'Counter-Diagonal Dress',
    'Dresses',
    ['clara-mendes-clothing', 'Counter-Diagonal', 'Made to order'],
    [variant('CD-DRESS-M', {Size: 'M'}, '69.99')],
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
// The Printful rows a feed lists, as the server filters them.
const printfulRows = (catalog, market = 'CY') =>
  merchantFeedRows(catalog, 'printful', market).filter((row) =>
    hasFeedShipping(row, market === 'US' ? US : EU),
  );

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
  // Each row carries the fee table's EU fee for its shipping group.
  const eu = (group) => ({...FEES[group].EU, about: true});
  assert.deepEqual(
    rows.map((r) => [r.id, r.line, r.printfulFee]),
    [
      ['CM-FW-01-MUG11-PF', 'mug', eu('mug')],
      ['CM-FW-01-CUSH18-C', 'cushion-cover', eu('light')],
      ['CM-FW-01-CUSH18-I', 'cushion-insert', eu('cushion-insert')],
      ['CM-QC-121-MM-XS', 'apparel', eu('light')],
      ['CD-HOOD-M', 'apparel', eu('hoodie')],
      ['CD-HOOD-L', 'apparel', eu('hoodie')],
      ['CD-CAP', 'apparel', eu('cap')],
      ['CD-DRESS-M', 'apparel', null],
    ],
  );
  // Fixed lines read FIXED_RATES instead.
  for (const row of merchantFeedRows(CATALOG, 'fixed'))
    assert.equal(row.printfulFee, null, row.id);
});

test('clothing carries the apparel attributes and its capsule label', () => {
  const items = byId(merchantFeedTsv(printfulRows(CATALOG), EU));
  const hoodie = items['CD-HOOD-M'];
  assert.equal(hoodie.title, 'Counter-Diagonal Premium Hoodie — M, Bone');
  assert.equal(hoodie.item_group_id, 'counter-diagonal-premium-hoodie');
  assert.equal(
    hoodie.link,
    'https://shopclaramendes.com/products/counter-diagonal-premium-hoodie?country=CY&Size=M&Color=Bone',
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
  // In no capsule collection and with no capsule tag: no label.
  assert.equal(tank.custom_label_0, '');
  // The retired Quiet Current tank never feeds, even approved.
  assert.equal(items['CM-QC-RETIRED'], undefined);
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

test('museum titles name the artist from the art registry, not only from tags', () => {
  // Museum Masterpieces products carry no artist tag.
  const tags = ['Museum Reproduction', 'Museum Masterpieces'];
  const items = byId(
    merchantFeedTsv(
      printfulRows([
        product('irises-blanket', 'Irises Throw Blanket', 'Blankets', tags, [
          variant('CM-MM-01-BLANKET50X60', {Size: '50 × 60 in'}, '64.99'),
        ]),
        product('the-milkmaid-mug', 'The Milkmaid Mug', 'Mugs', tags, [
          variant('CM-MM-05-MUG11-PF', {Size: '11 oz'}, '24.99'),
        ]),
        product(
          'strawberry-thief-cushion',
          'Strawberry Thief Cushion',
          'Cushions',
          tags,
          [
            variant(
              'CM-MM-06-CUSH22-I',
              {Size: '22 × 22 in', Filling: 'With insert'},
              '69.99',
            ),
          ],
        ),
      ]),
      EU,
    ),
  );
  assert.equal(
    items['CM-MM-01-BLANKET50X60'].title,
    'Irises Throw Blanket by Van Gogh — 50 × 60 in',
  );
  assert.equal(
    items['CM-MM-05-MUG11-PF'].title,
    'The Milkmaid Mug by Vermeer — 11 oz',
  );
  assert.equal(
    items['CM-MM-06-CUSH22-I'].title,
    'Strawberry Thief Cushion by Morris — 22 × 22 in, with insert',
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
  // US zones (2026-11-05): prints EUR 13.99 (orders under EUR 77).
  assert.equal(rate(print, 'US'), 'US:13.99 EUR:2:4:7:20');
  assert.equal(rate(print, 'CA'), 'CA:17.99 EUR:2:4:7:20');
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
  assert.equal(rate(items['CM-SKY-8X10-UNF'], 'US'), 'US:13.99 EUR:2:4:7:20');
  assert.equal(rate(items['CM-POT-BLUSH'], 'DE'), 'DE:6.99 EUR:2:4:5:10');
  assert.equal(rate(items['CM-POT-BLUSH'], 'US'), undefined);
});

test('Printful lines ship in the EU only, at the fee table rate and Printful windows', () => {
  const items = byId(merchantFeedTsv(printfulRows(CATALOG), EU));
  const mug = items['CM-FW-01-MUG11-PF'];
  // One fee across the EU, Cyprus included; nowhere else, never the US.
  assert.deepEqual(
    mug.shipping,
    FEED_EU_COUNTRIES.map((c) => `${c}:${euFee('mug')} EUR:3:6:5:10`),
  );
  assert.equal(
    mug.google_product_category,
    'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs',
  );
  assert.equal(
    items['CM-FW-01-CUSH18-I'].title,
    'The Great Wave off Kanagawa Cushion by Hokusai — 18 × 18 in, with insert',
  );
  assert.equal(
    rate(items['CM-FW-01-CUSH18-I'], 'DE'),
    `DE:${euFee('cushion-insert')} EUR:3:8:5:10`,
  );
  // A cover alone ships as a light piece.
  assert.equal(
    rate(items['CM-FW-01-CUSH18-C'], 'CY'),
    `CY:${euFee('light')} EUR:3:8:5:10`,
  );
  const tank = items['CM-QC-121-MM-XS'];
  assert.equal(rate(tank, 'CY'), `CY:${euFee('light')} EUR:3:8:5:10`);
  assert.equal(rate(tank, 'US'), undefined);
  assert.equal(
    rate(items['CD-HOOD-L'], 'FR'),
    `FR:${euFee('hoodie')} EUR:3:8:5:10`,
  );
  assert.equal(items['CD-CAP'].shipping.length, 26);
});

test('the feed states a moving fee slightly above the table, never below', () => {
  // Google: "Match or slightly overestimate the cost customers would pay."
  assert.equal(FEED_EXCHANGE_ALLOWANCE_PERCENT, 2);
  const about = (amount) => ({amount, currencyCode: 'EUR', about: true});
  assert.equal(feedAmount(about('4.47')), '4.56');
  assert.equal(feedAmount(about('4.83')), '4.93');
  assert.equal(feedAmount(about('6.53')), '6.67');
  assert.equal(feedAmount(about('12.35')), '12.60');
  assert.equal(feedAmount(about('10.00')), '10.20');
  // A fee that does not move with the exchange rate is stated as is.
  assert.equal(feedAmount({amount: '8.79', currencyCode: 'USD'}), '8.79');
  // Checkout charges the fixed lines' US rate in whole dollars.
  const usd = (amount) => ({amount, currencyCode: 'USD', about: true});
  assert.equal(feedAmount(usd('16.00'), 100), '17.00');
  assert.equal(feedAmount(usd('28.00'), 100), '29.00');
  for (const group of Object.keys(FEES)) {
    const table = Number(FEES[group].EU.amount);
    const stated = Number(euFee(group));
    assert.ok(stated >= table, group);
    assert.ok(stated <= table * 1.02 + 0.01, group);
    assert.equal(usFee(group), FEES[group].US.amount);
  }
});

test('the fee table prices every fixed line that ships to the US, in whole dollars', () => {
  const shipsToUs = Object.keys(FIXED_RATES).filter((line) =>
    Object.values(FIXED_RATES[line].international ?? {}).some((countries) =>
      countries.includes('US'),
    ),
  );
  assert.deepEqual(shipsToUs, ['print', 'mounted', 'canvas']);
  assert.deepEqual(Object.keys(US_FIXED_SHIPPING_FEES), shipsToUs);
  for (const line of shipsToUs) {
    const fee = US_FIXED_SHIPPING_FEES[line];
    assert.equal(fee.currencyCode, 'USD', line);
    assert.match(fee.amount, /^\d+\.00$/, line);
    // The next dollar up: the allowance for a rate that follows the dollar.
    assert.equal(
      usFixedRate(line),
      `${Number(fee.amount) + 1}.00`,
      line,
    );
  }
  for (const line of ['framed', 'card', 'pot'])
    assert.equal(usFixedRate(line), null, line);
});

test('a Printful piece the fee table has no group for is left out, not guessed', () => {
  const rows = merchantFeedRows(CATALOG, 'printful');
  const dress = rows.find((row) => row.id === 'CD-DRESS-M');
  assert.equal(hasFeedShipping(dress, EU), false);
  assert.equal(hasFeedShipping(dress, US), false);
  assert.ok(rows.filter((row) => row !== dress).every((row) => hasFeedShipping(row, EU)));
  assert.equal(byId(merchantFeedTsv(printfulRows(CATALOG), EU))['CD-DRESS-M'], undefined);
  // Asked to write it anyway, the feed fails rather than list it unpriced.
  assert.throws(
    () => merchantFeedTsv(rows, EU),
    /No CY delivery rate for CD-DRESS-M/,
  );
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

test('the USD feeds list the US only, at fee table rates and ?country=US links', () => {
  const catalog = inUsd(CATALOG);
  const fixed = merchantFeedRows(catalog, 'fixed', 'US');
  // Cards, framed prints and pots have no US rate: the server leaves them out.
  const shipping = fixed.filter((row) => hasFeedShipping(row, US));
  assert.deepEqual(
    fixed.filter((row) => !shipping.includes(row)).map((row) => row.id),
    ['CM-QF-POST-7X5', 'CM-SKY-8X10-NAT', 'CM-POT-BLUSH', 'CM-FW-01-CFP16X20'],
  );
  const items = byId(merchantFeedTsv(shipping, US));
  const print = items['CM-QF-01-8X10'];
  assert.equal(print.price, '26.99 USD');
  assert.deepEqual(print.shipping, [
    `US:${usFixedRate('print')} USD:2:4:7:15`,
  ]);
  assert.equal(
    print.link,
    'https://shopclaramendes.com/products/quiet-form-i-art-print?country=US&Size=8+%C3%97+10+in&Presentation=Unframed',
  );
  assert.deepEqual(Object.keys(items).sort(), [
    'CM-FW-01-HANG-A3-BLK',
    'CM-QF-01-8X10',
    'CM-SKY-8X10-UNF',
  ]);

  const us = byId(merchantFeedTsv(printfulRows(catalog, 'US'), US));
  // Printful's dollar rates are fixed, so the feed states them exactly.
  assert.deepEqual(us['CD-HOOD-M'].shipping, [
    `US:${usFee('hoodie')} USD:3:8:7:15`,
  ]);
  assert.deepEqual(us['CM-FW-01-MUG11-PF'].shipping, [
    `US:${usFee('mug')} USD:3:6:7:15`,
  ]);
  assert.deepEqual(us['CD-CAP'].shipping, [`US:${usFee('cap')} USD:3:8:7:15`]);
  assert.equal(us['CD-HOOD-M'].price, '58.49 USD');
  assert.equal(us['CD-HOOD-M'].custom_label_0, 'Counter-Diagonal');
  assert.match(us['CD-HOOD-M'].link, /\?country=US&Size=M&Color=Bone$/);
  assert.equal(us['CD-DRESS-M'], undefined);
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
  // A line with no US rate is the server's to leave out, never to guess.
  const rows = merchantFeedRows(inUsd(CATALOG), 'fixed', 'US');
  assert.throws(
    () => merchantFeedTsv(rows, US),
    /No US delivery rate for CM-QF-POST-7X5/,
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
    // Product-level title: Meta cards drop the variant's size and colour.
    'Counter-Diagonal Premium Hoodie',
    '58.49 USD',
    'https://shopclaramendes.com/products/counter-diagonal-premium-hoodie?country=US&Size=M&Color=Bone',
    'in stock',
  ]);
  // Not for sale in the US market: listed, but out of stock for US viewers.
  assert.equal(byKey['CM-QF-01-16X20'][5], 'out of stock');
  assert.equal(byKey['CM-QF-01-8X10'][2], 'Quiet Form I Art Print');
  assert.equal(byKey['CD-TEE-M'], undefined);
  for (const row of rows) assert.equal(row.length, header.length);
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

test('US zones: acrylic and metal pay the upper General rate, canvas its own', () => {
  const catalog = [
    product(
      'the-great-wave-off-kanagawa-acrylic-print',
      'The Great Wave off Kanagawa Acrylic Print',
      'Acrylic Prints',
      MUSEUM,
      [variant('CM-FW-01-ACRY8X12', {Size: '8 × 12 in'}, '79.99')],
    ),
    product(
      'stretched-canvas-art-16x20',
      'Stretched Canvas Art',
      'Canvas Art',
      [STUDIO],
      [variant('CM-QF-CAN-16X20', {Artwork: 'Quiet Form'}, '80.10')],
    ),
    CATALOG[0],
  ];
  const items = byId(merchantFeedTsv(merchantFeedRows(catalog, 'fixed')));
  const acrylic = items['CM-FW-01-ACRY8X12'];
  const print = items['CM-QF-01-8X10'];
  assert.equal(rate(acrylic, 'US'), 'US:23.99 EUR:2:4:7:20');
  assert.equal(rate(print, 'US'), 'US:13.99 EUR:2:4:7:20');
  // Everywhere else acrylic keeps exactly the print rates.
  assert.deepEqual(
    acrylic.shipping.filter((c) => !c.startsWith('US:')),
    print.shipping.filter((c) => !c.startsWith('US:')),
  );
  const canvas = items['CM-QF-CAN-16X20'];
  assert.equal(rate(canvas, 'US'), 'US:23.99 EUR:2:4:7:20');
  assert.equal(rate(canvas, 'JP'), 'JP:29.99 EUR:2:4:7:20');
  assert.equal(rate(canvas, 'CY'), 'CY:3.99 EUR:2:4:5:10');
});

/** Execute a real feed route loader (the route file, transpiled as it is). */
function loadRoute(name) {
  const file = path.join(ROOT, `app/routes/${name}.tsx`);
  const localRequire = createRequire(file);
  const output = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  const load = (specifier) =>
    specifier.startsWith('~/lib/')
      ? localRequire(path.join(ROOT, `app/${specifier.slice(2)}.ts`))
      : localRequire(specifier);
  new Function('exports', 'require', output)(exports, load);
  return exports;
}

test('every feed route answers from catalogue reads and the tables, without a cart', async (t) => {
  // The Cache API of the worker runtime, in memory.
  const cached = new Map();
  globalThis.caches = {
    open: async () => ({
      match: async (key) => cached.get(key)?.clone(),
      put: async (key, response) => void cached.set(key, response),
    }),
  };
  t.after(() => delete globalThis.caches);
  const warnings = [];
  t.mock.method(console, 'warn', (...args) => warnings.push(args.join(' ')));

  const queries = [];
  const mutations = [];
  const storefront = {
    CacheShort: () => ({}),
    query: async (query, {variables}) => {
      assert.doesNotMatch(query, /\bmutation\b|cartCreate|cartLinesUpdate/);
      queries.push(query.match(/query (\w+)/)[1]);
      // The US market sells in USD.
      if (query.includes('query FeedMarketCurrency'))
        return {
          localization: {
            country: {currency: {isoCode: FEED_CURRENCY[variables.country]}},
          },
        };
      return {
        products: {
          nodes: variables.country === 'US' ? inUsd(CATALOG) : CATALOG,
          pageInfo: {hasNextPage: false, endCursor: null},
        },
      };
    },
    // What the old feeds did for every quote: a cart, which Shopify counts
    // as a visit that added to cart.
    mutate: async (mutation) => {
      mutations.push(mutation);
      throw new Error('A feed must not create a cart');
    },
  };
  const fetchFeed = async (name) => {
    const {loader} = loadRoute(`feeds.${name}[.txt]`);
    const response = await loader({
      request: new Request(`https://shopclaramendes.com/feeds/${name}.txt`),
      context: {storefront},
      params: {},
    });
    assert.equal(response.status, 200, name);
    assert.match(response.headers.get('Content-Type'), /^text\/plain/);
    return response.text();
  };

  const site = byId(await fetchFeed('google-merchant'));
  assert.equal(rate(site['CM-QF-01-8X10'], 'DE'), 'DE:16.00 EUR:2:4:5:10');
  // The US market sells in USD, so the EUR feed leaves the US to the USD one.
  assert.equal(rate(site['CM-QF-01-8X10'], 'US'), undefined);
  assert.equal(site['CM-FW-01-MUG11-PF'], undefined);

  const printful = byId(await fetchFeed('google-merchant-printful'));
  assert.deepEqual(
    printful['CD-HOOD-M'].shipping,
    FEED_EU_COUNTRIES.map((c) => `${c}:${euFee('hoodie')} EUR:3:8:5:10`),
  );
  assert.equal(
    rate(printful['CM-FW-01-MUG11-PF'], 'CY'),
    `CY:${euFee('mug')} EUR:3:6:5:10`,
  );
  assert.equal(printful['CD-DRESS-M'], undefined);

  const siteUs = byId(await fetchFeed('google-merchant-us'));
  assert.deepEqual(Object.keys(siteUs).sort(), [
    'CM-FW-01-HANG-A3-BLK',
    'CM-QF-01-8X10',
    'CM-SKY-8X10-UNF',
  ]);
  assert.deepEqual(siteUs['CM-QF-01-8X10'].shipping, [
    `US:${usFixedRate('print')} USD:2:4:7:15`,
  ]);

  const printfulUs = byId(await fetchFeed('google-merchant-printful-us'));
  assert.deepEqual(printfulUs['CD-HOOD-M'].shipping, [
    `US:${usFee('hoodie')} USD:3:8:7:15`,
  ]);
  assert.deepEqual(printfulUs['CM-FW-01-CUSH18-I'].shipping, [
    `US:${usFee('cushion-insert')} USD:3:8:7:15`,
  ]);

  const [metaHeader, ...meta] = parse(await fetchFeed('meta-country-us'));
  assert.deepEqual(metaHeader, [...META_COUNTRY_COLUMNS]);
  assert.ok(meta.some((row) => row[0] === 'CD-HOOD-M' && row[3] === '58.49 USD'));

  assert.deepEqual(mutations, []);
  // One catalogue read per feed, and the US currency for the two EUR feeds.
  assert.deepEqual(queries.sort(), [
    ...Array(2).fill('FeedMarketCurrency'),
    ...Array(5).fill('MerchantFeedProducts'),
  ]);
  // Rows without a rate were left out and named in the log.
  assert.equal(warnings.length, 3);
  assert.match(warnings[0], /printful, EUR\): 1 items .* counter-diagonal-dress$/);
  assert.match(warnings[1], /fixed, USD\): 4 items/);
  assert.match(warnings[2], /printful, USD\): 1 items .* counter-diagonal-dress$/);

  // A repeat request inside the cache window reads nothing.
  await fetchFeed('google-merchant-printful');
  assert.equal(queries.length, 7);
});

test('the feed server holds no cart mutation', () => {
  const server = read('app/lib/merchantFeed.server.ts');
  assert.doesNotMatch(server, /\.mutate\(|\bmutation\b|cartCreate|cartLinesUpdate/);
  assert.doesNotMatch(read('storefrontapi.generated.d.ts'), /FeedQuote/);
});
