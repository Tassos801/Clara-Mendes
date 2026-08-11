import {Link, redirect, useLoaderData} from 'react-router';
import {getPaginationVariables} from '@shopify/hydrogen';
import type {Route} from './+types/collections.$handle';
import {CollectionView} from './collections.all';
import type {
  CollectionLink,
  CollectionProductConnection,
  CollectionViewData,
} from './collections.all';
import {
  ClaraProductCard,
  type ClaraCardProduct,
} from '~/components/ClaraProductCard';
import {StructuredData} from '~/components/StructuredData';
import {buildCapsuleTagQuery} from '~/lib/capsules';
import {
  capsulePagePath,
  getCapsulePage,
  listCapsulePages,
  type CapsulePage,
} from '~/lib/capsulePages';
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
import {
  breadcrumbSchema,
  buildSeoMeta,
  collectionSchema,
  getCanonicalUrl,
} from '~/lib/seo';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';

type CapsuleLoaderData = {
  kind: 'capsule';
  page: CapsulePage;
  products: ClaraCardProduct[];
  otherCapsules: Array<{slug: string; title: string; subtitle: string}>;
  seoUrl: string;
};

type ShopifyCollectionLoaderData = CollectionViewData & {
  kind?: undefined;
};

export const meta: Route.MetaFunction = ({data}) => {
  if (data && 'kind' in data && data.kind === 'capsule') {
    return buildSeoMeta({
      description: data.page.metaDescription,
      image: data.products[0]?.featuredImage?.url,
      title: data.page.seoTitle,
      url: data.seoUrl,
    });
  }

  const collection = data as ShopifyCollectionLoaderData | undefined;
  return buildSeoMeta({
    description:
      collection?.description ??
      'A focused Clara Mendes collection of original art and considered products.',
    title: collection?.heading ?? 'Collection',
    url: collection?.seoUrl ?? `${STOREFRONT_ORIGIN}/collections/all`,
  });
};

export async function loader({context, params, request}: Route.LoaderArgs) {
  const handle = params.handle;

  if (!handle || handle === 'all' || isDemoCollection({handle})) {
    throw redirect('/collections/all');
  }

  // The five capsule pages render from the sync-guaranteed capsule tags, so
  // they exist (and stay indexable) independently of any Shopify collection.
  const page = getCapsulePage(handle);
  if (page) {
    const data = await context.storefront.query(CAPSULE_PAGE_QUERY, {
      variables: {
        first: 6,
        query: buildCapsuleTagQuery(page.capsule),
      },
    });

    const catalogOrder = page.capsule.handles;
    const products = filterDemoProducts(
      (data.products?.nodes ?? []) as ClaraCardProduct[],
    ).sort(
      (a, b) => catalogOrder.indexOf(a.handle) - catalogOrder.indexOf(b.handle),
    );

    return {
      kind: 'capsule',
      otherCapsules: listCapsulePages()
        .filter((other) => other.slug !== page.slug)
        .map((other) => ({
          slug: other.slug,
          subtitle: other.subtitle,
          title: other.capsule.title,
        })),
      page,
      products,
      seoUrl: getCanonicalUrl(request, capsulePagePath(page.slug)),
    } satisfies CapsuleLoaderData;
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
    seoUrl: getCanonicalUrl(request, `/collections/${data.collection.handle}`),
  } satisfies CollectionViewData;
}

export default function Collection() {
  const data = useLoaderData<typeof loader>();
  if ('kind' in data && data.kind === 'capsule') {
    return <CapsuleLandingView data={data} />;
  }
  return <CollectionView data={data as ShopifyCollectionLoaderData} />;
}

/** Cinematic palette per capsule, matching each capsule's temperature. */
const CAPSULE_CHAPTER: Record<string, string> = {
  'quiet-form': 'linen',
  'patina-blue': 'ink',
  'neo-deco': 'umber',
  'midnight-garden': 'ink',
  'sunlit-mosaic': 'clay',
};

function CapsuleLandingView({data}: {data: CapsuleLoaderData}) {
  const {page, products, otherCapsules, seoUrl} = data;
  const shopUrl = new URL('/collections/all', seoUrl).toString();

  return (
    <div
      className="collection-page capsule-page"
      data-chapter={CAPSULE_CHAPTER[page.slug] ?? 'linen'}
    >
      <StructuredData
        data={[
          collectionSchema({
            description: page.metaDescription,
            products,
            title: `${page.capsule.title} Art Prints`,
            url: seoUrl,
          }),
          breadcrumbSchema({
            items: [
              {name: 'Shop', url: shopUrl},
              {name: page.capsule.title, url: seoUrl},
            ],
          }),
        ]}
      />

      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/collections/all">Shop</Link>
        <span aria-hidden="true">›</span>
        <span>{page.capsule.title}</span>
      </nav>

      <header className="capsule-hero">
        <p className="eyebrow">Original art prints — a capsule of three</p>
        <h1>{page.capsule.title}</h1>
        <p className="capsule-subtitle">{page.subtitle}</p>
      </header>

      <div className="capsule-editorial">
        {page.editorial.map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
      </div>

      <section
        className="capsule-products"
        aria-label={`${page.capsule.title} prints`}
      >
        <div className="product-grid compact-grid">
          {products.map((product, index) => (
            <ClaraProductCard
              key={product.id}
              product={product}
              loading={index === 0 ? 'eager' : 'lazy'}
              showStory
            />
          ))}
        </div>
        {products.length === 0 ? (
          <p className="capsule-empty">
            The {page.capsule.title} prints are briefly unavailable.{' '}
            <Link className="text-link" to="/collections/all">
              Browse all available prints
            </Link>
          </p>
        ) : null}
      </section>

      <section className="capsule-others" aria-label="More capsules">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Keep exploring</p>
            <h2>The other capsules</h2>
          </div>
          <Link className="text-link" to="/collections/all">
            Browse all prints
          </Link>
        </div>
        <div className="capsule-others-grid">
          {otherCapsules.map((other) => (
            <Link
              className="capsule-other-card"
              key={other.slug}
              to={capsulePagePath(other.slug)}
              prefetch="intent"
            >
              <p className="eyebrow">Art capsule</p>
              <h3>{other.title}</h3>
              <p>{other.subtitle}</p>
            </Link>
          ))}
        </div>
      </section>

      <style suppressHydrationWarning>{capsulePageCss}</style>
    </div>
  );
}

const capsulePageCss = `
.capsule-page {
  padding-top: calc(var(--header-height) + 22px);
}

.capsule-hero {
  max-width: 760px;
  padding: clamp(26px, 4vw, 48px) 0 0;
}

.capsule-hero h1 {
  font-family: var(--serif);
  font-size: clamp(2.6rem, 6vw, 4.4rem);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 1;
  margin: 0 0 14px;
}

.capsule-subtitle {
  color: var(--color-muted);
  font-size: 1.02rem;
  line-height: 1.6;
  margin: 0;
}

.capsule-editorial {
  display: grid;
  gap: 16px;
  margin: clamp(24px, 3.5vw, 40px) 0 clamp(34px, 5vw, 58px);
  max-width: 640px;
}

.capsule-editorial p {
  color: var(--color-ink);
  font-size: 1rem;
  line-height: 1.75;
  margin: 0;
}

.capsule-empty {
  color: var(--color-muted);
  margin: 18px 0 0;
}

.capsule-others {
  margin: clamp(48px, 7vw, 90px) 0 clamp(52px, 7vw, 96px);
}

.capsule-others-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  margin-top: 22px;
}

.capsule-other-card {
  border: 1px solid rgba(38, 35, 31, 0.14);
  display: grid;
  gap: 8px;
  padding: 20px;
  transition: border-color 180ms ease, transform 180ms ease;
}

.capsule-other-card:hover {
  border-color: var(--color-ink);
  transform: translateY(-2px);
}

.capsule-other-card h3 {
  font-family: var(--serif);
  font-size: 1.45rem;
  font-weight: 400;
  letter-spacing: -0.02em;
  margin: 0;
}

.capsule-other-card p:not(.eyebrow) {
  color: var(--color-muted);
  font-size: 0.9rem;
  line-height: 1.55;
  margin: 0;
}
`;

const CAPSULE_PAGE_QUERY = `#graphql
  query CapsulePage(
    $country: CountryCode
    $first: Int!
    $language: LanguageCode
    $query: String!
  ) @inContext(country: $country, language: $language) {
    products(first: $first, query: $query) {
      nodes {
        ...ClaraProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

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
