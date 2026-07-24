# Open Questions

## Launch And Hosting

- Is the final public Oxygen/storefront domain attached and reachable?
- Are all production environment variables configured in the deployment
  environment, not only local `.env`?
- Has the live storefront completed a production smoke test for home,
  collection, product, cart, checkout, policy, search, sitemap, and robots
  routes?

Sources: [Launch readiness](../launch-readiness.md), [README](../../README.md).

## Shopify Admin And Catalog

- Will the owner switch the first release to Budget shipping, raise the $29
  retail price, or accept a landed cost above the planned $12 maximum?
- When will the owner add Prodigi billing details?
- Should all fifteen prints be activated together after those decisions, or
  should a smaller controlled batch launch first?
- Which products have passed a physical sample review? The current "Excellent"
  status verifies file resolution only.

Sources: [Shopify Admin cleanup](../shopify-admin-cleanup.md),
[Original Art Launch](../original-art-launch.md).

## Measurement And Growth

- Has Shopify analytics been verified for page, search, product, cart,
  add-to-cart, and checkout journey data?
- Have ad-platform events been checked against live campaigns?
- Have UTM and click ID cart attributes been verified through a real checkout
  flow?
- Are product-level gross margin, refund rate, and dispute rate visible by
  channel before scaling paid traffic?

Sources: [Launch readiness](../launch-readiness.md),
`app/lib/marketingAttribution.ts`, `app/components/AdPlatformAnalytics.tsx`.
