import type {Storefront} from '@shopify/hydrogen';
import {
  markNotShippedTo,
  markOutOfReachVariant,
  markOutOfReachVariants,
  needsVariantReach,
  reachCheckIds,
  type DeliveryCountryChoice,
  type NotShippedTo,
  type ReachProduct,
} from './deliveryReach.ts';
import {
  AVAILABLE_MARKET_COUNTRIES_QUERY,
  DEFAULT_MARKET_COUNTRY,
  marketCountryName,
} from './markets.ts';

// `nodes(ids:)` accepts at most 250 IDs; listing pages hold at most 100.
const MAX_REACH_IDS = 250;

/**
 * One default-market read per listing: products the buyer cannot buy are
 * re-read in Cyprus, and those on sale there carry `notShippedTo` so their
 * card says it doesn't ship to the buyer instead of "Sold out". A buyer in
 * the default market, or a page where everything is buyable, costs nothing.
 * On a failed read the cards keep their sold-out state.
 */
export async function withDeliveryReach<T extends ReachProduct>(
  storefront: Storefront,
  products: T[],
): Promise<Array<T & NotShippedTo>> {
  const buyerCountry = storefront.i18n.country;
  const ids = reachCheckIds(buyerCountry, products).slice(0, MAX_REACH_IDS);
  if (!ids.length) return products;

  try {
    const data = await storefront.query(DEFAULT_MARKET_PRODUCTS_QUERY, {
      variables: {country: DEFAULT_MARKET_COUNTRY, ids},
    });
    const sellable = new Set(
      data.nodes.flatMap((node) =>
        node?.__typename === 'Product' && node.availableForSale
          ? [node.id]
          : [],
      ),
    );
    return markNotShippedTo(products, sellable, buyerCountry);
  } catch (error) {
    console.warn('Unable to read default-market availability.', error);
    return products;
  }
}

type ReachVariant = {availableForSale: boolean; id: string};

/**
 * The product page's variants with `outOfReach` set on each one the buyer
 * cannot buy but the default market can, so the page says it doesn't ship
 * to the buyer's country instead of "Sold out".
 */
export async function withVariantReach<
  V extends ReachVariant,
  P extends {
    handle: string;
    selectedOrFirstAvailableVariant?: V | null;
    variants: {nodes: V[]};
  },
>(storefront: Storefront, product: P): Promise<P> {
  if (!needsVariantReach(storefront.i18n.country, product.variants.nodes)) {
    return product;
  }

  try {
    const data = await storefront.query(DEFAULT_MARKET_VARIANTS_QUERY, {
      variables: {country: DEFAULT_MARKET_COUNTRY, handle: product.handle},
    });
    const available = new Set(
      (data.product?.variants.nodes ?? []).flatMap((variant) =>
        variant.availableForSale ? [variant.id] : [],
      ),
    );
    if (!available.size) return product;
    const selected = product.selectedOrFirstAvailableVariant;
    return {
      ...product,
      selectedOrFirstAvailableVariant: selected
        ? markOutOfReachVariant(selected, available)
        : selected,
      variants: {
        ...product.variants,
        nodes: markOutOfReachVariants(product.variants.nodes, available),
      },
    };
  } catch (error) {
    console.warn('Unable to read default-market variant availability.', error);
    return product;
  }
}

/**
 * The countries checkout accepts, for the "deliver elsewhere" picker. The
 * locale action validates against the same list, so the picker never
 * offers a country it would refuse (the UK resolves but is in no market).
 */
export async function deliveryCountryChoices(
  storefront: Storefront,
): Promise<DeliveryCountryChoice[] | null> {
  try {
    const data = await storefront.query(AVAILABLE_MARKET_COUNTRIES_QUERY, {
      cache: storefront.CacheLong(),
    });
    return data.localization.availableCountries
      .flatMap(({isoCode}) => {
        const name = marketCountryName(isoCode);
        return name ? [{code: isoCode, name}] : [];
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'en'));
  } catch (error) {
    console.warn('Unable to load delivery countries.', error);
    return null;
  }
}

const DEFAULT_MARKET_PRODUCTS_QUERY = `#graphql
  query DefaultMarketProductAvailability(
    $country: CountryCode
    $ids: [ID!]!
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    nodes(ids: $ids) {
      __typename
      ... on Product {
        id
        availableForSale
      }
    }
  }
` as const;

const DEFAULT_MARKET_VARIANTS_QUERY = `#graphql
  query DefaultMarketVariantAvailability(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      variants(first: 100) {
        nodes {
          id
          availableForSale
        }
      }
    }
  }
` as const;
