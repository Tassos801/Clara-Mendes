# Open Questions

## Launch And Hosting

- Is the final public Oxygen/storefront domain attached and reachable?
- Are all production environment variables configured in the deployment
  environment, not only local `.env`?
- Has the live storefront completed a production smoke test for home,
  collection, product, cart, checkout, policy, search, sitemap, and robots
  routes?

- The monthly shipping fee rebuild (`.github/workflows/shipping-fees.yml`)
  first ran on 2026-11-16: the repository secrets are set and Actions
  opened pull request #204. Still open: does GitHub offer **Approve
  workflows to run** on that pull request as its documentation says (the
  `Validate` job then admits it)?

Sources: [Launch readiness](../launch-readiness.md), [README](../../README.md),
[Fulfillment](modules/fulfillment.md#the-monthly-rebuild).

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
- Is the "Free EU shipping – artist products" profile still wanted? It was
  never created: the seven-products range went live on General (log
  2026-10-20) and the Printful blankets now sit in a Printful app profile
  (blanket EU fee EUR 6.53 in `app/lib/printfulShippingFees.ts`), yet
  `docs/add-products-runbook.md` (supplied-file families),
  `docs/artist-shops/status.md` and the `release` dry-run note in
  `scripts/lib/art-product-steps.mjs` still require it. Moving only some
  blankets would split the blanket fee group (the `shipping-fees` rebuild
  stops) and contradict the fee their pages show; either drop the
  requirement or move whole families and rebuild the fee table together.
- Does inventory tracking change how an order reaches Printful? On
  2026-11-18 the three Art & Words blankets (9,999) and the plain Great Wave
  blanket (9,998) are tracked with DENY; the other 27 live blankets and all
  live museum mugs and cushions are untracked, the state `release` writes.
  The 2026-11-17 release (PR #215) took tracking as the reason order #1002 went
  to Printful; no order of an untracked Printful product exists to compare.
  Until it is known: should `release` leave already-released products alone?
  Today it untracks every selected product, so the next Art & Words release
  untracks the first three.

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
- The Everyday collection was populated on 2026-09-23; verify its live
  Hydrogen route and sitemap after the release-flag deployment.
- Should the card families stay on Prodigi's Budget (untracked) service with
  the storefront saying so, or move back to Standard (tracked, ≈€3.25 more per
  order)? The Shopify shipping-policy page still promises tracked delivery for
  everything either way.

Sources: [Art for Everyday Living](../art-product-extensions.md).

## Measurement And Growth

- **Next sale: where does the reduced price live?** The 2026 Black Friday
  discounts act in the cart only, so product prices and the feeds never
  changed and nothing needed undoing. The cost showed in the Shopping ads:
  an ad shows the feed price, and the sale appeared only as a Merchant
  Center promotion, which Google offers in some countries (not Ireland,
  Belgium or Austria in November 2026). A sale that should show in every
  country's ads needs the reduced price on the product itself (compare-at
  price in Shopify, `sale_price` in the feeds, the same price on the page).
  Owner decision before the next sale; not built.

- Has Shopify analytics been verified for page, search, product, cart,
  add-to-cart, and checkout journey data?
- Have ad-platform events been checked against live campaigns?
- Have UTM and click ID cart attributes been verified through a real checkout
  flow?
- Are product-level gross margin, refund rate, and dispute rate visible by
  channel before scaling paid traffic?

Sources: [Launch readiness](../launch-readiness.md),
`app/lib/marketingAttribution.ts`, `app/components/AdPlatformAnalytics.tsx`.

## Clothing Destination

- Does the collection metafield definition `custom.collection_kind` (Single
  line text, Storefront access read) exist? The 8 October 2026 snapshot shows no
  value on any of the 17 collections but cannot show definitions. Until it
  exists, a new capsule cannot be marked `capsule`.
- Are the 13 empty legacy collections and the two empty "Art for Everyday
  Living" duplicates (`art-for-everyday-living`, `art-for-everyday-living-1`)
  still published to the `Clara Mendes` channels? The snapshot has no
  collection publication data. The code hides them either way.
- Should the four Quiet Current garments get the prepared Shopify categories
  (Activewear leggings, sports bras, activewear shorts, tank tops)? The shorts
  choice (`aa-1-1-1-3` against `aa-1-14-8`) is a judgment call.
- After the empty duplicates are unpublished, their URLs return 404 because
  they are not on `LEGACY_COLLECTION_HANDLES`. Is a redirect wanted?
- Should the four Quiet Current garments get both approval metafields set to
  `true`? Today they show through the released-handle path and both are `false`.
  The first paid order is their first quality check.
- Does Shopify's Storefront API still return an unpublished capsule collection
  in `product.collections`? Not tested. The guide tells operators to publish the
  collection, as Quiet Current was.
- What delivery estimate, shipping profile and supplier source will the first
  new garment use? `fulfilmentWindows` returns `null` for every garment except
  the four Quiet Current handles, so a new garment has no delivery window until
  code adds one.
- Shop All hides garment types from its type tabs by the type list, so a garment
  admitted only by the tag `clara-mendes-clothing` with an unlisted type still
  shows its type as a tab. Is that wanted?
- Predictive search suggestions cannot judge a new capsule collection without a
  product list, so a new capsule collection is not suggested there. Is that
  acceptable?
- Is the `/clothing` branch (`codex/clothing-destination-2026-10-08`) merged and
  deployed? These notes describe the uncommitted work of 8 October 2026.

Sources: [Clothing](modules/clothing.md),
[Clothing destination guide](../clothing-destination.md),
[Catalogue audit](../audits/clothing-catalog-2026-10-08.md),
`app/lib/catalogFilters.ts`, `app/lib/storefrontBasics.ts`.
