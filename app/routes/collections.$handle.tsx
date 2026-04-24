import {redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/collections.$handle';
import {CollectionView} from './collections.all';
import type {CollectionLink, CollectionViewData} from './collections.all';
import type {ClaraCardProduct} from '~/components/ClaraProductCard';
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

export async function loader({context, params}: Route.LoaderArgs) {
  const handle = params.handle;

  if (!handle || handle === 'all' || isDemoCollection({handle})) {
    throw redirect('/collections/all');
  }

  const data = await context.storefront.query(COLLECTION_QUERY, {
    variables: {
      first: 24,
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
    products: filterDemoProducts(
      data.collection.products.nodes as ClaraCardProduct[],
    ),
  } satisfies CollectionViewData;
}

export default function Collection() {
  const data = useLoaderData<typeof loader>();
  return <CollectionView data={data} />;
}

const COLLECTION_QUERY = `#graphql
  query Collection(
    $country: CountryCode
    $first: Int!
    $handle: String!
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(first: $first, sortKey: COLLECTION_DEFAULT) {
        nodes {
          ...ClaraProductCard
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
