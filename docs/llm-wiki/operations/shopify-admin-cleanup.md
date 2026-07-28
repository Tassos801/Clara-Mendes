# Shopify Admin Cleanup

## Purpose

The storefront code filters off-theme products and collections, but Shopify
Admin remains the source that can affect search, feeds, SEO, sitemaps,
publication state, and future storefront routes. Cleanup should happen in Admin,
not only in code.

Source: `docs/shopify-admin-cleanup.md`, `app/lib/catalogFilters.ts`.

## Store

Admin store domain recorded by the cleanup document:

`vre00g-8b.myshopify.com`

## Product Cleanup

All 49 legacy products were moved to Draft on 2026-07-23. The fifteen
replacement art prints are now Active and visible through the configured
production Storefront API. The 12 extension families remain Draft. The original
prints were activated before the documented cost, billing, and physical-sample
gates were resolved; see `docs/original-art-launch.md`.

## Collection Cleanup

Legacy navigation includes Daily Carry, formalwear, health, beauty, Gift Sets,
Home Rituals, Lighting, Textiles, Ceramics, Storage, and Accents. The Hydrogen
filter now hides these old or empty collections. Shopify Admin should still
remove their Headless publication or archive them so other channels cannot
surface them.

## Verification After Cleanup

Run:

```powershell
npm run typecheck
npm run lint
npm run build
npx shopify hydrogen check routes
```

Then verify:

- `/collections/all` only shows published Clara Mendes products plus the five
  original-art capsule previews.
- `/sitemap/products/1.xml` excludes off-theme product handles.
- `/sitemap/collections/1.xml` only includes intended public collections.

Source: `docs/shopify-admin-cleanup.md`.
