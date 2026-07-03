# Launch Readiness

This list covers the parts of revenue readiness that code cannot finish alone.
Use it before sending paid traffic to Clara Mendes.

## Storefront And Measurement

- Configure every production environment variable in `README.md`, including
  `PUBLIC_STOREFRONT_ID`, checkout domain, and Storefront API token.
- Confirm the Hydrogen privacy banner loads for a new visitor and Shopify
  analytics receives page, search, product, cart, add-to-cart, and checkout
  journey data in the connected storefront.
- Test canonical tags, social share previews, `robots.txt`, `sitemap.xml`, and
  product structured data on the production domain after deployment.
- Preserve UTM parameters through acquisition links and run one end-to-end test
  order from each channel before scaling spend.

## Checkout And Trust

- Enable production payments, Shop Pay, taxes, duties where applicable, fraud
  controls, order emails, and checkout branding in Shopify Admin.
- Test one mobile and one desktop purchase with shipping address, discount code,
  tax/shipping calculation, payment, order confirmation, and refund handling.
- Publish accurate shipping, return, privacy, terms, support contact, and order
  tracking expectations. Do not promise supplier delivery times that operations
  cannot meet.
- Verify the support inbox, refund procedure, chargeback evidence process, and
  escalation owner before taking paid orders.

## Catalog And Offer

- Finish `docs/shopify-admin-cleanup.md` so off-brand products and collections
  cannot leak into Headless search, sitemaps, feeds, or advertising catalogs.
- Review every live variant for sellable inventory, SKU mapping, price,
  margin after shipping and refunds, image quality, alt text, shipping weight,
  delivery expectation, and policy fit.
- Order samples for products with fragile packaging, uncertain media, or margin
  sensitivity before making them scale targets.
- Build merchandising around offers that can be measured: hero products,
  collections, bundles, cross-sells, email/SMS capture, and repeat-purchase
  follow-up.

## Operations

- Verify the supplier/fulfillment workflow, tracking sync, cancellations, and
  exception handling on real test orders before taking live traffic.
- Set monitoring for storefront availability, server errors, fulfillment
  failures, checkout conversion, refund rate, payment disputes, and margin by
  product.
- Keep a release checklist with build, typecheck, lint, route check, production
  smoke test, rollback owner, and incident contact.
- Coordinate load testing and traffic spikes with Shopify support when the
  launch plan warrants it.

## Growth Gate

Scale acquisition only after these numbers are visible and stable by channel:

- Product view to add-to-cart rate.
- Add-to-cart to checkout rate.
- Checkout completion rate.
- Landed cost, gross margin, contribution margin, refund rate, and dispute rate.
- Repeat purchase or list growth rate for the offer being promoted.
