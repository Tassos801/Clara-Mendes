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

The cleanup document lists off-brand products that should be unpublished from
the Headless channel, set to draft, or deleted if no longer needed. Examples
include Daily Hydration Bottle, Glow Reset Ice Roller, Glow Tools Duo,
GoddessYou Signature Case, Reset Journal, Soft Sleep Satin Set, and The Daily
Carry Pouch.

It also lists three GoddessYou-origin home-fit products that were hidden until
each variant had a confirmed supplier fulfillment mapping:

- Drawer Reset Bundle
- Soft Reset Candle
- The Home Ritual Warmer

The condition for un-hiding these products should be updated to whatever the
current supplier or fulfillment workflow requires.

## Collection Cleanup

Collections listed for removal from Headless publication or deletion include
Daily Carry, Evening Gowns & Formal Dresses, Home page, Glow Tools, Health &
Wellness, and Wellness Reset.

Collections to keep or build around include Gift Sets and Home Rituals.

## Verification After Cleanup

Run:

```powershell
npm run typecheck
npm run lint
npm run build
npx shopify hydrogen check routes
```

Then verify:

- `/collections/all` only shows Clara Mendes home goods plus approved
  home-ritual products.
- `/sitemap/products/1.xml` excludes off-theme product handles.
- `/sitemap/collections/1.xml` only includes intended public collections.

Source: `docs/shopify-admin-cleanup.md`.
