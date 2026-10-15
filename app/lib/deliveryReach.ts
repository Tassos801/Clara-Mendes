// Relative imports keep this module loadable by the plain-Node test runner,
// which cannot resolve the Vite "~" alias.
import {DEFAULT_MARKET_COUNTRY, marketCountryName} from './markets.ts';

/**
 * Storefront `availableForSale` is per buyer country. A variant whose
 * Shopify shipping profile has no zone for the buyer's country reads false,
 * exactly like a sold-out one (cartCreate even warns
 * MERCHANDISE_OUT_OF_STOCK), and `currentlyNotInStock` stays false for both.
 * Letter-post cards ship within the EU only, framed pieces and pots to
 * selected countries (docs/llm-wiki/modules/fulfillment.md). The default
 * market (Cyprus) is in every profile, so re-reading availability there
 * separates "doesn't ship to you" from "sold out": a variant that is
 * unavailable for the buyer but available in the default market is out of
 * reach, while a staged or genuinely unavailable one is unavailable in both.
 */

type Flagged = {availableForSale?: boolean | null} | null;
type FlaggedNodes = {nodes?: readonly Flagged[] | null} | null;

export type ReachProduct = {
  id: string;
  /** Product-level flag, when the listing query selects one. */
  availableForSale?: boolean | null;
  cardVariant?: FlaggedNodes;
  sizeVariants?: FlaggedNodes;
  variants?: FlaggedNodes;
};

/** A checkout country, for the "deliver elsewhere" picker. */
export type DeliveryCountryChoice = {code: string; name: string};

/** Set on a listing product the buyer cannot be sent: "the United States". */
export type NotShippedTo = {notShippedTo?: string};

/** Set on a variant that is sellable in the default market but not here. */
export type OutOfReach = {outOfReach?: boolean};

// Names that read with an article: "doesn't ship to the United States".
const DEFINITE_ARTICLE = new Set(
  'AE AX BS CK DO FK FO GB GM KM KY MV NL PH SB SC TC US VG'.split(' '),
);

/** The buyer country as a sentence object: "the United States", "Japan". */
export function countryPhrase(code: string): string {
  const name = marketCountryName(code) ?? code;
  return DEFINITE_ARTICLE.has(code.toUpperCase()) ? `the ${name}` : name;
}

/** Nothing on this listing entry can be bought by the current buyer. */
export function nothingBuyable(product: ReachProduct): boolean {
  if (typeof product.availableForSale === 'boolean') {
    return !product.availableForSale;
  }
  const sample = [
    ...(product.sizeVariants?.nodes ?? []),
    ...(product.cardVariant?.nodes ?? []),
    ...(product.variants?.nodes ?? []),
  ];
  return (
    sample.length > 0 &&
    !sample.some((variant) => variant?.availableForSale === true)
  );
}

/**
 * Products to re-read in the default market: none for a buyer already
 * there, otherwise every listed product the buyer cannot buy anything of.
 */
export function reachCheckIds(
  buyerCountry: string,
  products: readonly ReachProduct[],
): string[] {
  if (buyerCountry === DEFAULT_MARKET_COUNTRY) return [];
  return [
    ...new Set(products.filter(nothingBuyable).map((product) => product.id)),
  ];
}

/** Labels the unbuyable products the default market can sell. */
export function markNotShippedTo<T extends ReachProduct>(
  products: readonly T[],
  sellableIds: ReadonlySet<string>,
  buyerCountry: string,
): Array<T & NotShippedTo> {
  if (!sellableIds.size) return [...products];
  const phrase = countryPhrase(buyerCountry);
  return products.map((product) =>
    sellableIds.has(product.id) && nothingBuyable(product)
      ? {...product, notShippedTo: phrase}
      : product,
  );
}

/** Variants worth re-reading: only when the buyer cannot buy some of them. */
export function needsVariantReach(
  buyerCountry: string,
  variants: ReadonlyArray<{availableForSale: boolean}>,
): boolean {
  return (
    buyerCountry !== DEFAULT_MARKET_COUNTRY &&
    variants.some((variant) => !variant.availableForSale)
  );
}

/** Flags each variant the buyer cannot buy but the default market can. */
export function markOutOfReachVariants<
  V extends {availableForSale: boolean; id: string},
>(variants: readonly V[], defaultMarketIds: ReadonlySet<string>) {
  return variants.map((variant) =>
    markOutOfReachVariant(variant, defaultMarketIds),
  );
}

export function markOutOfReachVariant<
  V extends {availableForSale: boolean; id: string},
>(variant: V, defaultMarketIds: ReadonlySet<string>): V & OutOfReach {
  return !variant.availableForSale && defaultMarketIds.has(variant.id)
    ? {...variant, outOfReach: true}
    : variant;
}

/**
 * Variants as the default market sees them, for structured data: an
 * out-of-reach variant is on sale there. Its Offer's shipping destinations
 * are the EU, so InStock stays true for every destination it names, and
 * Googlebot (which crawls from the US) does not read the EU-only cards and
 * pots as sold out.
 */
export function defaultMarketVariants<
  V extends {availableForSale: boolean} & OutOfReach,
>(variants: readonly V[]): V[] {
  return variants.map((variant) =>
    variant.outOfReach ? {...variant, availableForSale: true} : variant,
  );
}
