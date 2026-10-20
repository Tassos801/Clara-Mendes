import {isClothingProduct} from './clothing.ts';
import {SKY_PRODUCT_TYPE} from './sky/products.ts';

export const SUPPORT_EMAIL = 'hello@shopclaramendes.com';
export const STOREFRONT_ORIGIN = 'https://shopclaramendes.com';
export const RETURN_WINDOW_DAYS = 30;

// The live refund policy (docs/shopify-policies-drafts.md) lists custom or
// personalised orders as non-returnable, so RETURN_WINDOW_DAYS never applies
// to them. What it does promise every order: a replacement or full refund for
// an item that arrives damaged, defective or incorrect, reported within this
// many days of delivery.
export const DAMAGE_REPORT_WINDOW_DAYS = 7;

/** Your Sky and First Light share this type; both are made for one person. */
export function isPersonalisedProductType(productType?: string | null) {
  return (
    productType?.trim().toLowerCase() === SKY_PRODUCT_TYPE.toLowerCase()
  );
}

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

// US buyers (docs/us-market/status.md, step A2) read Prodigi's documented
// US Standard estimate instead of the generic non-EU window. Everyone else
// keeps the EU + elsewhere wording unchanged (owner rule: additive, keyed on
// the buyer's country).
export const DELIVERY_US_BUSINESS_DAYS = '7–15';

/**
 * True when this buyer should read the US delivery window: a US buyer, on a
 * Prodigi line (not a Printful one, activewear or the museum mugs, cushions
 * and blankets, whose US transit isn't verified yet), for an item that ships
 * to them (an out-of-reach item keeps the generic wording beside its
 * "Doesn't ship to the United States" notice).
 */
// Product types whose US orders Prodigi makes in its US labs and ships
// within the US (live quotes, docs/us-market/status.md step B1, 2026-10-18:
// prints, Your Sky, canvas and cases all quoted from prodigi_us / us7), so
// US buyers owe no import duties on them. Add a type only after a quote shows
// a US lab; framed 20×24 ships from GB.
export const US_DOMESTIC_PRODUCT_TYPES = [
  'Art Prints',
  'Canvas Art',
  'Personalised Art',
  'Phone Cases',
] as const;

export function shipsWithinUs(productType?: string | null) {
  const type = productType?.trim().toLowerCase();
  return Boolean(
    type && US_DOMESTIC_PRODUCT_TYPES.some((t) => t.toLowerCase() === type),
  );
}

export function readsUsDelivery({
  buyerCountry,
  shipsToBuyer = true,
  isApparel = false,
  printful = false,
}: {
  buyerCountry?: string | null;
  shipsToBuyer?: boolean;
  isApparel?: boolean;
  /** A museum product Printful makes (`printfulTechnique` set). */
  printful?: boolean;
}) {
  return (
    buyerCountry?.trim().toUpperCase() === 'US' &&
    shipsToBuyer &&
    !isApparel &&
    !printful
  );
}

// Printful all-over synthetic garments (Quiet Current activewear, matched by
// exact released product handles). Printful publishes 2–5 business days in-house and
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

/** Verified shipping belongs to these existing products, never a future type. */
export function isQuietCurrentProduct(handle?: string | null) {
  return [
    'quiet-current-high-waist-leggings',
    'quiet-current-studio-bra',
    'quiet-current-high-waist-biker-shorts',
    'quiet-current-studio-tank',
  ].includes(handle?.toLowerCase() ?? '');
}

// Quiet Current activewear ships on its own Shopify profile, "Quiet Current
// activewear" (148183646542): one flat Standard rate per zone, charged once
// per order however many activewear pieces it holds
// (docs/quiet-current-release.md#shipping). The PDP and the collection hero
// quote these figures, so change them here in the same step as the profile.
export const APPAREL_SHIPPING_RATES = [
  {zone: 'Cyprus', eur: '3.99'},
  {zone: 'Rest of the EU', eur: '4.95'},
  {zone: 'United States', eur: '4.95'},
  {zone: 'Japan', eur: '4.95'},
  {
    zone: 'Other European countries',
    eur: '6.99',
    note: 'Albania, Andorra, Bosnia & Herzegovina, Moldova, Monaco, Montenegro, North Macedonia, San Marino, Serbia, Ukraine, Vatican City',
  },
  {zone: 'Canada', eur: '6.99'},
  {zone: 'Australia & New Zealand', eur: '6.99'},
  {
    zone: 'Switzerland, Norway, Iceland & Liechtenstein',
    eur: '9.99',
  },
  {zone: 'Everywhere else we ship', eur: '12.99'},
] as const satisfies ReadonlyArray<{zone: string; eur: string; note?: string}>;

/** Lowest activewear shipping rate, for "from" lines. */
export const APPAREL_SHIPPING_FROM_EUR = APPAREL_SHIPPING_RATES.reduce(
  (low, rate) => (Number(rate.eur) < Number(low) ? rate.eur : low),
  APPAREL_SHIPPING_RATES[0].eur as string,
);

/**
 * How Printful makes a museum product, by Printful's own technique: the mug
 * and the blanket are sublimation; the cushion is "All-over synthetic"
 * cut-and-sew, the technique of the Quiet Current activewear.
 */
export type PrintfulTechnique = 'sublimation' | 'cut-sew';

// Printful's museum products (mug, cushion, blanket: the `printful` route in
// app/lib/artProductCatalog.ts). Printful's average fulfilment for Mugs and
// Sublimation is 2–5 business days at every facility, partners included
// (printful.com/fulfillment-updates, read 2026-10-20). Orders wait for the
// same manual confirmation as activewear, so dispatch lands 3–6 business days
// from order. Cut-and-sew cushions run 3–7 at partner facilities and take the
// activewear windows.
export const PRINTFUL_SUBLIMATION_PRODUCTION_WINDOW_BUSINESS_DAYS = '2–5';
export const PRINTFUL_SUBLIMATION_DISPATCH_WINDOW_BUSINESS_DAYS = '3–6';

/**
 * Production and dispatch windows: Prodigi's, unless Printful makes the
 * product (Quiet Current, or a museum product with a `printfulTechnique`).
 * Future garments have no supplier estimate until their merchant copy
 * states it.
 */
export function fulfilmentWindows(
  productType?: string | null,
  handle?: string | null,
  tags?: string[] | null,
  printfulTechnique?: PrintfulTechnique | null,
) {
  if (isClothingProduct({productType, tags}) && !isQuietCurrentProduct(handle))
    return null;
  if (isQuietCurrentProduct(handle) || printfulTechnique === 'cut-sew')
    return {
      production: APPAREL_PRODUCTION_WINDOW_BUSINESS_DAYS,
      dispatch: APPAREL_DISPATCH_WINDOW_BUSINESS_DAYS,
    };
  if (printfulTechnique === 'sublimation')
    return {
      production: PRINTFUL_SUBLIMATION_PRODUCTION_WINDOW_BUSINESS_DAYS,
      dispatch: PRINTFUL_SUBLIMATION_DISPATCH_WINDOW_BUSINESS_DAYS,
    };
  return {
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
