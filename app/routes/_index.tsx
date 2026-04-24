import {useEffect, useRef} from 'react';
import {Link, useLoaderData, useNavigate} from 'react-router';
import type {Route} from './+types/_index';
import {
  ClaraProductCard,
  type ClaraCardProduct,
} from '~/components/ClaraProductCard';
import {useAside} from '~/components/Aside';
import {
  filterDemoCollections,
  filterDemoProducts,
  HOME_GOODS_COLLECTIONS,
} from '~/lib/catalogFilters';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/productCardFragment';

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

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'Clara Mendes | Objects with Soul'},
    {
      name: 'description',
      content:
        'Curated supplier-sourced home goods with secure Shopify checkout and tracked fulfillment.',
    },
  ];
};

export async function loader({context}: Route.LoaderArgs) {
  const data = await context.storefront.query(HOMEPAGE_QUERY, {
    variables: {
      first: 8,
    },
  });

  return {
    collections: filterDemoCollections(data.collections.nodes as HomeCollection[]),
    products: filterDemoProducts(data.products.nodes as ClaraCardProduct[]),
  };
}

export default function Homepage() {
  const {collections, products} = useLoaderData<typeof loader>();
  const {open} = useAside();
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
                Collection
              </Link>
              <Link to="/our-story" className="hm-nav-text">
                Our Story
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
              Timeless pieces for mindful living
            </p>
          </div>

          <div className="hm-coords">34.0522 N, 118.2437 W</div>

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

      <section className="collection-intro home-commerce-intro">
        <div>
          <p className="eyebrow">Home goods edit</p>
          <h2>
            {products.length > 0
              ? 'Quiet pieces, ready to live with.'
              : 'Supplier selection is in progress.'}
          </h2>
        </div>
        <p>
          {products.length > 0
            ? 'A restrained selection of pieces chosen for texture, warmth, and rooms that feel collected over time.'
            : 'We are building the first Clara Mendes home catalog around lighting, textiles, ceramics, storage, and small accents.'}
        </p>
      </section>

      <section
        className="category-band"
        aria-label={collections.length > 0 ? 'Collections' : 'Sourcing focus'}
      >
        {collections.length > 0 ? (
          collections.slice(0, 5).map((collection) => (
            <Link key={collection.id} to={`/collections/${collection.handle}`}>
              <small>Collection</small>
              <span>{collection.title}</span>
            </Link>
          ))
        ) : (
          HOME_GOODS_COLLECTIONS.map((collection) => (
            <div className="category-preview-card" key={collection.id}>
              <small>Sourcing</small>
              <span>{collection.title}</span>
            </div>
          ))
        )}
      </section>

      {products.length > 0 ? (
        <section className="featured-grid-section" aria-labelledby="featured">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Featured edit</p>
              <h2 id="featured">Objects available now</h2>
            </div>
            <Link className="text-link" to="/collections/all">
              Shop all
            </Link>
          </div>
          <div className="product-grid">
            {products.slice(0, 4).map((product, index) => (
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
          <p className="eyebrow">Sourcing now</p>
          <h2>The first home-goods edit is being built.</h2>
          <p>
            The storefront is being prepared for supplier-backed home goods.
            Lighting, textiles, ceramics, storage, and accent pieces will
            appear here once vendor partners are confirmed.
          </p>
          <Link className="primary-button" to="/collections/all">
            Preview the catalog
          </Link>
        </section>
      )}

      <section className="story-section home-story-return">
        <div className="story-image" aria-hidden />
        <div className="story-copy">
          <p className="eyebrow">Considered sourcing</p>
          <h2>Atmosphere first, details underneath.</h2>
          <p>
            Every product is selected to support a calm room, then fulfilled
            with clear delivery expectations and a simple checkout path.
          </p>
          <Link className="text-link" to="/our-story">
            Read the story
          </Link>
        </div>
      </section>
    </div>
  );
}

const HOMEPAGE_QUERY = `#graphql
  query Homepage(
    $country: CountryCode
    $first: Int!
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: $first, sortKey: BEST_SELLING) {
      nodes {
        ...ClaraProductCard
      }
    }
    collections(first: 6) {
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
  background: var(--color-paper);
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
  background-image: url('https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=2560&auto=format&fit=crop');
  background-size: cover;
  background-position: center;
  z-index: 1;
  filter: sepia(0.2) grayscale(0.2);
}

.hm-layer-blur {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background-image: url('https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=2560&auto=format&fit=crop');
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
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  border-bottom: 1px solid rgba(255,255,255,0.15);
  padding-bottom: 1.5rem;
}

.hm-nav-group {
  align-items: center;
  display: flex;
  gap: clamp(1.2rem, 3vw, 3rem);
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
    padding-bottom: 1rem;
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
`;
