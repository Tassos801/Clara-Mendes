import {useEffect, useRef} from 'react';
import {
  Link,
  useLoaderData,
  useNavigate,
  useRouteLoaderData,
} from 'react-router';
import type {Route} from './+types/_index';
import type {loader as rootLoader} from '~/root';
import type {ClaraCardProduct} from '~/components/ClaraProductCard';
import {HeroTiles} from '~/components/HeroTiles';
import {NAV_LINKS} from '~/lib/navLinks';
import {BRAND} from '~/content/brand';
import {NewsletterForm} from '~/components/NewsletterForm';
import {HomepageEditorial} from '~/components/HomepageEditorial';
import {ClothingFeature} from '~/components/ClothingFeature';
import {ArtistShopsFeature} from '~/components/ArtistShopsFeature';
import {artistFeature} from '~/lib/artistShops';
import {listShopCapsules, shopCapsulePath} from '~/lib/capsules';
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
  isDemoProduct,
  isReleasedExtensionHandle,
  isReleasedProductHandle,
} from '~/lib/catalogFilters';
import {CLASSIC_FRAME_HANDLE} from '~/lib/classicFrame';
import {
  buildOriginalArtProductMap,
  type OriginalArtProductMap,
} from '~/lib/originalArt';
import {
  LEAD_PRINT_HANDLES,
  LEAD_PRINTS_QUERY_FIRST,
  leadPrintsQuery,
} from '~/lib/leadPrints';
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
import {
  BOOK_NOOK_PRODUCT_TYPE,
  BOOK_NOOKS_PATH,
  bookNookDeliveryPhrase,
  buildBookNookShelf,
  releasedBookNooks,
} from '~/lib/bookNooks';

const HERO_INTERIOR_MOBILE = '/images/backdrops/hero-interior-mobile.webp';

// Artist shops from catalog data, like the site header's Artists link.
const ARTIST_FEATURE = artistFeature();
const MUSEUM_COLLECTIONS = listShopCapsules()
  .filter((capsule) => capsule.kind === 'museum')
  .map((capsule) => ({
    path: shopCapsulePath(capsule.slug),
    title: capsule.title,
  }));

export const meta: Route.MetaFunction = ({data}) => {
  return buildSeoMeta({
    description: BRAND.seo.homeDescription,
    title: BRAND.seo.homeTitle,
    url: data?.seoUrl ?? `${STOREFRONT_ORIGIN}/`,
  });
};

// The hero background is a CSS image, which browsers discover only after
// the stylesheet parses — preloading it moves LCP earlier. Phones get a
// 1700 px WebP (about 90 KB) instead of the 2560 px JPEG (about 680 KB);
// the media queries match the stylesheet so only one file is fetched.
export const links: Route.LinksFunction = () => [
  {rel: 'stylesheet', href: artistFeatureStyles},
  {
    as: 'image',
    href: '/images/backdrops/hero-interior.jpg',
    media: '(min-width: 721px)',
    rel: 'preload',
  },
  {
    as: 'image',
    href: HERO_INTERIOR_MOBILE,
    media: '(max-width: 720px)',
    rel: 'preload',
    type: 'image/webp',
  },
];

export async function loader({context, request}: Route.LoaderArgs) {
  // The homepage never fails because clothing could not load.
  const clothing = loadClothingProducts(context.storefront)
    .catch(() => [] as ClothingProduct[])
    .then(clothingFeaturePicks);
  try {
    const data = await context.storefront.query(HOMEPAGE_QUERY, {
      variables: {
        // Live state for the lead print of every studio capsule, by catalog
        // tag; the catalog, not this query, decides which prints exist.
        artFirst: LEAD_PRINTS_QUERY_FIRST,
        artQuery: leadPrintsQuery(),
        // The sentinel tag matches nothing until a nook is released.
        bookNookQuery: releasedBookNooks().length
          ? `product_type:"${BOOK_NOOK_PRODUCT_TYPE}"`
          : 'tag:"__no-book-nooks__"',
        frameHandle: isReleasedExtensionHandle(CLASSIC_FRAME_HANDLE)
          ? CLASSIC_FRAME_HANDLE
          : '__frame-not-released__',
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
      leadPrintProducts: buildOriginalArtProductMap(
        (data.leadPrints?.nodes ?? []) as ClaraCardProduct[],
        LEAD_PRINT_HANDLES,
      ),
      frameProduct:
        data.frameProduct && !isDemoProduct(data.frameProduct)
          ? (data.frameProduct as ClaraCardProduct)
          : null,
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
      frameProduct: null as ClaraCardProduct | null,
      leadPrintProducts: {} as OriginalArtProductMap,
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

export default function Homepage() {
  const {
    bookNookDelivery,
    bookNookShelf,
    caseTeaser,
    clothingPicks,
    frameProduct,
    leadPrintProducts,
    seoUrl,
  } = useLoaderData<typeof loader>();
  const welcomeCode =
    useRouteLoaderData<typeof rootLoader>('root')?.newsletter.welcomeCode ??
    null;
  const {open, type: asideType} = useAside();
  const navigate = useNavigate();
  const blurRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const outlineRef = useRef<HTMLDivElement | null>(null);
  const orbRef = useRef<HTMLButtonElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const subRef = useRef<HTMLParagraphElement | null>(null);

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
              {NAV_LINKS.map(({to, label}) => (
                <Link key={to} to={to} className="hm-nav-text" prefetch="intent">
                  {label}
                </Link>
              ))}
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

          <div className="hm-hero-text">
            <h1 ref={titleRef} id="home-title" className="hm-prompt-main">
              {BRAND.hero.headline}
            </h1>
            <p ref={subRef} className="hm-prompt-sub">
              {BRAND.hero.line}
            </p>
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
          </div>

          <div className="hm-coords">{BRAND.hero.footnote}</div>

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
        className="home-curiosity"
        aria-labelledby="home-curiosity-title"
      >
        <div className="hc-body">
          <div className="hc-text">
            <p className="eyebrow">{BRAND.curiosity.eyebrow}</p>
            <h2 id="home-curiosity-title" className="hc-title">
              {BRAND.curiosity.title}
            </h2>
            <p className="hc-line">{BRAND.curiosity.line}</p>
          </div>

          <HeroTiles />
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

      <OriginalArtPreview products={leadPrintProducts} compact />

      <ArtistShopsFeature
        artists={ARTIST_FEATURE.artists}
        collections={MUSEUM_COLLECTIONS}
        families={ARTIST_FEATURE.families}
      />

      <YourSkyTeaser />

      <ClothingFeature picks={clothingPicks} />

      <BookNookShelf delivery={bookNookDelivery} items={bookNookShelf} />

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

      <BrandFilm className="home-film" chapter="linen" eyebrow="The film" />

      <HomepageEditorial />

      {frameProduct ? <FramedArtFeature product={frameProduct} /> : null}

      <section className="story-section home-story-return" data-chapter="ink">
        <div className="story-image" aria-hidden />
        <div className="story-copy" data-reveal>
          <p className="eyebrow">{BRAND.storyBand.eyebrow}</p>
          <h2>{BRAND.storyBand.title}</h2>
          <p>{BRAND.storyBand.body}</p>
          <Link className="text-link" to="/our-story">
            {BRAND.storyBand.cta}
          </Link>
        </div>
      </section>

      <section
        className="home-journal-teaser"
        data-chapter="ink"
        aria-label="Letters from Nicosia — sign up"
      >
        <div className="journal-teaser-card" data-reveal>
          <div className="journal-teaser-sky" aria-hidden>
            <div className="journal-teaser-cloud" />
          </div>
          <div className="journal-teaser-copy">
            <span className="journal-teaser-eyebrow">{BRAND.newsletter.eyebrow}</span>
            <span className="journal-teaser-title">{BRAND.newsletter.title}</span>
            <span className="journal-teaser-line">{BRAND.newsletter.body(welcomeCode)}</span>
            <NewsletterForm variant="feature" />
            <Link className="journal-teaser-cta" to="/blogs/karina-of-time" prefetch="intent">
              {BRAND.newsletter.journalLink}
            </Link>
          </div>
        </div>
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
    $frameHandle: String!
    $language: LanguageCode
    $toughCaseHandle: String!
  ) @inContext(country: $country, language: $language) {
    leadPrints: products(first: $artFirst, query: $artQuery) {
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

@media (max-width: 720px) {
  .hm-layer-sharp,
  .hm-layer-blur {
    background-image: url(/images/backdrops/hero-interior-mobile.webp);
  }
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
  gap: clamp(1rem, 1.6vw, 3rem);
}

/* One line per link; narrower desktops tighten the type below instead. */
.hm-nav-group .hm-nav-text {
  white-space: nowrap;
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
  flex-shrink: 0;
  white-space: nowrap;
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
  margin-inline: auto;
  max-width: 16ch;
  text-wrap: balance;
  color: var(--hm-text-main);
  opacity: 0;
  animation: hmFadeInSlow 3s var(--hm-ease-fluid) forwards 0.5s;
}

.hm-prompt-sub {
  font-family: var(--hm-font-serif);
  font-size: clamp(1.05rem, 1.5vw, 1.35rem);
  text-transform: none;
  letter-spacing: 0;
  line-height: 1.5;
  color: var(--hm-text-muted);
  max-width: 34ch;
  margin: 0 auto;
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
  line-height: 1.6;
  /* Stops short of the centred "Enter the shop" label. */
  max-width: calc(50% - 10rem);
  color: rgba(255,255,255,0.35);
  opacity: 0;
  animation: hmFadeInSlow 3s var(--hm-ease-fluid) forwards 2s;
}

/* ── So far: the curiosity grid ── directly under the full-screen hero.
   Four columns, the Hokusai and the book nook each two wide, so the eye
   reads a cabinet of very different things. */
.home-curiosity {
  --hm-text-main: #26231f;
  --hm-text-muted: rgba(38, 35, 31, 0.8);
  --hm-ease-fluid: cubic-bezier(0.25, 1, 0.5, 1);
  --hm-font-serif: Georgia, 'Times New Roman', serif;
  --hm-font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  position: relative;
  background-color: var(--color-soft);
  color: var(--hm-text-main);
  font-family: var(--hm-font-sans);
  -webkit-font-smoothing: antialiased;
  isolation: isolate;
  padding: clamp(48px, 7vw, 96px) 5rem;
}

.hc-body {
  align-items: center;
  display: grid;
  gap: clamp(32px, 5vw, 80px);
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
}

.hc-text {
  max-width: 34rem;
}

.hc-title {
  font-family: var(--hm-font-serif);
  font-size: clamp(2.6rem, 5.2vw, 4.6rem);
  line-height: 1.02;
  font-weight: 400;
  letter-spacing: -0.025em;
  margin: 0 0 1.2rem;
  color: var(--hm-text-main);
  text-wrap: balance;
}

.hc-line {
  font-family: var(--hm-font-serif);
  font-size: clamp(1.05rem, 1.5vw, 1.35rem);
  line-height: 1.5;
  color: var(--hm-text-muted);
  margin: 0;
  max-width: 30ch;
}

.hc-tiles {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  list-style: none;
  margin: 0;
  padding: 0;
}

.hc-tile {
  min-width: 0;
}

.hc-tile a {
  aspect-ratio: 4 / 5;
  background: #ded7cb;
  border-radius: 6px;
  display: block;
  overflow: hidden;
  position: relative;
}

.hc-tile:nth-child(2) a,
.hc-tile:nth-child(6) a {
  aspect-ratio: 8 / 5;
}

.hc-tile:nth-child(2),
.hc-tile:nth-child(6) {
  grid-column: span 2;
}

.hc-tile img {
  display: block;
  height: 100%;
  object-fit: cover;
  transition: transform 900ms var(--hm-ease-fluid);
  width: 100%;
}

.hc-tile a:hover img,
.hc-tile a:focus-visible img {
  transform: scale(1.03);
}

.hc-tile a:focus-visible {
  outline: 2px solid #26231f;
  outline-offset: 3px;
}

.hc-tile-tag {
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

.home-story-return {
  margin-top: 0;
}

@keyframes hmFadeInSlow {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes hmOrbPulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.2; }
  50% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
}

/* Narrower desktops: the full navigation list still fits the header pill
   on one line (measured with the brand at 769-1360px). Scoped to the nav
   group so the brand keeps its own size. */
@media (max-width: 1360px) {
  .hm-ui-layer {
    padding-left: 2.5rem;
    padding-right: 2.5rem;
  }

  .hm-nav-group {
    gap: 12px;
  }

  .hm-nav-group .hm-nav-text {
    font-size: 0.66rem;
    letter-spacing: 0.12em;
  }
}

@media (max-width: 960px) {
  .hm-ui-layer {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }

  .hm-nav-group {
    gap: 8px;
  }

  .hm-nav-group .hm-nav-text {
    font-size: 0.6rem;
    letter-spacing: 0.06em;
  }

  .hm-brand {
    font-size: 1.45rem;
  }
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
    color: rgba(255, 255, 255, 0.9);
    font-size: 1.02rem;
    letter-spacing: 0;
    line-height: 1.5;
    margin-inline: auto;
    max-width: 30ch;
    text-shadow: 0 1px 14px rgba(0, 0, 0, 0.35);
  }

  .hm-prompt-main {
    text-shadow: 0 2px 24px rgba(0, 0, 0, 0.18);
  }

  .hm-hero-actions {
    flex-direction: column;
    gap: 10px;
    margin-top: 24px;
  }

  .hm-hero-action {
    min-height: 46px;
    width: min(240px, 100%);
  }

  /* "Enter the shop" repeats "See what we made"; phones keep one action. */
  .hm-interaction-anchor {
    display: none;
  }

  .hm-coords {
    bottom: 1.8rem;
    color: rgba(255, 255, 255, 0.72);
    left: 1.25rem;
    max-width: none;
    right: 1.25rem;
    text-align: center;
    text-shadow: 0 1px 10px rgba(0, 0, 0, 0.35);
  }

  .hm-cursor-dot,
  .hm-cursor-outline {
    display: none;
  }

  .home-curiosity {
    padding: 2.4rem 1.25rem;
  }

  .hc-body {
    gap: 26px;
    grid-template-columns: minmax(0, 1fr);
  }

  .hc-title {
    font-size: clamp(2.2rem, 10.5vw, 2.8rem);
  }

  /* Phones show the first four tiles, square, two across. */
  .hc-tiles {
    gap: 10px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hc-tile:nth-child(2),
  .hc-tile:nth-child(6) {
    grid-column: auto;
  }

  .hc-tile a,
  .hc-tile:nth-child(2) a,
  .hc-tile:nth-child(6) a {
    aspect-ratio: 1 / 1;
  }

  .hc-tile:nth-child(n + 5) {
    display: none;
  }

  .home-trust-band p {
    font-size: 0.6rem;
    letter-spacing: 0.12em;
    padding: 14px 6px;
  }
}

@media (max-width: 768px) and (max-height: 680px) {
  .hm-ui-layer {
    display: grid;
    /* One full-width column; the flex layout's space-between would
       otherwise shrink it to its content. */
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) auto;
    padding: 1rem 1.25rem 2.2rem;
    row-gap: 8px;
  }

  .hm-brand,
  .hm-brand.hm-nav-text {
    font-size: 1.25rem;
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
    font-size: 0.92rem;
    line-height: 1.45;
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

  .hc-tile img {
    transition: none;
  }
}

/* ── Letters from Nicosia ──
   A pocket dusk sky holding the email sign-up, with a link on to the
   journal; the drifting cloud tile is the journal's own procedural billow
   layer. The card is a div, not a link: a form cannot live in an anchor. */
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

.journal-teaser-cta {
  font-family: 'Courier Prime', 'Courier New', ui-monospace, monospace;
  font-size: 0.7rem;
  letter-spacing: 0.24em;
  margin-top: 8px;
  opacity: 0.85;
  text-transform: uppercase;
  transition: opacity 240ms ease;
}

.journal-teaser-card:hover .journal-teaser-cta,
.journal-teaser-cta:focus-visible {
  opacity: 1;
}

.journal-teaser-cta:focus-visible {
  outline: 2px solid #f2ece1;
  outline-offset: 4px;
}

.journal-teaser-copy .newsletter--feature { margin: 22px 0 6px; max-width: 520px; width: 100%; }
.journal-teaser-copy .newsletter__row { display: flex; gap: 8px; }
.journal-teaser-copy .newsletter__input {
  background: rgba(251, 250, 246, 0.14); border: 1px solid rgba(251, 250, 246, 0.45);
  border-radius: 999px; color: #fbfaf6; flex: 1 1 auto; font-size: 1rem; margin: 0; min-height: 46px; min-width: 0; padding: 0 18px;
}
.journal-teaser-copy .newsletter__input::placeholder { color: rgba(251, 250, 246, 0.6); }
.journal-teaser-copy .newsletter__button {
  background: #fbfaf6; border: 0; border-radius: 999px; color: #26231f; cursor: pointer;
  font-size: 0.74rem; font-weight: 600; letter-spacing: 0.14em; min-height: 46px; padding: 0 20px; text-transform: uppercase; white-space: nowrap;
}
.journal-teaser-copy .newsletter__button:disabled { opacity: 0.7; cursor: default; }
.journal-teaser-copy .newsletter__input:focus-visible,
.journal-teaser-copy .newsletter__button:focus-visible { outline: 2px solid #fbfaf6; outline-offset: 2px; }
.journal-teaser-copy .newsletter__message { font-size: 0.95rem; margin: 10px 0 0; }
.journal-teaser-copy .newsletter__message.is-error { color: #f3c9b8; }
.journal-teaser-copy .newsletter__consent { font-size: 0.76rem; margin: 8px 0 0; opacity: 0.8; }
.journal-teaser-copy .newsletter__consent a { color: inherit; text-decoration: underline; }
.journal-teaser-copy .newsletter__label,
.journal-teaser-copy .newsletter__trap { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
@media (max-width: 560px) { .journal-teaser-copy .newsletter__row { flex-direction: column; } }

@media (prefers-reduced-motion: reduce) {
  .journal-teaser-cloud {
    animation: none;
  }
}
`;
