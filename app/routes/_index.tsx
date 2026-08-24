import {useEffect, useRef} from 'react';
import {Link, useLoaderData, useNavigate} from 'react-router';
import type {Route} from './+types/_index';
import {
  ClaraProductCard,
  type ClaraCardProduct,
} from '~/components/ClaraProductCard';
import {HomepageEditorial} from '~/components/HomepageEditorial';
import {FramedArtFeature} from '~/components/FramedArtFeature';
import {OriginalArtPreview} from '~/components/OriginalArtPreview';
import {StructuredData} from '~/components/StructuredData';
import {useAside} from '~/components/Aside';
import {
  filterDemoCollections,
  filterDemoProducts,
  ORIGINAL_ART_COLLECTIONS,
} from '~/lib/catalogFilters';
import {
  buildOriginalArtQuery,
  buildOriginalArtProductMap,
  ORIGINAL_ART_QUERY_FIRST,
  type OriginalArtProductMap,
} from '~/lib/originalArt';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/productCardFragment';
import {
  buildSeoMeta,
  getCanonicalUrl,
  organizationSchema,
  websiteSchema,
} from '~/lib/seo';
import {RETURN_WINDOW_DAYS, STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';
import {CLASSIC_FRAME_HANDLE, buildClassicFrameUrl} from '~/lib/classicFrame';

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
    description:
      'Original Clara Mendes art prints in three sizes, plus five selected works as complete ready-to-hang 16 × 20 framed editions in a Natural classic frame.',
    title: 'Original & Framed Art Prints | Clara Mendes',
    url: data?.seoUrl ?? `${STOREFRONT_ORIGIN}/`,
  });
};

// The hero background is a CSS image, which browsers discover only after
// the stylesheet parses — preloading it moves LCP earlier.
export const links: Route.LinksFunction = () => [
  {
    as: 'image',
    href: '/images/backdrops/hero-interior.jpg',
    rel: 'preload',
  },
];

export async function loader({context, request}: Route.LoaderArgs) {
  try {
    const data = await context.storefront.query(HOMEPAGE_QUERY, {
      variables: {
        // Availability for the original-art section is resolved with a
        // dedicated catalog-tag query covering every expected print — the
        // best-selling slice below is presentation-only and must never
        // decide which prints exist.
        artFirst: ORIGINAL_ART_QUERY_FIRST,
        artQuery: buildOriginalArtQuery(),
        // Headroom above the 7 cards rendered, since demo/off-theme
        // products are filtered out after fetching
        first: 12,
        framedHandle: CLASSIC_FRAME_HANDLE,
      },
    });

    return {
      collections: filterDemoCollections(
        data.collections.nodes as HomeCollection[],
      ),
      originalArtProducts: buildOriginalArtProductMap(
        (data.originalArtProducts?.nodes ?? []) as ClaraCardProduct[],
      ),
      framedProduct:
        data.framedProduct &&
        filterDemoProducts([data.framedProduct as ClaraCardProduct]).length > 0
          ? (data.framedProduct as ClaraCardProduct)
          : null,
      products: filterDemoProducts(data.products.nodes as ClaraCardProduct[]),
      seoUrl: getCanonicalUrl(request, '/'),
    };
  } catch {
    return {
      collections: [] as HomeCollection[],
      framedProduct: null as ClaraCardProduct | null,
      originalArtProducts: {} as OriginalArtProductMap,
      products: [] as ClaraCardProduct[],
      seoUrl: getCanonicalUrl(request, '/'),
    };
  }
}

export default function Homepage() {
  const {collections, framedProduct, originalArtProducts, products, seoUrl} =
    useLoaderData<typeof loader>();
  const {open} = useAside();
  const navigate = useNavigate();
  const quickShopProducts = products.slice(0, 3);
  const featuredProducts =
    products.length > 3 ? products.slice(3, 7) : products.slice(0, 4);
  const blurRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const outlineRef = useRef<HTMLDivElement | null>(null);
  const orbRef = useRef<HTMLButtonElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const subRef = useRef<HTMLParagraphElement | null>(null);
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

  useEffect(() => {
    const blur = blurRef.current;
    const dot = dotRef.current;
    const outline = outlineRef.current;
    if (!blur || !dot || !outline) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;
    let raf = 0;
    let isVisible = false;

    const showCursor = () => {
      if (!isVisible) {
        isVisible = true;
        dot.style.opacity = '1';
        outline.style.opacity = '1';
      }
    };

    const onMove = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      dot.style.left = `${mouseX}px`;
      dot.style.top = `${mouseY}px`;
      showCursor();
    };

    const onResize = () => {
      mouseX = window.innerWidth / 2;
      mouseY = window.innerHeight / 2;
    };

    const tick = () => {
      cursorX += (mouseX - cursorX) * 0.1;
      cursorY += (mouseY - cursorY) * 0.1;
      outline.style.left = `${cursorX}px`;
      outline.style.top = `${cursorY}px`;
      blur.style.setProperty('--x', `${(cursorX / window.innerWidth) * 100}%`);
      blur.style.setProperty('--y', `${(cursorY / window.innerHeight) * 100}%`);
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('resize', onResize);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const orb = orbRef.current;
    const outline = outlineRef.current;
    const title = titleRef.current;
    const sub = subRef.current;
    if (!orb || !outline || !title || !sub) return;

    let pressTimer: ReturnType<typeof setTimeout> | null = null;

    const down = () => {
      outline.style.width = '20px';
      outline.style.height = '20px';
      outline.style.backgroundColor = 'rgba(255,255,255,0.1)';
      outline.style.borderColor = 'rgba(255,255,255,0.6)';
      title.style.transition = 'opacity 1s ease';
      title.style.opacity = '0';
      sub.style.transition = 'opacity 1s ease';
      sub.style.opacity = '0';
      pressTimer = setTimeout(() => {
        void navigate('/collections/all');
      }, 950);
    };

    const up = () => {
      if (pressTimer) clearTimeout(pressTimer);
      outline.style.width = '32px';
      outline.style.height = '32px';
      outline.style.backgroundColor = 'transparent';
      outline.style.borderColor = 'rgba(255,255,255,0.3)';
      title.style.opacity = '1';
      sub.style.opacity = '1';
    };

    const enterOrb = () => {
      outline.style.width = '48px';
      outline.style.height = '48px';
      outline.style.borderColor = 'rgba(255,255,255,0.5)';
    };

    orb.addEventListener('mousedown', down);
    orb.addEventListener('mouseup', up);
    orb.addEventListener('mouseenter', enterOrb);
    orb.addEventListener('mouseleave', up);
    orb.addEventListener('touchstart', down);
    orb.addEventListener('touchend', up);

    return () => {
      orb.removeEventListener('mousedown', down);
      orb.removeEventListener('mouseup', up);
      orb.removeEventListener('mouseenter', enterOrb);
      orb.removeEventListener('mouseleave', up);
      orb.removeEventListener('touchstart', down);
      orb.removeEventListener('touchend', up);
      if (pressTimer) clearTimeout(pressTimer);
    };
  }, [navigate]);

  return (
    <div className="commerce-home">
      <style suppressHydrationWarning>{homeCss}</style>
      <StructuredData
        data={[organizationSchema(seoUrl), websiteSchema(seoUrl)]}
      />

      <section className="home-root" aria-labelledby="home-title">
        <div className="hm-layer-sharp" />
        <div ref={blurRef} className="hm-layer-blur" />
        <div className="hm-noise-overlay" />
        <div className="hm-vignette" />

        <div className="hm-ui-layer">
          <header className="hm-header-top">
            <Link to="/" className="hm-nav-text hm-brand">
              Clara Mendes
            </Link>
            <nav className="hm-nav-group" aria-label="Home navigation">
              <Link to="/collections/all" className="hm-nav-text">
                Shop
              </Link>
              <Link
                to={buildClassicFrameUrl('Quiet Form')}
                className="hm-nav-text"
              >
                Framed Art
              </Link>
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
          </header>

          <div className="hm-hero-text">
            <h1 ref={titleRef} id="home-title" className="hm-prompt-main">
              <i>Objects</i> with soul
            </h1>
            <p ref={subRef} className="hm-prompt-sub">
              Original art now. Considered products for collected spaces.
            </p>
            <div className="hm-hero-actions">
              <Link
                className="hm-hero-action hm-hero-action--primary"
                to="/collections/all"
              >
                Shop the edit
              </Link>
              <Link className="hm-hero-action" to="/our-story">
                Our story
              </Link>
            </div>
          </div>

          <div className="hm-coords">
            Five capsules · fifteen original works
          </div>

          <div className="hm-interaction-anchor">
            <button
              ref={orbRef}
              type="button"
              className="hm-orb-btn"
              aria-label="Enter the shop"
              onClick={() => {
                void navigate('/collections/all');
              }}
            />
            <span className="hm-label-enter">Enter the shop</span>
          </div>
        </div>

        <div ref={dotRef} className="hm-cursor-dot" />
        <div ref={outlineRef} className="hm-cursor-outline" />
      </section>

      <section
        className="home-trust-band"
        aria-label="Store service"
        data-chapter="linen"
      >
        <p>Secure Shopify checkout</p>
        <p>Tracked delivery updates</p>
        <p>{RETURN_WINDOW_DAYS}-day returns</p>
      </section>

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
              Browse available Clara Mendes products, then check out through
              Shopify with delivery tracking and clear return terms.
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

          <div
            className="home-shop-accelerator-proof"
            aria-label="Buying support"
          >
            <p>
              <strong>Checkout</strong>
              <span>Shopify protected payment</span>
            </p>
            <p>
              <strong>Delivery</strong>
              <span>Tracking sent after dispatch</span>
            </p>
            <p>
              <strong>Returns</strong>
              <span>{RETURN_WINDOW_DAYS} days from delivery</span>
            </p>
          </div>
        </section>
      ) : null}

      {framedProduct ? <FramedArtFeature product={framedProduct} /> : null}

      <section
        className="collection-intro home-commerce-intro"
        data-chapter="clay"
      >
        <div data-reveal>
          <p className="eyebrow">The Clara Mendes collection</p>
          <h2>
            {products.length > 0
              ? 'Original work, ready to live with.'
              : 'The first print edition is being prepared.'}
          </h2>
        </div>
        <p>
          {products.length > 0
            ? 'The collection begins with original prints and leaves room for considered objects and editions to follow.'
            : 'Fifteen original art prints lead the new collection, with future product types introduced only when they meet the same creative and production standards.'}
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

      <HomepageEditorial />

      <OriginalArtPreview products={originalArtProducts} compact />

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
          <p className="eyebrow">Original art collection</p>
          <h2>Explore the complete first print edition.</h2>
          <p>
            Browse all fifteen works now. Product pages and secure Shopify
            checkout appear automatically as each print becomes available.
          </p>
          <Link className="primary-button" to="/collections/all">
            Browse the print collection
          </Link>
        </section>
      )}

      <section className="story-section home-story-return" data-chapter="ink">
        <div className="story-image" aria-hidden />
        <div className="story-copy" data-reveal>
          <p className="eyebrow">Considered editions</p>
          <h2>Original art first, room to grow.</h2>
          <p>
            New product types can join the collection over time, each with clear
            production details, delivery expectations, and a simple checkout
            path.
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
    $country: CountryCode
    $first: Int!
    $framedHandle: String!
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: $first, sortKey: BEST_SELLING) {
      nodes {
        ...ClaraProductCard
      }
    }
    originalArtProducts: products(first: $artFirst, query: $artQuery) {
      nodes {
        ...ClaraProductCard
      }
    }
    framedProduct: product(handle: $framedHandle) {
      ...ClaraProductCard
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
     falls back to the solid paper body background without WebGL */
  background: rgba(251, 250, 246, 0.85);
}

.home-root {
  --hm-bg-base: #6B655B;
  --hm-bg-overlay: rgba(107, 101, 91, 0.85);
  --hm-text-main: #ffffff;
  --hm-text-muted: rgba(255, 255, 255, 0.7);
  --hm-ease-fluid: cubic-bezier(0.25, 1, 0.5, 1);
  --hm-font-serif: Georgia, 'Times New Roman', serif;
  --hm-font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  position: relative;
  min-height: 94svh;
  overflow: hidden;
  background-color: var(--hm-bg-base);
  color: var(--hm-text-main);
  font-family: var(--hm-font-sans);
  -webkit-font-smoothing: antialiased;
  isolation: isolate;
}

@media (hover: hover) and (pointer: fine) {
  .home-root,
  .home-root * {
    cursor: none;
  }
}

.hm-layer-sharp {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background-image: url(/images/backdrops/hero-interior.jpg);
  background-size: cover;
  background-position: center;
  z-index: 1;
  filter: sepia(0.2) grayscale(0.2);
}

.hm-layer-blur {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background-image: url(/images/backdrops/hero-interior.jpg);
  background-size: cover;
  background-position: center;
  filter: blur(30px) brightness(0.8) sepia(0.3);
  transform: scale(1.1);
  z-index: 2;
  mask-image: radial-gradient(circle 350px at var(--x, 50%) var(--y, 50%), transparent 0%, black 100%);
  -webkit-mask-image: radial-gradient(circle 350px at var(--x, 50%) var(--y, 50%), transparent 0%, black 100%);
}

.hm-noise-overlay {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 3;
  opacity: 0.08;
  pointer-events: none;
  mix-blend-mode: overlay;
  background-image: url(data:image/svg+xml,%3Csvg%20viewBox=%220%200%20200%20200%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter%20id=%22noiseFilter%22%3E%3CfeTurbulence%20type=%22fractalNoise%22%20baseFrequency=%220.8%22%20numOctaves=%223%22%20stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect%20width=%22100%25%22%20height=%22100%25%22%20filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E);
}

.hm-noise-overlay::after {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: var(--hm-bg-overlay);
  mix-blend-mode: multiply;
}

.hm-ui-layer {
  position: relative;
  z-index: 10;
  width: 100%;
  min-height: 94svh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4rem 5rem;
  pointer-events: none;
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
    linear-gradient(135deg, rgba(255,255,255,0.16), transparent 48%),
    rgba(24, 22, 18, 0.24);
  border: 1px solid rgba(255,255,255,0.24);
  border-radius: 24px;
  box-shadow:
    0 18px 46px rgba(10, 9, 7, 0.2),
    inset 0 1px 0 rgba(255,255,255,0.28),
    inset 0 -1px 0 rgba(0,0,0,0.12);
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

.hm-brand {
  font-family: var(--hm-font-serif);
  font-size: 1.8rem;
  font-weight: 400;
  letter-spacing: -0.02em;
  font-style: italic;
  text-transform: none;
}

.hm-hero-text {
  position: absolute;
  top: 48%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  width: 100%;
  pointer-events: none;
}

.hm-prompt-main {
  font-family: var(--hm-font-serif);
  font-size: clamp(3.2rem, 7vw, 5rem);
  line-height: 1.1;
  font-weight: 400;
  letter-spacing: -0.02em;
  margin: 0 0 2rem;
  color: var(--hm-text-main);
  opacity: 0;
  animation: hmFadeInSlow 3s var(--hm-ease-fluid) forwards 0.5s;
}

.hm-prompt-main i { font-style: italic; }

.hm-prompt-sub {
  font-family: var(--hm-font-sans);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  color: var(--hm-text-muted);
  margin: 0;
  opacity: 0;
  animation: hmFadeInSlow 3s var(--hm-ease-fluid) forwards 1.5s;
}

.hm-hero-actions {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: clamp(28px, 4vw, 44px);
  pointer-events: auto;
}

.hm-hero-action {
  align-items: center;
  backdrop-filter: blur(18px) saturate(1.25);
  -webkit-backdrop-filter: blur(18px) saturate(1.25);
  background:
    linear-gradient(135deg, rgba(255,255,255,0.16), transparent 52%),
    rgba(20, 18, 15, 0.26);
  border: 1px solid rgba(255,255,255,0.42);
  border-radius: 999px;
  box-shadow:
    0 12px 30px rgba(10, 9, 7, 0.18),
    inset 0 1px 0 rgba(255,255,255,0.28);
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
  background: rgba(20, 18, 15, 0.38);
  border-color: rgba(255,255,255,0.72);
}

.hm-hero-action--primary {
  background:
    linear-gradient(135deg, rgba(255,255,255,0.82), transparent 58%),
    rgba(251,250,246,0.84);
  border-color: rgba(255,255,255,0.76);
  color: #26231f;
}

.hm-hero-action--primary:hover {
  background: white;
  color: #26231f;
}

.hm-interaction-anchor {
  position: absolute;
  bottom: 4rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  pointer-events: auto;
}

.hm-orb-btn {
  width: 12px;
  height: 12px;
  background: transparent;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.6);
  transition: all 0.6s var(--hm-ease-fluid);
  position: relative;
  overflow: visible;
  padding: 0;
}

.hm-orb-btn::before {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 40px; height: 40px;
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 50%;
  animation: hmOrbPulse 2.8s var(--hm-ease-fluid) infinite;
}

.hm-orb-btn::after {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  border-radius: 50%;
  background: white;
  transform: scale(0);
  transition: transform 1.5s var(--hm-ease-fluid);
}

.hm-orb-btn:active::after { transform: scale(1); }

.hm-orb-btn:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.9);
}

.hm-orb-btn:hover::before {
  animation: none;
  width: 50px; height: 50px;
  border-color: rgba(255,255,255,0.4);
}

.hm-label-enter {
  font-family: var(--hm-font-sans);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--hm-text-muted);
  opacity: 0;
  animation: hmFadeInSlow 3s var(--hm-ease-fluid) forwards 2.2s;
}

.hm-cursor-dot,
.hm-cursor-outline {
  position: fixed;
  top: 0; left: 0;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  z-index: 9999;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.4s ease;
}

.hm-cursor-dot {
  width: 4px; height: 4px;
  background-color: white;
}

.hm-cursor-outline {
  width: 32px; height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: width 0.25s var(--hm-ease-fluid), height 0.25s var(--hm-ease-fluid),
              background-color 0.2s ease, border-color 0.2s ease, opacity 0.4s ease;
}

.hm-vignette {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  background: radial-gradient(
    ellipse 120% 100% at 50% 50%,
    transparent 40%,
    rgba(30, 28, 24, 0.55) 100%
  );
}

.hm-coords {
  position: absolute;
  bottom: 4rem;
  left: 5rem;
  font-family: var(--hm-font-sans);
  font-variant-numeric: tabular-nums;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.35);
  opacity: 0;
  animation: hmFadeInSlow 3s var(--hm-ease-fluid) forwards 2s;
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
    linear-gradient(90deg, var(--color-paper) 0%, #f4f0e8 58%, #dde4d9 100%);
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

.home-shop-accelerator-proof {
  border-top: 1px solid rgba(38, 35, 31, 0.14);
  display: grid;
  gap: 0;
  grid-column: 1 / -1;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.home-shop-accelerator-proof p {
  border-right: 1px solid rgba(38, 35, 31, 0.12);
  display: grid;
  gap: 7px;
  margin: 0;
  padding: clamp(16px, 2.4vw, 28px) clamp(0px, 2vw, 28px);
}

.home-shop-accelerator-proof p:last-child {
  border-right: 0;
}

.home-shop-accelerator-proof strong {
  color: var(--color-ink);
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.home-shop-accelerator-proof span {
  color: var(--color-muted);
  font-size: 0.95rem;
  line-height: 1.45;
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
  background: linear-gradient(180deg, var(--color-soft) 0%, var(--color-paper) 100%);
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
  height: 36px;
  transition: border-color 0.3s ease, color 0.3s ease;
  width: 36px;
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
    linear-gradient(180deg, #f6f2eb 0%, var(--color-paper) 28%);
}

.home-story-return {
  margin-top: 0;
}

.home-empty-catalog {
  margin-left: clamp(18px, 4vw, 70px);
  margin-right: clamp(18px, 4vw, 70px);
  max-width: min(680px, calc(100vw - 36px));
}

@keyframes hmFadeInSlow {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes hmOrbPulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.2; }
  50% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
}

@media (max-width: 768px) {
  .home-root,
  .home-root * {
    cursor: auto;
  }

  .hm-ui-layer {
    padding: 2rem;
  }

  .hm-header-top {
    align-items: flex-start;
    flex-direction: column;
    gap: 1rem;
    padding: 14px;
  }

  .hm-brand {
    font-size: 1.38rem;
    line-height: 1.08;
    max-width: none;
  }

  .hm-nav-group {
    justify-content: space-between;
    gap: 0.7rem;
    width: 100%;
  }

  .hm-nav-group .hm-nav-text {
    align-items: center;
    display: inline-flex;
    min-height: 44px;
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
    font-size: 1.38rem;
    line-height: 1.08;
    letter-spacing: -0.02em;
  }

  .hm-hero-text {
    left: 50%;
    max-width: 340px;
    top: 46%;
    width: calc(100% - 4rem);
  }

  .hm-prompt-main {
    font-size: 2.72rem;
    letter-spacing: -0.01em;
    line-height: 1.04;
    margin-bottom: 1.35rem;
    text-wrap: balance;
  }

  .hm-prompt-sub {
    font-size: 0.64rem;
    letter-spacing: 0.22em;
    line-height: 1.8;
  }

  .hm-hero-actions {
    flex-direction: column;
    gap: 10px;
    margin-top: 24px;
  }

  .hm-hero-action {
    min-height: 42px;
    min-width: min(220px, 100%);
  }

  .hm-interaction-anchor {
    bottom: 4.7rem;
    gap: 1.35rem;
  }

  .hm-coords {
    bottom: 1.8rem;
    left: 2rem;
  }

  .hm-cursor-dot,
  .hm-cursor-outline {
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

  .home-trust-band {
    grid-template-columns: 1fr;
  }

  .home-trust-band p {
    border-bottom: 1px solid rgba(255,255,255,0.12);
    border-right: 0;
    padding: 16px 18px;
  }

  .home-trust-band p:last-child {
    border-bottom: 0;
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
    grid-template-columns: 1fr;
  }

  .home-shop-accelerator-proof {
    grid-template-columns: 1fr;
  }

  .home-shop-accelerator-proof p {
    border-bottom: 1px solid rgba(38, 35, 31, 0.12);
    border-right: 0;
    padding-left: 0;
    padding-right: 0;
  }

  .home-shop-accelerator-proof p:last-child {
    border-bottom: 0;
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

@media (max-width: 480px) {
  .hm-nav-group {
    display: grid;
    gap: 2px 8px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .hm-nav-group .hm-nav-text {
    justify-content: center;
    text-align: center;
  }
}

@media (max-width: 768px) and (max-height: 680px) {
  .hm-ui-layer {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    padding: 1rem 1.25rem 2.2rem;
    row-gap: 8px;
  }

  .hm-header-top {
    border-radius: 20px;
    gap: 0.65rem;
    padding: 10px 12px;
  }

  .hm-brand,
  .hm-brand.hm-nav-text {
    font-size: 1.25rem;
  }

  .hm-nav-group {
    gap: 0.4rem;
  }

  .hm-nav-text {
    font-size: 0.56rem;
    letter-spacing: 0.13em;
  }

  .hm-hero-text {
    align-self: center;
    grid-row: 2;
    justify-self: center;
    left: auto;
    max-width: 300px;
    position: static;
    top: auto;
    transform: none;
    width: 100%;
  }

  .hm-prompt-main {
    font-size: clamp(2.3rem, 14vw, 2.65rem);
    line-height: 1;
    margin-bottom: 0.8rem;
  }

  .hm-prompt-sub {
    font-size: 0.58rem;
    letter-spacing: 0.18em;
    line-height: 1.55;
  }

  .hm-hero-actions {
    gap: 8px;
    margin-top: 14px;
  }

  .hm-hero-action {
    min-height: 38px;
    padding-inline: 16px;
  }

  .hm-interaction-anchor {
    align-self: end;
    bottom: auto;
    gap: 0.85rem;
    grid-row: 3;
    justify-self: center;
    left: auto;
    position: static;
    transform: none;
  }

  .hm-label-enter {
    font-size: 0.62rem;
  }

  .hm-coords {
    bottom: 0.75rem;
    font-size: 0.62rem;
    left: 1.25rem;
  }
}

@media (max-width: 480px) {
  .featured-collections-track .featured-collection-card {
    flex-basis: min(calc(100vw - 36px), 340px);
    min-height: 210px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hm-prompt-main,
  .hm-prompt-sub,
  .hm-coords,
  .hm-label-enter,
  .hm-orb-btn::before {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
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
