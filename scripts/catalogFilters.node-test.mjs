import assert from 'node:assert/strict';
import extensionCatalog from '../data/art-product-extensions.json' with {type: 'json'};
import {
  computeSellableHandles,
  EXTENSION_COLLECTION_HANDLE,
  EXTENSION_RELEASE_FLAGS,
  featurePagePath,
  filterDemoProducts,
  hasReleasedExtensions,
  isDemoCollection,
  isDemoProduct,
  isFeaturePageHandle,
  isListedProduct,
  isReleasedExtensionHandle,
  isRetiredExtensionHandle,
  isStoreThemeProduct,
  isUnreleasedExtensionHandle,
  PHONE_CASE_HANDLE,
  releasedExtensionProductTypes,
  SKY_PRODUCT_HANDLE,
} from '../app/lib/catalogFilters.ts';

/**
 * Runs `fn` with the module's release flags temporarily replaced by
 * `overrides` (every key not in `overrides` is set to false), then restores
 * the exact prior state — so no assertion can leak flag state into another.
 * Note: SELLABLE_PRODUCT_HANDLES is memoised at module load and is NOT
 * affected; only the live-read helpers (hasReleasedExtensions,
 * isDemoCollection, isReleasedExtensionHandle) see the override.
 */
function withFlags(overrides, fn) {
  const saved = {...EXTENSION_RELEASE_FLAGS};
  for (const key of Object.keys(EXTENSION_RELEASE_FLAGS)) {
    EXTENSION_RELEASE_FLAGS[key] = Boolean(overrides[key]);
  }
  try {
    return fn();
  } finally {
    Object.assign(EXTENSION_RELEASE_FLAGS, saved);
  }
}

const greetingCard = {
  handle: 'fine-art-greeting-card',
  productType: 'Cards',
  tags: ['Clara Mendes Original', 'Art for Everyday Living'],
  title: 'Fine Art Greeting Card',
  vendor: 'Clara Mendes',
};

const BLANKET_HANDLE = 'art-premium-fleece-blanket-30x40';
const FRAME_HANDLE = 'classic-framed-art-print-16x20';

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

// Every extension is gated. The retired complete framed-print product must not
// become sellable while the three-size frame-only replacement is unresolved.
assert.equal(isReleasedExtensionHandle(BLANKET_HANDLE), false);
assert.equal(isReleasedExtensionHandle(FRAME_HANDLE), false);
// Cards and postcards released 2026-09-01; every other family stays dark.
assert.equal(hasReleasedExtensions(), true);
assert.equal(isReleasedExtensionHandle('fine-art-greeting-card'), true);
assert.equal(isReleasedExtensionHandle('fine-art-postcard'), true);
// A released family is sellable on the storefront (PDP, search, grid)…
assert.equal(isStoreThemeProduct(greetingCard), true);
assert.equal(isDemoProduct(greetingCard), false);
assert.equal(isUnreleasedExtensionHandle('fine-art-greeting-card'), false);
// …and its product type is offered by the shop's type filter.
assert.deepEqual(releasedExtensionProductTypes(), ['Cards', 'Postcards']);
assert.deepEqual(releasedExtensionProductTypes({}), []);
assert.equal(hasReleasedExtensions({}), false);

// A handle retired by an in-place rename (the calendar's previous edition)
// stays unlisted and stripped from the sitemap until the live record moves.
assert.equal(isRetiredExtensionHandle('clara-mendes-art-calendar-2026'), true);
assert.equal(
  isUnreleasedExtensionHandle('clara-mendes-art-calendar-2026'),
  true,
);
assert.equal(
  isStoreThemeProduct({
    ...greetingCard,
    handle: 'clara-mendes-art-calendar-2026',
  }),
  false,
);
assert.equal(isRetiredExtensionHandle('clara-mendes-art-calendar-2027'), false);
const releasedCount = Object.values(EXTENSION_RELEASE_FLAGS).filter(
  Boolean,
).length;
assert.equal(releasedCount, 2);

// The launch prints are unaffected by the staging machinery.
assert.equal(isStoreThemeProduct(print), true);
const sellableToday = computeSellableHandles();
// 15 prints + released extensions + the released Your Sky star map.
assert.equal(sellableToday.size, 15 + releasedCount + 1);
assert.ok(!sellableToday.has(FRAME_HANDLE));
assert.ok(!sellableToday.has(BLANKET_HANDLE));
assert.ok(!sellableToday.has(PHONE_CASE_HANDLE));

// Flipping a flag adds exactly that handle and keeps all 15 prints — the
// one-line storefront release described in docs/phone-case-release.md.
const sellableReleased = computeSellableHandles({[PHONE_CASE_HANDLE]: true});
assert.equal(sellableReleased.size, 17);
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

// The released card families keep the handle-only pre-query guard open, but
// an explicit empty Storefront API result must still redirect instead of
// exposing an indexable zero-product collection.
assert.equal(isDemoCollection({handle: EXTENSION_COLLECTION_HANDLE}), false);
assert.equal(
  isDemoCollection({
    handle: EXTENSION_COLLECTION_HANDLE,
    products: {nodes: []},
  }),
  true,
);
// With every release flag off the guard hides the Everyday collection, and
// any single future flag (the blanket here) is enough to open it again.
withFlags({}, () => {
  assert.equal(hasReleasedExtensions(), false);
  assert.equal(isDemoCollection({handle: EXTENSION_COLLECTION_HANDLE}), true);
});
withFlags({[BLANKET_HANDLE]: true}, () => {
  assert.equal(hasReleasedExtensions(), true);
  assert.equal(isDemoCollection({handle: EXTENSION_COLLECTION_HANDLE}), false);
});
// The helper restored the real state.
assert.equal(isReleasedExtensionHandle('fine-art-greeting-card'), true);
assert.equal(isReleasedExtensionHandle(BLANKET_HANDLE), false);
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

// The personalised star map is staged behind its own flag map and follows
// the same dual gate as extensions: hidden from listings and the sitemap
// until flipped, sellable once flipped.
{
  const {
    hasReleasedPersonalised,
    isStagedPersonalisedHandle,
    isUnreleasedExtensionHandle: isUnreleasedStagedHandle,
    PERSONALISED_RELEASE_FLAGS,
    SKY_PRODUCT_HANDLE,
  } = await import('../app/lib/catalogFilters.ts');
  assert.equal(SKY_PRODUCT_HANDLE, 'your-sky-star-map');
  // Released 2026-09-01 after the sandbox E2E passed (runbook §5).
  assert.equal(PERSONALISED_RELEASE_FLAGS[SKY_PRODUCT_HANDLE], true);
  assert.equal(isStagedPersonalisedHandle(SKY_PRODUCT_HANDLE), true);
  assert.equal(isStagedPersonalisedHandle('quiet-form-i-art-print'), false);
  assert.equal(isUnreleasedStagedHandle(SKY_PRODUCT_HANDLE), false);
  assert.equal(
    computeSellableHandles(EXTENSION_RELEASE_FLAGS, {
      [SKY_PRODUCT_HANDLE]: false,
    }).has(SKY_PRODUCT_HANDLE),
    false,
  );
  assert.equal(
    computeSellableHandles(EXTENSION_RELEASE_FLAGS, {
      [SKY_PRODUCT_HANDLE]: true,
    }).has(SKY_PRODUCT_HANDLE),
    true,
  );
  assert.equal(hasReleasedPersonalised({[SKY_PRODUCT_HANDLE]: true}), true);
  assert.equal(hasReleasedPersonalised({[SKY_PRODUCT_HANDLE]: false}), false);
  assert.equal(
    isDemoProduct({
      handle: SKY_PRODUCT_HANDLE,
      productType: 'Personalised Art',
      tags: ['Clara Mendes Original'],
      title: 'Your Sky',
      vendor: 'Clara Mendes',
    }),
    false,
    'the released star map is sellable',
  );

  // The First Light birth poster stages beside the sky, independently
  // flagged and independently releasable.
  const {NATAL_PRODUCT_HANDLE} = await import('../app/lib/catalogFilters.ts');
  const {NATAL_PRODUCT_HANDLE: codecHandle} =
    await import('../app/lib/natal/products.ts');
  assert.equal(NATAL_PRODUCT_HANDLE, 'first-light-birth-poster');
  assert.equal(
    NATAL_PRODUCT_HANDLE,
    codecHandle,
    'flag map and natal codec must agree on the handle',
  );
  assert.equal(PERSONALISED_RELEASE_FLAGS[NATAL_PRODUCT_HANDLE], false);
  assert.equal(isStagedPersonalisedHandle(NATAL_PRODUCT_HANDLE), true);
  assert.equal(isUnreleasedStagedHandle(NATAL_PRODUCT_HANDLE), true);
  assert.equal(
    computeSellableHandles(EXTENSION_RELEASE_FLAGS, {
      [SKY_PRODUCT_HANDLE]: false,
      [NATAL_PRODUCT_HANDLE]: true,
    }).has(NATAL_PRODUCT_HANDLE),
    true,
    'the natal flag releases independently of the sky flag',
  );
  assert.equal(
    isDemoProduct({
      handle: NATAL_PRODUCT_HANDLE,
      productType: 'Personalised Art',
      tags: ['Clara Mendes Original'],
      title: 'First Light',
      vendor: 'Clara Mendes',
    }),
    true,
    'staged birth poster is not sellable while its flag is false',
  );
}

// A feature-page product is purchasable (PDP loader, cart) but never listed:
// grid, search, recommendations, recently viewed, products sitemap.
{
  const sky = {
    handle: SKY_PRODUCT_HANDLE,
    productType: 'Personalised Art',
    tags: ['Clara Mendes Original', 'personalised', 'gift'],
    title: 'Your Sky — a personalised star map',
    vendor: 'Clara Mendes',
  };
  assert.equal(isFeaturePageHandle(SKY_PRODUCT_HANDLE), true);
  assert.equal(isFeaturePageHandle('Your-Sky-Star-Map'), true);
  assert.equal(isFeaturePageHandle('quiet-form-i-art-print'), false);
  assert.equal(featurePagePath(SKY_PRODUCT_HANDLE), '/your-sky');
  assert.equal(featurePagePath('quiet-form-i-art-print'), null);
  assert.equal(isStoreThemeProduct(sky), true);
  assert.equal(isDemoProduct(sky), false);
  assert.equal(isListedProduct(sky), false);
  assert.equal(isListedProduct(print), true);
  assert.deepEqual(
    filterDemoProducts([print, sky, phoneCase]).map((p) => p.handle),
    [print.handle],
  );
}
