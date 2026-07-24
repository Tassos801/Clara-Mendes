import {redirect, useLoaderData} from 'react-router';
import {getPaginationVariables} from '@shopify/hydrogen';
import type {Route} from './+types/collections.$handle';
import {CollectionView} from './collections.all';
import type {
  CollectionLink,
  CollectionProductConnection,
  CollectionViewData,
} from './collections.all';
import {
  filterDemoCollections,
  filterDemoProducts,
  isDemoCollection,
} from '~/lib/catalogFilters';
import {
  buildCollectionProductFilters,
  extractFacetOptions,
  parseFacetSelection,
  type StorefrontFilterFacet,
} from '~/lib/catalogFacets';
import {
  getCollectionProductsSortInput,
  getCollectionSortValue,
} from '~/lib/collectionSort';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/productCardFragment';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {
      title: `Clara Mendes | ${data?.heading ?? 'Collection'}`,
    },
    data?.description
      ? {
          name: 'description',
          content: data.description,
        }
      : {},
  ];
};

export async function loader({context, params, request}: Route.LoaderArgs) {
  const handle = params.handle;

  if (!handle || handle === 'all' || isDemoCollection({handle})) {
    throw redirect('/collections/all');
  }

  const paginationVariables = getPaginationVariables(request, {
    pageBy: 24,
  });
  const searchParams = new URL(request.url).searchParams;
  const sort = getCollectionSortValue(searchParams);
  const productFilters = buildCollectionProductFilters(
    parseFacetSelection(searchParams),
  );

  const data = await context.storefront.query(COLLECTION_QUERY, {
    variables: {
      ...paginationVariables,
      ...getCollectionProductsSortInput(sort),
      filters: productFilters.length > 0 ? productFilters : null,
      handle,
    },
  });

  if (!data.collection) {
    throw new Response(`Collection ${handle} not found`, {status: 404});
  }

  if (isDemoCollection(data.collection)) {
    throw redirect('/collections/all');
  }

  const products = data.collection.products as CollectionProductConnection & {
    filters?: StorefrontFilterFacet[];
  };

  return {
    activeHandle: data.collection.handle,
    collections: filterDemoCollections(
      data.collections.nodes as CollectionLink[],
    ),
    description:
      data.collection.description ||
      'A focused Clara Mendes collection of original art and considered products.',
    facets: extractFacetOptions(products.filters),
    heading: data.collection.title,
    products: {
      ...products,
      nodes: filterDemoProducts(products.nodes),
    },
  } satisfies CollectionViewData;
}

export default function Collection() {
  const data = useLoaderData<typeof loader>();
  return <CollectionView data={data} />;
}

const COLLECTION_QUERY = `#graphql
  query Collection(
    $country: CountryCode
    $endCursor: String
    $filters: [ProductFilter!]
    $first: Int
    $handle: String!
    $language: LanguageCode
    $last: Int
    $reverse: Boolean
    $sortKey: ProductCollectionSortKeys
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(
        after: $endCursor
        before: $startCursor
        filters: $filters
        first: $first
        last: $last
        reverse: $reverse
        sortKey: $sortKey
      ) {
        filters {
          id
          label
          values {
            count
            label
          }
        }
        nodes {
          ...ClaraProductCard
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }
    collections(first: 24) {
      nodes {
        id
        handle
        title
        products(first: 4) {
          nodes {
            handle
            productType
            tags
            title
            vendor
          }
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;
