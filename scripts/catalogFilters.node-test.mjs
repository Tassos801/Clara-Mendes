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

// The fleece blanket is the first released extension (Prodigi-mapped
// 2026-07-31): sellable alongside the 15 prints, while every other
// extension stays staged.
assert.equal(isReleasedExtensionHandle(BLANKET_HANDLE), true);
assert.equal(hasReleasedExtensions(), true);
const releasedCount = Object.values(EXTENSION_RELEASE_FLAGS).filter(
  Boolean,
).length;
assert.equal(releasedCount, 1);

// The launch prints are unaffected by the staging machinery.
assert.equal(isStoreThemeProduct(print), true);
const sellableToday = computeSellableHandles();
assert.equal(sellableToday.size, 15 + releasedCount);
assert.ok(sellableToday.has(BLANKET_HANDLE));
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
// The handle-only check (the collection route's pre-query guard) admits the
// collection once any extension is live — the post-query content check still
// hides it while it holds nothing sellable.
assert.equal(
  isDemoCollection({handle: EXTENSION_COLLECTION_HANDLE}),
  false,
);
assert.equal(
  isDemoCollection({
    handle: EXTENSION_COLLECTION_HANDLE,
    products: {nodes: [print]},
  }),
  false,
);

// A released extension member surfaces the collection on its own.
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
  false,
);
