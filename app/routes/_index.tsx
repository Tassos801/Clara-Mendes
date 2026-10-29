import {useEffect, useRef} from 'react';
import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/_index';
import {LineRail} from '~/components/LineRail';
import {PRIMARY_LINKS} from '~/lib/navLinks';
import {LINE_RAIL_ENTRIES} from '~/lib/lineRail';
import {BRAND} from '~/content/brand';
import {StructuredData} from '~/components/StructuredData';
import {useAside} from '~/components/Aside';
import {
  buildSeoMeta,
  getCanonicalUrl,
  organizationSchema,
  websiteSchema,
} from '~/lib/seo';
import {RETURN_WINDOW_DAYS, STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';
import {
  HERO_BACKDROP,
  HERO_BACKDROP_MEDIA,
  heroBackdropPreloads,
} from '~/lib/heroBackdrop';

/** Set on <html> once the hero's glass pill has scrolled out of view. */
const HOME_PAST_HERO_CLASS = 'home-past-hero';

export const meta: Route.MetaFunction = ({data}) => {
  return buildSeoMeta({
    description: BRAND.seo.homeDescription,
    title: BRAND.seo.homeTitle,
    url: data?.seoUrl ?? `${STOREFRONT_ORIGIN}/`,
  });
};

// The hero background is a CSS image; preload the one file (phone,
// desktop or large) the stylesheet will paint (app/lib/heroBackdrop.ts).
export const links: Route.LinksFunction = () => heroBackdropPreloads();

// Every section is static (the rail is release-gated data; the sign-up is
// the footer's), so the homepage makes no Storefront call; the loader only
// resolves the canonical URL.
export function loader({request}: Route.LoaderArgs) {
  return {seoUrl: getCanonicalUrl(request, '/')};
}

export default function Homepage() {
  const {seoUrl} = useLoaderData<typeof loader>();
  const {open, type: asideType} = useAside();
  const blurRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const outlineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // The custom cursor follows a mouse. Touch screens and reduced motion
    // keep the system cursor (homeCss matches) and skip the frame loop.
    if (
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

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

  // The hero carries its own glass pill, so the global header stays hidden
  // until that pill has scrolled away; then the class on <html> brings the
  // fixed site header back (homeCss), and scrolling up hides it again.
  // Without JavaScript the class never lands and the page is as before.
  useEffect(() => {
    const pill = headerRef.current;
    if (!pill || typeof IntersectionObserver === 'undefined') return;
    const root = document.documentElement;
    const observer = new IntersectionObserver(([entry]) => {
      root.classList.toggle(HOME_PAST_HERO_CLASS, !entry.isIntersecting);
    });
    observer.observe(pill);
    return () => {
      observer.disconnect();
      root.classList.remove(HOME_PAST_HERO_CLASS);
    };
  }, []);

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
          <header ref={headerRef} className="hm-header-top">
            {/* Desktops show the three main links beside search and the
                cart; phones get one calm row (menu, name, search, cart)
                and the site's own mobile menu lists every page. */}
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
              {PRIMARY_LINKS.map(({to, label}) => (
                <Link key={to} to={to} className="hm-nav-text" prefetch="intent">
                  {label}
                </Link>
              ))}
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
            <h1 id="home-title" className="hm-prompt-main">
              {BRAND.hero.headline}
            </h1>
          </div>
        </div>

        <div ref={dotRef} className="hm-cursor-dot" />
        <div ref={outlineRef} className="hm-cursor-outline" />
      </section>

      <LineRail entries={LINE_RAIL_ENTRIES} />

      <p className="home-trust-line" data-chapter="linen">
        <Link to="/policies/shipping-policy">International delivery</Link>
        <span aria-hidden="true"> · </span>
        <Link to="/policies/refund-policy">
          {RETURN_WINDOW_DAYS}-day returns
        </Link>
      </p>
    </div>
  );
}

const homeCss = `
/* The hero's own glass pill stands in for the site header; the fixed
   header returns once that pill has scrolled away (home-past-hero). */
html:has(.home-root):not(.home-past-hero) .site-header {
  display: none !important;
}

html.home-past-hero .site-header {
  animation: homeHeaderIn 320ms cubic-bezier(0.25, 1, 0.5, 1) both;
}

@keyframes homeHeaderIn {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: none; }
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
  min-height: 94vh;
  min-height: 94svh;
  overflow: hidden;
  background-color: var(--hm-bg-base);
  color: var(--hm-text-main);
  font-family: var(--hm-font-sans);
  -webkit-font-smoothing: antialiased;
  isolation: isolate;
}

/* Hidden only where the custom cursor runs (the same gate as its effect). */
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .home-root,
  .home-root * {
    cursor: none;
  }
}

.hm-layer-sharp {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background-image: url(${HERO_BACKDROP.desktop});
  background-size: cover;
  background-position: center;
  z-index: 1;
  filter: sepia(0.2) grayscale(0.2);
}

.hm-layer-blur {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background-image: url(${HERO_BACKDROP.desktop});
  background-size: cover;
  background-position: center;
  filter: blur(30px) brightness(0.8) sepia(0.3);
  transform: scale(1.1);
  z-index: 2;
  mask-image: radial-gradient(circle 350px at var(--x, 50%) var(--y, 50%), transparent 0%, black 100%);
  -webkit-mask-image: radial-gradient(circle 350px at var(--x, 50%) var(--y, 50%), transparent 0%, black 100%);
}

@media ${HERO_BACKDROP_MEDIA.large} {
  .hm-layer-sharp,
  .hm-layer-blur {
    background-image: url(${HERO_BACKDROP.large});
  }
}

@media ${HERO_BACKDROP_MEDIA.mobile} {
  .hm-layer-sharp,
  .hm-layer-blur {
    background-image: url(${HERO_BACKDROP.mobile});
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
  min-height: 94vh;
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

.hm-header-icons {
  align-items: center;
  display: inline-flex;
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

/* Phone-only control; the 768px query shows it. */
.hm-menu-button {
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
  margin: 0 auto;
  max-width: 16ch;
  text-wrap: balance;
  color: var(--hm-text-main);
  opacity: 0;
  animation: hmFadeInSlow 3s var(--hm-ease-fluid) forwards 0.5s;
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

/* One quiet line under the rail; each half opens its policy. */
.home-trust-line {
  color: var(--color-muted);
  font-size: 0.85rem;
  line-height: 1.5;
  margin: 0;
  padding: clamp(16px, 2.5vw, 28px) 20px;
  text-align: center;
}

.home-trust-line a {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: rgba(82, 77, 69, 0.35);
  text-underline-offset: 3px;
}

.home-trust-line a:hover,
.home-trust-line a:focus-visible {
  color: var(--color-ink);
  text-decoration-color: currentColor;
}

@keyframes hmFadeInSlow {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Narrower desktops: the three links keep their size; only the page
   padding and the brand tighten. */
@media (max-width: 1360px) {
  .hm-ui-layer {
    padding-left: 2.5rem;
    padding-right: 2.5rem;
  }
}

@media (max-width: 960px) {
  .hm-ui-layer {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
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

  /* Phones keep the hero in flow: pill and words as grid rows, so the hero
     can never be shorter than its content and the centred words never
     slide under the pill (an absolute block at 46% did, on phones whose
     browser reported a short small-viewport height). */
  .hm-ui-layer {
    display: grid;
    /* One full-width column; the flex layout's space-between would
       otherwise shrink it to its content. */
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    padding: 1.25rem 1.25rem 1.5rem;
    row-gap: 16px;
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
    align-self: center;
    grid-row: 2;
    justify-self: center;
    left: auto;
    max-width: 340px;
    /* A little more room below than above, as the old 46% centre had. */
    padding-bottom: 6vh;
    position: static;
    top: auto;
    transform: none;
    width: 100%;
  }

  .hm-prompt-main {
    font-size: 2.72rem;
    letter-spacing: -0.01em;
    line-height: 1.04;
    margin-bottom: 0;
    text-wrap: balance;
  }

  .hm-prompt-main {
    text-shadow: 0 2px 24px rgba(0, 0, 0, 0.18);
  }

  .hm-cursor-dot,
  .hm-cursor-outline {
    display: none;
  }
}

/* Short phones (landscape, small viewports): tighter type and spacing on
   the same grid. */
@media (max-width: 768px) and (max-height: 680px) {
  .hm-ui-layer {
    padding: 1rem 1.25rem 1.25rem;
    row-gap: 8px;
  }

  .hm-brand,
  .hm-brand.hm-nav-text {
    font-size: 1.25rem;
  }

  .hm-hero-text {
    max-width: 300px;
    padding-bottom: 0;
  }

  .hm-prompt-main {
    font-size: clamp(2.3rem, 14vw, 2.65rem);
    line-height: 1;
    margin-bottom: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hm-prompt-main {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }

  html.home-past-hero .site-header {
    animation: none;
  }
}
`;
