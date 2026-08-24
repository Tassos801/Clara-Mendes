import type {Route} from './+types/api.cart-recommendations';
import type {ClaraCardProduct} from '~/components/ClaraProductCard';
import {filterDemoProducts} from '~/lib/catalogFilters';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/productCardFragment';

const MAX_RECOMMENDATIONS = 4;
const MAX_SEED_PRODUCTS = 2;

/**
 * Resource route consumed by the cart drawer. Receives the product ids
 * currently in the cart and returns purchasable, on-theme products to
 * recommend alongside them. Shopify's related-product suggestions come
 * first; best sellers fill any remaining slots.
 */
export async function loader({context, request}: Route.LoaderArgs) {
  const {storefront} = context;
  const url = new URL(request.url);
  const cartProductIds = (url.searchParams.get('productIds') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.startsWith('gid://shopify/Product/'));

  const excludedIds = new Set(cartProductIds);
  const recommendations: ClaraCardProduct[] = [];

  const addCandidates = (candidates: ClaraCardProduct[]) => {
    for (const product of filterDemoProducts(candidates)) {
      if (recommendations.length >= MAX_RECOMMENDATIONS) return;
      if (excludedIds.has(product.id)) continue;
      const variant = product.cardVariant?.nodes?.[0];
      if (!variant || variant.availableForSale === false) continue;
      excludedIds.add(product.id);
      recommendations.push(product);
    }
  };

  const relatedResults = await Promise.all(
    cartProductIds.slice(0, MAX_SEED_PRODUCTS).map((productId) =>
      storefront
        .query(CART_RECOMMENDATIONS_QUERY, {
          cache: storefront.CacheLong(),
          variables: {productId},
        })
        .catch((error) => {
          console.warn('Unable to load product recommendations.', error);
          return null;
        }),
    ),
  );

  // Round-robin across each cart item's related products so one item
  // does not crowd out suggestions for the others.
  const relatedLists = relatedResults.map(
    (result) => (result?.productRecommendations ?? []) as ClaraCardProduct[],
  );
  const longestList = Math.max(0, ...relatedLists.map((list) => list.length));
  for (let index = 0; index < longestList; index++) {
    addCandidates(
      relatedLists
        .map((list) => list[index])
        .filter((product): product is ClaraCardProduct => Boolean(product)),
    );
  }

  if (recommendations.length < MAX_RECOMMENDATIONS) {
    const fallback = await storefront
      .query(CART_RECOMMENDATIONS_FALLBACK_QUERY, {
        cache: storefront.CacheLong(),
      })
      .catch((error) => {
        console.warn('Unable to load fallback recommendations.', error);
        return null;
      });
    addCandidates((fallback?.products?.nodes ?? []) as ClaraCardProduct[]);
  }

  return {products: recommendations};
}

const CART_RECOMMENDATIONS_QUERY = `#graphql
  query CartRecommendations(
    $country: CountryCode
    $language: LanguageCode
    $productId: ID!
  ) @inContext(country: $country, language: $language) {
    productRecommendations(productId: $productId, intent: RELATED) {
      ...ClaraProductCard
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

const CART_RECOMMENDATIONS_FALLBACK_QUERY = `#graphql
  query CartRecommendationsFallback(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: 12, sortKey: BEST_SELLING) {
      nodes {
        ...ClaraProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;
