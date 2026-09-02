import assert from 'node:assert/strict';
import catalog from '../data/art-product-extensions.json' with {type: 'json'};
import {
  descriptionHtml,
  editionOf,
  expectedVariantCount,
  expectedVariants,
  imageAlt,
  seoFor,
  variantIssues,
} from './lib/extension-product.mjs';

const family = (id) => catalog.families.find((entry) => entry.id === id);
const card = family('greeting-card');
const calendar = family('calendar');
const frame = family('classic-frame');
const phoneCase = family('snap-phone-case');

// The variant grid is derived from the manifest, in sync creation order.
assert.deepEqual(
  expectedVariants(card, catalog).map((variant) => variant.sku),
  [
    'CM-QF-GRE-7X5',
    'CM-PB-GRE-7X5',
    'CM-ND-GRE-7X5',
    'CM-MG-GRE-7X5',
    'CM-SM-GRE-7X5',
  ],
);
assert.deepEqual(expectedVariants(card, catalog)[0].options, {
  Artwork: 'Quiet Form',
});
assert.deepEqual(expectedVariants(calendar, catalog), [
  {options: {Edition: '2027'}, sku: 'CM-CAL-A4-2027'},
]);
assert.equal(expectedVariantCount(frame, catalog), 3);
assert.equal(expectedVariantCount(phoneCase, catalog), 20);
assert.deepEqual(expectedVariants(phoneCase, catalog)[0], {
  options: {Artwork: 'Quiet Form', Device: 'iPhone 15'},
  sku: 'CM-QF-CASE-IP15',
});

// The edition year lives in one manifest field and flows everywhere.
assert.equal(editionOf(calendar), '2027');
assert.equal(editionOf(card), null);
assert.throws(
  () => editionOf({...calendar, edition: undefined}),
  /must declare an "edition"/,
);
assert.equal(
  imageAlt(calendar, 'All Capsules'),
  'Clara Mendes 2027 art calendar featuring all five original-art capsules',
);
assert.equal(
  imageAlt(card, 'Patina Blue'),
  'Patina Blue artwork shown on the fine art greeting card',
);
assert.equal(
  seoFor(calendar).title,
  'Clara Mendes Art Calendar 2027 | Clara Mendes',
);
assert.ok(calendar.handle.endsWith(editionOf(calendar)));
assert.ok(calendar.skuSuffix.endsWith(editionOf(calendar)));
assert.ok(calendar.title.endsWith(editionOf(calendar)));

// Description HTML keeps a separator between list items so Shopify's
// flattened plain-text description cannot fuse "…ritual.324gsm…".
const html = descriptionHtml(card);
assert.ok(html.includes('</li>\n<li>'));
assert.ok(html.startsWith('<p>Original Clara Mendes artwork adapted for'));

// The audit's variant check catches a half-done rename: right SKU count,
// stale Edition value or stale SKU.
const liveOk = [
  {sku: 'CM-CAL-A4-2027', selectedOptions: [{name: 'Edition', value: '2027'}]},
];
assert.deepEqual(variantIssues(calendar, catalog, liveOk), []);
assert.deepEqual(
  variantIssues(calendar, catalog, [
    {
      sku: 'CM-CAL-A4-2027',
      selectedOptions: [{name: 'Edition', value: '2026'}],
    },
  ]),
  ['CM-CAL-A4-2027: option Edition is "2026", expected "2027"'],
);
assert.deepEqual(
  variantIssues(calendar, catalog, [
    {
      sku: 'CM-CAL-A4-2026',
      selectedOptions: [{name: 'Edition', value: '2026'}],
    },
  ]),
  [
    'expected one variant with SKU CM-CAL-A4-2027, found 0',
    'unexpected variant SKU CM-CAL-A4-2026',
  ],
);
assert.deepEqual(variantIssues(calendar, catalog, []), [
  'expected one variant with SKU CM-CAL-A4-2027, found 0',
]);
