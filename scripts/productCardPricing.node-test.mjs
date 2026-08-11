import assert from 'node:assert/strict';

import {
  deriveCardPricing,
  formatCardPrice,
  formatCardPriceLabel,
} from '../app/lib/productCardPricing.ts';

const eur = (amount) => ({amount, currencyCode: 'EUR'});
const released = (amount) => ({availableForSale: true, price: eur(amount)});
const staged = (amount) => ({availableForSale: false, price: eur(amount)});

// The production shape: three released sizes → "From" the cheapest.
const threeSizes = deriveCardPricing({
  priceRange: {minVariantPrice: eur('29.99')},
  sizeVariants: {nodes: [released('29.99'), released('39.99'), released('49.99')]},
});
assert.deepEqual(threeSizes.price, eur('29.99'));
assert.equal(threeSizes.hasRange, true);
assert.equal(formatCardPriceLabel(threeSizes), 'From €29.99');

// Min is derived, not positional — variant order must not matter.
const shuffled = deriveCardPricing({
  sizeVariants: {nodes: [released('49.99'), released('29.99'), released('39.99')]},
});
assert.deepEqual(shuffled.price, eur('29.99'));

// GUARD: a staged (unreleased) dearer size must not create a "From" range.
// Staged variants exist in Shopify at full price with availableForSale=false
// for the whole stage→activate window and again after a pause.
const stagedDearer = deriveCardPricing({
  priceRange: {minVariantPrice: eur('29.99')},
  sizeVariants: {nodes: [released('29.99'), staged('49.99')]},
});
assert.deepEqual(stagedDearer.price, eur('29.99'));
assert.equal(stagedDearer.hasRange, false);
assert.equal(formatCardPriceLabel(stagedDearer), '€29.99');

// GUARD: a staged CHEAPER size must never become the advertised floor.
const stagedCheaper = deriveCardPricing({
  priceRange: {minVariantPrice: eur('19.99')},
  sizeVariants: {nodes: [staged('19.99'), released('29.99'), released('49.99')]},
});
assert.deepEqual(stagedCheaper.price, eur('29.99'));
assert.equal(stagedCheaper.hasRange, true);

// One released price (even across several variants) is not a range.
const flat = deriveCardPricing({
  sizeVariants: {nodes: [released('24.99'), released('24.99')]},
});
assert.equal(flat.hasRange, false);
assert.equal(formatCardPriceLabel(flat), '€24.99');

// No variant sample at all → fall back to priceRange.minVariantPrice, flat.
const fallback = deriveCardPricing({
  priceRange: {minVariantPrice: eur('29.99')},
});
assert.deepEqual(fallback.price, eur('29.99'));
assert.equal(fallback.hasRange, false);

// A `variants` list works when no aliased sizeVariants sample exists (PDP).
const fromVariants = deriveCardPricing({
  variants: {nodes: [released('29.99'), released('39.99')]},
});
assert.equal(fromVariants.hasRange, true);
assert.deepEqual(fromVariants.price, eur('29.99'));

// Everything sold out → fall back to the base price without claiming a range.
const soldOut = deriveCardPricing({
  priceRange: {minVariantPrice: eur('29.99')},
  sizeVariants: {nodes: [staged('29.99'), staged('49.99')]},
});
assert.deepEqual(soldOut.price, eur('29.99'));
assert.equal(soldOut.hasRange, false);

// Malformed entries are skipped, never crash the card.
const messy = deriveCardPricing({
  sizeVariants: {
    nodes: [
      null,
      {availableForSale: true},
      {availableForSale: true, price: {amount: 'oops', currencyCode: 'EUR'}},
      released('29.99'),
    ],
  },
});
assert.deepEqual(messy.price, eur('29.99'));
assert.equal(messy.hasRange, false);

// Empty product → no price, no label.
assert.deepEqual(deriveCardPricing({}), {price: null, hasRange: false});
assert.equal(formatCardPriceLabel({price: null, hasRange: false}), null);

// Formatting matches the product page (Intl currency, en-US, 2 decimals).
assert.equal(formatCardPrice(eur('29.99')), '€29.99');
assert.equal(formatCardPrice({amount: '34.0', currencyCode: 'USD'}), '$34.00');
assert.equal(formatCardPrice(null), null);
assert.equal(formatCardPrice({amount: 'oops', currencyCode: 'EUR'}), null);
