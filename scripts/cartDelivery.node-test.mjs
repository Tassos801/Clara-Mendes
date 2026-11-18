import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  cartChristmasOrderBy,
  cartShippingNote,
} from '../app/lib/cartDelivery.ts';
import {
  christmasOrderBy,
  formatOrderByDate,
} from '../app/lib/christmasDelivery.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');

test('the shipping line names the cart country, as the product page does', () => {
  assert.equal(cartShippingNote('CY'), 'Shipping to Cyprus is added at checkout.');
  assert.equal(
    cartShippingNote('us'),
    'Shipping to the United States is added at checkout.',
  );
  // No country, or one the shop does not list: the plain sentence.
  assert.equal(cartShippingNote(null), 'Shipping is calculated at checkout.');
  assert.equal(cartShippingNote('ZZ'), 'Shipping is calculated at checkout.');
});

test('a mixed cart shows the earliest order-by date of its lines', () => {
  const art = christmasOrderBy('prodigi-art', 'eu', 2026).date;
  const blanket = christmasOrderBy('printful-home', 'eu', 2026).date;
  const earliest = art < blanket ? art : blanket;
  assert.equal(
    cartChristmasOrderBy({
      countryCode: 'DE',
      lines: ['prodigi-art', 'printful-home'],
      today: '2026-11-18',
    }),
    `For Christmas delivery in the EU, order by ${formatOrderByDate(earliest)}.`,
  );
});

test('no order-by date when a line has none, after it, or outside the EU and US', () => {
  const lines = ['prodigi-art'];
  // A line without verified windows (some garments) gets no date, so the
  // cart cannot promise one for the whole order.
  assert.equal(
    cartChristmasOrderBy({countryCode: 'CY', lines: ['prodigi-art', null], today: '2026-11-18'}),
    null,
  );
  assert.equal(cartChristmasOrderBy({countryCode: 'JP', lines, today: '2026-11-18'}), null);
  assert.equal(cartChristmasOrderBy({countryCode: null, lines, today: '2026-11-18'}), null);
  assert.equal(cartChristmasOrderBy({countryCode: 'CY', lines: [], today: '2026-11-18'}), null);
  const date = christmasOrderBy('prodigi-art', 'eu', 2026).date;
  const dayAfter = new Date(`${date}T00:00:00Z`);
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
  assert.equal(
    cartChristmasOrderBy({countryCode: 'CY', lines, today: dayAfter.toISOString().slice(0, 10)}),
    null,
  );
  assert.equal(cartChristmasOrderBy({countryCode: 'CY', lines, today: '2026-10-20'}), null);
});

test('the cart totals use these lines and name no shipping fee', () => {
  const summary = read('app/components/CartSummary.tsx');
  assert.match(summary, /cartShippingNote\(/);
  assert.match(summary, /cartChristmasOrderBy\(/);
});
