import assert from 'node:assert/strict';
import extensionCatalog from '../data/art-product-extensions.json' with {type: 'json'};
import {
  computeSellableHandles,
  EXTENSION_COLLECTION_HANDLE,
  EXTENSION_RELEASE_FLAGS,
  isDemoCollection,
  isDemoProduct,
  isReleasedExtensionHandle,
  isStoreThemeProduct,
  PHONE_CASE_HANDLE,
} from '../app/lib/catalogFilters.ts';

const phoneCase = {
  handle: PHONE_CASE_HANDLE,
  productType: 'Phone Cases',
  tags: ['Clara Mendes Original', 'Art for Everyday Living'],
  title: 'Art Snap Phone Case',
  vendor: 'Clara Mendes',
};
const print = {
  handle: 'quiet-form-i-art-print',
  productType: 'Art Prints',
  tags: ['Clara Mendes Original', 'Quiet Form'],
  title: 'Quiet Form I Art Print',
  vendor: 'Clara Mendes',
};

// Every staged flag must point at a real extension family — a typo would
// make the release flip silently do nothing.
const extensionHandles = new Set(
  extensionCatalog.families.map((family) => family.handle),
);
for (const handle of Object.keys(EXTENSION_RELEASE_FLAGS)) {
  assert.ok(
    extensionHandles.has(handle),
    `${handle} is not an extension family handle`,
  );
}

// While the flag is false the phone case stays hidden everywhere, even
// though it carries on-theme tags and could be published by mistake.
assert.equal(isReleasedExtensionHandle(PHONE_CASE_HANDLE), false);
assert.equal(isStoreThemeProduct(phoneCase), false);
assert.equal(isDemoProduct(phoneCase), true);

// The launch prints are unaffected by the staging machinery.
assert.equal(isStoreThemeProduct(print), true);
const sellableToday = computeSellableHandles();
assert.equal(sellableToday.size, 15);
assert.ok(!sellableToday.has(PHONE_CASE_HANDLE));

// Flipping the flag adds exactly the phone case and keeps all 15 prints —
// this is the one-line storefront release described in
// docs/phone-case-release.md.
const sellableReleased = computeSellableHandles({[PHONE_CASE_HANDLE]: true});
assert.equal(sellableReleased.size, 16);
assert.ok(sellableReleased.has(PHONE_CASE_HANDLE));
assert.ok(sellableReleased.has('quiet-form-i-art-print'));

// Handle matching is case-insensitive like every other filter here.
assert.equal(isReleasedExtensionHandle('Art-Snap-Phone-Case'), false);

// The Art for Everyday Living collection is hidden while its only member is
// unreleased, and surfaces automatically once a member product is approved.
assert.equal(
  isDemoCollection({
    handle: EXTENSION_COLLECTION_HANDLE,
    products: {nodes: [phoneCase]},
  }),
  true,
);
assert.equal(
  isDemoCollection({handle: EXTENSION_COLLECTION_HANDLE}),
  true,
);
assert.equal(
  isDemoCollection({
    handle: EXTENSION_COLLECTION_HANDLE,
    products: {nodes: [print]},
  }),
  false,
);
