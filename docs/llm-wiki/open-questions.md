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

- Has a current Admin API token or signed-in Admin session been restored?
- Have the 47 currently available products been moved to Draft with the restore
  backup preserved?
- Which free POD provider and exact 8 × 10 paper product passed the physical
  sample comparison?
- Are the nine original-art SKUs mapped to the provider and still Draft until a
  complete test order succeeds?
- Has the planned $12 maximum landed cost been verified with real US shipping?

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
