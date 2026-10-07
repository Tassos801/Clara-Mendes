export const SUPPORT_EMAIL = 'hello@shopclaramendes.com';
export const STOREFRONT_ORIGIN = 'https://shopclaramendes.com';
export const RETURN_WINDOW_DAYS = 30;

// Prodigi Standard windows (docs/first-order-runbook.md): a 24-hour
// auto-release hold precedes the 1–3 business-day production window, so
// dispatch lands 2–4 business days from order; delivery estimates count
// from dispatch. Changing these means re-pasting the shipping policy
// (docs/shopify-policies-drafts.md) and re-checking runbook step 5.
// Outside the EU, Prodigi routes each order to its nearest lab (US, AU or
// GB) and ships Standard tracked; Prodigi publishes no window for those
// lanes (US 7–15 is its documented US estimate), so the storefront promises
// a conservative 7–20 business days for every non-EU country.
export const PRODUCTION_WINDOW_BUSINESS_DAYS = '1–3';
export const DISPATCH_WINDOW_BUSINESS_DAYS = '2–4';
export const DELIVERY_EU_BUSINESS_DAYS = '5–10';
export const DELIVERY_INTERNATIONAL_BUSINESS_DAYS = '7–20';

// Printful all-over synthetic garments (Quiet Current activewear, matched by
// Shopify product type). Printful publishes 2–5 business days in-house and
// 3–7 at partner facilities for the technique, counted from the business day
// after the order (help.printful.com, "How long does fulfillment take?").
// Orders wait for manual confirmation in Printful, which can add a business
// day, so dispatch lands 3–8 business days from order. Transit from
// Printful's Latvia facility (3–7 business days to Cyprus, 3 to Germany)
// stays within the shared EU and international delivery windows above.
export const APPAREL_PRODUCT_TYPES = [
  'Yoga Leggings',
  'Sports Bra',
  'Biker Shorts',
  'Studio Top',
] as const;
export const APPAREL_PRODUCTION_WINDOW_BUSINESS_DAYS = '2–7';
export const APPAREL_DISPATCH_WINDOW_BUSINESS_DAYS = '3–8';

export function isApparelProductType(productType?: string | null) {
  const type = productType?.trim().toLowerCase();
  return Boolean(
    type && APPAREL_PRODUCT_TYPES.some((t) => t.toLowerCase() === type),
  );
}

/** The production and dispatch windows a product type's PDP promises. */
export function fulfilmentWindows(productType?: string | null) {
  return isApparelProductType(productType)
    ? {
        production: APPAREL_PRODUCTION_WINDOW_BUSINESS_DAYS,
        dispatch: APPAREL_DISPATCH_WINDOW_BUSINESS_DAYS,
      }
    : {
        production: PRODUCTION_WINDOW_BUSINESS_DAYS,
        dispatch: DISPATCH_WINDOW_BUSINESS_DAYS,
      };
}

// The EU-27 countries, where every product line ships at the published EU
// rates (Shopify markets "Cyprus" + "European Union"). Since 2026-10-06 the
// "International" market also sells outside the EU (not the UK), with rates
// and reach that differ by product line — see
// docs/llm-wiki/modules/fulfillment.md. Structured data keeps to the EU-27
// promise: repeating ~200 regions on every variant offer would bloat each
// product page, and Merchant Center reads international shipping from the
// feeds instead.
export const SHIPPING_COUNTRY_CODES = [
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES',
  'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU',
  'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
] as const;
