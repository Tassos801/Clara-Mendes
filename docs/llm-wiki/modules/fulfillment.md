# Fulfillment And Delivery Promises

Snapshot: 2026-08-14

## Facts

- Fulfilment is Prodigi print-on-demand from UK/EU labs; there is no Cyprus
  facility, so the home market ships the same Standard lanes as the rest of
  the EU (`docs/original-art-launch.md`).
- Orders import to Prodigi and sit in a 24-hour auto-release hold before
  production starts; production runs 1–3 business days, so dispatch lands
  2–4 business days from order (`docs/first-order-runbook.md`).
- Prodigi Standard delivery estimates, counted from dispatch: EU 5–10 and
  US 7–15 business days. Only the EU window is promised on the storefront.
- Live Shopify Markets (checked 2026-08-14 via the Storefront API
  `localization.availableCountries` query) enable 15 EU countries:
  AT BE CY CZ DE DK ES FI FR IE IT NL PL PT SE — no US, no GB, and 12 EU
  members absent. Code-side allowlist is `MARKET_COUNTRIES`
  (`app/lib/markets.ts`, EU-27 + GB + US); the live intersection governs
  checkout, so re-run the query before widening any copy claims.

## Where The Promises Render

- Constants: `app/lib/storefrontBasics.ts` — PRODUCTION_WINDOW_BUSINESS_DAYS,
  DISPATCH_WINDOW_BUSINESS_DAYS, DELIVERY_EU_BUSINESS_DAYS,
  DELIVERY_US_BUSINESS_DAYS.
- PDP: the availability chip and the Shipping details row in
  `app/routes/products.$handle.tsx` interpolate those constants.
- Shipping policy: `docs/shopify-policies-drafts.md` is the paste source for
  Shopify Admin > Settings > Policies; the site footer links
  `/policies/shipping-policy`, which renders the admin-hosted content.
- Ops QC: `docs/first-order-runbook.md` step 5 validates tracking against the
  same windows.

## Changing A Window

Update the constants, mirror the change in the shipping-policy draft and
re-paste it into Shopify Admin, and re-check runbook step 5. The live policy
page and the Merchant Center shipping settings live in Shopify admin and do
not update from code.
