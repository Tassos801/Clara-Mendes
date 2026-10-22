import {useRef} from 'react';
import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/_index';
import {
  ClaraProductCard,
  type ClaraCardProduct,
} from '~/components/ClaraProductCard';
import {HeroTiles} from '~/components/HeroTiles';
import {BRAND} from '~/content/brand';
import {HomepageEditorial} from '~/components/HomepageEditorial';
import {ClothingFeature} from '~/components/ClothingFeature';
import {ArtistShopsFeature} from '~/components/ArtistShopsFeature';
import {artistFeature} from '~/lib/artistShops';
import {listShopCapsules, shopCapsulePath} from '~/lib/capsules';
import {museumTagClause, studioSearchQuery} from '~/lib/museumListingOrder';
import artistFeatureStyles from '~/styles/artist-feature.css?url';
import {
  loadClothingProducts,
  type ClothingProduct,
} from '~/lib/clothing.server';
import {clothingFeaturePicks} from '~/lib/clothingPresentation';
import {FramedArtFeature} from '~/components/FramedArtFeature';
import {OriginalArtPreview} from '~/components/OriginalArtPreview';
import {StructuredData} from '~/components/StructuredData';
import {BrandFilm} from '~/components/BrandFilm';
import {YourSkyTeaser} from '~/components/YourSkyTeaser';
import {
  BookNookShelf,
  type BookNookShelfItem,
} from '~/components/BookNookShelf';
import type {BookNookStorefrontProduct} from '~/components/BookNookCard';
import {
  ToughCaseTeaser,
  type ToughCaseTeaserCase,
} from '~/components/ToughCaseTeaser';
import {useAside} from '~/components/Aside';
import {
  filterDemoCollections,
  filterDemoProducts,
  isDemoProduct,
  isReleasedExtensionHandle,
  isReleasedProductHandle,
  ORIGINAL_ART_COLLECTIONS,
  pickVariedProducts,
} from '~/lib/catalogFilters';
import {withDeliveryReach} from '~/lib/deliveryReach.server';
import {CLASSIC_FRAME_HANDLE} from '~/lib/classicFrame';
import {
  buildOriginalArtQuery,
  buildOriginalArtProductMap,
  ORIGINAL_ART_QUERY_FIRST,
  type OriginalArtProductMap,
} from '~/lib/originalArt';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/productCardFragment';
import {type MoneyAmount} from '~/lib/money';
import {
  TOUGH_CASE_ARTWORK_OPTION,
  TOUGH_CASE_HANDLE,
  TOUGH_CASE_TEASER_ARTWORKS,
} from '~/lib/toughCase';
import {
  buildSeoMeta,
  getCanonicalUrl,
  organizationSchema,
  websiteSchema,
} from '~/lib/seo';
import {RETURN_WINDOW_DAYS, STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';
import {catalogCounts, countWord} from '~/lib/catalogSummary';
import {
  BOOK_NOOK_PRODUCT_TYPE,
  BOOK_NOOKS_PATH,
  bookNookDeliveryPhrase,
  buildBookNookShelf,
  releasedBookNooks,
} from '~/lib/bookNooks';

// Artist shops from catalog data, like the site header's Artists link.
const ARTIST_FEATURE = artistFeature();
const MUSEUM_COLLECTIONS = listShopCapsules()
  .filter((capsule) => capsule.kind === 'museum')
  .map((capsule) => ({
    path: shopCapsulePath(capsule.slug),
    title: capsule.title,
  }));

// "More from the edit" shows the studio's own products; museum
// reproductions have the artist feature instead, and would otherwise fill
// it, being the newest products in Shopify's best-selling order.
const MUSEUM_CLAUSE = museumTagClause();
const EDIT_QUERY = MUSEUM_CLAUSE ? studioSearchQuery(null, MUSEUM_CLAUSE) : null;

// Read from the catalog data so a new collection release updates the copy.
const CATALOG = catalogCounts();
const CAPSULE_COUNT_WORD = countWord(CATALOG.capsules);
const WORK_COUNT_WORD = countWord(CATALOG.works);

type HomeCollection = {
  id: string;
  handle: string;
  title: string;
  description?: string | null;
  products?: {
    nodes?: Array<{
      handle?: string | null;
      productType?: string | null;
      tags?: string[] | null;
      title?: string | null;
      vendor?: string | null;
    }>;
  };
};

export const meta: Route.MetaFunction = ({data}) => {
  return buildSeoMeta({
    description: BRAND.seo.homeDescription,
    title: BRAND.seo.homeTitle,
    url: data?.seoUrl ?? `${STOREFRONT_ORIGIN}/`,
  });
};

export const links: Route.LinksFunction = () => [
  {rel: 'stylesheet', href: artistFeatureStyles},
];

export async function loader({context, request}: Route.LoaderArgs) {
  // The homepage never fails because clothing could not load.
  const clothing = loadClothingProducts(context.storefront)
    .catch(() => [] as ClothingProduct[])
    .then(clothingFeaturePicks);
  try {
    const data = await context.storefront.query(HOMEPAGE_QUERY, {
      variables: {
        // Availability for the original-art section is resolved with a
        // dedicated catalog-tag query covering every expected print — the
        // best-selling slice below is presentation-only and must never
        // decide which prints exist.
        artFirst: ORIGINAL_ART_QUERY_FIRST,
        artQuery: buildOriginalArtQuery(),
        // The sentinel tag matches nothing until a nook is released.
        bookNookQuery: releasedBookNooks().length
          ? `product_type:"${BOOK_NOOK_PRODUCT_TYPE}"`
          : 'tag:"__no-book-nooks__"',
        frameHandle: isReleasedExtensionHandle(CLASSIC_FRAME_HANDLE)
          ? CLASSIC_FRAME_HANDLE
          : '__frame-not-released__',
        // Headroom above the 7 cards rendered, since demo/off-theme
        // products are filtered out after fetching
        first: 24,
        productsQuery: EDIT_QUERY,
        toughCaseHandle: isReleasedProductHandle(TOUGH_CASE_HANDLE)
          ? TOUGH_CASE_HANDLE
          : '__tough-case-not-released__',
      },
    });

    return {
      clothingPicks: await clothing,
      bookNookShelf: buildBookNookShelf(
        (data.bookNooks?.nodes ?? []) as BookNookStorefrontProduct[],
      ) as BookNookShelfItem[],
      bookNookDelivery: bookNookDeliveryPhrase(),
      collections: filterDemoCollections(
        data.collections.nodes as HomeCollection[],
      ),
      originalArtProducts: buildOriginalArtProductMap(
        (data.originalArtProducts?.nodes ?? []) as ClaraCardProduct[],
      ),
      featuredPrints: pickFeaturedPrints(
        filterDemoProducts(
          (data.originalArtProducts?.nodes ?? []) as ClaraCardProduct[],
        ),
      ),
      frameProduct:
        data.frameProduct && !isDemoProduct(data.frameProduct)
          ? (data.frameProduct as ClaraCardProduct)
          : null,
      products: await withDeliveryReach(
        context.storefront,
        filterDemoProducts(data.products.nodes as ClaraCardProduct[]),
      ),
      caseTeaser: buildCaseTeaser(
        data.toughCase as ToughCaseTeaserProduct | null,
      ),
      seoUrl: getCanonicalUrl(request, '/'),
    };
  } catch {
    return {
      clothingPicks: await clothing,
      bookNookShelf: [] as BookNookShelfItem[],
      bookNookDelivery: '',
      caseTeaser: null as CaseTeaser | null,
      collections: [] as HomeCollection[],
      frameProduct: null as ClaraCardProduct | null,
      originalArtProducts: {} as OriginalArtProductMap,
      featuredPrints: [] as ClaraCardProduct[],
      products: [] as ClaraCardProduct[],
      seoUrl: getCanonicalUrl(request, '/'),
    };
  }
}

type ToughCaseTeaserProduct = {
  handle: string;
  productType?: string | null;
  tags?: string[] | null;
  title?: string | null;
  vendor?: string | null;
  priceRange: {minVariantPrice: MoneyAmount};
  options: Array<{
    name: string;
    optionValues: Array<{
      name: string;
      firstSelectableVariant?: {
        availableForSale: boolean;
        image?: {url: string; altText?: string | null} | null;
      } | null;
    }>;
  }>;
};

type CaseTeaser = {cases: ToughCaseTeaserCase[]; price: MoneyAmount | null};

/** The released case's curated previews; null hides the section. */
function buildCaseTeaser(
  product: ToughCaseTeaserProduct | null,
): CaseTeaser | null {
  if (!product || isDemoProduct(product)) return null;
  const values =
    product.options.find((option) => option.name === TOUGH_CASE_ARTWORK_OPTION)
      ?.optionValues ?? [];
  const cases = TOUGH_CASE_TEASER_ARTWORKS.flatMap((artwork) => {
    const variant = values.find(
      (value) => value.name === artwork,
    )?.firstSelectableVariant;
    return variant?.availableForSale && variant.image
      ? [{artwork, image: variant.image}]
      : [];
  });
  return cases.length >= 3
    ? {cases, price: product.priceRange.minVariantPrice}
    : null;
}

/** One work per temperament — calm, cool, night — for the "Ready now" block. */
const FEATURED_PRINT_HANDLES = [
  'quiet-form-i-art-print',
  'patina-blue-i-art-print',
  'midnight-garden-i-art-print',
];

function pickFeaturedPrints(products: ClaraCardProduct[]): ClaraCardProduct[] {
  const byHandle = new Map(
    products.map(
      (product) => [product.handle?.toLowerCase(), product] as const,
    ),
  );
  return FEATURED_PRINT_HANDLES.map((handle) => byHandle.get(handle)).filter(
    (product): product is ClaraCardProduct => Boolean(product),
  );
}

export default function Homepage() {
  const {
    bookNookDelivery,
    bookNookShelf,
    caseTeaser,
    clothingPicks,
    collections,
    featuredPrints,
    frameProduct,
    originalArtProducts,
    products,
    seoUrl,
  } = useLoaderData<typeof loader>();
  const {open, type: asideType} = useAside();
  const quickShopProducts =
    featuredPrints.length === FEATURED_PRINT_HANDLES.length
      ? featuredPrints
      : products.slice(0, 3);
  const featuredProducts = pickVariedProducts(
    products,
    4,
    products.length > 3 ? quickShopProducts : [],
  );
  const collectionTrackRef = useRef<HTMLDivElement | null>(null);
  const hasLiveCollections = collections.length > 0;
  const categoryItems = hasLiveCollections
    ? collections
    : ORIGINAL_ART_COLLECTIONS;

  const scrollCollectionCarousel = (direction: -1 | 1) => {
    const track = collectionTrackRef.current;
    if (!track) return;

    const cards = Array.from(
      track.querySelectorAll<HTMLElement>('.category-carousel-card'),
    );
    if (cards.length === 0) return;

    const getCardLeft = (card: HTMLElement) =>
      card.offsetLeft - track.offsetLeft;
    const currentIndex = cards.reduce((closestIndex, card, index) => {
      const closestDistance = Math.abs(
        getCardLeft(cards[closestIndex]) - track.scrollLeft,
      );
      const distance = Math.abs(getCardLeft(card) - track.scrollLeft);
      return distance < closestDistance ? index : closestIndex;
    }, 0);
    const nextIndex = Math.min(
      Math.max(currentIndex + direction, 0),
      cards.length - 1,
    );

    track.scrollTo({
      behavior: 'smooth',
      left: getCardLeft(cards[nextIndex]),
    });
  };

  return (
    <div className="commerce-home">
      <style suppressHydrationWarning>{homeCss}</style>
      <StructuredData
        data={[organizationSchema(seoUrl), websiteSchema(seoUrl)]}
      />

      <section className="home-root" aria-labelledby="home-title">
        <div className="hm-ui-layer">
          <header className="hm-header-top">
            {/* Phones get one calm row (menu, name, search, cart); the
                site's own mobile menu lists every page. */}
            <button
              className="hm-icon-button hm-menu-button"
              type="button"
              onClick={() => open('mobile')}
              aria-label="Open menu"
              aria-expanded={asideType === 'mobile'}
              aria-haspopup="dialog"
            >
              <svg width="20" height="12" viewBox="0 0 20 12" fill="none" aria-hidden="true">
                <line x1="0" y1="1" x2="20" y2="1" stroke="currentColor" strokeWidth="1.3" />
                <line x1="0" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="1.3" />
                <line x1="0" y1="11" x2="20" y2="11" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </button>
            <Link to="/" className="hm-nav-text hm-brand">
              Clara Mendes
            </Link>
            <nav className="hm-nav-group" aria-label="Home navigation">
              <Link to="/collections/all" className="hm-nav-text">
                Shop
              </Link>
              {ARTIST_FEATURE.artists.length ? (
                <Link to="/artists" className="hm-nav-text">
                  Artists
                </Link>
              ) : null}
              {clothingPicks.length ? (
                <Link to="/clothing" className="hm-nav-text">
                  Clothing
                </Link>
              ) : null}
              {bookNookShelf.length ? (
                <Link to={BOOK_NOOKS_PATH} className="hm-nav-text">
                  Book Nooks
                </Link>
              ) : null}
              <Link to="/our-story" className="hm-nav-text">
                Our Story
              </Link>
              <Link to="/blogs/karina-of-time" className="hm-nav-text">
                Journal
              </Link>
              <Link to="/search" className="hm-nav-text">
                Search
              </Link>
              <button
                className="hm-nav-text hm-cart-link"
                type="button"
                onClick={() => open('cart')}
              >
                Cart
              </button>
            </nav>
            <div className="hm-header-icons">
              <Link className="hm-icon-button" to="/search" aria-label="Search">
                <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                  <line x1="13.5" y1="13.5" x2="18" y2="18" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </Link>
              <button
                className="hm-icon-button"
                type="button"
                onClick={() => open('cart')}
                aria-label="Cart"
                aria-haspopup="dialog"
              >
                <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4 6.5h12l-1 11H5l-1-11Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M7 8V5.5a3 3 0 0 1 6 0V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </header>

          <div className="hm-hero-body">
            <div className="hm-hero-text">
              <h1 id="home-title" className="hm-prompt-main">
                {BRAND.hero.headline}
              </h1>
              <p className="hm-prompt-sub">{BRAND.hero.line}</p>
              <div className="hm-hero-actions">
                <Link
                  className="hm-hero-action hm-hero-action--primary"
                  to={BRAND.hero.primaryCta.href}
                >
                  {BRAND.hero.primaryCta.label}
                </Link>
                <Link className="hm-hero-action" to={BRAND.hero.secondaryCta.href}>
                  {BRAND.hero.secondaryCta.label}
                </Link>
              </div>
              <p className="hm-hero-foot">{BRAND.hero.footnote}</p>
            </div>

            <HeroTiles />
          </div>
        </div>
      </section>

      <section
        className="home-trust-band"
        aria-label="Store service"
        data-chapter="linen"
      >
        <p>Secure checkout</p>
        <p>International delivery</p>
        <p>{RETURN_WINDOW_DAYS}-day returns</p>
      </section>

      <ArtistShopsFeature
        artists={ARTIST_FEATURE.artists}
        collections={MUSEUM_COLLECTIONS}
        families={ARTIST_FEATURE.families}
      />

      <ClothingFeature picks={clothingPicks} />

      <BrandFilm className="home-film" chapter="linen" eyebrow="The film" />

      {quickShopProducts.length > 0 ? (
        <section
          className="home-shop-accelerator"
          aria-labelledby="home-shop-accelerator-title"
          data-chapter="linen"
        >
          <div className="home-shop-accelerator-copy" data-reveal>
            <p className="eyebrow">Ready now</p>
            <h2 id="home-shop-accelerator-title">
              Start with an original piece.
            </h2>
            <p>
              One work from each temperament — calm, cool, and night. Giclée on
              200 gsm matte paper, printed to order and shipped worldwide.
            </p>
            <div className="home-shop-accelerator-actions">
              <Link className="primary-button" to="/collections/all">
                Shop all products
              </Link>
              <Link className="text-link" to="/policies">
                View policies
              </Link>
            </div>
          </div>

          <div
            className="home-shop-accelerator-products"
            aria-label="Ready to shop products"
            data-reveal
          >
            {quickShopProducts.map((product, index) => (
              <ClaraProductCard
                key={product.id}
                product={product}
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            ))}
          </div>
        </section>
      ) : null}

      <BookNookShelf delivery={bookNookDelivery} items={bookNookShelf} />

      <section
        className="collection-intro home-commerce-intro"
        data-chapter="clay"
      >
        <div data-reveal>
          <p className="eyebrow">The collection</p>
          <h2>Original work, ready to live with.</h2>
        </div>
        <p>
          The art comes first: {WORK_COUNT_WORD} original works across{' '}
          {CAPSULE_COUNT_WORD} capsules, printed to order. The founding capsules
          also come as cards, postcards and canvas, and every work as a phone
          case.
        </p>
      </section>

      <section
        className={`featured-collections featured-collections--carousel${
          categoryItems.length === 1 ? ' featured-collections--solo' : ''
        }`}
        aria-label={hasLiveCollections ? 'Collections' : 'Art capsules'}
        data-chapter="clay"
      >
        <div className="category-carousel-toolbar featured-collections-toolbar">
          <div
            className="category-carousel-controls"
            aria-label="Collection carousel controls"
          >
            <button
              aria-label="Previous collections"
              className="category-carousel-button"
              disabled={categoryItems.length <= 1}
              onClick={() => scrollCollectionCarousel(-1)}
              type="button"
            >
              <span aria-hidden="true">&larr;</span>
            </button>
            <button
              aria-label="Next collections"
              className="category-carousel-button"
              disabled={categoryItems.length <= 1}
              onClick={() => scrollCollectionCarousel(1)}
              type="button"
            >
              <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>

        <div
          className="category-carousel-track featured-collections-track"
          ref={collectionTrackRef}
        >
          {categoryItems.map((collection) =>
            hasLiveCollections ? (
              <Link
                className="featured-collection-card category-carousel-card"
                key={collection.id}
                to={`/collections/${collection.handle}`}
              >
                <small className="eyebrow">Collection</small>
                <h2 className="featured-collection-title">
                  {collection.title}
                </h2>
                {'description' in collection && collection.description ? (
                  <p className="featured-collection-desc">
                    {collection.description}
                  </p>
                ) : null}
                <span className="text-link">Explore collection</span>
              </Link>
            ) : (
              <Link
                className="featured-collection-card category-carousel-card"
                key={collection.id}
                to={`/collections/${collection.handle}`}
                prefetch="intent"
              >
                <small className="eyebrow">Art capsule</small>
                <h2 className="featured-collection-title">
                  {collection.title}
                </h2>
                {'note' in collection && collection.note ? (
                  <p className="featured-collection-desc">{collection.note}</p>
                ) : null}
                <span className="text-link">Explore capsule</span>
              </Link>
            ),
          )}
        </div>
      </section>

      <YourSkyTeaser />

      {caseTeaser ? <ToughCaseTeaser {...caseTeaser} /> : null}

      <section
        className="pastel-pot-teaser"
        aria-labelledby="pastel-pot-teaser-title"
      >
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Ceramic plant pots</p>
            <h2 id="pastel-pot-teaser-title">Pastel Forms</h2>
          </div>
          <Link className="text-link" to="/pastel-forms">
            Explore the series
          </Link>
        </div>
        <Link
          to="/pastel-forms"
          aria-label="Explore the Pastel Forms plant pots"
        >
          <img
            src="/images/pastel-plant-pots/series.webp"
            alt="Design mockups of four minimal pastel ceramic plant pots"
            width={1536}
            height={1024}
            loading="lazy"
          />
        </Link>
      </section>

      <HomepageEditorial />

      <OriginalArtPreview products={originalArtProducts} compact />

      {frameProduct ? <FramedArtFeature product={frameProduct} /> : null}

      {featuredProducts.length > 0 ? (
        <section
          className="featured-grid-section"
          aria-labelledby="featured"
          data-chapter="linen"
        >
          <div className="section-heading-row" data-reveal>
            <div>
              <p className="eyebrow">Featured edit</p>
              <h2 id="featured">
                {products.length > 3
                  ? 'More from the edit'
                  : 'Products available now'}
              </h2>
            </div>
            <Link className="text-link" to="/collections/all">
              Shop all
            </Link>
          </div>
          <div className="product-grid">
            {featuredProducts.map((product, index) => (
              <ClaraProductCard
                key={product.id}
                product={product}
                loading={index < 2 ? 'eager' : 'lazy'}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="empty-state home-empty-catalog">
          <p className="eyebrow">The shop</p>
          <h2>Browse the full collection.</h2>
          <p>
            Every available print and product is in the shop, each with its
            details and secure checkout.
          </p>
          <Link className="primary-button" to="/collections/all">
            Browse the shop
          </Link>
        </section>
      )}

      <section className="story-section home-story-return" data-chapter="ink">
        <div className="story-image" aria-hidden />
        <div className="story-copy" data-reveal>
          <p className="eyebrow">Our story</p>
          <h2>Original art first, then the things around it.</h2>
          <p>
            What began as fifteen prints now takes in clothing, ceramics, phone
            cases and book nooks. Every product page sets out how it is made
            and how it ships.
          </p>
          <Link className="text-link" to="/our-story">
            Read the story
          </Link>
        </div>
      </section>

      <section
        className="home-journal-teaser"
        data-chapter="ink"
        aria-label="Karina of Time — the journal"
      >
        <Link
          className="journal-teaser-card"
          to="/blogs/karina-of-time"
          prefetch="intent"
          data-reveal
        >
          <div className="journal-teaser-sky" aria-hidden>
            <div className="journal-teaser-cloud" />
          </div>
          <span className="journal-teaser-copy">
            <span className="journal-teaser-eyebrow">The journal</span>
            <span className="journal-teaser-title">
              Karina <i>of</i> Time
            </span>
            <span className="journal-teaser-line">
              <span lang="el">καρίνα</span> — Greek, the keel. Notes on the
              prints, the capsules, and the rooms they live in.
            </span>
            <span className="journal-teaser-cta">Enter the journal →</span>
          </span>
        </Link>
      </section>
    </div>
  );
}

const HOMEPAGE_QUERY = `#graphql
  query Homepage(
    $artFirst: Int!
    $artQuery: String!
    $bookNookQuery: String!
    $country: CountryCode
    $first: Int!
    $frameHandle: String!
    $language: LanguageCode
    $productsQuery: String
    $toughCaseHandle: String!
  ) @inContext(country: $country, language: $language) {
    products(first: $first, sortKey: BEST_SELLING, query: $productsQuery) {
      nodes {
        ...ClaraProductCard
      }
    }
    originalArtProducts: products(first: $artFirst, query: $artQuery) {
      nodes {
        ...ClaraProductCard
      }
    }
    frameProduct: product(handle: $frameHandle) {
      ...ClaraProductCard
    }
    bookNooks: products(first: 50, query: $bookNookQuery) {
      nodes {
        handle
        title
        availableForSale
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
    toughCase: product(handle: $toughCaseHandle) {
      handle
      productType
      tags
      title
      vendor
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      options {
        name
        optionValues {
          name
          firstSelectableVariant {
            availableForSale
            image {
              # Tight portrait crop: the previews carry linen either side.
              url(transform: {crop: CENTER, maxWidth: 440, maxHeight: 800})
              altText
            }
          }
        }
      }
    }
    collections(first: 12) {
      nodes {
        id
        handle
        title
        description
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

const homeCss = `
html:has(.home-root) .site-header {
  display: none !important;
}

html:has(.home-root) main {
  margin: 0;
  padding: 0;
}

.commerce-home {
  /* Translucent wash lets the cinematic painted canvas breathe through;
     falls back to the solid page body background without WebGL */
  background: color-mix(in srgb, var(--color-page) 85%, transparent);
}

.home-root {
  --hm-text-main: #26231f;
  --hm-text-muted: rgba(38, 35, 31, 0.68);
  --hm-ease-fluid: cubic-bezier(0.25, 1, 0.5, 1);
  --hm-font-serif: Georgia, 'Times New Roman', serif;
  --hm-font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  position: relative;
  background-color: var(--color-soft);
  color: var(--hm-text-main);
  font-family: var(--hm-font-sans);
  -webkit-font-smoothing: antialiased;
  isolation: isolate;
}

.hm-ui-layer {
  position: relative;
  z-index: 10;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: clamp(36px, 6vw, 84px);
  padding: 2rem 5rem clamp(48px, 7vw, 96px);
}

.hm-nav-text {
  font-family: var(--hm-font-sans);
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--hm-text-main);
  pointer-events: auto;
  transition: opacity 0.3s ease;
  text-decoration: none;
  mix-blend-mode: normal;
}

.hm-nav-text:hover { opacity: 0.6; }

.hm-header-top {
  backdrop-filter: blur(24px) saturate(1.25);
  -webkit-backdrop-filter: blur(24px) saturate(1.25);
  background:
    linear-gradient(135deg, rgba(255,255,255,0.6), transparent 48%),
    rgba(255, 255, 255, 0.34);
  border: 1px solid rgba(38, 35, 31, 0.14);
  border-radius: 24px;
  box-shadow:
    0 18px 46px rgba(38, 35, 31, 0.08),
    inset 0 1px 0 rgba(255,255,255,0.7);
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 14px 18px;
}

.hm-nav-group {
  align-items: center;
  display: flex;
  gap: clamp(1.2rem, 3vw, 3rem);
}

.hm-header-top .market-selector select {
  background:
    linear-gradient(45deg, transparent 50%, currentColor 50%) right 11px top 50% / 4px 4px no-repeat,
    linear-gradient(135deg, currentColor 50%, transparent 50%) right 7px top 50% / 4px 4px no-repeat,
    rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.28);
  color: var(--hm-text-main);
  max-width: 104px;
  min-height: 32px;
}

.hm-header-top .market-selector option {
  background: #fbfaf6;
  color: #26231f;
}

.hm-cart-link {
  background: transparent;
  border: 0;
  padding: 0;
}

.hm-icon-button {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 999px;
  color: var(--hm-text-main);
  display: inline-flex;
  height: 44px;
  justify-content: center;
  padding: 0;
  pointer-events: auto;
  transition: background 0.3s ease;
  width: 44px;
}

.hm-icon-button:hover,
.hm-icon-button:focus-visible {
  background: rgba(255, 255, 255, 0.14);
}

.hm-icon-button:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.9);
  outline-offset: 1px;
}

/* Phone-only controls; the 768px query shows them. */
.hm-menu-button,
.hm-header-icons {
  display: none;
}

.hm-brand {
  font-family: var(--hm-font-serif);
  font-size: 1.8rem;
  font-weight: 400;
  letter-spacing: -0.02em;
  font-style: italic;
  text-transform: none;
}

.hm-hero-body {
  align-items: center;
  display: grid;
  gap: clamp(32px, 5vw, 80px);
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
}

.hm-hero-text {
  max-width: 34rem;
}

.hm-prompt-main {
  font-family: var(--hm-font-serif);
  font-size: clamp(2.6rem, 5.2vw, 4.6rem);
  line-height: 1.02;
  font-weight: 400;
  letter-spacing: -0.025em;
  margin: 0 0 1.2rem;
  color: var(--hm-text-main);
  text-wrap: balance;
}

.hm-prompt-sub {
  font-family: var(--hm-font-serif);
  font-size: clamp(1.05rem, 1.5vw, 1.35rem);
  line-height: 1.5;
  color: var(--hm-text-muted);
  margin: 0;
  max-width: 30ch;
}

.hm-hero-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: clamp(24px, 3vw, 36px);
}

.hm-hero-action {
  align-items: center;
  backdrop-filter: blur(18px) saturate(1.25);
  -webkit-backdrop-filter: blur(18px) saturate(1.25);
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(38, 35, 31, 0.28);
  border-radius: 999px;
  color: var(--hm-text-main);
  display: inline-flex;
  font-size: 0.72rem;
  font-weight: 600;
  justify-content: center;
  letter-spacing: 0.16em;
  min-height: 46px;
  min-width: 150px;
  padding: 0 20px;
  text-decoration: none;
  text-transform: uppercase;
  transition: background 240ms ease, border-color 240ms ease, color 240ms ease;
}

.hm-hero-action:hover {
  background: rgba(255, 255, 255, 0.78);
  border-color: rgba(38, 35, 31, 0.5);
}

.hm-hero-action--primary {
  background: #26231f;
  border-color: #26231f;
  color: #f6f1e8;
}

.hm-hero-action--primary:hover {
  background: #000;
  border-color: #000;
  color: #fff;
}

.hm-hero-foot {
  color: var(--hm-text-muted);
  font-family: var(--hm-font-sans);
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  margin: clamp(20px, 3vw, 32px) 0 0;
  text-transform: uppercase;
}

/* ── The curiosity grid ── four columns, the Hokusai and the book nook
   each two wide, so the eye reads a cabinet of very different things. */
.hm-tiles {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  list-style: none;
  margin: 0;
  padding: 0;
}

.hm-tile {
  min-width: 0;
}

.hm-tile a {
  aspect-ratio: 4 / 5;
  background: #ded7cb;
  border-radius: 6px;
  display: block;
  overflow: hidden;
  position: relative;
}

.hm-tile:nth-child(2) a,
.hm-tile:nth-child(6) a {
  aspect-ratio: 8 / 5;
}

.hm-tile:nth-child(2),
.hm-tile:nth-child(6) {
  grid-column: span 2;
}

.hm-tile img {
  display: block;
  height: 100%;
  object-fit: cover;
  transition: transform 900ms var(--hm-ease-fluid);
  width: 100%;
}

.hm-tile a:hover img,
.hm-tile a:focus-visible img {
  transform: scale(1.03);
}

.hm-tile a:focus-visible {
  outline: 2px solid #26231f;
  outline-offset: 3px;
}

.hm-tile-tag {
  background: rgba(251, 250, 246, 0.94);
  border-radius: 3px;
  bottom: 10px;
  color: #26231f;
  font-family: var(--hm-font-serif);
  font-size: 0.86rem;
  font-style: italic;
  left: 10px;
  line-height: 1;
  padding: 6px 9px;
  position: absolute;
}

.home-commerce-intro {
  border-bottom: 1px solid rgba(38, 35, 31, 0.12);
}

.home-trust-band {
  background: var(--color-deep);
  color: rgba(255,255,255,0.78);
  display: grid;
  gap: 1px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.home-trust-band p {
  background: var(--color-deep);
  border-right: 1px solid rgba(255,255,255,0.12);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  line-height: 1.45;
  margin: 0;
  padding: clamp(18px, 2.5vw, 30px);
  text-align: center;
  text-transform: uppercase;
}

.home-trust-band p:last-child {
  border-right: 0;
}

.home-shop-accelerator {
  align-items: start;
  background:
    linear-gradient(90deg, var(--color-page) 0%, var(--color-soft) 58%, #c2c9bb 100%);
  border-bottom: 1px solid rgba(38, 35, 31, 0.12);
  display: grid;
  gap: clamp(28px, 4vw, 58px);
  grid-template-columns: minmax(280px, 0.78fr) minmax(0, 1.22fr);
  padding: clamp(44px, 6vw, 88px) clamp(18px, 4vw, 70px);
}

.home-shop-accelerator-copy {
  display: grid;
  gap: clamp(18px, 2vw, 28px);
  position: sticky;
  top: 96px;
}

.home-shop-accelerator-copy h2 {
  color: var(--color-ink);
  font-family: var(--serif);
  font-size: clamp(2.7rem, 5.4vw, 5.6rem);
  font-weight: 400;
  letter-spacing: -0.055em;
  line-height: 0.93;
  margin: 0;
  text-wrap: balance;
}

.home-shop-accelerator-copy p:not(.eyebrow) {
  color: var(--color-muted);
  font-size: 1.04rem;
  line-height: 1.72;
  margin: 0;
  max-width: 44ch;
}

.home-shop-accelerator-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}

.home-shop-accelerator-products {
  display: grid;
  gap: clamp(16px, 2vw, 28px);
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.featured-collections {
  background: var(--color-deep);
  color: var(--color-paper);
  display: grid;
  gap: 1px;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
}

.featured-collections--solo {
  grid-template-columns: 1fr;
}

.featured-collections--carousel {
  background: linear-gradient(180deg, var(--color-soft) 0%, var(--color-page) 100%);
  color: var(--color-ink);
  display: block;
  overflow: hidden;
  position: relative;
}

.featured-collections-toolbar {
  border-bottom-color: transparent;
  padding-bottom: 14px;
  padding-top: 14px;
}

.featured-collections--carousel .category-carousel-controls {
  gap: 10px;
}

.featured-collections--carousel .category-carousel-button {
  background: transparent;
  border-color: rgba(38, 35, 31, 0.22);
  border-radius: 999px;
  color: rgba(38, 35, 31, 0.55);
  height: 44px;
  transition: border-color 0.3s ease, color 0.3s ease;
  width: 44px;
}

.featured-collections--carousel .category-carousel-button:hover {
  background: transparent;
  border-color: var(--color-ink);
  color: var(--color-ink);
}

.featured-collections-track {
  background: transparent;
  display: flex;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-behavior: smooth;
  scroll-padding-inline: clamp(18px, 4vw, 70px);
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  /* pan-y must stay allowed: with pan-x alone, a vertical swipe that
     starts on this strip cannot scroll the page at all. */
  touch-action: pan-x pan-y;
  -webkit-overflow-scrolling: touch;
}

.featured-collections-track::-webkit-scrollbar {
  display: none;
}

.featured-collections-track .featured-collection-card {
  border-right: none;
  flex: 0 0 clamp(250px, 28vw, 380px);
  min-height: clamp(240px, 24vw, 320px);
  padding: clamp(28px, 4vw, 52px) clamp(22px, 3vw, 38px);
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

.featured-collections--solo .featured-collections-track .featured-collection-card {
  border-right: 0;
  flex-basis: 100%;
}

.featured-collection-card {
  background: var(--color-deep);
  color: var(--color-paper);
  display: flex;
  flex-direction: column;
  gap: clamp(18px, 2.5vw, 36px);
  padding: clamp(52px, 8vw, 104px) clamp(24px, 4vw, 70px);
  text-decoration: none;
  transition: background 0.5s ease;
}

.featured-collections--carousel .featured-collection-card {
  background: transparent;
  color: var(--color-ink);
}

.featured-collections--solo .featured-collection-card {
  align-items: center;
  text-align: center;
}

.featured-collection-card:hover {
  background: rgba(255, 255, 255, 0.03);
}

.featured-collections--carousel .featured-collection-card:hover {
  background: rgba(38, 35, 31, 0.025);
}

.featured-collection-title {
  font-family: var(--serif);
  font-size: clamp(3.2rem, 6.5vw, 6rem);
  font-weight: 400;
  letter-spacing: -0.045em;
  line-height: 0.92;
  margin: 0;
}

.featured-collections-track .featured-collection-title {
  font-size: clamp(2rem, 3.4vw, 3.4rem);
  letter-spacing: -0.012em;
  line-height: 1;
  overflow-wrap: anywhere;
}

.featured-collection-desc {
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.05rem;
  line-height: 1.72;
  margin: 0;
  max-width: 460px;
}

.featured-collections--carousel .featured-collection-desc {
  color: var(--color-muted);
  font-size: 0.95rem;
  line-height: 1.65;
  max-width: 320px;
}

.featured-collection-card .eyebrow {
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
}

.featured-collections--carousel .featured-collection-card .eyebrow {
  color: var(--color-muted);
  opacity: 0.7;
}

.featured-collection-card .text-link {
  color: rgba(255, 255, 255, 0.6);
  margin-top: clamp(6px, 1.5vw, 18px);
  transition: color 0.3s ease;
}

.featured-collections--carousel .featured-collection-card .text-link {
  color: var(--color-ink);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  margin-top: auto;
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.featured-collections--carousel .featured-collection-card .text-link::after {
  display: none;
}

.featured-collection-card:hover .text-link {
  color: var(--color-paper);
}

.featured-collections--carousel .featured-collection-card:hover .text-link {
  color: var(--color-ink);
  opacity: 1;
}

.featured-grid-section {
  background:
    linear-gradient(180deg, var(--color-page-warm) 0%, var(--color-page) 28%);
}

.home-story-return {
  margin-top: 0;
}

.home-empty-catalog {
  margin-left: clamp(18px, 4vw, 70px);
  margin-right: clamp(18px, 4vw, 70px);
  max-width: min(680px, calc(100vw - 36px));
}

@media (max-width: 768px) {
  .hm-header-top {
    border-radius: 999px;
    gap: 2px;
    justify-content: flex-start;
    padding: 5px;
  }

  .hm-menu-button,
  .hm-header-icons {
    display: inline-flex;
  }

  .hm-header-icons {
    margin-left: auto;
  }

  /* The text links move into the site's mobile menu. */
  .hm-nav-group {
    display: none;
  }

  .hm-brand {
    font-size: 1.38rem;
    line-height: 1.08;
    max-width: none;
  }


  .hm-header-top .market-selector select {
    max-width: 74px;
    min-height: 30px;
  }

  .hm-nav-text {
    font-size: 0.62rem;
    letter-spacing: 0.16em;
  }

  .hm-brand.hm-nav-text {
    font-size: 1.32rem;
    line-height: 1;
    letter-spacing: -0.02em;
    padding-left: 4px;
  }

  .hm-ui-layer {
    gap: 28px;
    padding: 1rem 1.25rem 2.4rem;
  }

  .hm-hero-body {
    gap: 26px;
    grid-template-columns: minmax(0, 1fr);
  }

  .hm-prompt-main {
    font-size: clamp(2.2rem, 10.5vw, 2.8rem);
  }

  .hm-hero-actions {
    gap: 10px;
  }

  .hm-hero-action {
    flex: 1 1 140px;
    min-height: 44px;
    min-width: 0;
  }

  /* Phones show the first four tiles, square, two across. */
  .hm-tiles {
    gap: 10px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hm-tile:nth-child(2),
  .hm-tile:nth-child(6) {
    grid-column: auto;
  }

  .hm-tile a,
  .hm-tile:nth-child(2) a,
  .hm-tile:nth-child(6) a {
    aspect-ratio: 1 / 1;
  }

  .hm-tile:nth-child(n + 5) {
    display: none;
  }

  .featured-collections {
    grid-template-columns: 1fr;
  }

  .featured-collections-toolbar {
    padding: 14px 18px;
  }

  .featured-collections-track {
    scroll-padding-inline: 18px;
  }

  .home-trust-band p {
    font-size: 0.6rem;
    letter-spacing: 0.12em;
    padding: 14px 6px;
  }

  .home-shop-accelerator {
    grid-template-columns: 1fr;
    padding-bottom: 54px;
    padding-top: 48px;
  }

  .home-shop-accelerator-copy {
    position: static;
  }

  .home-shop-accelerator-copy h2 {
    font-size: clamp(2.35rem, 11vw, 4rem);
  }

  .home-shop-accelerator-products {
    display: flex;
    gap: 14px;
    margin: 0 -18px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    padding: 0 18px 6px;
    scroll-padding-inline: 18px;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .home-shop-accelerator-products::-webkit-scrollbar {
    display: none;
  }

  .home-shop-accelerator-products > * {
    flex: 0 0 min(74vw, 300px);
    scroll-snap-align: start;
  }


  .featured-collection-card {
    padding: 42px 24px;
  }

  .featured-collections-track .featured-collection-card {
    flex-basis: min(82vw, 340px);
    gap: 20px;
    min-height: 220px;
    padding: 28px 22px;
  }

  .featured-collection-title {
    font-size: clamp(2.4rem, 10vw, 3.6rem);
  }

  .featured-collections-track .featured-collection-title {
    font-size: clamp(2rem, 10vw, 2.85rem);
  }

}

@media (max-width: 768px) and (max-height: 680px) {
  .hm-brand,
  .hm-brand.hm-nav-text {
    font-size: 1.25rem;
  }
}

@media (max-width: 480px) {
  .featured-collections-track .featured-collection-card {
    flex-basis: min(calc(100vw - 36px), 340px);
    min-height: 210px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hm-tile img {
    transition: none;
  }
}

/* ── Karina of Time teaser ──
   A pocket dusk sky linking to the journal; the drifting cloud tile is
   the journal's own procedural billow layer. */
.home-journal-teaser {
  padding: clamp(48px, 8vw, 96px) clamp(20px, 5vw, 70px);
}

.journal-teaser-card {
  background: linear-gradient(180deg, #100d0a 0%, #3a2b1e 55%, #9a6b52 100%);
  border-radius: 28px;
  box-shadow: 0 30px 70px rgba(20, 15, 10, 0.35);
  color: #f2ece1;
  display: block;
  isolation: isolate;
  margin: 0 auto;
  max-width: 1060px;
  overflow: hidden;
  position: relative;
  text-decoration: none;
  transition: transform 300ms ease, box-shadow 300ms ease;
}

.journal-teaser-card:hover {
  box-shadow: 0 36px 84px rgba(20, 15, 10, 0.45);
  transform: translateY(-3px);
}

.journal-teaser-card:focus-visible {
  outline: 2px solid #f2ece1;
  outline-offset: 4px;
}

.journal-teaser-sky {
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  position: absolute;
}

.journal-teaser-cloud {
  animation: homeTeaserDrift 140s linear infinite;
  background-image: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='1600'%20height='900'%3E%3Cfilter%20id='b'%20x='0'%20y='0'%20width='100%25'%20height='100%25'%3E%3CfeTurbulence%20type='fractalNoise'%20baseFrequency='0.0011%200.0032'%20numOctaves='5'%20seed='9'%20stitchTiles='stitch'/%3E%3CfeColorMatrix%20type='matrix'%20values='0%200%200%200%200.94%200%200%200%200%200.78%200%200%200%200%200.62%201.15%201.15%201.15%200%20-1.02'/%3E%3C/filter%3E%3Crect%20width='100%25'%20height='100%25'%20filter='url(%23b)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 1600px 900px;
  inset: 0 -1600px 0 0;
  opacity: 0.55;
  position: absolute;
  will-change: transform;
}

@keyframes homeTeaserDrift {
  to { transform: translate3d(-1600px, 0, 0); }
}

.journal-teaser-copy {
  align-content: center;
  display: grid;
  gap: 14px;
  justify-items: center;
  min-height: 300px;
  padding: clamp(32px, 5vw, 56px);
  position: relative;
  text-align: center;
  z-index: 1;
}

.journal-teaser-eyebrow {
  font-family: 'Courier Prime', 'Courier New', ui-monospace, monospace;
  font-size: 0.68rem;
  letter-spacing: 0.32em;
  opacity: 0.7;
  text-transform: uppercase;
}

.journal-teaser-title {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(2rem, 4.4vw, 3.2rem);
  line-height: 1.05;
  text-shadow: 0 2px 24px rgba(10, 8, 6, 0.4);
}

.journal-teaser-line {
  font-size: 0.98rem;
  line-height: 1.65;
  max-width: 52ch;
  opacity: 0.78;
}

.journal-teaser-line [lang='el'] {
  font-family: Georgia, 'Times New Roman', serif;
  font-style: italic;
}

.journal-teaser-cta {
  font-family: 'Courier Prime', 'Courier New', ui-monospace, monospace;
  font-size: 0.7rem;
  letter-spacing: 0.24em;
  margin-top: 8px;
  opacity: 0.85;
  text-transform: uppercase;
  transition: opacity 240ms ease;
}

.journal-teaser-card:hover .journal-teaser-cta {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .journal-teaser-cloud {
    animation: none;
  }

  .journal-teaser-card {
    transition: none;
  }
}
`;
