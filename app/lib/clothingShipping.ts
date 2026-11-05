import {isClothingProduct} from './clothing.ts';
import {isQuietCurrentProduct} from './storefrontBasics.ts';

/**
 * Shipping for clothing beyond Quiet Current (Counter-Diagonal today). These
 * garments ship on Printful's own Shopify profiles, whose rates Printful sets
 * per destination and product (in USD, converted daily) and Shopify charges
 * at checkout. A fixed table here would drift, so the product page quotes
 * checkout itself: a one-piece cart for the buyer's country, in the buyer's
 * market currency (docs/us-market/HANDOFF.md rule 2: derived, never a
 * hardcoded copy). Printful's app manages the profiles (rates in USD, flat,
 * one fee per profile per order): hoodies and crewneck $7.29 EU / $8.79 US,
 * tees and long sleeve $4.99 / $4.95, cap, beanie and tote $4.99 / $4.69
 * (read 2026-11-05 by cd-apparel, cd-accessories and us-market; checkout
 * then showed CY €6.50 / €4.45 / €4.45). Pieces in one profile share a fee,
 * pieces in different profiles each add one, so the page quotes one piece
 * and leaves the order total to checkout. US orders ship from Printful's US
 * facilities. No rate for the UK or Japan (not in a sellable zone).
 */
export type ClothingShippingQuote = {amount: string; currencyCode: string};

/** Clothing that ships on a profile without a table of its own. */
export function quotesClothingShipping(product: {
  handle?: string | null;
  productType?: string | null;
  tags?: string[] | null;
}) {
  return isClothingProduct(product) && !isQuietCurrentProduct(product.handle);
}

/**
 * Printful prices the US, Canada and Australia by state or province, so a
 * country code alone gets no rate there. A public landmark per country,
 * used only to price delivery; every other country prices by code.
 */
export const QUOTE_ADDRESSES: Readonly<
  Record<string, {city: string; zip: string; provinceCode: string}>
> = {
  US: {city: 'New York', zip: '10001', provinceCode: 'NY'},
  CA: {city: 'Toronto', zip: 'M5V 2T6', provinceCode: 'ON'},
  AU: {city: 'Sydney', zip: '2000', provinceCode: 'NSW'},
};

/** The standard rate: the cheapest option checkout offers. */
export function cheapestShippingQuote(
  options: Array<{estimatedCost: {amount: string; currencyCode: string}}>,
): ClothingShippingQuote | null {
  const priced = options
    .map((option) => option.estimatedCost)
    .filter((cost) => Number.isFinite(Number(cost.amount)));
  if (!priced.length) return null;
  const cheapest = priced.reduce((low, cost) =>
    Number(cost.amount) < Number(low.amount) ? cost : low,
  );
  return {amount: cheapest.amount, currencyCode: cheapest.currencyCode};
}
