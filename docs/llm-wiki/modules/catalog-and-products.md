# Catalog And Products

## Current Picture

The 49 legacy products were moved to Draft on 2026-07-23. The replacement is an
owned fifteen-product wall-art collection. All fifteen Shopify records are
Active, available for sale, visible through the configured production
Storefront API, and mapped to Prodigi. Activation did not resolve the failed
Standard-shipping cost gate, missing Prodigi billing, or missing physical
samples.

The storefront no longer uses an email-only early-access CTA. All 15 previews
now resolve to the Active products and the existing product, cart, and checkout
path. A Draft or unpublished handle would remain a non-interactive preview.

## Original Art Replacement

| Capsule         | Product handles                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Quiet Form      | `quiet-form-i-art-print`, `quiet-form-ii-art-print`, `quiet-form-iii-art-print`                |
| Patina Blue     | `patina-blue-i-art-print`, `patina-blue-ii-art-print`, `patina-blue-iii-art-print`             |
| Neo Deco        | `neo-deco-i-art-print`, `neo-deco-ii-art-print`, `neo-deco-iii-art-print`                      |
| Midnight Garden | `midnight-garden-i-art-print`, `midnight-garden-ii-art-print`, `midnight-garden-iii-art-print` |
| Sunlit Mosaic   | `sunlit-mosaic-i-art-print`, `sunlit-mosaic-ii-art-print`, `sunlit-mosaic-iii-art-print`       |

Each live product has an 8 × 10 inch variant at EUR 29.99, a 16 × 20 variant at
EUR 39.99, and a 20 × 24 variant at EUR 49.99. The 20 × 24 size was activated
2026-08-10 after all 15 `GLOBAL-FAP-20X24` Prodigi mappings were individually
confirmed. Source metadata is in
`data/original-art-catalog.json`; the mutating
`scripts/sync-original-art-catalog.mjs` remains a Draft staging command and must
not be run as a way to preserve the current Active state.

Each live print's intended media is the flat artwork plus three generated room
views for each of the three live sizes: one clean warm-neutral sofa scene and
two sage-wall scenes, for ten READY images per product. Sofa images use the
same artwork at relative widths of 1:2:2.5 for 8 × 10, 16 × 20, and 20 × 24.
All scenes are composited by `scripts/generate-room-mockups.mjs` and
`scripts/generate-sofa-mockups.mjs` from owned backdrops into
`public/images/product-art-mockups/` (scene geometry in
`scripts/lib/room-mockup-scenes.mjs`, layout-tested by
`scripts/roomMockups.node-test.mjs` and `scripts/sofaMockups.node-test.mjs`).
`scripts/sync-room-mockups.mjs`
(`catalog:art:mockups:sync`) appends them to the ACTIVE products via
`productCreateMedia` only — it is the safe apply path for live products,
idempotent by alt text; future media syncs plan all six sage-wall mockups.
`scripts/sync-sofa-mockups.mjs` has a read-only live preflight, verifies source
identity and READY state, requires the exact three-size variant set, and rejects
crossed or extra variant associations. It uploads and verifies new sofa media,
associates exactly one matching sofa image to each Size variant, and verifies
the replacement state before removing a legacy overlay. Product cards keep the
flat featured image, while the PDP leads with the selected variant's sofa scene
and filters the rest of the gallery to that size. The production catalog audit
also validates each exact size-to-sofa media association.
The 20 × 24 production and mockup assets use the same centred 5:6 full-bleed
crop and a context width ratio of `0.48`, exactly 2.5 times the 8 × 10 width.

`data/art-product-extensions.json` and
`scripts/prepare-art-product-extensions.py` define twelve additional product
families and generate local Prodigi production candidates plus committed review
previews. `scripts/sync-art-product-extensions.mjs` is dry-run by default and
creates or updates the Shopify records as **DRAFT** only after an explicit
`--apply`. SKU, shipping, margin, and physical-sample gates still apply.
All twelve records, totalling 71 variants, were created and passed live Shopify
readback on 2026-07-24; none were published.

As of 2026-08-10, every extension release flag is `false`. The blanket remains
Draft at EUR 49 per variant, which conflicts with the EUR 79 manifest price, so
the "Everyday" navigation and collection stay hidden. The collection filter
also distinguishes the route's handle-only preflight from an explicit empty
Storefront API result, preventing a future flag from exposing a zero-product
page before its product is actually published.

Sources: [Original Art Launch](../../original-art-launch.md),
[Art for Everyday Living](../../art-product-extensions.md).

## Catalog Filtering

`app/lib/catalogFilters.ts` uses an explicit fifteen-handle launch allowlist.
Old or supplier-imported products cannot appear in catalog, search,
recommendations, or direct product routes merely because they are active in
Shopify. Admin status is still the authoritative cross-channel control. The
intended state is now 15 Active originals, 12 Draft extensions, and 49 Draft
legacy products.

It defines:

- Five original-art capsule previews.
- Legacy/off-theme collection handles, including empty home-goods navigation
  left by the previous catalog.
- Off-theme product handles.
- Unfulfillable product handles.
- The fifteen approved original-art product handles.
- Home-goods terms.
- Off-theme vendor and product terms.
- `isStoreThemeProduct`.
- `filterDemoProducts`.
- `filterDemoCollections`.

This filtering is used by home, collection, product, and search routes.

## Storefront Product Behavior

Product cards use `ClaraProductCard` and product-card fragments to display
storefront product data consistently. On collection and capsule shopping pages,
the 15 originals also show one concise editorial story per artwork. Those
stories live beside the artwork metadata in `data/original-art-catalog.json`
and are resolved by `getProductStory`; cards outside shopping pages keep the
compact title-and-price treatment. Product pages add:

- Variant option selection.
- Size-specific living-room imagery led by the selected variant.
- Add-to-cart analytics.
- Shopify ProductView analytics.
- Ad platform product view event.
- JSON-LD product schema.
- Recently viewed persistence.
- Shop Pay button when available.

Sources: `app/components/ClaraProductCard.tsx`,
`app/lib/productCardFragment.ts`, `app/lib/productCopy.ts`,
`app/routes/collections.all.tsx`, `app/routes/collections.$handle.tsx`,
`app/routes/products.$handle.tsx`.

## Admin Cleanup Relationship

The code filters off-theme products defensively, but the Admin cleanup document
says unwanted products and collections should be cleaned at the Shopify source
so they cannot leak into search, feeds, SEO, or future storefront routes.

Source: [Shopify Admin cleanup](../operations/shopify-admin-cleanup.md).
