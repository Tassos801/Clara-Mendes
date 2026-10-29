# Analytics And Attribution

## Current Picture

The storefront uses Shopify analytics, ad-platform events, and custom marketing
attribution capture that persists UTM and click identifiers into cart
attributes.

Sources: `app/root.tsx`, `app/components/GoogleCommerceAnalytics.tsx`,
`app/components/MetaPixelAnalytics.tsx`,
`app/components/MarketingAttribution.tsx`, `app/lib/marketingAttribution.ts`,
`app/routes/cart.tsx`.

## Shopify Analytics

`app/root.tsx` wraps the app in `Analytics.Provider`. The root loader attempts
to load Shopify analytics configuration with `getShopAnalytics` and passes
customer-consent context using:

- checkout domain
- Storefront API token
- privacy banner flag
- storefront country/language

The app continues if Shopify analytics configuration cannot be loaded.

## Consent

`withPrivacyBanner: true` (root loader) loads Shopify's storefront banner.
Hydrogen only marks analytics ready once the banner script hands over the full
`window.Shopify.customerPrivacy` API; for a visitor who already chose, that
script leaves only `{backendConsentEnabled, consentStatus}` (live site,
2026-10-29), so `customerPrivacy` stayed null and `canTrack()` false for every
returning visitor. `app/components/CustomerPrivacyApiFallback.tsx` loads
Shopify's standalone consent-tracking-api after 2 s when the full API is
missing; Hydrogen's own setter picks it up and analytics start with the stored
consent.

## Ad Platform Events

Both integrations subscribe to Hydrogen analytics events and turn payloads
into commerce items with `app/lib/analyticsItems.ts` (`item_id` = variant SKU,
the id of the Merchant Center and Meta catalogs).

- Google Tag Manager: `app/components/GoogleCommerceAnalytics.tsx` with
  consent mode from Shopify consent. Off unless `PUBLIC_GTM_CONTAINER_ID` is
  set (not set on 2026-10-29).
- Meta pixel: `app/components/MetaPixelAnalytics.tsx`,
  `app/lib/metaPixel{,.client}.ts`. Off unless `PUBLIC_META_PIXEL_ID` is set
  (dataset "Clara Mendes pixel", 2509864056173154, linked to the Meta catalog
  "Clara Mendes"). Nothing loads before marketing consent; accepting later
  loads it and sends a PageView; withdrawing sends `consent revoke`. Events:
  PageView, ViewContent and AddToCart with `content_ids` = SKUs. Purchase
  happens on Shopify checkout and is not sent by the storefront.
- CSP (`app/lib/csp.ts`): connect.facebook.net (script), www.facebook.com
  (img, connect, frame). `CSP_FRAME_SRC` also keeps the default-src frame
  hosts, since Hydrogen uses a custom frame-src as given.

## Marketing Attribution

`app/lib/marketingAttribution.ts` captures:

- UTM parameters: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`,
  `utm_term`, `utm_id`.
- Click IDs: `fbclid`, `ttclid`, `gclid`, `gbraid`, `wbraid`, `msclkid`.
- first touch
- last touch
- landing page
- referrer
- session ID

The attribution snapshot is stored in local storage and passed through hidden
cart form input. The cart action merges sanitized attribution into cart
attributes.

## Launch Measurement Gate

Before scaling paid acquisition, the launch readiness doc says these metrics
must be visible and stable by channel:

- Product view to add-to-cart rate.
- Add-to-cart to checkout rate.
- Checkout completion rate.
- Landed cost.
- Gross margin.
- Contribution margin.
- Refund rate.
- Dispute rate.
- Repeat purchase or list growth rate.

Source: `docs/launch-readiness.md`.

