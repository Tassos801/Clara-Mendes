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

Each live print has the flat artwork plus three generated room
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

The 2026-08-11 production migration verified all 15 Active products with ten
READY media each and one exact sofa association for every live Size variant.
All 15 legacy text-overlay sofa media records were removed only after each
replacement state passed readback. The 45 clean sofa assets and the selected
variant gallery behavior are live on Oxygen.
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

The Classic Framed Art Print — 16 × 20 in release was reversed on 2026-08-24
after the owner clarified that the separate offer must sell the frame only,
not a print bundled with a frame. The product is Draft, unpublished from both
the `Clara Mendes` and `Clara Mendes Headless` catalogs, and its release flag is
false. Prodigi `GLOBAL-CFP-16X20` necessarily includes a fine-art print and is
therefore not a valid fulfillment mapping for the corrected offer. All twelve
extension flags are false and all twelve extension products are Draft.

The replacement is a frame-only product with one `Size` option: 8 × 10 in,
16 × 20 in, and 20 × 24 in, no `Artwork` option, and copy stating that the
print is not included. Its manifest record (Natural Classic Frame), sync/audit
support, and storefront experience were built on 2026-08-24 and staged behind
the false release flag — but the build overstated its fulfilment mapping as a
dashboard-verified "GLOBAL-CFP family with blank removable insert". A
2026-08-31 audit corrected this: no such Prodigi product exists, no dashboard
verification was recorded, and the live Shopify record is still the retired
five-variant framed print with its `Prodigi Mapping Pending` tag. The real
frame-only candidate is Prodigi's Backloader frames range
(`GLOBAL-CFP-<SIZE>-BACKLOADER` — the classic frame sold without a print).
The 2026-09-01 dashboard readback verified `GLOBAL-CFP-16X20-BACKLOADER`
(€18.00 wholesale, Natural among eight order-level colours, present in the
Shopify channel SKU picker, blank face-plate image required at order time) but
found **no 8 × 10 and no 20 × 24 backloader** — the family's nearest sizes are
6 × 8/11 × 14 and 18 × 24/20 × 28. Release remains blocked on an owner
decision about the size range (change it, substitute nearest sizes, or source
those frames elsewhere) plus retail price approval; the manifest's
€32.50/€50.00/€64.29 are provisional placeholders.

On 2026-08-24, its five product previews were rebuilt from Prodigi's official
Natural classic-frame blank and the exact live artwork. The deterministic
generator preserves the art pixels, uses the true 16:20 opening, scales the
frame face to the published 20 mm width, and leaves no mat between art and
frame. `scripts/classicFrameMockups.node-test.mjs` guards those dimensions and
pixel identity. `scripts/sync-classic-frame-mockups.mjs` is the guarded live
media path: it stages local files, waits for READY, orders the accurate set
first, and assigns one exact image to each Artwork variant without changing the
product record or fulfillment mapping.

The retired complete-framed-print merchandising is gated off and is not part
of the live homepage, catalog, cross-sells, sitemap, or PDP surface. The 15
unframed products and their 8 × 10, 16 × 20, and 20 × 24 in variants remain
unchanged.

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
- The fifteen approved original-art product handles plus released extensions.
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
- An explicit three-size promise for unframed prints.

Sources: `app/components/ClaraProductCard.tsx`,
`app/lib/productCardFragment.ts`, `app/lib/productCopy.ts`,
`app/routes/collections.all.tsx`, `app/routes/collections.$handle.tsx`,
`app/routes/products.$handle.tsx`.

## Your Sky Guided Configurator

The 2026-09-01 approved single-page refinement is implemented and locally
verified. Your Sky now exposes Linen, Midnight Garden, and Quiet Form; shows the
selected unframed, natural-frame, or black-frame presentation around the live
artwork; and presents the product story and price before configuration on
mobile. The place field is an accessible combobox with complete keyboard,
empty, failure, retry, and clear states. A validated versioned draft survives
same-tab navigation, and an explicit reset clears it.

The purchase flow follows Personalise, Size and finish, then Review and buy.
The review repeats style, title, place, date/time, size, finish, and price.
Add-to-cart remains unavailable until the current validated inputs match the
latest successful render, so a stale or failed preview cannot be purchased.
The signed cart normalizes the customer-visible Style label from the trusted
theme identifier; its canonical signed fields and order pipeline are unchanged.

Primary sources: `app/components/SkyConfigurator.tsx`,
`app/lib/sky/configuratorState.ts`, `app/lib/sky/params.ts`,
`app/lib/sky/products.ts`, `app/routes/products.$handle.tsx`, and
`app/styles/app.css`. Behavioral contracts live in
`scripts/skyConfigurator.node-test.mjs`, `scripts/skyParams.node-test.mjs`,
`scripts/skyProducts.node-test.mjs`, and
`docs/superpowers/specs/2026-09-01-your-sky-refinement-design.md`.

The refinement is deployed in production at `/products/your-sky-star-map` from
merge commit `300c87d` (PR #64). The six Shopify SKUs, prices, Prodigi mappings,
PDF geometry, checkout integration, and First Light release state remain
explicitly unchanged.

## Admin Cleanup Relationship

The code filters off-theme products defensively, but the Admin cleanup document
says unwanted products and collections should be cleaned at the Shopify source
so they cannot leak into search, feeds, SEO, or future storefront routes.

Source: [Shopify Admin cleanup](../operations/shopify-admin-cleanup.md).
