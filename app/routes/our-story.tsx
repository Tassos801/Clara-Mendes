import {useEffect, useRef} from 'react';
import {Link} from 'react-router';
import type {Route} from './+types/our-story';
import {StructuredData} from '~/components/StructuredData';
import {useAside} from '~/components/Aside';
import {ORIGINAL_ART_COLLECTIONS} from '~/lib/catalogFilters';
import {buildSeoMeta} from '~/lib/seo';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';

const PAGE_URL = `${STOREFRONT_ORIGIN}/our-story`;
const PAGE_DESCRIPTION =
  'Clara Mendes creates original art for calm, collected spaces: fifteen original works across five coordinated capsules, printed to order as unframed 8 × 10 in giclée prints on 200gsm Enhanced Matte Art paper.';

export const meta: Route.MetaFunction = () => {
  return buildSeoMeta({
    description: PAGE_DESCRIPTION,
    image: `${STOREFRONT_ORIGIN}/images/product-art/quiet-form/quiet-form-01.webp`,
    title: 'Our Story',
    url: PAGE_URL,
  });
};

export default function OurStory() {
  const {open} = useAside();
  const blurRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const outlineRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);

  // Cursor-reactive hero blur — a progressive enhancement for fine
  // pointers only; reduced-motion visitors get the static composition.
  useEffect(() => {
    const hero = heroRef.current;
    const blur = blurRef.current;
    const dot = dotRef.current;
    const outline = outlineRef.current;
    if (!hero || !blur || !dot || !outline) return;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!finePointer.matches || reduceMotion.matches) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = `${mouseX}px`;
      dot.style.top = `${mouseY}px`;
    };

    const tick = () => {
      const ease = 0.08;
      cursorX += (mouseX - cursorX) * ease;
      cursorY += (mouseY - cursorY) * ease;
      outline.style.left = `${cursorX}px`;
      outline.style.top = `${cursorY}px`;

      const rect = hero.getBoundingClientRect();
      const xPercent = (cursorX / window.innerWidth) * 100;
      const yPercent = rect.height
        ? ((cursorY - rect.top) / rect.height) * 100
        : 50;
      blur.style.setProperty('--x', `${xPercent}%`);
      blur.style.setProperty('--y', `${yPercent}%`);

      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="our-story-root">
      <style suppressHydrationWarning>{ourStoryCss}</style>
      <StructuredData
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            name: 'Our Story | Clara Mendes',
            description: PAGE_DESCRIPTION,
            url: PAGE_URL,
          },
        ]}
      />

      <section ref={heroRef} className="os-hero" aria-labelledby="os-title">
        <div className="os-layer-sharp" />
        <div ref={blurRef} className="os-layer-blur" />
        <div className="os-noise-overlay" />

        <div className="os-ui-layer">
          <header className="os-header-top">
            <Link to="/" className="os-nav-text os-brand">
              Clara Mendes
            </Link>
            <nav className="os-nav-group" aria-label="Site navigation">
              <Link to="/collections/all" className="os-nav-text">
                Shop
              </Link>
              <Link to="/our-story" className="os-nav-text os-active-tab">
                Our Story
              </Link>
              <Link to="/search" className="os-nav-text">
                Search
              </Link>
              <Link to="/contact" className="os-nav-text">
                Contact
              </Link>
              <button
                className="os-nav-text os-cart-link"
                type="button"
                onClick={() => open('cart')}
              >
                Cart
              </button>
            </nav>
          </header>

          <div className="os-content-container">
            <h1 id="os-title" className="os-story-title">
              The quiet pursuit of <i>permanence</i>.
            </h1>
            <div className="os-story-body">
              <p>
                Clara Mendes was born from a singular belief: the art and
                objects we live with should bring character, calm, and a point
                of view to everyday spaces.
              </p>
              <p>
                The collection begins with fifteen original works across five
                coordinated art capsules — each made to hold its own on a wall,
                and to sit comfortably beside the others.
              </p>
            </div>
            <a className="os-scroll-cue" href="#os-collection">
              Read the story
              <span aria-hidden>↓</span>
            </a>
          </div>
        </div>

        <div ref={dotRef} className="os-cursor-dot" />
        <div ref={outlineRef} className="os-cursor-outline" />
      </section>

      <section
        id="os-collection"
        className="os-section"
        aria-labelledby="os-collection-title"
      >
        <p className="os-eyebrow">The collection</p>
        <h2 id="os-collection-title">
          Fifteen works. Five capsules. One considered whole.
        </h2>
        <p className="os-section-lede">
          Every capsule holds three complementary original works, composed so a
          single print carries a room and a pair or trio reads as one
          intentional arrangement. Buy one now and add its companions later —
          they are designed to keep belonging together.
        </p>
        <ul className="os-capsule-list">
          {ORIGINAL_ART_COLLECTIONS.map((capsule) => (
            <li key={capsule.id}>
              <Link
                className="os-capsule-item"
                to={`/collections/all?capsule=${capsule.handle}`}
              >
                <span className="os-capsule-name">{capsule.title}</span>
                <span className="os-capsule-note">{capsule.note}</span>
                <span className="os-capsule-cta" aria-hidden>
                  View the three works →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="os-section os-section--facts" aria-labelledby="os-made-title">
        <p className="os-eyebrow">How each print is made</p>
        <h2 id="os-made-title">Printed to order, made to keep.</h2>
        <dl className="os-facts">
          <div>
            <dt>Format</dt>
            <dd>
              Unframed 8 × 10 in portrait prints — a size that works alone,
              in pairs, or as a full capsule of three.
            </dd>
          </div>
          <div>
            <dt>Paper &amp; inks</dt>
            <dd>
              Giclée printed on 200gsm Enhanced Matte Art paper, chosen for
              its flat, painterly surface and faithful colour.
            </dd>
          </div>
          <div>
            <dt>Production</dt>
            <dd>
              Each print is produced when it is ordered — nothing sits in a
              warehouse, and nothing ships that wasn&apos;t asked for.
            </dd>
          </div>
          <div>
            <dt>What comes next</dt>
            <dd>
              Considered objects may join the collection over time, and only
              once their quality and production meet the same standard as the
              art.
            </dd>
          </div>
        </dl>
      </section>

      <section className="os-section os-section--cta" aria-label="Continue">
        <h2>Live with something original.</h2>
        <div className="os-cta-row">
          <Link className="os-cta os-cta--primary" to="/collections/all">
            Shop the collection
          </Link>
          <Link className="os-cta" to="/contact">
            Get in touch
          </Link>
        </div>
      </section>
    </div>
  );
}

const ourStoryCss = `
html:has(.our-story-root) .site-header {
  display: none !important;
}
html:has(.our-story-root) main {
  margin: 0;
  padding: 0;
}

.our-story-root {
  --os-bg-base: #6B655B;
  --os-ink: #26231f;
  --os-muted: #6f685e;
  --os-paper: #fbfaf6;
  --os-text-main: #ffffff;
  --os-text-muted: rgba(255, 255, 255, 0.7);
  --os-ease-fluid: cubic-bezier(0.25, 1, 0.5, 1);
  --os-font-serif: Georgia, 'Times New Roman', serif;
  --os-font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  background: var(--os-paper);
  color: var(--os-ink);
  font-family: var(--os-font-sans);
  -webkit-font-smoothing: antialiased;
}

/* ── Cinematic hero ── */
.os-hero {
  position: relative;
  min-height: 92svh;
  overflow: hidden;
  background-color: var(--os-bg-base);
  color: var(--os-text-main);
  isolation: isolate;
}

@media (hover: hover) and (pointer: fine) {
  .os-hero,
  .os-hero * {
    cursor: none;
  }
}

.os-layer-sharp {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background-image: url(https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=2560&auto=format&fit=crop);
  background-size: cover;
  background-position: center;
  z-index: 1;
  filter: sepia(0.3) grayscale(0.2) brightness(0.9);
}

.os-layer-blur {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background-image: url(https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=2560&auto=format&fit=crop);
  background-size: cover;
  background-position: center;
  filter: blur(40px) brightness(0.7) sepia(0.4);
  transform: scale(1.1);
  z-index: 2;
  mask-image: radial-gradient(circle 320px at var(--x, 50%) var(--y, 50%), transparent 0%, black 100%);
  -webkit-mask-image: radial-gradient(circle 320px at var(--x, 50%) var(--y, 50%), transparent 0%, black 100%);
}

.os-noise-overlay {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 3;
  opacity: 0.12;
  pointer-events: none;
  mix-blend-mode: overlay;
  background-image: url(data:image/svg+xml,%3Csvg%20viewBox=%220%200%20200%20200%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter%20id=%22noiseFilter%22%3E%3CfeTurbulence%20type=%22fractalNoise%22%20baseFrequency=%220.85%22%20numOctaves=%223%22%20stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect%20width=%22100%25%22%20height=%22100%25%22%20filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E);
}

.os-ui-layer {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  min-height: 92svh;
  padding: 4rem 5rem;
}

.os-nav-text {
  font-family: var(--os-font-sans);
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--os-text-main);
  transition: opacity 0.3s ease;
  text-decoration: none;
}

.os-nav-text:hover { opacity: 0.6; }

.os-cart-link {
  background: transparent;
  border: 0;
  padding: 0;
}

.os-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 1.5rem;
}

.os-nav-group {
  align-items: center;
  display: flex;
  gap: clamp(1rem, 2.6vw, 3rem);
}

.os-brand {
  font-family: var(--os-font-serif);
  font-size: 1.8rem;
  font-style: italic;
  text-transform: none;
  letter-spacing: 0;
}

.os-content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 640px;
}

.os-story-title {
  font-family: var(--os-font-serif);
  font-size: clamp(2.4rem, 5vw, 3.5rem);
  font-weight: 400;
  font-style: italic;
  margin: 0 0 2.5rem;
  opacity: 0;
  animation: osFadeInSlow 2.5s var(--os-ease-fluid) forwards 0.4s;
  line-height: 1.15;
}

.os-story-body {
  font-family: var(--os-font-sans);
  font-size: 1.1rem;
  line-height: 1.8;
  font-weight: 300;
  color: var(--os-text-muted);
  opacity: 0;
  animation: osFadeInSlow 2.5s var(--os-ease-fluid) forwards 0.8s;
}

.os-story-body p { margin: 0 0 1.5rem; }

.os-scroll-cue {
  align-items: center;
  color: var(--os-text-main);
  display: inline-flex;
  font-size: 0.7rem;
  font-weight: 600;
  gap: 10px;
  letter-spacing: 0.2em;
  margin-top: 1rem;
  opacity: 0;
  animation: osFadeInSlow 2.5s var(--os-ease-fluid) forwards 1.2s;
  text-decoration: none;
  text-transform: uppercase;
  width: fit-content;
}

.os-scroll-cue:hover { opacity: 0.7 !important; }

.os-cursor-dot,
.os-cursor-outline {
  position: fixed;
  top: 0; left: 0;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  z-index: 9999;
  pointer-events: none;
  display: none;
}

@media (hover: hover) and (pointer: fine) {
  .os-cursor-dot,
  .os-cursor-outline {
    display: block;
  }
}

.os-cursor-dot {
  width: 4px; height: 4px;
  background-color: white;
}

.os-cursor-outline {
  width: 32px; height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: width 0.2s, height 0.2s, background-color 0.2s;
}

.os-active-tab {
  border-bottom: 1px solid white;
  padding-bottom: 2px;
}

/* ── Story content ── */
.os-section {
  margin: 0 auto;
  max-width: 1060px;
  padding: clamp(64px, 9vw, 128px) clamp(20px, 5vw, 70px);
}

.os-eyebrow {
  color: var(--os-muted);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.26em;
  margin: 0 0 18px;
  text-transform: uppercase;
}

.os-section h2 {
  font-family: var(--os-font-serif);
  font-size: clamp(1.9rem, 3.6vw, 3rem);
  font-weight: 400;
  letter-spacing: -0.02em;
  line-height: 1.12;
  margin: 0 0 22px;
  max-width: 22ch;
  text-wrap: balance;
}

.os-section-lede {
  color: var(--os-muted);
  font-size: 1.06rem;
  line-height: 1.75;
  margin: 0 0 40px;
  max-width: 62ch;
}

.os-capsule-list {
  border-top: 1px solid rgba(38, 35, 31, 0.14);
  list-style: none;
  margin: 0;
  padding: 0;
}

.os-capsule-item {
  border-bottom: 1px solid rgba(38, 35, 31, 0.14);
  color: inherit;
  display: grid;
  gap: 6px 28px;
  grid-template-columns: minmax(150px, 0.55fr) 1fr;
  padding: 22px 2px;
  text-decoration: none;
  transition: background 300ms ease;
}

.os-capsule-item:hover {
  background: rgba(38, 35, 31, 0.035);
}

.os-capsule-item:focus-visible {
  outline: 1.5px solid var(--os-ink);
  outline-offset: 3px;
}

.os-capsule-name {
  font-family: var(--os-font-serif);
  font-size: clamp(1.25rem, 2vw, 1.6rem);
}

.os-capsule-note {
  color: var(--os-muted);
  font-size: 0.95rem;
  line-height: 1.55;
}

.os-capsule-cta {
  color: var(--os-muted);
  font-size: 0.7rem;
  font-weight: 600;
  grid-column: 2;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  transition: color 300ms ease;
}

.os-capsule-item:hover .os-capsule-cta {
  color: var(--os-ink);
}

.os-section--facts {
  border-top: 1px solid rgba(38, 35, 31, 0.12);
}

.os-facts {
  display: grid;
  gap: clamp(24px, 3.5vw, 44px);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 34px 0 0;
}

.os-facts dt {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  margin-bottom: 10px;
  text-transform: uppercase;
}

.os-facts dd {
  color: var(--os-muted);
  font-size: 0.98rem;
  line-height: 1.7;
  margin: 0;
  max-width: 44ch;
}

.os-section--cta {
  border-top: 1px solid rgba(38, 35, 31, 0.12);
  text-align: center;
}

.os-section--cta h2 {
  margin-left: auto;
  margin-right: auto;
}

.os-cta-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: center;
  margin-top: 10px;
}

.os-cta {
  align-items: center;
  border: 1px solid rgba(38, 35, 31, 0.32);
  color: var(--os-ink);
  display: inline-flex;
  font-size: 0.72rem;
  font-weight: 600;
  justify-content: center;
  letter-spacing: 0.16em;
  min-height: 48px;
  min-width: 190px;
  padding: 0 22px;
  text-decoration: none;
  text-transform: uppercase;
  transition: background 240ms ease, color 240ms ease, border-color 240ms ease;
}

.os-cta:hover {
  border-color: var(--os-ink);
}

.os-cta--primary {
  background: var(--os-ink);
  border-color: var(--os-ink);
  color: var(--os-paper);
}

.os-cta--primary:hover {
  background: #3a352f;
}

@keyframes osFadeInSlow {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .os-ui-layer { padding: 2rem; }

  .os-header-top {
    align-items: flex-start;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: 1rem;
  }

  .os-nav-group {
    flex-wrap: wrap;
    gap: 0.8rem 1.1rem;
    justify-content: flex-start;
    width: 100%;
  }

  .os-nav-text {
    font-size: 0.62rem;
    letter-spacing: 0.16em;
  }

  .os-brand {
    font-size: 1.38rem;
    line-height: 1.08;
  }

  .os-brand.os-nav-text {
    font-size: 1.38rem;
  }

  .os-facts {
    grid-template-columns: 1fr;
  }

  .os-capsule-item {
    grid-template-columns: 1fr;
  }

  .os-capsule-cta {
    grid-column: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .os-story-title,
  .os-story-body,
  .os-scroll-cue {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }

  .os-scroll-cue { scroll-behavior: auto; }

  .os-capsule-item,
  .os-cta {
    transition: none;
  }
}
`;
