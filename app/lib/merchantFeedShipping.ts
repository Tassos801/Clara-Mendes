import {
  APPAREL_DISPATCH_WINDOW_BUSINESS_DAYS,
  DELIVERY_EU_BUSINESS_DAYS,
  DELIVERY_INTERNATIONAL_BUSINESS_DAYS,
  DISPATCH_WINDOW_BUSINESS_DAYS,
  PRINTFUL_SUBLIMATION_DISPATCH_WINDOW_BUSINESS_DAYS,
} from './storefrontBasics.ts';

// Item-level shipping for the Merchant Center feeds. The Google & YouTube app
// rewrites the account shipping policies on every sync (local currency for
// CZ/DK/HU/PL/RO/SE, nothing for BG/HR/MT), so each item carries its own.
//
// Rates are what checkout charges for one item (single-line Storefront carts,
// 2026-10-29), per Shopify shipping profile: General (prints, hanger, acrylic
// and metal prints, unframed Your Sky), "Canvas 16x20", "Framed Your Sky",
// "Letter post - cards & postcards" (EU only) and "Pastel Forms plant pots".
// A country missing from a table means that line does not ship there. When a
// shipping profile changes in Shopify, change this table in the same PR.

// The EU-27 minus Slovenia, which Google Shopping does not list.
// prettier-ignore
export const FEED_EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'ES', 'SE',
] as const;

// Where Merchant Center lists products outside the EU and the International
// market sells. No South Korea: Google needs KRW prices there.
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

export const FIXED_RATES = {
  print: {
    cyprus: '3.99',
    eu: '16.00',
    international: {
      '9.99': ['NO', 'CH', 'TR'],
      '17.99': except('NO', 'CH', 'TR', 'ID', 'IL', 'MY'),
      '39.99': ['ID', 'IL', 'MY'],
    },
  },
  canvas: {
    cyprus: '3.99',
    eu: '16.00',
    international: {
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
        'US',
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

export const SHIPPING_COLUMN =
  'shipping(country:price:min_handling_time:max_handling_time:min_transit_time:max_transit_time)';

/** One `shipping` value per country the item ships to. */
export function shippingCells(rates: Rates, handling: string) {
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
    rateOf.has(c)
      ? [`${c}:${rateOf.get(c)} EUR:${handling}:${TRANSIT_INTERNATIONAL}`]
      : [],
  );
  return [...eu, ...international];
}
