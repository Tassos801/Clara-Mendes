# Clara Mendes Store Overview

Clara Mendes is a custom Shopify Hydrogen storefront leading with an owned
original-art collection for quiet interiors. The storefront is built with
Hydrogen, React Router, Vite, TypeScript, Shopify Storefront API, and Customer
Account API generated types.

Sources: [README](../../README.md), [package.json](../../package.json).

## Current Store Shape

- Storefront brand: Clara Mendes.
- Positioning: original Clara Mendes art for quieter walls and everyday living.
- Framework: Shopify Hydrogen `2026.4.4`, React Router `7.16.0`, Vite `6.4.3`.
- Runtime: Oxygen-style worker entry through `server.ts`.
- Storefront data: Shopify Storefront API through Hydrogen context.
- Customer account data: Customer Account API routes and generated query types.
- Product operations: Shopify Admin automation scripts.

## Current Catalog Snapshot

The store has fifteen original 8 × 10 art prints across five capsules. All are
Draft and unpublished because the US landed-cost gate fails at the selected
Standard shipping method and Prodigi billing is not configured.

| Metric                  | Value |
| ----------------------- | ----: |
| Product count           |    15 |
| Missing product count   |     0 |
| Active product count    |     0 |
| Published product count |     0 |
| Product issue count     |     0 |
| Product warning count   |     0 |
| Image warning count     |     0 |
| Variant issue count     |     0 |

## Current Launch Batch

Current launch capsules:

- Quiet Form I, II, and III
- Patina Blue I, II, and III
- Neo Deco I, II, and III
- Midnight Garden I, II, and III
- Sunlit Mosaic I, II, and III

## Most Important Operational Risks

- Public Oxygen/final domain and production environment variables must be
  confirmed before launch.
- Shopify checkout, payments, taxes, order emails, policies, and support process
  must be verified in Shopify Admin.
- Prodigi billing, physical samples, and the landed-cost decision remain open.
- Catalog cleanup in Shopify Admin should remain aligned with storefront
  filtering so off-theme products cannot leak into search, feeds, SEO, or
  future routes.

Sources: [Launch readiness](../launch-readiness.md),
[Shopify Admin cleanup](../shopify-admin-cleanup.md).
