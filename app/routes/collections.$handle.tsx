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
    pageBy: 60,
  });

  const data = await context.storefront.query(COLLECTION_QUERY, {
    variables: {
      ...paginationVariables,
      handle,
    },
  });

  if (!data.collection) {
    throw new Response(`Collection ${handle} not found`, {status: 404});
  }

  if (isDemoCollection(data.collection)) {
    throw redirect('/collections/all');
  }

  return {
    activeHandle: data.collection.handle,
    collections: filterDemoCollections(
      data.collections.nodes as CollectionLink[],
    ),
    description:
      data.collection.description ||
      'A focused edit of objects selected for texture, utility, and atmosphere.',
    heading: data.collection.title,
    products: {
      ...(data.collection.products as CollectionProductConnection),
      nodes: filterDemoProducts(
        (data.collection.products as CollectionProductConnection).nodes,
      ),
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
    $first: Int
    $handle: String!
    $language: LanguageCode
    $last: Int
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
        first: $first
        last: $last
        sortKey: COLLECTION_DEFAULT
      ) {
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
    collections(first: 12) {
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
