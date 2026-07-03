# Analytics And Attribution

## Current Picture

The storefront uses Shopify analytics, ad-platform events, and custom marketing
attribution capture that persists UTM and click identifiers into cart
attributes.

Sources: `app/root.tsx`, `app/components/AdPlatformAnalytics.tsx`,
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

## Ad Platform Events

Ad platform components exist for page/product/cart commerce events. Product
pages send product-view payloads, and `AddToCartButton` sends an `AddToCart`
event after successful cart form submission.

Sources: `app/components/AdPlatformAnalytics.tsx`,
`app/routes/products.$handle.tsx`, `app/components/AddToCartButton.tsx`.

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

