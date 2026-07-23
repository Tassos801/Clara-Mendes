# Catalog And Products

## Current Picture

The live Storefront API check on 2026-07-23 returned 47 products and all 47 were
available for sale. This is not the intended launch state: the catalog includes
generic, unrelated, heavy, electrical, and designer-authenticity-risk products.
The saved Admin API token expired on 2026-04-29, so the status reset is pending
restored Shopify Admin write access.

The replacement strategy is an owned nine-product wall-art collection, staged
as Draft until a print provider is connected and samples pass. The storefront
can truthfully preview the works before they are sellable.

## Original Art Replacement

| Capsule     | Product handles                                                                    |
| ----------- | ---------------------------------------------------------------------------------- |
| Quiet Form  | `quiet-form-i-art-print`, `quiet-form-ii-art-print`, `quiet-form-iii-art-print`    |
| Patina Blue | `patina-blue-i-art-print`, `patina-blue-ii-art-print`, `patina-blue-iii-art-print` |
| Neo Deco    | `neo-deco-i-art-print`, `neo-deco-ii-art-print`, `neo-deco-iii-art-print`          |

Each planned Draft product has one 8 × 10 inch, $29 variant. Larger formats are
blocked until higher-resolution production and sample review. Source metadata is
in `data/original-art-catalog.json`; staging is handled by
`scripts/sync-original-art-catalog.mjs`.

Source: [Original Art Launch](../../original-art-launch.md).

## Catalog Filtering

`app/lib/catalogFilters.ts` now uses an explicit nine-handle launch allowlist.
Old or supplier-imported products cannot appear in catalog, search,
recommendations, or direct product routes merely because they are active in
Shopify. Admin status is still the authoritative cross-channel control, so the
47-product Draft reset remains required.

It defines:

- Preview home-goods collection categories.
- Demo/off-theme collection handles.
- Off-theme product handles.
- Unfulfillable product handles.
- The nine approved original-art product handles.
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
