import {
  FEED_EU_COUNTRIES,
  FIXED_RATES,
  type FixedRateLine,
} from './merchantFeedShipping.ts';
import type {ShippingFee} from './printfulShipping.ts';

/**
 * Prodigi-made lines: the flat EUR rate Shopify's own profiles charge, from
 * the table the Merchant Center feeds publish (merchantFeedShipping.ts).
 * Only the lines checked against checkout carts on 2026-11-12 (CY €3.99,
 * rest of the EU €16, cards €2.90), and only for EU buyers. US buyers pay a
 * USD conversion that moves with the exchange rate and is not in the
 * table; phone cases, plant pots and Your Sky have no checked row. Those
 * get no line, and checkout prices them.
 */
const LINE_BY_TYPE: Record<string, FixedRateLine> = {
  'Art Prints': 'print',
  'Hanger Prints': 'print',
  'Acrylic Prints': 'mounted',
  'Metal Prints': 'mounted',
  'Canvas Art': 'canvas',
  'Framed Art': 'framed',
  Cards: 'card',
  Postcards: 'card',
};

// Google Shopping leaves Slovenia out of the feeds; checkout does not.
const EU: readonly string[] = [...FEED_EU_COUNTRIES, 'SI'];

export function fixedShippingFee(
  product: {productType?: string | null},
  variant:
    | {availableForSale?: boolean | null; price?: {currencyCode: string} | null}
    | null
    | undefined,
  country: string | null | undefined,
): ShippingFee | null {
  if (!variant?.availableForSale) return null;
  const code = country?.toUpperCase() ?? '';
  const line = LINE_BY_TYPE[product.productType?.trim() ?? ''];
  if (!line || !EU.includes(code)) return null;
  const rates = FIXED_RATES[line];
  const fee = {
    amount: code === 'CY' ? rates.cyprus : rates.eu,
    currencyCode: 'EUR',
  };
  if (variant.price && variant.price.currencyCode !== fee.currencyCode)
    return null;
  return fee;
}
