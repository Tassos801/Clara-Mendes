import assert from 'node:assert/strict';
import extensionCatalog from '../data/art-product-extensions.json' with {type: 'json'};
import {
  computeSellableHandles,
  EXTENSION_COLLECTION_HANDLE,
  EXTENSION_RELEASE_FLAGS,
  hasReleasedExtensions,
  isDemoCollection,
  isDemoProduct,
  isReleasedExtensionHandle,
  isStoreThemeProduct,
  PHONE_CASE_HANDLE,
} from '../app/lib/catalogFilters.ts';

const BLANKET_HANDLE = 'art-premium-fleece-blanket-30x40';

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

// No extension is released while the first candidate remains Draft at a
// price that does not match the approved manifest. This keeps the blanket
// hidden alongside every other extension family.
assert.equal(isReleasedExtensionHandle(BLANKET_HANDLE), false);
assert.equal(hasReleasedExtensions(), false);
const releasedCount = Object.values(EXTENSION_RELEASE_FLAGS).filter(
  Boolean,
).length;
assert.equal(releasedCount, 0);

// The launch prints are unaffected by the staging machinery.
assert.equal(isStoreThemeProduct(print), true);
const sellableToday = computeSellableHandles();
assert.equal(sellableToday.size, 15 + releasedCount);
assert.ok(!sellableToday.has(BLANKET_HANDLE));
assert.ok(!sellableToday.has(PHONE_CASE_HANDLE));

// Flipping a flag adds exactly that handle and keeps all 15 prints — the
// one-line storefront release described in docs/phone-case-release.md.
const sellableReleased = computeSellableHandles({[PHONE_CASE_HANDLE]: true});
assert.equal(sellableReleased.size, 16);
assert.ok(sellableReleased.has(PHONE_CASE_HANDLE));
assert.ok(sellableReleased.has('quiet-form-i-art-print'));
assert.ok(!sellableReleased.has(BLANKET_HANDLE));

// Handle matching is case-insensitive like every other filter here.
assert.equal(isReleasedExtensionHandle('Art-Snap-Phone-Case'), false);

// The Art for Everyday Living collection stays hidden when its sampled
// members are all unreleased.
assert.equal(
  isDemoCollection({
    handle: EXTENSION_COLLECTION_HANDLE,
    products: {nodes: [phoneCase]},
  }),
  true,
);

// Defense in depth: a future flag may admit the handle-only pre-query guard,
// but an explicit empty Storefront API result must still redirect instead of
// exposing another indexable zero-product collection.
EXTENSION_RELEASE_FLAGS[BLANKET_HANDLE] = true;
assert.equal(isDemoCollection({handle: EXTENSION_COLLECTION_HANDLE}), false);
assert.equal(
  isDemoCollection({
    handle: EXTENSION_COLLECTION_HANDLE,
    products: {nodes: []},
  }),
  true,
);
EXTENSION_RELEASE_FLAGS[BLANKET_HANDLE] = false;
// The handle-only check is the collection route's pre-query guard. With no
// released extension it must redirect the direct Everyday URL before Shopify
// is queried, matching the hidden header and mobile navigation.
assert.equal(isDemoCollection({handle: EXTENSION_COLLECTION_HANDLE}), true);
assert.equal(
  isDemoCollection({
    handle: EXTENSION_COLLECTION_HANDLE,
    products: {nodes: [print]},
  }),
  false,
);

// A Shopify collection sample containing the unreleased blanket is hidden,
// even if the product is accidentally published outside the storefront flag.
assert.equal(
  isDemoCollection({
    handle: EXTENSION_COLLECTION_HANDLE,
    products: {
      nodes: [
        {
          handle: BLANKET_HANDLE,
          productType: 'Blankets',
          tags: ['Clara Mendes Original', 'Art for Everyday Living'],
          title: 'Art Premium Fleece Blanket — 30 × 40 in',
          vendor: 'Clara Mendes',
        },
      ],
    },
  }),
  true,
);
