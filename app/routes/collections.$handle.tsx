import {Link, redirect, useLoaderData} from 'react-router';
import {Analytics, getPaginationVariables} from '@shopify/hydrogen';
import type {Route} from './+types/collections.$handle';
import {
  buildCollectionAnalyticsProducts,
  CollectionView,
  SHOP_PRODUCT_TYPES,
} from './collections.all';
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
  buildGalleryTagQuery,
  galleryPagePath,
  getGalleryPage,
  listGalleryPages,
  type GalleryPage,
} from '~/lib/galleryPages';
import {
  filterDemoCollections,
  filterDemoProducts,
  isDemoCollection,
} from '~/lib/catalogFilters';
import {
  buildCollectionProductFilters,
  extractFacetOptions,
  normalizeSingleProductTypeSearch,
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
import {
  DELIVERY_EU_BUSINESS_DAYS,
  DISPATCH_WINDOW_BUSINESS_DAYS,
  RETURN_WINDOW_DAYS,
  STOREFRONT_ORIGIN,
} from '~/lib/storefrontBasics';

type CapsuleLoaderData = {
  kind: 'capsule';
  page: CapsulePage;
  products: ClaraCardProduct[];
  otherCapsules: Array<{slug: string; title: string; subtitle: string}>;
  seoUrl: string;
};

type GalleryLoaderData = {
  kind: 'gallery';
  page: GalleryPage;
  products: ClaraCardProduct[];
  relatedEdits: Array<{slug: string; title: string; subtitle: string}>;
  capsuleCards: Array<{slug: string; title: string; subtitle: string}>;
  seoUrl: string;
};

type ShopifyCollectionLoaderData = CollectionViewData & {
  kind?: undefined;
};

export const meta: Route.MetaFunction = ({data}) => {
  if (
    data &&
    'kind' in data &&
    (data.kind === 'capsule' || data.kind === 'gallery')
  ) {
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

  // Gallery slugs are storefront-only routes, so the stale-Shopify-collection
  // guard must not swallow them; they never reach the Shopify query below.
  if (
    !handle ||
    handle === 'all' ||
    (isDemoCollection({handle}) && !getGalleryPage(handle))
  ) {
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

  // The curated gallery edits render from the same capsule tags, filtered to
  // each page's hand-picked handle list — indexable "shop by" pages that need
  // no Shopify collection.
  const galleryPage = getGalleryPage(handle);
  if (galleryPage) {
    const data = await context.storefront.query(CAPSULE_PAGE_QUERY, {
      variables: {
        first: 15,
        query: buildGalleryTagQuery(galleryPage),
      },
    });

    const curated = galleryPage.handles;
    const products = filterDemoProducts(
      (data.products?.nodes ?? []) as ClaraCardProduct[],
    )
      .filter((product) => curated.includes(product.handle))
      .sort((a, b) => curated.indexOf(a.handle) - curated.indexOf(b.handle));

    return {
      kind: 'gallery',
      capsuleCards: listCapsulePages()
        .filter((capsule) => galleryPage.capsules.includes(capsule.slug))
        .map((capsule) => ({
          slug: capsule.slug,
          subtitle: capsule.subtitle,
          title: capsule.capsule.title,
        })),
      page: galleryPage,
      products,
      relatedEdits: listGalleryPages()
        .filter((other) => galleryPage.related.includes(other.slug))
        .map((other) => ({
          slug: other.slug,
          subtitle: other.subtitle,
          title: other.title,
        })),
      seoUrl: getCanonicalUrl(request, galleryPagePath(galleryPage.slug)),
    } satisfies GalleryLoaderData;
  }

  const paginationVariables = getPaginationVariables(request, {
    pageBy: 24,
  });
  const searchParams = new URL(request.url).searchParams;
  const sort = getCollectionSortValue(searchParams);
  const facetSelection = parseFacetSelection(searchParams);
  const normalizedProductTypes = normalizeSingleProductTypeSearch(
    searchParams,
    SHOP_PRODUCT_TYPES,
  );

  if (normalizedProductTypes) {
    const queryString = normalizedProductTypes.toString();
    throw redirect(
      `/collections/${handle}${queryString ? `?${queryString}` : ''}`,
    );
  }

  const productFilters = buildCollectionProductFilters(facetSelection);

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
  const facets = extractFacetOptions(products.filters);
  facets.productTypes = facets.productTypes.filter((option) =>
    SHOP_PRODUCT_TYPES.some((productType) => productType === option.label),
  );

  return {
    activeHandle: data.collection.handle,
    activeId: data.collection.id,
    collections: filterDemoCollections(
      data.collections.nodes as CollectionLink[],
    ),
    description:
      data.collection.description ||
      'A focused Clara Mendes collection of original art and considered products.',
    facets,
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
  if ('kind' in data && data.kind === 'gallery') {
    return <GalleryLandingView data={data} />;
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
      <Analytics.CollectionView
        data={{
          collection: {
            handle: page.slug,
            id: `capsule:${page.slug}`,
          },
        }}
        customData={{products: buildCollectionAnalyticsProducts(products)}}
      />
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

function GalleryLandingView({data}: {data: GalleryLoaderData}) {
  const {page, products, relatedEdits, capsuleCards, seoUrl} = data;
  const shopUrl = new URL('/collections/all', seoUrl).toString();

  return (
    <div className="collection-page capsule-page" data-chapter={page.chapter}>
      <Analytics.CollectionView
        data={{
          collection: {
            handle: page.slug,
            id: `gallery:${page.slug}`,
          },
        }}
        customData={{products: buildCollectionAnalyticsProducts(products)}}
      />
      <StructuredData
        data={[
          collectionSchema({
            description: page.metaDescription,
            products,
            title: page.title,
            url: seoUrl,
          }),
          breadcrumbSchema({
            items: [
              {name: 'Shop', url: shopUrl},
              {name: page.title, url: seoUrl},
            ],
          }),
        ]}
      />

      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/collections/all">Shop</Link>
        <span aria-hidden="true">›</span>
        <span>{page.title}</span>
      </nav>

      <header className="gallery-hero">
        <div className="gallery-hero-copy">
          <p className="eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className="capsule-subtitle">{page.subtitle}</p>
          <p className="gallery-lead">{page.editorial[0]}</p>
        </div>
        <figure className="gallery-hero-media">
          <img
            alt={page.hero.alt}
            fetchPriority="high"
            height="1200"
            src={page.hero.src}
            width="1600"
          />
        </figure>
      </header>

      <div className="gallery-editorial">
        <div className="gallery-editorial-copy">
          <p>{page.editorial[1]}</p>
          <p>{page.editorial[2]}</p>
        </div>
        <aside className="gallery-facts" aria-label="Print essentials">
          <p className="eyebrow">Every print</p>
          <dl>
            <div>
              <dt>Paper</dt>
              <dd>200gsm archival matte</dd>
            </div>
            <div>
              <dt>Inks</dt>
              <dd>Giclée pigment</dd>
            </div>
            <div>
              <dt>Sizes</dt>
              <dd>8 × 10 · 16 × 20 · 20 × 24 in</dd>
            </div>
            <div>
              <dt>Dispatch</dt>
              <dd>{DISPATCH_WINDOW_BUSINESS_DAYS} business days</dd>
            </div>
            <div>
              <dt>EU delivery</dt>
              <dd>{DELIVERY_EU_BUSINESS_DAYS} days after dispatch</dd>
            </div>
            <div>
              <dt>Returns</dt>
              <dd>{RETURN_WINDOW_DAYS} days</dd>
            </div>
          </dl>
        </aside>
      </div>

      <section className="capsule-products" aria-label={`${page.title} prints`}>
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
            These prints are briefly unavailable.{' '}
            <Link className="text-link" to="/collections/all">
              Browse all available prints
            </Link>
          </p>
        ) : null}
      </section>

      {capsuleCards.length > 0 ? (
        <section className="capsule-others" aria-label="Capsules in this edit">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">The capsules behind this edit</p>
              <h2>Explore the full trios</h2>
            </div>
            <Link className="text-link" to="/collections/all">
              Browse all prints
            </Link>
          </div>
          <div className="capsule-others-grid">
            {capsuleCards.map((capsule) => (
              <Link
                className="capsule-other-card"
                key={capsule.slug}
                to={capsulePagePath(capsule.slug)}
                prefetch="intent"
              >
                <p className="eyebrow">Art capsule</p>
                <h3>{capsule.title}</h3>
                <p>{capsule.subtitle}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {relatedEdits.length > 0 ? (
        <section className="capsule-others" aria-label="Related edits">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Keep browsing</p>
              <h2>Related edits</h2>
            </div>
          </div>
          <div className="capsule-others-grid">
            {relatedEdits.map((edit) => (
              <Link
                className="capsule-other-card"
                key={edit.slug}
                to={galleryPagePath(edit.slug)}
                prefetch="intent"
              >
                <p className="eyebrow">Curated edit</p>
                <h3>{edit.title}</h3>
                <p>{edit.subtitle}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <style suppressHydrationWarning>{capsulePageCss + galleryPageCss}</style>
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

const galleryPageCss = `
.gallery-hero {
  align-items: center;
  display: grid;
  gap: clamp(28px, 4.5vw, 64px);
  grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  padding: clamp(26px, 4vw, 52px) 0 clamp(10px, 2vw, 22px);
}

.gallery-hero-copy h1 {
  font-family: var(--serif);
  font-size: clamp(2.6rem, 5.4vw, 4.2rem);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 1.02;
  margin: 10px 0 0;
}

.gallery-hero-copy .capsule-subtitle {
  color: var(--color-muted);
  font-size: 1.02rem;
  margin: 14px 0 0;
}

.gallery-lead {
  border-top: 1px solid rgba(38, 35, 31, 0.14);
  font-size: 0.98rem;
  line-height: 1.7;
  margin: 22px 0 0;
  padding-top: 22px;
}

.gallery-hero-media {
  margin: 0;
}

.gallery-hero-media img {
  aspect-ratio: 4 / 3;
  border: 1px solid rgba(38, 35, 31, 0.14);
  border-radius: 10px;
  display: block;
  height: auto;
  object-fit: cover;
  width: 100%;
}

.gallery-editorial {
  border-top: 1px solid rgba(38, 35, 31, 0.12);
  display: grid;
  gap: clamp(26px, 4vw, 58px);
  grid-template-columns: minmax(0, 7fr) minmax(0, 4fr);
  margin-top: clamp(22px, 3vw, 40px);
  padding-top: clamp(22px, 3vw, 40px);
}

.gallery-editorial-copy {
  max-width: 640px;
}

.gallery-editorial-copy p {
  line-height: 1.75;
  margin: 0 0 1.1em;
}

.gallery-editorial-copy p:last-child {
  margin-bottom: 0;
}

.gallery-facts {
  align-self: start;
  border: 1px solid rgba(38, 35, 31, 0.14);
  padding: 22px 24px;
}

.gallery-facts dl {
  display: grid;
  gap: 12px;
  margin: 14px 0 0;
}

.gallery-facts dl div {
  display: grid;
  gap: 2px;
}

.gallery-facts dt {
  color: var(--color-muted);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.gallery-facts dd {
  font-size: 0.92rem;
  margin: 0;
}

@media (max-width: 880px) {
  .gallery-hero,
  .gallery-editorial {
    grid-template-columns: 1fr;
  }

  .gallery-hero {
    gap: 24px;
  }

  .gallery-hero-media {
    order: -1;
  }
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
