# Clara Mendes Store Overview

Clara Mendes is a custom Shopify Hydrogen storefront for curated home goods. The
storefront is built with Hydrogen, React Router, Vite, TypeScript, Shopify
Storefront API, and Customer Account API generated types.

Sources: [README](../../README.md), [package.json](../../package.json).

## Current Store Shape

- Storefront brand: Clara Mendes.
- Positioning: quiet home objects, textiles, table goods, storage, accents,
  ceramics, and small lifestyle home pieces.
- Framework: Shopify Hydrogen `2026.4.0`, React Router `7.12.0`, Vite `6.4.2`.
- Runtime: Oxygen-style worker entry through `server.ts`.
- Storefront data: Shopify Storefront API through Hydrogen context.
- Customer account data: Customer Account API routes and generated query types.
- Product operations: Shopify Admin automation scripts.

## Current Catalog Snapshot

The store carries a 10-product launch batch. The latest recorded Shopify product
audit summary reports:

| Metric | Value |
| --- | ---: |
| Product count | 10 |
| Missing product count | 0 |
| Active product count | 10 |
| Published product count | 10 |
| Product issue count | 0 |
| Product warning count | 1 |
| Image warning count | 1 |
| Variant issue count | 0 |

The one recorded warning is `low_product_media_count` for
`clara-waffle-cotton-throw`.

## Current Launch Batch

Current launch products:

- Clara Waffle Cotton Throw
- Luma Tassel Cotton Throw
- Sera Woven Table Runner
- Sol Linen Cushion Cover
- Alba Cotton-Linen Cushion
- Vale Walnut Storage Tray
- Ayla Cotton Bath Towel
- Mara Linen Dining Placemat
- Nora Round Cotton Trivet
- Tali Tassel Table Mat

## Most Important Operational Risks

- Public Oxygen/final domain and production environment variables must be
  confirmed before launch.
- Shopify checkout, payments, taxes, order emails, policies, and support process
  must be verified in Shopify Admin.
- Current fulfillment/supplier workflow is not documented in the wiki yet.
- Catalog cleanup in Shopify Admin should remain aligned with storefront
  filtering so off-theme products cannot leak into search, feeds, SEO, or
  future routes.

Sources: [Launch readiness](../launch-readiness.md),
[Shopify Admin cleanup](../shopify-admin-cleanup.md).
