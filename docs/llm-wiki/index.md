# Clara Mendes LLM Wiki Index

Snapshot: 2026-07-24

Source: local Shopify Hydrogen storefront repository at
`C:\Users\admin\Desktop\4. Work & Projects\shopify\clara-mendes`

## Start Here

- [Overview](overview.md) - Current synthesized picture of the Clara Mendes store.
- [Architecture](architecture.md) - Runtime, routing, data flow, and integration map.
- [Open Questions](open-questions.md) - Pending setup, launch, and operational gaps.
- [Log](log.md) - Append-only maintenance history.

## Store And Codebase Topics

- [Hydrogen Runtime](modules/hydrogen-runtime.md) - Server entry, security headers (CSP), Hydrogen context, sessions, Storefront API, and routing shell.
- [Routes And Pages](modules/routes-and-pages.md) - Customer-facing route map and page responsibilities.
- [Catalog And Products](modules/catalog-and-products.md) - Product filtering, live catalog status, collections, and product page behavior.
- [Cart And Checkout](modules/cart-and-checkout.md) - Add-to-cart, cart actions, drawer/page cart, checkout handoff, and attribution persistence.
- [Analytics And Attribution](modules/analytics-and-attribution.md) - Shopify analytics, ad platform events, UTM/click ID capture, and cart attributes.

## Operations

- [Local Development And Launch](operations/local-development-and-launch.md) - Commands, environment variables, validation, launch gates, and deployment notes.
- [Shopify Admin Cleanup](operations/shopify-admin-cleanup.md) - Off-theme products/collections and Admin cleanup source notes.
- [Original Art Launch](../original-art-launch.md) - Fifteen-product owned-art catalog, extension asset lab, staging, supplier gates, and reset sequence.
- [Art for Everyday Living](../art-product-extensions.md) - Draft product-extension architecture, generated assets, sync workflow, and release gates.

## Source Notes

- [Source Map](source-notes/source-map.md) - Main repo files used to build this wiki and what each source contributes.
