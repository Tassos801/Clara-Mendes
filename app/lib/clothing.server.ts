import type {Storefront} from '@shopify/hydrogen';
import type {ClaraCardProduct} from '../components/ClaraProductCard';
import {filterDemoProducts} from './catalogFilters';
import {CLOTHING_PRODUCT_QUERY, isClothingProduct} from './clothing';
import {PRODUCT_CARD_FRAGMENT} from './productCardFragment';

export type ClothingProduct = ClaraCardProduct & {
  options: Array<{
    name: string;
    optionValues: Array<{
      name: string;
      swatch?: {color?: string | null} | null;
      firstSelectableVariant?: {
        id: string;
        availableForSale: boolean;
        image?: {
          url: string;
          altText?: string | null;
          width?: number | null;
          height?: number | null;
        } | null;
        price: {amount: string; currencyCode: string};
        selectedOptions: Array<{name: string; value: string}>;
      } | null;
    }>;
  }>;
  collections: {
    nodes: Array<{
      handle: string;
      title: string;
      clothingKind?: {type: string; value: string} | null;
    }>;
  };
};

type ClothingQueryResult = {
  products: {
    nodes: ClothingProduct[];
    pageInfo: {hasNextPage: boolean; endCursor?: string | null};
  };
};

/** Fetch every page, then filter before computing categories or capsules.
 * Shopify's short cache is locale-aware; unpublished products never enter this query.
 * Only the selected display page is serialized by the route loader.
 */
export async function loadClothingProducts(
  storefront: Storefront,
): Promise<ClothingProduct[]> {
  const products = new Map<string, ClothingProduct>();
  const visited = new Set<string>();
  let after: string | null = null;
  do {
    const data: ClothingQueryResult = await storefront.query(CLOTHING_QUERY, {
      variables: {
        query: CLOTHING_PRODUCT_QUERY,
        after,
        country: storefront.i18n.country,
        language: storefront.i18n.language,
      },
      cache: storefront.CacheShort(),
    });
    for (const product of filterDemoProducts(data.products.nodes).filter(
      isClothingProduct,
    )) {
      products.set(product.id, product);
    }
    if (!data.products.pageInfo.hasNextPage) break;
    const cursor = data.products.pageInfo.endCursor;
    if (!cursor || visited.has(cursor))
      throw new Error('Clothing catalog pagination did not advance');
    visited.add(cursor);
    after = cursor;
  } while (after);
  return [...products.values()];
}

const CLOTHING_QUERY = `#graphql
  query ClothingCatalog($query: String!, $after: String, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    products(first: 50, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
      nodes {
        ...ClaraProductCard
        collections(first: 30) { nodes { handle title clothingKind: metafield(namespace: "custom", key: "collection_kind") { type value } } }
        options {
          name
          optionValues {
            name
            swatch { color }
            firstSelectableVariant {
              id availableForSale
              image { url altText width height }
              price { amount currencyCode }
              selectedOptions { name value }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;
