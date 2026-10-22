// Relative imports keep this module loadable by the plain-Node test runner,
// which cannot resolve the Vite "~" alias.
import artCatalog from '../../data/original-art-catalog.json' with {type: 'json'};
import type {ClaraCardProduct} from '../components/ClaraProductCard';
import {isStoreThemeProduct} from './catalogFilters.ts';
import {deriveCardPricing, formatCardPrice} from './productCardPricing.ts';

type MoneyAmount = {
  amount: string;
  currencyCode: string;
};

export type OriginalArtLiveProduct = {
  availableForSale: boolean;
  handle: string;
  /** True when the print sells at more than one released price. */
  hasPriceRange: boolean;
  image?: {altText?: string | null; url: string} | null;
  /** Lowest released price — the "From" floor, never a staged variant's. */
  price?: MoneyAmount | null;
  url: string;
};

/** Live Storefront API state for each expected original-art handle. */
export type OriginalArtProductMap = Record<string, OriginalArtLiveProduct>;

/**
 * The authoritative list of expected original prints. Availability decisions
 * must always be made against this full set — never against a limited
 * best-selling or paginated slice of the store catalog.
 */
export const ORIGINAL_ART_HANDLES: string[] = artCatalog.map(
  (item) => item.handle,
);

/**
 * Reduces Storefront API products to a handle-keyed map of live state.
 * A handle that is missing from the result was not returned by Shopify
 * (unpublished or deleted) and is the only case treated as unavailable.
 */
export function buildOriginalArtProductMap(
  products: Array<ClaraCardProduct | null | undefined>,
  expected: readonly string[] = ORIGINAL_ART_HANDLES,
): OriginalArtProductMap {
  const expectedHandles = new Set(expected.map((handle) => handle.toLowerCase()));
  const map: OriginalArtProductMap = {};

  for (const product of products) {
    const handle = product?.handle?.toLowerCase();
    if (!product || !handle || !expectedHandles.has(handle)) continue;
    if (!isStoreThemeProduct(product)) continue;

    const variant =
      product.cardVariant?.nodes?.[0] ?? product.variants?.nodes?.[0];
    const pricing = deriveCardPricing(product);

    map[handle] = {
      availableForSale: variant?.availableForSale ?? true,
      handle,
      hasPriceRange: pricing.hasRange,
      image: product.featuredImage ?? null,
      price: pricing.price ?? variant?.price ?? null,
      url: `/products/${handle}`,
    };
  }

  return map;
}

/** Formats a Storefront price exactly like the product page does. */
export function formatOriginalArtPrice(price?: MoneyAmount | null) {
  return formatCardPrice(price);
}
