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
 * Query size for the dedicated availability lookup. The headroom covers a
 * future capsule addition AND the 12 extension products, which share the
 * `Clara Mendes Original` tag once published — without it, released
 * extensions could push prints off the end of the response and make them
 * read as unavailable.
 */
export const ORIGINAL_ART_QUERY_FIRST = ORIGINAL_ART_HANDLES.length + 25;

/**
 * Storefront `products(query:)` clause targeting the original prints.
 *
 * The catalog sync tags every print `Clara Mendes Original`, and tag is a
 * supported product search field. (Handle is not — Shopify silently ignores
 * unsupported fields and would return the entire catalog.) The resulting
 * product list is still keyed strictly by the expected catalog handles in
 * `buildOriginalArtProductMap`, so a mistagged product cannot leak in.
 */
export const ORIGINAL_ART_TAG = 'Clara Mendes Original';

export function buildOriginalArtQuery() {
  return `tag:"${ORIGINAL_ART_TAG}"`;
}

/**
 * Reduces Storefront API products to a handle-keyed map of live state.
 * A handle that is missing from the result was not returned by Shopify
 * (unpublished or deleted) and is the only case treated as unavailable.
 */
export function buildOriginalArtProductMap(
  products: Array<ClaraCardProduct | null | undefined>,
): OriginalArtProductMap {
  const expectedHandles = new Set(ORIGINAL_ART_HANDLES);
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
