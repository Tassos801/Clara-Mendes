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

- Should the owner keep the 15 prints Active while automatic fulfillment is
  blocked, or return them to Draft until the remaining gates pass?
- Will the owner switch to Budget shipping, change the contextual retail
  price, or formally replace the planned $12 landed-cost ceiling?
- When will the owner add Prodigi billing details?
- When will Quiet Form I, Patina Blue II, and Neo Deco III be ordered as the
  controlled three-design sample batch?
- Which products have passed physical inspection? The current "Excellent"
  status verifies file resolution only; none have passed a sample review.

Sources: [Shopify Admin cleanup](../shopify-admin-cleanup.md),
[Original Art Launch](../original-art-launch.md).

## Extensions (cards, postcards, calendar)

- The Admin API client-credentials exchange (`SHOPIFY_CLIENT_ID/SECRET` in
  `.env.shopify-admin.local`) returned an error on 2026-09-01, so the
  calendar rename (`scripts/rename-calendar-2027.mjs`) has not run; has the
  app secret rotated, or does the app need re-installing?
- Does the Prodigi channel mapping for the calendar (1/1, fourteen attached
  sides) survive the in-place rename? The script preserves the product and
  variant ids, which is what the mapping keys on, but the dashboard has not
  yet been re-read after a run.
- Will the owner add the greeting card and postcard to the "Art for Everyday
  Living" collection in Admin (the sync only tags), then flip
  `EXTENSION_COLLECTION_POPULATED`?
- Should the card families stay on Prodigi's Budget (untracked) service with
  the storefront saying so, or move back to Standard (tracked, ≈€3.25 more per
  order)? The Shopify shipping-policy page still promises tracked delivery for
  everything either way.

Sources: [Art for Everyday Living](../art-product-extensions.md).

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
