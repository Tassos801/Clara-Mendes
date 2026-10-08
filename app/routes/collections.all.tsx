import {useEffect, useRef, useState} from 'react';
import {
  Link,
  redirect,
  useLoaderData,
  useNavigate,
  useSearchParams,
} from 'react-router';
import {Analytics, getPaginationVariables, Pagination} from '@shopify/hydrogen';
import {ensurePaginatedData} from '~/lib/pagination';
import type {Route} from './+types/collections.all';
import {
  ClaraProductCard,
  type ClaraCardProduct,
} from '~/components/ClaraProductCard';
import {OriginalArtPreview} from '~/components/OriginalArtPreview';
import {StructuredData} from '~/components/StructuredData';
import {
  buildCapsuleTagQuery,
  getShopCapsuleBySlug,
  listShopCapsules,
  shopCapsuleDescription,
  shopCapsulePath,
} from '~/lib/capsules';
import {
  filterDemoCollections,
  filterDemoProducts,
  isOffThemeCollectionHandle,
  releasedExtensionProductTypes,
} from '~/lib/catalogFilters';
import {
  buildProductsSearchQuery,
  countActiveFacets,
  normalizeSingleProductTypeSearch,
  parseFacetSelection,
  type CatalogFacetOptions,
} from '~/lib/catalogFacets';
import {CatalogFilterPanel} from '~/components/CatalogFilterPanel';
import {
  COLLECTION_SORT_OPTIONS,
  getCollectionSortValue,
  getProductsSortInput,
} from '~/lib/collectionSort';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/productCardFragment';
import {buildSeoMeta, collectionSchema, getCanonicalUrl} from '~/lib/seo';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';
import type {CollectionHero} from '~/lib/collectionHeroes';
import {releasedPrintHandles} from '~/lib/printCatalog';
import {releasedCuratedProductTypes} from '~/lib/curatedProducts';
import {bookNookDeliveryPhrase} from '~/lib/bookNooks';
import {loadClothingProducts} from '~/lib/clothing.server';
import {
  clothingCategories,
  clothingCapsules,
  isClothingProductType,
  isClothingCategoryCollection,
  type ClothingCategoryCount,
  type ClothingCapsule,
} from '~/lib/clothing';

export type CollectionLink = {
  id: string;
  handle: string;
  products?: {
    nodes?: Array<{
      handle?: string | null;
      productType?: string | null;
      tags?: string[] | null;
      title?: string | null;
      vendor?: string | null;
    }>;
  };
  title: string;
};

/**
 * The prints plus the product type of every released catalog family, so
 * a family becomes filterable (and its `?type=` deep links valid) the day
 * its flag flips.
 */
export const SHOP_PRODUCT_TYPES: readonly string[] = [
  'Art Prints',
  ...releasedExtensionProductTypes(),
  ...releasedCuratedProductTypes(),
];

export type CollectionProductConnection = {
  nodes: ClaraCardProduct[];
  pageInfo: {
    endCursor?: string | null;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string | null;
  };
};

export type CollectionViewData = {
  clothingNavigation?: {
    categories: ClothingCategoryCount[];
    capsules: ClothingCapsule[];
  };
  clothingOnly?: boolean;
  activeCapsule?: string | null;
  activeHandle: string;
  activeId: string;
  collections: CollectionLink[];
  description?: string | null;
  facets: CatalogFacetOptions;
  heading: string;
  /** Collection-specific hero replacing the shared interior backdrop. */
  hero?: CollectionHero | null;
  products: CollectionProductConnection;
  seoUrl?: string;
  shareImage?: string | null;
};

export const meta: Route.MetaFunction = ({data}) => {
  const heading = data?.heading;
  const isCapsule = Boolean(data?.activeCapsule) && heading;

  return buildSeoMeta({
    description:
      data?.description ??
      'Original art and considered objects for a collected home, selected by Clara Mendes.',
    image: `${STOREFRONT_ORIGIN}${data?.shareImage || '/images/product-art/quiet-form/quiet-form-01.webp'}`,
    title: isCapsule
      ? `${heading} Capsule`
      : 'Shop Original Art & Considered Objects',
    // Other facets canonicalize to the unfiltered page. Launch capsules use
    // their landing pages; print-catalog collections keep their shop filter
    // URL because they have no separate landing page.
    url: data?.seoUrl ?? `${STOREFRONT_ORIGIN}/collections/all`,
  });
};

export async function loader({context, request}: Route.LoaderArgs) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 24,
  });
  const searchParams = new URL(request.url).searchParams;
  const sort = getCollectionSortValue(searchParams);
  const facetSelection = parseFacetSelection(searchParams);
  const capsule = getShopCapsuleBySlug(searchParams.get('capsule'));
  const clothing = await loadClothingProducts(context.storefront);
  const productTypes = [
    ...new Set([
      ...SHOP_PRODUCT_TYPES,
      ...clothing
        .map((product) => product.productType)
        .filter((type): type is string => Boolean(type)),
    ]),
  ];
  const isBookNooks =
    facetSelection.productTypes.length === 1 &&
    facetSelection.productTypes[0] === 'Book Nooks' &&
    SHOP_PRODUCT_TYPES.includes('Book Nooks');
  const normalizedProductTypes = normalizeSingleProductTypeSearch(
    searchParams,
    productTypes,
  );

  if (normalizedProductTypes) {
    const queryString = normalizedProductTypes.toString();
    throw redirect(`/collections/all${queryString ? `?${queryString}` : ''}`);
  }

  const searchQuery = [
    buildProductsSearchQuery(facetSelection),
    capsule ? buildCapsuleTagQuery(capsule) : null,
  ]
    .filter(Boolean)
    .join(' ');

  const data = await context.storefront.query(ALL_COLLECTION_QUERY, {
    variables: {
      ...paginationVariables,
      ...getProductsSortInput(sort),
      query: searchQuery || null,
    },
  });
  ensurePaginatedData(request, data);

  return {
    clothingNavigation: {
      categories: clothingCategories(clothing),
      capsules: clothingCapsules(clothing).filter(
        (capsule) => !isOffThemeCollectionHandle(capsule.handle),
      ),
    },
    activeCapsule: capsule?.slug ?? null,
    activeHandle: 'all',
    activeId: capsule ? `capsule:${capsule.slug}` : 'all',
    collections: filterDemoCollections(
      data.collections.nodes as CollectionLink[],
    ),
    description: capsule
      ? shopCapsuleDescription(capsule)
      : isBookNooks
        ? `Miniature worlds for your bookshelf. Explore DIY book nook kits curated by Clara Mendes, with delivery included ${bookNookDeliveryPhrase()}.`
        : releasedCuratedProductTypes().length > 0
          ? 'Original art and considered objects for a collected home, selected by Clara Mendes.'
          : releasedPrintHandles().length > 0
            ? 'Shop original Clara Mendes art prints, from quiet geometry to cinematic imagined worlds.'
            : 'Shop 15 original Clara Mendes art prints across five coordinated capsules in 8 × 10, 16 × 20, and 20 × 24 in.',
    facets: {
      productTypes: productTypes.map((label) => ({label})),
      vendors: [] as Array<{label: string}>,
    },
    heading: capsule ? capsule.title : isBookNooks ? 'Book Nooks' : 'Shop All',
    shareImage: capsule?.image ?? null,
    products: filterProductConnection(
      data.products as CollectionProductConnection,
    ),
    seoUrl: getCanonicalUrl(
      request,
      capsule ? shopCapsulePath(capsule.slug) : '/collections/all',
    ),
  } satisfies CollectionViewData;
}

export default function AllCollection() {
  const data = useLoaderData<typeof loader>();
  return <CollectionView data={data} />;
}

export function CollectionView({data}: {data: CollectionViewData}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const sort = getCollectionSortValue(searchParams);
  const facetSelection = parseFacetSelection(searchParams);
  const activeProductType =
    facetSelection.productTypes.length === 1
      ? facetSelection.productTypes[0]
      : '';
  const activeFacetCount = countActiveFacets({
    ...facetSelection,
    productTypes: [],
  });
  const [filtersOpen, setFiltersOpen] = useState(activeFacetCount > 0);
  const {ref: loadMoreRef, inView} = useInView();
  const activeCapsule = data.activeCapsule ?? null;
  const toolbarRef = useRef<HTMLDivElement>(null);
  const typeTabsRef = useRef<HTMLElement>(null);
  const filterToggleRef = useRef<HTMLButtonElement>(null);
  const [toolbarOutOfView, setToolbarOutOfView] = useState(false);

  // Phones scroll the category chips sideways; keep the active one in view
  // without moving the page.
  useEffect(() => {
    const tabs = typeTabsRef.current;
    const active = tabs?.querySelector<HTMLElement>('.cv-type-link.is-active');
    if (!tabs || !active || tabs.scrollWidth <= tabs.clientWidth) return;
    tabs.scrollLeft = Math.max(
      0,
      active.offsetLeft - (tabs.clientWidth - active.offsetWidth) / 2,
    );
  }, [activeProductType]);

  // Once the toolbar has scrolled away, a thumb-height "Filter & sort"
  // control brings it back (phones only; desktop keeps a sticky toolbar).
  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setToolbarOutOfView(
          !entry.isIntersecting && entry.boundingClientRect.top < 0,
        ),
      {threshold: 0},
    );
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);

  const returnToFilters = () => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    setFiltersOpen(true);
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const top =
      toolbar.getBoundingClientRect().top +
      window.scrollY -
      (parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--header-height',
        ),
      ) || 68);
    window.scrollTo({behavior: reduceMotion ? 'auto' : 'smooth', top});
    filterToggleRef.current?.focus({preventScroll: true});
  };

  // Capsule filtering lives in the URL (?capsule=slug) so selections are
  // shareable and survive sort, facet, and back/forward navigation. A real
  // Shopify collection with the same handle takes precedence when it exists.
  const namedCollections = data.collections.filter(
    (collection) => !isClothingCategoryCollection(collection),
  );
  const shadowedSlugs = new Set(namedCollections.map((c) => c.handle));
  const shadowedTitles = new Set(
    namedCollections.map((c) => c.title.trim().toLowerCase()),
  );
  const capsuleLinks = listShopCapsules().filter(
    (capsule) =>
      !shadowedSlugs.has(capsule.slug) &&
      !shadowedTitles.has(capsule.title.trim().toLowerCase()),
  );

  const capsuleSearch = (slug: string | null) => {
    const next = new URLSearchParams(searchParams);
    next.delete('cursor');
    next.delete('direction');
    if (slug) {
      next.set('capsule', slug);
    } else {
      next.delete('capsule');
    }
    const queryString = next.toString();
    return queryString ? `?${queryString}` : '';
  };

  const categorySearch = (productType: string | null) => {
    const next = new URLSearchParams(searchParams);
    next.delete('cursor');
    next.delete('direction');
    next.delete('type');
    if (productType) {
      next.set('type', productType);
      if (productType !== 'Art Prints') next.delete('capsule');
    }
    const queryString = next.toString();
    return queryString ? `?${queryString}` : '';
  };

  const collectionPath = (handle: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete('capsule');
    next.delete('cursor');
    next.delete('direction');
    next.delete('type');
    const queryString = next.toString();
    return `/collections/${handle}${queryString ? `?${queryString}` : ''}`;
  };

  const activeCollectionPath =
    data.activeHandle === 'all'
      ? `/collections/all${capsuleSearch(activeCapsule)}`
      : collectionPath(data.activeHandle);
  const productCategories = [
    {
      active: !activeProductType,
      label: data.clothingOnly ? 'All clothing' : 'All products',
      path: data.clothingOnly
        ? '/clothing'
        : `/collections/all${categorySearch(null)}`,
    },
    ...(data.clothingOnly
      ? (data.clothingNavigation?.categories ?? []).map((category) => ({
          active: false,
          label: category.label,
          path: `/clothing?category=${category.slug}#pieces`,
        }))
      : data.facets.productTypes
          .filter(
            (option) =>
              !isClothingProductType(option.label) ||
              activeProductType === option.label,
          )
          .map((option) => ({
            active: activeProductType === option.label,
            label: option.label,
            path: `/collections/all${categorySearch(option.label)}`,
          }))),
    ...(!data.clothingOnly && data.clothingNavigation?.categories.length
      ? [{active: false, label: 'Clothing', path: '/clothing'}]
      : []),
  ];

  const onSortChange = (value: string) => {
    void setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        // Reset pagination cursors so the new sort starts from page one
        next.delete('cursor');
        next.delete('direction');
        if (value === 'featured') {
          next.delete('sort');
        } else {
          next.set('sort', value);
        }
        return next;
      },
      {preventScrollReset: true},
    );
  };

  return (
    <div className="collection-page cv-root">
      <Analytics.CollectionView
        data={{
          collection: {
            handle: activeCapsule ?? data.activeHandle,
            id: data.activeId,
          },
        }}
        customData={{
          products: buildCollectionAnalyticsProducts(data.products.nodes),
        }}
      />
      <style suppressHydrationWarning>{collectionCss}</style>
      {data.clothingOnly ? (
        <nav className="cv-departments" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/clothing">Clothing</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{data.heading}</span>
        </nav>
      ) : null}
      {data.seoUrl ? (
        <StructuredData
          data={[
            collectionSchema({
              description: data.description ?? data.heading,
              products: data.products.nodes,
              title: data.heading,
              url: data.seoUrl,
            }),
          ]}
        />
      ) : null}

      <section
        className={`cv-hero${data.hero ? ' cv-hero--custom' : ''}`}
        aria-labelledby="cv-hero-title"
        style={
          data.hero
            ? ({
                '--cv-hero-image': `url(${data.hero.image})`,
                '--cv-hero-image-mobile': `url(${data.hero.imageMobile})`,
              } as React.CSSProperties)
            : undefined
        }
      >
        {data.hero ? (
          <span role="img" aria-label={data.hero.alt} className="sr-only" />
        ) : null}
        <div className="cv-hero-noise" />
        <div className="cv-hero-vignette" />

        <div className="cv-hero-inner">
          <p className="cv-eyebrow">
            {data.hero
              ? data.hero.eyebrow
              : data.clothingOnly
                ? 'Clara Mendes Clothing'
                : 'Original art & considered products'}
          </p>
          <h1 id="cv-hero-title" className="cv-title">
            <i>{splitTitle(data.heading).italic}</i>
            {splitTitle(data.heading).rest
              ? ' ' + splitTitle(data.heading).rest
              : ''}
          </h1>
          {data.hero?.subtitle ? (
            <p className="cv-hero-subtitle">{data.hero.subtitle}</p>
          ) : null}
        </div>
        <div className="cv-hero-rule" aria-hidden />
      </section>

      <div
        className="cv-toolbar"
        aria-label="Collection toolbar"
        ref={toolbarRef}
        role="region"
      >
        <div className="cv-browse-controls">
          <div className="cv-browse-group cv-browse-group--category">
            <span className="cv-browse-label" id="cv-category-label">
              Product
            </span>
            <nav
              aria-labelledby="cv-category-label"
              className="cv-type-tabs"
              ref={typeTabsRef}
            >
              {productCategories.map((category) => (
                <Link
                  aria-current={category.active ? 'page' : undefined}
                  className={`cv-type-link${
                    category.active ? ' is-active' : ''
                  }`}
                  key={category.label}
                  prefetch="intent"
                  to={category.path}
                >
                  {category.label}
                </Link>
              ))}
            </nav>
            <select
              aria-labelledby="cv-category-label"
              className="cv-category-select"
              value={
                productCategories.find((category) => category.active)?.path ??
                productCategories[0].path
              }
              onChange={(event) =>
                void navigate(event.target.value, {preventScrollReset: true})
              }
            >
              {productCategories.map((category) => (
                <option key={category.label} value={category.path}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div className="cv-browse-group cv-browse-group--collection">
            <label className="cv-browse-label" htmlFor="cv-collection-select">
              Collection
            </label>
            <select
              className="cv-collection-select"
              id="cv-collection-select"
              value={activeCollectionPath}
              onChange={(event) =>
                void navigate(event.target.value, {preventScrollReset: true})
              }
            >
              <option value={`/collections/all${capsuleSearch(null)}`}>
                All collections
              </option>
              {namedCollections.length > 0 ? (
                <optgroup label="Collections">
                  {namedCollections
                    .filter(
                      (collection) =>
                        !data.clothingOnly ||
                        data.clothingNavigation?.capsules.some(
                          (capsule) => capsule.handle === collection.handle,
                        ),
                    )
                    .map((collection) => (
                      <option
                        key={collection.id}
                        value={collectionPath(collection.handle)}
                      >
                        {collection.title}
                      </option>
                    ))}
                </optgroup>
              ) : null}
              {!data.clothingOnly && capsuleLinks.length > 0 ? (
                <optgroup label="Art capsules">
                  {capsuleLinks.map((capsule) => (
                    <option
                      key={capsule.slug}
                      value={`/collections/all${capsuleSearch(capsule.slug)}`}
                    >
                      {capsule.title}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </div>
        </div>
        <div className="cv-toolbar-actions">
          <button
            className={`cv-filter-toggle${
              filtersOpen || activeFacetCount > 0 ? ' is-active' : ''
            }`}
            type="button"
            aria-controls="cv-filter-panel"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
            ref={filterToggleRef}
          >
            Filters{activeFacetCount > 0 ? ` · ${activeFacetCount}` : ''}
          </button>
          <div className="cv-sort">
            <label className="cv-sort-label" htmlFor="cv-sort-select">
              Sort
            </label>
            <select
              id="cv-sort-select"
              className="cv-sort-select"
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
            >
              {COLLECTION_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <CatalogFilterPanel
        facets={data.facets}
        id="cv-filter-panel"
        open={filtersOpen}
        showProductTypes={false}
      />

      <button
        aria-hidden={toolbarOutOfView ? undefined : true}
        className={`cv-jump${toolbarOutOfView ? ' is-visible' : ''}`}
        onClick={returnToFilters}
        tabIndex={toolbarOutOfView ? 0 : -1}
        type="button"
      >
        <svg
          aria-hidden="true"
          fill="none"
          height="16"
          viewBox="0 0 16 16"
          width="16"
        >
          <path
            d="M2 4h12M4.5 8h7M7 12h2"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.4"
          />
        </svg>
        Filter &amp; sort
        {activeFacetCount > 0 ? (
          <span className="cv-jump-count">{activeFacetCount}</span>
        ) : null}
      </button>

      <Pagination connection={data.products}>
        {({
          nodes,
          isLoading,
          hasNextPage,
          nextPageUrl,
          state,
          PreviousLink,
          NextLink,
        }) => (
          <>
            <p className="cv-count">
              {nodes.length}
              {hasNextPage ? '+' : ''}{' '}
              {nodes.length === 1 && !hasNextPage ? 'product' : 'products'}
            </p>

            {nodes.length > 0 ? (
              <section className="cv-products" aria-label="Products">
                <PreviousLink className="cv-load cv-load--prev">
                  {isLoading ? 'Loading…' : 'Load previous'}
                </PreviousLink>
                <AutoLoadGrid
                  products={nodes}
                  inView={inView}
                  hasNextPage={hasNextPage}
                  nextPageUrl={nextPageUrl}
                  state={state}
                />
                <NextLink className="cv-load" ref={loadMoreRef}>
                  {isLoading ? 'Loading…' : 'Load more'}
                </NextLink>
              </section>
            ) : activeFacetCount > 0 || activeProductType ? (
              <section className="empty-state collection-empty">
                <p className="eyebrow">No matches</p>
                <h2>Nothing fits those filters yet.</h2>
                <p>
                  Try widening the price range or removing a filter to see more
                  of the edit.
                </p>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() =>
                    setSearchParams(
                      (params) => {
                        const next = new URLSearchParams(params);
                        for (const key of [
                          'available',
                          'min',
                          'max',
                          'type',
                          'vendor',
                          'cursor',
                          'direction',
                        ]) {
                          next.delete(key);
                        }
                        return next;
                      },
                      {preventScrollReset: true},
                    )
                  }
                >
                  Clear filters
                </button>
              </section>
            ) : data.clothingOnly ? (
              <section className="empty-state collection-empty">
                <h2>No pieces available in this collection.</h2>
                <Link to="/clothing">Explore all clothing</Link>
              </section>
            ) : (
              <OriginalArtPreview />
            )}
          </>
        )}
      </Pagination>
    </div>
  );
}

export function buildCollectionAnalyticsProducts(products: ClaraCardProduct[]) {
  return products
    .map((product) => {
      const variant =
        product.cardVariant?.nodes?.[0] ?? product.variants?.nodes?.[0];
      const price =
        variant?.price?.amount ?? product.priceRange?.minVariantPrice?.amount;

      if (!variant?.id || !price) return null;

      return {
        id: product.id,
        price,
        productType: product.productType ?? undefined,
        quantity: 1,
        sku: variant.sku ?? undefined,
        title: product.title,
        variantId: variant.id,
        variantTitle: variant.title,
        vendor: product.vendor ?? 'Clara Mendes',
      };
    })
    .filter((product): product is NonNullable<typeof product> =>
      Boolean(product),
    );
}

/**
 * Renders the product grid and auto-loads the next page when the
 * "Load more" link scrolls into view (Hydrogen infinite-scroll recipe).
 */
function AutoLoadGrid({
  products,
  inView,
  hasNextPage,
  nextPageUrl,
  state,
}: {
  products: ClaraCardProduct[];
  inView: boolean;
  hasNextPage: boolean;
  nextPageUrl: string;
  state: unknown;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (inView && hasNextPage) {
      void navigate(nextPageUrl, {
        replace: true,
        preventScrollReset: true,
        state,
      });
    }
  }, [inView, hasNextPage, navigate, nextPageUrl, state]);

  return (
    <div className="cv-grid">
      {products.map((product, index) => (
        <div
          key={product.id}
          className="cv-card-wrap"
          style={{animationDelay: `${Math.min(index % 24, 11) * 70}ms`}}
        >
          <ClaraProductCard
            product={product}
            loading={index < 4 ? 'eager' : 'lazy'}
            showStory
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Minimal IntersectionObserver hook (callback-ref based) so we don't
 * need the react-intersection-observer dependency.
 */
function useInView() {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? false),
      {rootMargin: '600px 0px'},
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return {ref: setNode, inView};
}

function splitTitle(str: string): {italic: string; rest: string} {
  const parts = str.split(' ');
  if (parts.length === 1) return {italic: parts[0], rest: ''};
  return {italic: parts[0], rest: parts.slice(1).join(' ')};
}

function filterProductConnection(
  connection: CollectionProductConnection,
): CollectionProductConnection {
  return {
    ...connection,
    nodes: filterDemoProducts(connection.nodes),
  };
}

const ALL_COLLECTION_QUERY = `#graphql
  query AllCollection(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $query: String
    $reverse: Boolean
    $sortKey: ProductSortKeys
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    products(
      after: $endCursor
      before: $startCursor
      first: $first
      last: $last
      query: $query
      reverse: $reverse
      sortKey: $sortKey
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
    collections(first: 24) {
      nodes {
        id
        handle
        title
        products(first: 4) {
          nodes {
            ...ClaraProductCard
          }
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

const collectionCss = `
.cv-root {
  --cv-bg-base: #6B655B;
  --cv-ink: #26231f;
  --cv-muted: #746f65;
  /* Translucent so the cinematic painted canvas shows through;
     reads as solid paper when WebGL is unavailable (paper body behind) */
  --cv-paper: rgba(251, 250, 246, 0.92);
  --cv-ease: cubic-bezier(0.25, 1, 0.5, 1);
  padding-left: 0 !important;
  padding-right: 0 !important;
}

/* ── Hero (compact on mobile) ── */
.cv-hero {
  position: relative;
  overflow: hidden;
  background-color: var(--cv-bg-base);
  background-image:
    linear-gradient(180deg, rgba(30,28,24,0.35) 0%, rgba(107,101,91,0.05) 45%, rgba(107,101,91,0) 100%),
    url(/images/backdrops/hero-interior.jpg);
  background-size: cover;
  background-position: center 40%;
  color: #fff;
  padding: calc(var(--header-height) + clamp(88px, 10vw, 150px))
           clamp(18px, 4vw, 70px)
           clamp(70px, 9vw, 130px);
  min-height: 62vh;
  isolation: isolate;
}

.cv-hero::before {
  content: '';
  position: absolute; inset: 0;
  background: rgba(107, 101, 91, 0.58);
  z-index: 0;
  mix-blend-mode: multiply;
}

.cv-hero-noise {
  position: absolute; inset: 0;
  z-index: 1;
  opacity: 0.09;
  pointer-events: none;
  mix-blend-mode: overlay;
  background-image: url(data:image/svg+xml,%3Csvg%20viewBox=%220%200%20200%20200%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter%20id=%22nf%22%3E%3CfeTurbulence%20type=%22fractalNoise%22%20baseFrequency=%220.8%22%20numOctaves=%223%22%20stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect%20width=%22100%25%22%20height=%22100%25%22%20filter=%22url(%23nf)%22/%3E%3C/svg%3E);
}

.cv-hero-vignette {
  position: absolute; inset: 0;
  z-index: 1;
  pointer-events: none;
  background: radial-gradient(ellipse 120% 100% at 50% 40%, transparent 45%, rgba(20,18,14,0.55) 100%);
}

.cv-hero-inner {
  position: relative;
  z-index: 2;
  max-width: 940px;
}

.cv-eyebrow {
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.72);
  margin: 0 0 28px;
  opacity: 0;
  animation: cvFade 1.8s var(--cv-ease) forwards 0.2s;
}

.cv-title {
  font-family: var(--serif);
  font-size: clamp(3rem, 7.5vw, 6.2rem);
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.02;
  margin: 0;
  color: #fff;
  text-wrap: balance;
  opacity: 0;
  animation: cvFade 2.4s var(--cv-ease) forwards 0.5s;
}

.cv-title i {
  font-style: italic;
  font-weight: 400;
}

.cv-hero-rule {
  position: absolute;
  bottom: 0;
  left: clamp(18px, 4vw, 70px);
  right: clamp(18px, 4vw, 70px);
  z-index: 2;
  height: 1px;
  background: rgba(255,255,255,0.18);
  transform-origin: left;
  transform: scaleX(0);
  animation: cvScaleX 1.8s var(--cv-ease) forwards 1.8s;
}

/* ── Sticky toolbar (categories + sort) ── */
.cv-toolbar {
  position: sticky;
  top: var(--header-height);
  z-index: 20;
  backdrop-filter: blur(22px) saturate(1.22);
  -webkit-backdrop-filter: blur(22px) saturate(1.22);
  background:
    linear-gradient(135deg, rgba(255,255,255,0.48), transparent 48%),
    rgba(251, 250, 246, 0.82);
  border-bottom: 1px solid rgba(255,255,255,0.7);
  box-shadow:
    0 12px 32px rgba(55,48,39,0.08),
    inset 0 1px 0 rgba(255,255,255,0.82);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: clamp(18px, 3vw, 46px);
  padding: 18px clamp(18px, 4vw, 70px);
}

.cv-browse-controls {
  display: flex;
  align-items: end;
  gap: clamp(18px, 2.6vw, 38px);
  min-width: 0;
}

.cv-browse-group {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.cv-browse-label {
  font-family: var(--sans);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--cv-muted);
}

.cv-type-tabs {
  align-items: center;
  background: rgba(255,255,255,0.4);
  border: 1px solid rgba(38,35,31,0.1);
  border-radius: 8px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.78);
  display: inline-flex;
  min-height: 44px;
  padding: 3px;
}

.cv-type-link {
  align-items: center;
  border-radius: 6px;
  color: var(--cv-muted);
  display: inline-flex;
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 600;
  justify-content: center;
  min-height: 36px;
  padding: 0 14px;
  transition:
    background 300ms var(--cv-ease),
    color 300ms var(--cv-ease),
    box-shadow 300ms var(--cv-ease);
  white-space: nowrap;
}

.cv-type-link:hover {
  color: var(--cv-ink);
}

.cv-type-link:focus-visible,
.cv-category-select:focus-visible,
.cv-collection-select:focus-visible {
  outline: 1.5px solid var(--cv-ink);
  outline-offset: 2px;
}

.cv-type-link.is-active {
  background: var(--cv-ink);
  box-shadow: 0 4px 12px rgba(38,35,31,0.16);
  color: #fbfaf6;
}

.cv-category-select,
.cv-collection-select {
  background: rgba(255,255,255,0.46);
  border: 1px solid rgba(38,35,31,0.12);
  border-radius: 6px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
  color: var(--cv-ink);
  cursor: pointer;
  font-family: var(--sans);
  font-size: 0.78rem;
  min-height: 44px;
  padding: 0 34px 0 12px;
}

.cv-category-select {
  display: none;
}

.cv-collection-select {
  min-width: 210px;
}

/* Toolbar actions (filter toggle + sort) */
.cv-toolbar-actions {
  display: flex;
  align-items: center;
  gap: clamp(12px, 1.6vw, 22px);
  flex-shrink: 0;
}

.cv-filter-toggle {
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--cv-muted);
  backdrop-filter: blur(12px) saturate(1.16);
  -webkit-backdrop-filter: blur(12px) saturate(1.16);
  background:
    linear-gradient(135deg, rgba(255,255,255,0.46), transparent 58%),
    rgba(251,250,246,0.58);
  border: 1px solid rgba(255,255,255,0.72);
  border-radius: 6px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.82);
  min-height: 44px;
  padding: 0 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: color 400ms var(--cv-ease), border-color 400ms var(--cv-ease);
}

.cv-filter-toggle:hover,
.cv-filter-toggle.is-active {
  color: var(--cv-ink);
  border-color: rgba(38,35,31,0.42);
}

/* Facet panel */
.cv-facets {
  backdrop-filter: blur(22px) saturate(1.18);
  -webkit-backdrop-filter: blur(22px) saturate(1.18);
  display: flex;
  flex-wrap: wrap;
  gap: clamp(20px, 3vw, 48px);
  align-items: flex-start;
  padding: clamp(18px, 2.4vw, 30px) clamp(18px, 4vw, 70px);
  background:
    linear-gradient(135deg, rgba(255,255,255,0.48), transparent 46%),
    rgba(251,250,246,0.84);
  border-bottom: 1px solid rgba(255,255,255,0.72);
  box-shadow:
    0 18px 38px rgba(55,48,39,0.1),
    inset 0 1px 0 rgba(255,255,255,0.82);
}

.cv-facet-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.cv-facet-group--clear {
  margin-left: auto;
  align-self: center;
}

.cv-facet-title {
  font-family: var(--sans);
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--cv-muted);
  margin: 0;
}

.cv-facet-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--sans);
  font-size: 0.8rem;
  color: var(--cv-ink);
  cursor: pointer;
}

.cv-facet-check input {
  accent-color: var(--cv-ink);
}

.cv-facet-price {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cv-facet-input {
  font-family: var(--sans);
  font-size: 0.8rem;
  color: var(--cv-ink);
  background: rgba(255,255,255,0.48);
  border: 1px solid rgba(38,35,31,0.13);
  border-radius: 999px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.82);
  padding: 6px 10px;
  width: 84px;
  appearance: textfield;
  -moz-appearance: textfield;
}

.cv-facet-input::-webkit-outer-spin-button,
.cv-facet-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.cv-facet-dash {
  color: var(--cv-muted);
}

.cv-facet-apply {
  font-family: var(--sans);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--cv-ink);
  background: rgba(255,255,255,0.42);
  border: 1px solid rgba(38,35,31,0.3);
  border-radius: 999px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.78);
  padding: 6px 12px;
  cursor: pointer;
  transition: background 400ms var(--cv-ease), color 400ms var(--cv-ease);
}

.cv-facet-apply:hover {
  background: var(--cv-ink);
  color: #fbfaf6;
}

.cv-facet-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: min(560px, 100%);
}

.cv-facet-chip {
  font-family: var(--sans);
  font-size: 0.74rem;
  color: var(--cv-muted);
  backdrop-filter: blur(10px) saturate(1.14);
  -webkit-backdrop-filter: blur(10px) saturate(1.14);
  background: rgba(255,255,255,0.4);
  border: 1px solid rgba(255,255,255,0.72);
  border-radius: 999px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.78);
  padding: 5px 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: color 300ms var(--cv-ease), border-color 300ms var(--cv-ease),
    background 300ms var(--cv-ease);
}

.cv-facet-chip:hover {
  color: var(--cv-ink);
  border-color: rgba(38,35,31,0.42);
}

.cv-facet-chip.is-active {
  color: #fbfaf6;
  background: var(--cv-ink);
  border-color: var(--cv-ink);
}

.cv-facet-chip-count {
  opacity: 0.65;
  font-size: 0.66rem;
}

.cv-facet-clear {
  font-family: var(--sans);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--cv-muted);
  background: transparent;
  border: none;
  border-bottom: 1px solid currentColor;
  padding: 2px 0;
  cursor: pointer;
}

.cv-facet-clear:hover {
  color: var(--cv-ink);
}

/* Sort dropdown */
.cv-sort {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.cv-sort-label {
  font-family: var(--sans);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--cv-muted);
}

.cv-sort-select {
  font-family: var(--sans);
  font-size: 0.78rem;
  color: var(--cv-ink);
  backdrop-filter: blur(12px) saturate(1.16);
  -webkit-backdrop-filter: blur(12px) saturate(1.16);
  background-color: rgba(251,250,246,0.62);
  border: 1px solid rgba(255,255,255,0.72);
  border-radius: 6px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.82);
  min-height: 44px;
  padding: 0 30px 0 12px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%2326231f' stroke-width='1.2'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  cursor: pointer;
}

/* Product count */
.cv-count {
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--cv-muted);
  padding: 18px clamp(18px, 4vw, 70px) 0;
  margin: 0;
  background: var(--cv-paper);
}

.cv-grid {
  display: grid;
  gap: clamp(28px, 3vw, 52px) clamp(18px, 2.4vw, 36px);
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: clamp(24px, 3vw, 48px) clamp(18px, 4vw, 70px)
           clamp(36px, 5vw, 72px);
  background: var(--cv-paper);
}

.cv-products {
  background: var(--cv-paper);
  padding-bottom: clamp(56px, 7vw, 110px);
}

.cv-load {
  display: flex;
  width: fit-content;
  margin: 0 auto;
  align-items: center;
  justify-content: center;
  color: var(--cv-ink);
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: clamp(8px, 1.5vw, 18px) 16px clamp(20px, 2.5vw, 32px);
}

.cv-load--prev {
  padding-top: clamp(28px, 4vw, 48px);
  padding-bottom: clamp(10px, 2vw, 22px);
}

.cv-card-wrap {
  opacity: 0;
  transform: translateY(18px);
  animation: cvRise 1.2s var(--cv-ease) forwards;
}

.collection-empty {
  margin-left: clamp(18px, 4vw, 70px);
  margin-right: clamp(18px, 4vw, 70px);
  max-width: min(680px, calc(100vw - 36px));
}

.collection-empty p {
  max-width: min(58ch, calc(100vw - 70px));
}

@keyframes cvFade {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes cvRise {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes cvScaleX {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

@media (max-width: 1100px) {
  .cv-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 980px) {
  .cv-toolbar {
    align-items: stretch;
    grid-template-columns: minmax(0, 1fr);
  }

  .cv-toolbar-actions {
    justify-content: flex-end;
  }

  /* Tablets: the category tabs and the collection picker no longer fit on
     one row (the page scrolled sideways at 768 px); wrap them, and let the
     tabs scroll on their own. */
  .cv-browse-controls {
    flex-wrap: wrap;
  }

  .cv-browse-group--category {
    max-width: 100%;
  }

  .cv-type-tabs {
    max-width: 100%;
    overflow-x: auto;
    scrollbar-width: none;
  }
}

@media (max-width: 780px) {
  .cv-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .cv-hero { min-height: 50vh; }
}

/* Thumb-height shortcut back to the toolbar, shown on phones only. */
.cv-jump {
  display: none;
}

/* ── Mobile: compact hero, scrolling category chips, toolbar that scrolls
   away (a sticky one covered a third of a phone screen), 2-col grid ── */
@media (max-width: 720px) {
  .cv-hero {
    background-image:
      linear-gradient(180deg, rgba(30,28,24,0.35) 0%, rgba(107,101,91,0.05) 45%, rgba(107,101,91,0) 100%),
      url(/images/backdrops/hero-interior-mobile.webp);
    min-height: auto;
    padding: calc(var(--header-height) + 28px) 18px 26px;
  }

  .cv-eyebrow { margin-bottom: 12px; }
  .cv-title { font-size: clamp(2rem, 9vw, 3rem); margin: 0; }

  .cv-toolbar {
    position: relative;
    top: auto;
    align-items: stretch;
    gap: 10px;
    padding: 12px 0 12px;
  }

  .cv-browse-controls {
    display: grid;
    gap: 10px;
    grid-template-columns: minmax(0, 1fr);
  }

  .cv-browse-group--category .cv-browse-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  /* Categories: one tap each, swiped sideways with the thumb. */
  .cv-type-tabs {
    background: none;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    display: flex;
    gap: 8px;
    margin: 0;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    padding: 2px 16px 4px;
    scroll-padding-inline: 16px;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .cv-type-tabs::-webkit-scrollbar {
    display: none;
  }

  .cv-type-link {
    background: rgba(255,255,255,0.5);
    border: 1px solid rgba(38,35,31,0.14);
    border-radius: 999px;
    flex: none;
    font-size: 0.8rem;
    min-height: 44px;
    padding: 0 16px;
  }

  .cv-type-link.is-active {
    border-color: var(--cv-ink);
  }

  .cv-category-select {
    display: none;
  }

  .cv-browse-group--collection {
    padding: 0 16px;
  }

  .cv-browse-group--collection .cv-browse-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  .cv-category-select,
  .cv-collection-select,
  .cv-sort-select {
    font-size: 16px;
    min-width: 0;
    width: 100%;
  }

  .cv-toolbar-actions {
    display: grid;
    gap: 10px;
    grid-template-columns: auto minmax(0, 1fr);
    padding: 0 16px;
  }

  .cv-filter-toggle {
    font-size: 0.74rem;
    letter-spacing: 0.14em;
  }

  .cv-sort {
    display: grid;
    gap: 8px;
    grid-template-columns: auto minmax(0, 1fr);
  }

  .cv-facets {
    padding: 14px 16px 18px;
    gap: 18px;
  }

  .cv-facet-check {
    font-size: 0.92rem;
    min-height: 44px;
  }

  .cv-facet-check input {
    height: 20px;
    width: 20px;
  }

  .cv-facet-input {
    font-size: 16px;
    min-height: 44px;
    width: 96px;
  }

  .cv-facet-apply,
  .cv-facet-chip,
  .cv-facet-clear {
    min-height: 44px;
  }

  .cv-count {
    padding: 12px 16px 0;
    font-size: 0.72rem;
  }

  .cv-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 22px 12px;
    padding: 14px 14px 36px;
  }

  /* Cards appear at once on phones: a staggered fade made the grid blink
     empty when a shopper came back from a product. */
  .cv-card-wrap {
    animation: none;
    opacity: 1;
    transform: none;
  }

  .cv-load {
    min-height: 48px;
  }
}

/* Phones and tablets: the stacked toolbar would cover a quarter of the
   screen if it stayed pinned, so it scrolls away and the shortcut below
   brings it back. */
@media (max-width: 980px) {
  .cv-toolbar {
    position: relative;
    top: auto;
  }

  .cv-jump {
    align-items: center;
    background: var(--cv-ink);
    border: 0;
    border-radius: 999px;
    bottom: max(16px, env(safe-area-inset-bottom, 0px));
    box-shadow: 0 12px 28px rgba(38,35,31,0.28);
    color: #fbfaf6;
    display: inline-flex;
    font-family: var(--sans);
    font-size: 0.78rem;
    font-weight: 600;
    gap: 8px;
    left: 50%;
    letter-spacing: 0.12em;
    min-height: 48px;
    opacity: 0;
    padding: 0 20px;
    pointer-events: none;
    position: fixed;
    text-transform: uppercase;
    transform: translate(-50%, 16px);
    transition: opacity 220ms ease, transform 220ms ease, visibility 0s linear 220ms;
    visibility: hidden;
    z-index: 25;
  }

  .cv-jump.is-visible {
    opacity: 1;
    pointer-events: auto;
    transform: translate(-50%, 0);
    transition-delay: 0s;
    visibility: visible;
  }

  .cv-jump-count {
    align-items: center;
    background: #fbfaf6;
    border-radius: 999px;
    color: var(--cv-ink);
    display: inline-flex;
    font-size: 0.7rem;
    height: 20px;
    justify-content: center;
    letter-spacing: 0;
    min-width: 20px;
  }
}

@media (max-width: 520px) {
  .collection-empty p {
    max-width: none;
    width: calc(100vw - 70px);
  }

  .cv-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px 10px;
    padding: 14px 12px 32px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cv-jump {
    transition: none;
  }
}

/* Collection-specific hero (app/lib/collectionHeroes.ts): its own image, a
   left-side shade for the title instead of the interior's multiply wash. */
.cv-hero.cv-hero--custom {
  background-image:
    linear-gradient(90deg, rgba(24,22,19,0.42) 0%, rgba(24,22,19,0.24) 38%, rgba(24,22,19,0) 56%),
    var(--cv-hero-image);
  background-position: center;
}

.cv-hero.cv-hero--custom::before {
  display: none;
}

.cv-hero.cv-hero--custom .cv-hero-vignette {
  opacity: 0.45;
}

.cv-hero-subtitle {
  animation: cvFade 2.4s var(--cv-ease) forwards 0.8s;
  color: rgba(255,255,255,0.88);
  font-size: clamp(0.98rem, 1.25vw, 1.12rem);
  line-height: 1.6;
  margin: 24px 0 0;
  max-width: 34em;
  opacity: 0;
  text-wrap: pretty;
}

@media (max-width: 720px) {
  .cv-hero.cv-hero--custom {
    background-image:
      linear-gradient(180deg, rgba(24,22,19,0.6) 0%, rgba(24,22,19,0.42) 55%, rgba(24,22,19,0.2) 100%),
      var(--cv-hero-image-mobile);
    background-position: center;
  }

  .cv-hero-subtitle {
    font-size: 0.9rem;
    margin-top: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cv-eyebrow, .cv-title, .cv-tagline, .cv-coords, .cv-hero-subtitle,
  .cv-hero-rule, .cv-browse-controls, .cv-card-wrap {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}

@media (hover: none) and (pointer: coarse) {
  .cv-toolbar,
  .cv-facets {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    background: rgba(251,250,246,0.97);
  }
}
`;
