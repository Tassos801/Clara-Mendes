import type {Route} from './+types/api.recently-viewed';
import {filterDemoProducts} from '~/lib/catalogFilters';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/productCardFragment';
import {recentlyViewedProductIds} from '~/lib/recentlyViewed';

/** Local history is a list of identities, never authority to list a product. */
export async function loader({
  request,
  context: {storefront},
}: Route.LoaderArgs) {
  const ids = recentlyViewedProductIds(
    new URL(request.url).searchParams.getAll('id'),
  );
  if (!ids.length)
    return Response.json(
      {products: []},
      {headers: {'Cache-Control': 'no-store'}},
    );
  const result = await storefront.query(RECENTLY_VIEWED_QUERY, {
    variables: {
      ids,
      country: storefront.i18n.country,
      language: storefront.i18n.language,
    },
    cache: storefront.CacheNone(),
  });
  const products = filterDemoProducts(
    result.nodes.filter(
      (node): node is NonNullable<typeof node> & {__typename: 'Product'} =>
        node?.__typename === 'Product',
    ),
  );
  return Response.json({products}, {headers: {'Cache-Control': 'no-store'}});
}

const RECENTLY_VIEWED_QUERY = `#graphql
  query RecentlyViewedProducts($ids: [ID!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    nodes(ids: $ids) {
      __typename
      ... on Product { ...ClaraProductCard }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;
