# Catalog And Products

## Current Picture

The store is intentionally focused on a small Clara Mendes home-goods catalog
with a 10-product launch batch. The latest recorded Shopify audit summary says
those 10 products were active and published at the time of that audit, with one
media-count warning.

## Launch Batch Products

| Product | Handle |
| --- | --- |
| Clara Waffle Cotton Throw | `clara-waffle-cotton-throw` |
| Luma Tassel Cotton Throw | `luma-tassel-cotton-throw` |
| Sera Woven Table Runner | `sera-woven-table-runner` |
| Sol Linen Cushion Cover | `sol-linen-cushion-cover` |
| Alba Cotton-Linen Cushion | `alba-cotton-linen-cushion` |
| Vale Walnut Storage Tray | `vale-walnut-storage-tray` |
| Ayla Cotton Bath Towel | `ayla-cotton-bath-towel` |
| Mara Linen Dining Placemat | `mara-linen-dining-placemat` |
| Nora Round Cotton Trivet | `nora-round-cotton-trivet` |
| Tali Tassel Table Mat | `tali-tassel-table-mat` |

## Audit Snapshot

Latest stored audit summary:

- Product count: 10.
- Missing product count: 0.
- Active product count: 10.
- Published product count: 10.
- Product issue count: 0.
- Product warning count: 1.
- Image warning count: 1.
- Variant issue count: 0.

Known warning: `clara-waffle-cotton-throw` has `low_product_media_count`.

## Catalog Filtering

`app/lib/catalogFilters.ts` is the central filtering layer used to keep
off-theme, demo, and unfulfillable products out of the storefront.

It defines:

- Preview home-goods collection categories.
- Demo/off-theme collection handles.
- Off-theme product handles.
- Unfulfillable product handles.
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
