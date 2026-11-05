import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  collectionHero,
  heroNamesShipping,
  usCollectionHero,
} from '../app/lib/collectionHeroes.ts';
import {YOUR_SKY_PAGE} from '../app/lib/featurePages.ts';
import {cheapestPrice, formatMoney} from '../app/lib/money.ts';

// docs/us-market/status.md, step A3: no euro figure reaches a US (USD) page.
// Every other buyer keeps today's wording exactly.
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');

const QC_LEAD =
  'Leggings, studio bra, biker shorts and tank with a watercolour-style mist print. Moss / Mist and Clay / Oat, XS–XL.';

test('the Quiet Current hero keeps its EUR line for every non-US buyer', () => {
  assert.equal(
    collectionHero('quiet-current').subtitle,
    `${QC_LEAD} Clothing shipping from €3.99, one fee per order.`,
  );
  // Loader data stays plain (no function field).
  assert.ok(!('usSubtitle' in collectionHero('quiet-current')));
  assert.equal(heroNamesShipping('quiet-current'), true);
  assert.equal(heroNamesShipping('counter-diagonal'), false);
});

test('a US buyer reads checkout’s fee, or no figure', () => {
  assert.equal(
    usCollectionHero('quiet-current', '$6.00').subtitle,
    `${QC_LEAD} Clothing shipping $6.00 to the United States, one fee per order.`,
  );
  assert.equal(
    usCollectionHero('quiet-current', null).subtitle,
    `${QC_LEAD} One clothing shipping fee per order.`,
  );
  assert.deepEqual(
    usCollectionHero('counter-diagonal', '$6.00'),
    collectionHero('counter-diagonal'),
  );
  assert.equal(usCollectionHero('no-such-collection', null), null);
});

test('Your Sky reads the live USD price for US buyers, unframed only', () => {
  assert.equal(
    YOUR_SKY_PAGE.hero.priceLine,
    'From €35.99 · made to order · unframed or framed',
  );
  const from = cheapestPrice([
    {availableForSale: false, price: {amount: '30.00', currencyCode: 'USD'}},
    {availableForSale: true, price: {amount: '103.00', currencyCode: 'USD'}},
    {availableForSale: true, price: {amount: '41.00', currencyCode: 'USD'}},
  ]);
  assert.deepEqual(from, {amount: '41.00', currencyCode: 'USD'});
  assert.equal(
    YOUR_SKY_PAGE.hero.usPriceLine.replace('{price}', formatMoney(from)),
    'From $41.00 · made to order · unframed',
  );
  assert.equal(cheapestPrice([]), null);
  assert.match(
    read('app/routes/your-sky.tsx'),
    /usDelivery\s*\?\s*cheapestPrice/,
  );
});

test('the clothing page and PDP keep EUR for EUR buyers and quote the US', () => {
  const clothing = read('app/routes/clothing.tsx');
  assert.match(clothing, /`€\$\{APPAREL_SHIPPING_FROM_EUR\}`/);
  assert.match(
    clothing,
    /One clothing shipping fee per order, from \$\{data\.shippingFrom\}\. Other items ship at their own rates\. Checkout confirms the fee for your address\./,
  );
  const pdp = read('app/routes/products.$handle.tsx');
  assert.match(
    pdp,
    /isQuietCurrentProduct\(product\.handle\) && buyerCountry === 'US'/,
  );
  assert.match(pdp, /showApparelTable = isQuietCurrent && !clothingShipping/);
});
