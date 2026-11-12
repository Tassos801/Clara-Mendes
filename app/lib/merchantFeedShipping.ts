import type {ShippingFee} from './printfulShipping.ts';
import {US_FIXED_SHIPPING_FEES} from './printfulShippingFees.ts';
import {
  APPAREL_DISPATCH_WINDOW_BUSINESS_DAYS,
  DELIVERY_EU_BUSINESS_DAYS,
  DELIVERY_INTERNATIONAL_BUSINESS_DAYS,
  DELIVERY_US_BUSINESS_DAYS,
  DISPATCH_WINDOW_BUSINESS_DAYS,
  PRINTFUL_SUBLIMATION_DISPATCH_WINDOW_BUSINESS_DAYS,
} from './storefrontBasics.ts';

// Item-level shipping for the Merchant Center feeds. The Google & YouTube app
// rewrites the account shipping policies on every sync (local currency for
// CZ/DK/HU/PL/RO/SE, nothing for BG/HR/MT), so each item carries its own.
//
// Rates are what checkout charges for one item (single-line Storefront carts,
// 2026-10-29; US zones 2026-11-05), per Shopify shipping profile: General
// (prints, hanger, acrylic and metal prints, unframed Your Sky), "Canvas 16x20", "Framed Your Sky",
// "Letter post - cards & postcards" (EU only) and "Pastel Forms plant pots".
// A country missing from a table means that line does not ship there. When a
// shipping profile changes in Shopify, change this table in the same PR: the
// product page shows these rates to EU buyers too (fixedShippingFee.ts).
//
// These EUR tables feed the EUR feeds only. A US buyer pays Shopify's USD
// conversion of the US rate, rounded up to a dollar; the USD feed reads it
// from the checkout quotes `npm run shipping-fees` checks in
// (US_FIXED_SHIPPING_FEES), as the Printful lines read theirs. No feed
// creates a cart: Shopify counts every cart as a visit that added to cart.

// The EU-27 minus Slovenia, which Google Shopping does not list.
// prettier-ignore
export const FEED_EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'ES', 'SE',
] as const;

// Where Merchant Center lists products outside the EU and the International
// market sells. No South Korea: Google needs KRW prices there. The EUR feeds
// leave the US out once the US market sells in USD (the USD feeds take it).
// prettier-ignore
export const FEED_INTERNATIONAL_COUNTRIES = [
  'DZ', 'AO', 'AR', 'AU', 'BH', 'BD', 'BR', 'KH', 'CM', 'CA', 'CL', 'CO', 'CR',
  'CI', 'DO', 'EC', 'EG', 'SV', 'ET', 'GE', 'GH', 'GT', 'HK', 'IN', 'ID', 'IL',
  'JP', 'JO', 'KZ', 'KE', 'KW', 'LB', 'LI', 'MG', 'MY', 'MU', 'MX', 'MA', 'MZ',
  'NP', 'NZ', 'NI', 'NG', 'NO', 'OM', 'PK', 'PA', 'PY', 'PE', 'PH', 'SA', 'SN',
  'SG', 'ZA', 'LK', 'CH', 'TW', 'TZ', 'TH', 'TN', 'TR', 'UG', 'UA', 'AE', 'US',
  'UY', 'UZ', 'VN', 'ZM', 'ZW',
] as const;

export type Rates = {
  cyprus: string;
  eu: string;
  /** EUR rate -> countries outside the EU that pay it. */
  international?: Readonly<Record<string, readonly string[]>>;
};

const except = (...left: string[]) =>
  FEED_INTERNATIONAL_COUNTRIES.filter((country) => !left.includes(country));

// General profile, United States zone (owner, 2026-11-05: "Price-based
// split"): EUR 13.99 on orders under EUR 79 and EUR 23.99 from EUR 79, so
// acrylic and metal prints (from EUR 79.99; Prodigi ships them to the US for
// EUR 22-23) pay their cost while prints and hangers (up to EUR 74.99) don't.
// The split was first EUR 77, but in the USD market Shopify placed it between
// $77 and $87, so the $87 hanger paid the upper rate; EUR 79 fixed that
// (owner OK the same day). A one-item feed row lands on one side of the
// split, so the General lines are two tables: `print` and `mounted`.
const GENERAL_INTERNATIONAL = {
  '9.99': ['NO', 'CH', 'TR'],
  '17.99': except('NO', 'CH', 'TR', 'ID', 'IL', 'MY', 'US'),
  '39.99': ['ID', 'IL', 'MY'],
};

export const FIXED_RATES = {
  print: {
    cyprus: '3.99',
    eu: '16.00',
    international: {...GENERAL_INTERNATIONAL, '13.99': ['US']},
  },
  mounted: {
    cyprus: '3.99',
    eu: '16.00',
    international: {...GENERAL_INTERNATIONAL, '23.99': ['US']},
  },
  canvas: {
    cyprus: '3.99',
    eu: '16.00',
    international: {
      '23.99': ['US'],
      '29.99': [
        'AU',
        'CA',
        'CH',
        'HK',
        'IN',
        'JP',
        'NO',
        'NZ',
        'PH',
        'SG',
        'TH',
        'TW',
        'VN',
      ],
    },
  },
  framed: {
    cyprus: '3.99',
    eu: '16.00',
    international: {
      '29.99': ['AU', 'HK', 'IN', 'JP', 'NZ', 'PH', 'SG', 'TH', 'TW', 'VN'],
    },
  },
  card: {cyprus: '2.90', eu: '2.90'},
  pot: {
    cyprus: '6.99',
    eu: '6.99',
    international: {'11.99': except('CI', 'US')},
  },
} as const satisfies Record<string, Rates>;

export type FixedRateLine = keyof typeof FIXED_RATES;

/** '2–4' -> '2:4', the feed's min:max business days. */
function businessDays(window: string) {
  return window.replace(/\s*[–-]\s*/, ':');
}

// Handling = the dispatch window the product page promises; transit = the
// delivery window after dispatch.
export const HANDLING = {
  prodigi: businessDays(DISPATCH_WINDOW_BUSINESS_DAYS),
  sublimation: businessDays(PRINTFUL_SUBLIMATION_DISPATCH_WINDOW_BUSINESS_DAYS),
  cutSew: businessDays(APPAREL_DISPATCH_WINDOW_BUSINESS_DAYS),
};
const TRANSIT_EU = businessDays(DELIVERY_EU_BUSINESS_DAYS);
const TRANSIT_INTERNATIONAL = businessDays(
  DELIVERY_INTERNATIONAL_BUSINESS_DAYS,
);
const TRANSIT_US = businessDays(DELIVERY_US_BUSINESS_DAYS);

export const SHIPPING_COLUMN =
  'shipping(country:price:min_handling_time:max_handling_time:min_transit_time:max_transit_time)';

/**
 * One `shipping` value per country the item ships to. `omit` leaves countries
 * out (the US, once the USD feeds list it).
 */
export function shippingCells(
  rates: Rates,
  handling: string,
  omit: readonly string[] = [],
) {
  const eu = FEED_EU_COUNTRIES.map(
    (c) =>
      `${c}:${c === 'CY' ? rates.cyprus : rates.eu} EUR:${handling}:${TRANSIT_EU}`,
  );
  const rateOf = new Map(
    Object.entries(rates.international ?? {}).flatMap(([rate, countries]) =>
      countries.map((c) => [c, rate] as const),
    ),
  );
  const international = FEED_INTERNATIONAL_COUNTRIES.flatMap((c) =>
    rateOf.has(c) && !omit.includes(c)
      ? [`${c}:${rateOf.get(c)} EUR:${handling}:${TRANSIT_INTERNATIONAL}`]
      : [],
  );
  return [...eu, ...international];
}

/** The USD feeds' single `shipping` value: the US checkout rate. */
export function usShippingCell(amount: string, handling: string) {
  return `US:${amount} USD:${handling}:${TRANSIT_US}`;
}

// Google's product data specification, `shipping`: "Match or slightly
// overestimate the cost customers would pay." A fee that moves with the
// exchange rate between rebuilds of the fee table (printfulShippingFees.ts)
// cannot match checkout to the cent, so the feed states it this much higher,
// rounded up. It covers a 2% move since the last rebuild (the table is
// rebuilt weekly); a fee that does not move (`about` unset) is stated as is.
export const FEED_EXCHANGE_ALLOWANCE_PERCENT = 2;

/**
 * The amount a feed states for a fee from the fee table. `stepCents` is the
 * smallest step checkout charges the fee in.
 */
export function feedAmount(fee: ShippingFee, stepCents = 1) {
  if (!fee.about) return fee.amount;
  const cents =
    Math.round(Number(fee.amount) * 100) *
    (100 + FEED_EXCHANGE_ALLOWANCE_PERCENT);
  return (
    (Math.ceil(cents / (100 * stepCents)) * stepCents) /
    100
  ).toFixed(2);
}

/**
 * The USD amount the US feed states for a fixed line, or null when the line
 * does not ship to the US. Checkout converts the line's EUR rate and rounds
 * it up to a whole dollar, so the fee moves a dollar at a time (prints paid
 * $17 on 2026-11-05 and $16 a week later) and the allowance lands on the
 * next dollar.
 */
export function usFixedRate(line: FixedRateLine) {
  const fee = (
    US_FIXED_SHIPPING_FEES as Partial<
      Record<FixedRateLine, {amount: string; currencyCode: string}>
    >
  )[line];
  return fee?.currencyCode === 'USD'
    ? feedAmount({...fee, about: true}, 100)
    : null;
}
