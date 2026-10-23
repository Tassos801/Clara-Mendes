// Relative imports keep this module loadable by the plain-Node test runner.
import {HERO_TILES, type HeroTile} from '../content/brand.ts';
import {isDemoProduct} from './catalogFilters.ts';
import {deriveCardPricing, formatCardPriceLabel} from './productCardPricing.ts';

/**
 * One Storefront round trip for the six curiosity tiles' price chips, in
 * the buyer's market currency. Static so codegen types it; the six
 * handles arrive as variables (`homeTilePriceVariables`). The fragment
 * selects exactly what the listing gate (`isDemoProduct`) and the card
 * pricing (`deriveCardPricing`) read, nothing more.
 */
export const HOME_TILE_PRICES_QUERY = `#graphql
  query HomeTilePrices(
    $country: CountryCode
    $language: LanguageCode
    $tile0: String!
    $tile1: String!
    $tile2: String!
    $tile3: String!
    $tile4: String!
    $tile5: String!
  ) @inContext(country: $country, language: $language) {
    tile0: product(handle: $tile0) {
      ...HomeTilePrice
    }
    tile1: product(handle: $tile1) {
      ...HomeTilePrice
    }
    tile2: product(handle: $tile2) {
      ...HomeTilePrice
    }
    tile3: product(handle: $tile3) {
      ...HomeTilePrice
    }
    tile4: product(handle: $tile4) {
      ...HomeTilePrice
    }
    tile5: product(handle: $tile5) {
      ...HomeTilePrice
    }
  }
  fragment HomeTilePrice on Product {
    handle
    title
    vendor
    productType
    tags
    storefrontApproved: metafield(namespace: "custom", key: "storefront_approved") {
      type
      value
    }
    fulfillmentVerified: metafield(namespace: "custom", key: "fulfillment_verified") {
      type
      value
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    # Released-price sample: staged variants sit in Shopify at full price
    # with availableForSale=false, so the chip prices only what can be
    # bought (same sample as the product card fragment).
    sizeVariants: variants(first: 10) {
      nodes {
        availableForSale
        price {
          amount
          currencyCode
        }
      }
    }
  }
` as const;

export type HomeTileKey =
  'tile0' | 'tile1' | 'tile2' | 'tile3' | 'tile4' | 'tile5';

const TILE_KEYS: readonly HomeTileKey[] = [
  'tile0',
  'tile1',
  'tile2',
  'tile3',
  'tile4',
  'tile5',
];

type Money = {amount: string; currencyCode: string};
type Approval = {type?: string | null; value?: string | null};

export type HomeTilePriceProduct = {
  handle?: string | null;
  title?: string | null;
  vendor?: string | null;
  productType?: string | null;
  tags?: string[] | null;
  storefrontApproved?: Approval | null;
  fulfillmentVerified?: Approval | null;
  priceRange?: {minVariantPrice?: Money | null} | null;
  sizeVariants?: {
    nodes?: Array<{
      availableForSale?: boolean;
      price?: Money | null;
    } | null> | null;
  } | null;
};

export type HomeTilePricesData = Partial<
  Record<HomeTileKey, HomeTilePriceProduct | null>
>;

/** Tile `href` → price label ("From €26.99", "€39.99"). */
export type HomeTilePrices = Readonly<Record<string, string>>;

/** The query's handle variables, one per tile in grid order. */
export function homeTilePriceVariables(
  tiles: readonly HeroTile[] = HERO_TILES,
): Record<HomeTileKey, string> {
  return {
    tile0: tiles[0].priceHandle,
    tile1: tiles[1].priceHandle,
    tile2: tiles[2].priceHandle,
    tile3: tiles[3].priceHandle,
    tile4: tiles[4].priceHandle,
    tile5: tiles[5].priceHandle,
  };
}

/**
 * Price labels keyed by tile `href`. A tile gets no chip when its product
 * is missing (unpublished, renamed), fails the listing gate every other
 * surface applies, or has nothing purchasable in the sample: without that
 * last check `deriveCardPricing` would fall back to `priceRange` and price
 * a sold-out or still-staged product.
 */
export function tilePriceLabels(
  data: HomeTilePricesData | null | undefined,
  tiles: readonly HeroTile[] = HERO_TILES,
): HomeTilePrices {
  const labels: Record<string, string> = {};
  TILE_KEYS.forEach((key, index) => {
    const tile = tiles[index];
    const product = data?.[key];
    if (!tile || !product || isDemoProduct(product)) return;
    const sample = product.sizeVariants?.nodes ?? [];
    if (!sample.some((variant) => variant?.availableForSale === true)) return;
    const label = formatCardPriceLabel(deriveCardPricing(product));
    if (label) labels[tile.href] = label;
  });
  return Object.freeze(labels);
}
