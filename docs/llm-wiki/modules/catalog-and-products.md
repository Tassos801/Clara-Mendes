# Catalog And Products

## Current Picture

The 49 legacy products were moved to Draft on 2026-07-23. The replacement is an
owned fifteen-product wall-art collection. All fifteen Shopify records exist as
Draft products and are mapped to Prodigi, but remain unpublished because
Standard-shipping landed cost exceeds the documented $12 gate and Prodigi
billing is not configured.

The storefront previews the works while they are unavailable. It no longer
uses an email-only early-access CTA: once a Shopify print is active and
published to the connected storefront, its preview becomes a product link and
the existing product, cart, and checkout path takes over automatically.

## Original Art Replacement

| Capsule         | Product handles                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Quiet Form      | `quiet-form-i-art-print`, `quiet-form-ii-art-print`, `quiet-form-iii-art-print`                |
| Patina Blue     | `patina-blue-i-art-print`, `patina-blue-ii-art-print`, `patina-blue-iii-art-print`             |
| Neo Deco        | `neo-deco-i-art-print`, `neo-deco-ii-art-print`, `neo-deco-iii-art-print`                      |
| Midnight Garden | `midnight-garden-i-art-print`, `midnight-garden-ii-art-print`, `midnight-garden-iii-art-print` |
| Sunlit Mosaic   | `sunlit-mosaic-i-art-print`, `sunlit-mosaic-ii-art-print`, `sunlit-mosaic-iii-art-print`       |

Each planned Draft product has one 8 × 10 inch, $29 variant. Larger formats are
blocked until higher-resolution production and sample review. Source metadata is
in `data/original-art-catalog.json`; staging is handled by
`scripts/sync-original-art-catalog.mjs`.

`data/art-product-extensions.json` and
`scripts/prepare-art-product-extensions.py` define twelve additional product
families and generate local Prodigi production candidates plus committed review
previews. `scripts/sync-art-product-extensions.mjs` is dry-run by default and
creates or updates the Shopify records as **DRAFT** only after an explicit
`--apply`. SKU, shipping, margin, and physical-sample gates still apply.
All twelve records, totalling 71 variants, were created and passed live Shopify
readback on 2026-07-24; none were published.

Sources: [Original Art Launch](../../original-art-launch.md),
[Art for Everyday Living](../../art-product-extensions.md).

## Catalog Filtering

`app/lib/catalogFilters.ts` uses an explicit fifteen-handle launch allowlist.
Old or supplier-imported products cannot appear in catalog, search,
recommendations, or direct product routes merely because they are active in
Shopify. Admin status is still the authoritative cross-channel control, so the
Draft reset remains the authoritative catalog state.

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
storefront product data consistently. Product pages add:

- Variant option selection.
- Add-to-cart analytics.
- Shopify ProductView analytics.
- Ad platform product view event.
- JSON-LD product schema.
- Recently viewed persistence.
- Shop Pay button when available.

Sources: `app/components/ClaraProductCard.tsx`,
`app/lib/productCardFragment.ts`, `app/routes/products.$handle.tsx`.

## Admin Cleanup Relationship

The code filters off-theme products defensively, but the Admin cleanup document
says unwanted products and collections should be cleaned at the Shopify source
so they cannot leak into search, feeds, SEO, or future storefront routes.

Source: [Shopify Admin cleanup](../operations/shopify-admin-cleanup.md).
