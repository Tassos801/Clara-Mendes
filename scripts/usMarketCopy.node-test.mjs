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

test('no collection hero names a shipping fee, so US buyers read the same copy', () => {
  // Quiet Current, the only hero that named a EUR fee, is retired.
  assert.equal(collectionHero('quiet-current'), null);
  for (const handle of ['counter-diagonal', 'free-abyss', 'circle-rhythm']) {
    assert.equal(heroNamesShipping(handle), false, handle);
    assert.ok(!('usSubtitle' in collectionHero(handle)), handle);
    assert.deepEqual(usCollectionHero(handle, '$6.00'), collectionHero(handle), handle);
  }
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

test('the clothing page names no fixed fee and the PDP prices the US from the table', () => {
  // Each garment's product page quotes its own fee in the buyer's currency;
  // /clothing names no figure, so no euro amount reaches a US buyer.
  const clothing = read('app/routes/clothing.tsx');
  assert.doesNotMatch(clothing, /€|APPAREL_SHIPPING_FROM_EUR|shippingFrom/);
  assert.match(clothing, /Each product page shows the fee for your country; checkout\s+confirms it for your address\./);
  const pdp = read('app/routes/products.$handle.tsx');
  // The fee comes from the checked-in table, which refuses a fee whose
  // currency is not the buyer's (scripts/printfulShippingFees.node-test.mjs).
  assert.match(pdp, /printfulShippingFee\(/);
  assert.match(pdp, /showApparelTable = isQuietCurrent && !clothingShipping/);
});
