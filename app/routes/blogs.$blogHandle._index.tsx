import {useEffect, useRef} from 'react';
import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle._index';
import {Image, getPaginationVariables} from '@shopify/hydrogen';
import type {ArticleItemFragment} from 'storefrontapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {StructuredData} from '~/components/StructuredData';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {buildSeoMeta, SITE_NAME} from '~/lib/seo';
import {STOREFRONT_ORIGIN, SUPPORT_EMAIL} from '~/lib/storefrontBasics';

/**
 * The store's single journal. "Karina of Time" reads as wordplay on the
 * surface, but the name is literal: καρίνα is Greek for a ship's keel —
 * the line that holds a vessel steady through time. The index frames each
 * post as a numbered "issue" and presents covers on a slowly revolving
 * ring (a progressive enhancement — the ring is a flat scroll row on
 * mobile, reduced motion, and no-JS).
 */
export const KARINA_HANDLE = 'karina-of-time';

const KARINA_DESCRIPTION =
  'Karina of Time — καρίνα, Greek for keel — is the Clara Mendes journal: notes on original art, colour, and the rooms prints live in. New issues by email.';

/**
 * Covers that keep the ring full (and the page alive) before enough
 * articles exist: two plates from each of the five capsules, ordered so
 * neighbouring covers never share a palette.
 */
const PLATE_CAPSULES = [
  ['quiet-form', 'Quiet Form'],
  ['patina-blue', 'Patina Blue'],
  ['sunlit-mosaic', 'Sunlit Mosaic'],
  ['neo-deco', 'Neo Deco'],
  ['midnight-garden', 'Midnight Garden'],
] as const;

const ROMAN = ['I', 'II', 'III'] as const;

type Cover = {
  key: string;
  href: string;
  label: string;
  title: string;
  /** Shopify-hosted article image, when the cover is an issue. */
  imageData?: NonNullable<ArticleItemFragment['image']>;
  /** Local plate artwork, when the cover is a print. */
  src?: string;
};

function plateCovers(): Cover[] {
  const covers: Cover[] = [];
  for (let plate = 0; plate < 2; plate++) {
    for (const [slug, name] of PLATE_CAPSULES) {
      covers.push({
        key: `${slug}-${plate + 1}`,
        href: `/collections/all?capsule=${slug}`,
        label: `Plate ${String(covers.length + 1).padStart(2, '0')}`,
        title: `${name} ${ROMAN[plate]}`,
        src: `/images/product-art/${slug}/${slug}-0${plate + 1}.webp`,
      });
    }
  }
  return covers;
}

export const meta: Route.MetaFunction = ({data}) => {
  if (data?.blog.handle === KARINA_HANDLE) {
    return buildSeoMeta({
      description: KARINA_DESCRIPTION,
      // An issue-less journal must not be indexed as a thin page
      noIndex: !data?.hasArticles,
      title: 'Karina of Time — Journal',
      url: `${STOREFRONT_ORIGIN}/blogs/${KARINA_HANDLE}`,
    });
  }

  return buildSeoMeta({
    description:
      data?.blog.seo?.description ||
      'Notes and updates from the Clara Mendes studio.',
    noIndex: !data?.hasArticles,
    title: data?.blog.seo?.title || data?.blog.title || 'Journal',
    url: `${STOREFRONT_ORIGIN}/blogs/${data?.blog.handle ?? ''}`,
  });
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, request, params}: Route.LoaderArgs) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 12,
  });

  if (!params.blogHandle) {
    throw new Response(`blog not found`, {status: 404});
  }

  const [{blog}] = await Promise.all([
    context.storefront.query(BLOGS_QUERY, {
      variables: {
        blogHandle: params.blogHandle,
        ...paginationVariables,
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!blog?.articles) {
    throw new Response('Not found', {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle: params.blogHandle, data: blog});

  return {blog, hasArticles: blog.articles.nodes.length > 0};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Blog() {
  const {blog} = useLoaderData<typeof loader>();

  if (blog.handle === KARINA_HANDLE) {
    return <KarinaJournal blog={blog} />;
  }

  return <GenericBlog blog={blog} />;
}

/* ─────────────────────────── Karina of Time ─────────────────────────── */

function KarinaJournal({
  blog,
}: {
  blog: Awaited<ReturnType<typeof loadCriticalData>>['blog'];
}) {
  const articles = blog.articles.nodes;
  const hasArticles = articles.length > 0;

  // Newest issue carries the highest number: the ledger renders newest
  // first, so number down from the count on the current page.
  const issueNumber = (index: number) =>
    String(articles.length - index).padStart(2, '0');

  const issueCovers: Cover[] = articles
    .filter((article) => article.image)
    .map((article, index) => ({
      key: article.id,
      href: `/blogs/${blog.handle}/${article.handle}`,
      label: `Issue ${issueNumber(index)}`,
      title: article.title,
      imageData: article.image!,
    }));

  // Keep the ring full while the journal is young; plates take over the
  // remaining seats and route into the capsules they show.
  const covers = [...issueCovers, ...plateCovers()].slice(0, 10);

  const requestSubject = encodeURIComponent(
    hasArticles ? 'Karina of Time — next issue' : 'Karina of Time — Issue 01',
  );

  return (
    <div className="kot-root">
      <style suppressHydrationWarning>{kotCss}</style>
      <KarinaAura />
      <StructuredData
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'Karina of Time',
            alternateName: 'καρίνα',
            description: KARINA_DESCRIPTION,
            url: `${STOREFRONT_ORIGIN}/blogs/${KARINA_HANDLE}`,
            publisher: {
              '@type': 'Organization',
              name: SITE_NAME,
              url: STOREFRONT_ORIGIN,
            },
          },
        ]}
      />

      <section className="kot-hero" data-chapter="ink" aria-labelledby="kot-title">
        <p className="kot-eyebrow" data-reveal>
          The Clara Mendes journal
        </p>
        <h1 id="kot-title" className="kot-masthead" data-reveal>
          Karina <i>of</i> Time
        </h1>
        <p className="kot-lexicon" data-reveal>
          <span lang="el">καρίνα</span> <span aria-hidden>·</span> Greek,{' '}
          <em>the keel</em> — the line beneath a vessel that holds it steady
          through time.
        </p>
        <div className="kot-keel" aria-hidden />
      </section>

      <section
        className="kot-ring-band"
        data-chapter="linen"
        aria-label="Issue covers"
      >
        <CoverRing covers={covers} />
        <p className="kot-ring-caption">
          {hasArticles
            ? `Curated dispatches — ${articles.length} issue${
                articles.length === 1 ? '' : 's'
              } to date`
            : 'Issue 01 is at the press — the plates keep the ring turning'}
        </p>
      </section>

      <section className="kot-ledger" data-chapter="linen" aria-label="Issues">
        {hasArticles ? (
          <ol className="kot-ledger-list">
            {articles.map((article, index) => (
              <li key={article.id} data-reveal>
                <Link
                  className="kot-ledger-row"
                  to={`/blogs/${blog.handle}/${article.handle}`}
                  prefetch="intent"
                >
                  <span className="kot-ledger-issue">
                    Issue {issueNumber(index)}
                  </span>
                  <span className="kot-ledger-main">
                    <span className="kot-ledger-title">{article.title}</span>
                    {article.excerpt ? (
                      <span className="kot-ledger-excerpt">
                        {article.excerpt}
                      </span>
                    ) : null}
                  </span>
                  <time
                    className="kot-ledger-date"
                    dateTime={article.publishedAt ?? undefined}
                  >
                    {formatIssueDate(article.publishedAt)}
                  </time>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="kot-ledger-row kot-ledger-row--press" data-reveal>
            <span className="kot-ledger-issue">Issue 01</span>
            <span className="kot-ledger-main">
              <span className="kot-ledger-title">At the press</span>
              <span className="kot-ledger-excerpt">
                The first dispatch is being written — notes on the five
                capsules, how the prints are made, and the rooms they live in.
                Request it below and it arrives the day it publishes.
              </span>
            </span>
            <span className="kot-ledger-date">Soon</span>
          </div>
        )}
      </section>

      <section className="kot-request" data-chapter="clay" aria-label="Request the next issue">
        <p className="kot-request-eyebrow" data-reveal>
          Request access
        </p>
        <h2 data-reveal>Be aboard when the next issue leaves the press.</h2>
        <div className="kot-request-actions" data-reveal>
          <a
            className="kot-request-cta"
            href={`mailto:${SUPPORT_EMAIL}?subject=${requestSubject}`}
          >
            Request the next issue
          </a>
          <p className="kot-request-note">
            One email per issue, from the studio. Nothing else.
          </p>
        </div>
      </section>
    </div>
  );
}

/**
 * The journal's breathing aura: large grainy gradient blobs that drift and
 * breathe behind the whole page, crossfading between chapter-derived tints
 * (ink → linen → clay) as the reader scrolls. Pure CSS motion on
 * compositor-only transforms; an IntersectionObserver just flips the
 * active palette attribute as `[data-chapter]` sections cross the viewport
 * midline. Reduced-motion visitors keep the static tint without the
 * breathing. Tints are luminosity-tuned relatives of the cinematic paint
 * palettes (paintedShader.ts) — the raw ink hexes would read as mud over
 * paper.
 */
function KarinaAura() {
  const auraRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const aura = auraRef.current;
    const root = aura?.parentElement;
    if (!aura || !root) return;

    const sections = Array.from(
      root.querySelectorAll<HTMLElement>('[data-chapter]'),
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const palette = (entry.target as HTMLElement).dataset.chapter;
          if (palette) aura.dataset.palette = palette;
        }
      },
      // A section owns the aura while it straddles the viewport midline
      {rootMargin: '-42% 0px -42% 0px'},
    );
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={auraRef} className="kot-aura" data-palette="ink" aria-hidden>
      {(['ink', 'linen', 'clay'] as const).map((palette) => (
        <div
          key={palette}
          className={`kot-aura-layer kot-aura-layer--${palette}`}
        >
          <div className="kot-aura-blob kot-aura-blob--a" />
          <div className="kot-aura-blob kot-aura-blob--b" />
        </div>
      ))}
    </div>
  );
}

function formatIssueDate(publishedAt?: string | null) {
  if (!publishedAt) return '';
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(publishedAt));
}

/**
 * The revolving ring of covers. Server-rendered (and kept, on small
 * screens, for reduced motion, and without JS) as a scroll-snap row;
 * wide motion-friendly viewports are upgraded to a slow 3D carousel that
 * pauses while hovered or focused. The cinematic WebGL background runs
 * its own ticker, so one more transform-only rAF stays cheap.
 */
function CoverRing({covers}: {covers: Cover[]}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const ring = ringRef.current;
    if (!stage || !ring) return;

    const motionOk = window.matchMedia(
      '(prefers-reduced-motion: no-preference)',
    ).matches;
    const wide = window.matchMedia('(min-width: 821px)').matches;
    if (!motionOk || !wide) return;

    const items = Array.from(ring.children) as HTMLElement[];
    const count = items.length;
    if (count < 4) return;

    const step = 360 / count;
    const cardWidth = items[0].offsetWidth || 230;
    // Ring radius that seats every card with breathing room between edges
    const radius =
      Math.round(cardWidth / 2 / Math.tan(Math.PI / count)) + 46;

    stage.classList.add('is-ring');
    items.forEach((item, index) => {
      item.style.transform = `rotateY(${index * step}deg) translateZ(${radius}px)`;
    });

    const BASE_SPEED = -3.6; // degrees per second; negative drifts covers rightward
    let angle = 0;
    let speed = 0;
    let paused = false;
    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      // Ease toward the target speed so pause/resume feels like drag on
      // water rather than a switch.
      const target = paused ? 0 : BASE_SPEED;
      speed += (target - speed) * 0.055;
      angle = (angle + speed * dt) % 360;

      ring.style.transform = `translateZ(${-radius}px) rotateY(${angle}deg)`;

      for (let i = 0; i < count; i++) {
        const theta = ((i * step + angle) * Math.PI) / 180;
        const facing = Math.cos(theta); // 1 when the cover faces the viewer
        items[i].style.opacity = String(0.34 + 0.66 * Math.max(0, facing));
      }

      raf = requestAnimationFrame(tick);
    };

    const pause = () => {
      paused = true;
    };
    const resume = () => {
      paused = false;
    };

    stage.addEventListener('pointerenter', pause);
    stage.addEventListener('pointerleave', resume);
    stage.addEventListener('focusin', pause);
    stage.addEventListener('focusout', resume);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener('pointerenter', pause);
      stage.removeEventListener('pointerleave', resume);
      stage.removeEventListener('focusin', pause);
      stage.removeEventListener('focusout', resume);
      stage.classList.remove('is-ring');
      ring.style.transform = '';
      items.forEach((item) => {
        item.style.transform = '';
        item.style.opacity = '';
      });
    };
  }, [covers.length]);

  return (
    <div ref={stageRef} className="kot-ring-stage">
      <ul ref={ringRef} className="kot-ring">
        {covers.map((cover) => (
          <li key={cover.key} className="kot-cover">
            <Link
              to={cover.href}
              prefetch="intent"
              aria-label={`${cover.label} — ${cover.title}`}
            >
              <span className="kot-cover-frame">
                {cover.imageData ? (
                  <Image
                    alt={cover.imageData.altText || cover.title}
                    data={cover.imageData}
                    loading="lazy"
                    sizes="230px"
                  />
                ) : (
                  <img
                    src={cover.src}
                    alt={cover.title}
                    loading="lazy"
                    width={460}
                    height={575}
                  />
                )}
              </span>
              <span className="kot-cover-label">
                {cover.label} — {cover.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────────────────── Generic blog fallback ─────────────────────── */

function GenericBlog({
  blog,
}: {
  blog: Awaited<ReturnType<typeof loadCriticalData>>['blog'];
}) {
  const {articles} = blog;

  return (
    <div className="blog">
      <h1>{blog.title}</h1>
      <div className="blog-grid">
        <PaginatedResourceSection<ArticleItemFragment> connection={articles}>
          {({node: article, index}) => (
            <ArticleItem
              article={article}
              key={article.id}
              loading={index < 2 ? 'eager' : 'lazy'}
            />
          )}
        </PaginatedResourceSection>
      </div>
    </div>
  );
}

function ArticleItem({
  article,
  loading,
}: {
  article: ArticleItemFragment;
  loading?: HTMLImageElement['loading'];
}) {
  const publishedAt = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishedAt!));
  return (
    <div className="blog-article" key={article.id}>
      <Link to={`/blogs/${article.blog.handle}/${article.handle}`}>
        {article.image && (
          <div className="blog-article-image">
            <Image
              alt={article.image.altText || article.title}
              aspectRatio="3/2"
              data={article.image}
              loading={loading}
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>
        )}
        <h3>{article.title}</h3>
        <small>{publishedAt}</small>
      </Link>
    </div>
  );
}

/* ────────────────────────────── Styles ──────────────────────────────── */

const kotCss = `
.kot-root {
  --kot-ink: #26231f;
  --kot-muted: #6f685e;
  --kot-paper: #fbfaf6;
  --kot-hairline: rgba(38, 35, 31, 0.16);
  --kot-serif: Georgia, 'Times New Roman', serif;
  --kot-mono: 'Courier Prime', 'Courier New', ui-monospace, monospace;
  color: var(--kot-ink);
  isolation: isolate;
  position: relative;
}

/* ── Breathing aura ── */
.kot-aura {
  inset: 0;
  pointer-events: none;
  position: fixed;
  z-index: -1;
}

/* Grain that makes the gradients read as pigment, not screen glow */
.kot-aura::after {
  background-image: url(data:image/svg+xml,%3Csvg%20viewBox=%220%200%20200%20200%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter%20id=%22noiseFilter%22%3E%3CfeTurbulence%20type=%22fractalNoise%22%20baseFrequency=%220.85%22%20numOctaves=%223%22%20stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect%20width=%22100%25%22%20height=%22100%25%22%20filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E);
  content: '';
  inset: 0;
  mix-blend-mode: overlay;
  opacity: 0.14;
  position: absolute;
}

.kot-aura-layer {
  inset: 0;
  opacity: 0;
  position: absolute;
  transition: opacity 2200ms ease;
}

.kot-aura[data-palette='ink'] .kot-aura-layer--ink,
.kot-aura[data-palette='umber'] .kot-aura-layer--ink,
.kot-aura[data-palette='linen'] .kot-aura-layer--linen,
.kot-aura[data-palette='clay'] .kot-aura-layer--clay {
  opacity: 1;
}

.kot-aura-blob {
  border-radius: 50%;
  height: 78vmin;
  position: absolute;
  width: 78vmin;
  will-change: transform;
}

.kot-aura-blob--a {
  animation: kotBreatheA 11s ease-in-out infinite alternate;
  left: -10vmin;
  top: -14vmin;
}

.kot-aura-blob--b {
  animation: kotBreatheB 15s ease-in-out -7s infinite alternate;
  height: 92vmin;
  right: -16vmin;
  top: 30%;
  width: 92vmin;
}

/* Ink: the sea under the masthead — indigo drawn from Patina Blue */
.kot-aura-layer--ink .kot-aura-blob--a {
  background: radial-gradient(circle at 42% 40%,
    rgba(70, 83, 110, 0.5),
    rgba(70, 83, 110, 0.2) 44%,
    transparent 68%);
}

.kot-aura-layer--ink .kot-aura-blob--b {
  background: radial-gradient(circle at 55% 50%,
    rgba(129, 149, 173, 0.44),
    rgba(46, 58, 82, 0.15) 48%,
    transparent 70%);
}

/* Linen: warm parchment behind the ring and ledger */
.kot-aura-layer--linen .kot-aura-blob--a {
  background: radial-gradient(circle at 45% 42%,
    rgba(201, 169, 124, 0.42),
    rgba(211, 199, 175, 0.2) 46%,
    transparent 68%);
}

.kot-aura-layer--linen .kot-aura-blob--b {
  background: radial-gradient(circle at 52% 50%,
    rgba(211, 199, 175, 0.5),
    rgba(227, 220, 203, 0.22) 48%,
    transparent 70%);
}

/* Clay: terracotta warmth at the request foot */
.kot-aura-layer--clay .kot-aura-blob--a {
  background: radial-gradient(circle at 44% 42%,
    rgba(185, 138, 116, 0.46),
    rgba(168, 121, 102, 0.18) 46%,
    transparent 68%);
}

.kot-aura-layer--clay .kot-aura-blob--b {
  background: radial-gradient(circle at 52% 48%,
    rgba(226, 201, 182, 0.52),
    rgba(185, 138, 116, 0.18) 48%,
    transparent 70%);
}

@keyframes kotBreatheA {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(4vmin, 2.5vmin, 0) scale(1.12); }
}

@keyframes kotBreatheB {
  from { transform: translate3d(0, 0, 0) scale(1.08); }
  to { transform: translate3d(-4vmin, -3vmin, 0) scale(0.96); }
}

/* ── Masthead ── */
/* Tall enough to straddle the viewport midline at rest, so the ink aura
   owns the opening moment before linen takes the ring. */
.kot-hero {
  align-content: center;
  display: grid;
  min-height: 62svh;
  padding: clamp(56px, 9vh, 120px) clamp(20px, 5vw, 70px) clamp(28px, 4vh, 48px);
  text-align: center;
}

.kot-eyebrow {
  font-family: var(--kot-mono);
  font-size: 0.72rem;
  letter-spacing: 0.34em;
  margin: 0 0 22px;
  text-transform: uppercase;
  color: var(--kot-muted);
}

.kot-masthead {
  font-family: var(--kot-serif);
  font-size: clamp(2.9rem, 8.5vw, 6.2rem);
  font-weight: 400;
  letter-spacing: -0.015em;
  line-height: 1.02;
  margin: 0 0 26px;
  text-wrap: balance;
}

.kot-masthead i {
  font-style: italic;
  margin: 0 0.06em;
}

.kot-lexicon {
  color: var(--kot-muted);
  font-size: clamp(0.98rem, 1.6vw, 1.12rem);
  line-height: 1.7;
  margin: 0 auto;
  max-width: 52ch;
}

.kot-lexicon [lang='el'] {
  font-family: var(--kot-serif);
  font-style: italic;
  color: var(--kot-ink);
}

.kot-keel {
  background: var(--kot-hairline);
  height: 64px;
  margin: 34px auto 0;
  width: 1px;
}

/* ── Cover ring ── */
.kot-ring-band {
  padding: clamp(8px, 2vh, 24px) 0 clamp(36px, 6vh, 64px);
  overflow: hidden;
}

.kot-ring-stage {
  height: 440px;
  display: grid;
  align-items: center;
}

.kot-ring {
  display: flex;
  gap: 18px;
  list-style: none;
  margin: 0;
  overflow-x: auto;
  padding: 16px clamp(20px, 5vw, 70px) 24px;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
}

.kot-ring::-webkit-scrollbar { display: none; }

.kot-cover {
  flex: 0 0 auto;
  scroll-snap-align: center;
  width: clamp(158px, 24vw, 230px);
}

.kot-cover a {
  color: inherit;
  display: block;
  text-decoration: none;
}

.kot-cover-frame {
  background: #fff;
  box-shadow: 0 16px 38px rgba(38, 35, 31, 0.16);
  display: block;
  padding: 7px;
}

.kot-cover-frame img {
  aspect-ratio: 4 / 5;
  display: block;
  height: auto;
  object-fit: cover;
  width: 100%;
}

.kot-cover-label {
  display: block;
  font-family: var(--kot-mono);
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  margin-top: 12px;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--kot-muted);
}

.kot-cover a:hover .kot-cover-label,
.kot-cover a:focus-visible .kot-cover-label {
  color: var(--kot-ink);
}

.kot-cover a:focus-visible {
  outline: 1.5px solid var(--kot-ink);
  outline-offset: 4px;
}

/* Wide, motion-friendly viewports get the 3D ring (class added by JS) */
.kot-ring-stage.is-ring {
  perspective: 1600px;
  perspective-origin: 50% 42%;
}

.kot-ring-stage.is-ring .kot-ring {
  display: block;
  height: 100%;
  overflow: visible;
  padding: 0;
  position: relative;
  transform-style: preserve-3d;
  will-change: transform;
}

.kot-ring-stage.is-ring .kot-cover {
  height: fit-content;
  inset: 0;
  margin: auto;
  position: absolute;
  width: clamp(190px, 17vw, 230px);
}

.kot-ring-caption {
  font-family: var(--kot-mono);
  font-size: 0.66rem;
  letter-spacing: 0.22em;
  margin: 6px auto 0;
  text-align: center;
  text-transform: uppercase;
  color: var(--kot-muted);
}

/* ── Issue ledger ── */
.kot-ledger {
  margin: 0 auto;
  max-width: 980px;
  padding: 0 clamp(20px, 5vw, 70px) clamp(48px, 7vh, 88px);
}

.kot-ledger-list {
  border-top: 1px solid var(--kot-hairline);
  list-style: none;
  margin: 0;
  padding: 0;
}

.kot-ledger-row {
  align-items: baseline;
  border-bottom: 1px solid var(--kot-hairline);
  color: inherit;
  display: grid;
  gap: 6px 30px;
  grid-template-columns: 110px 1fr auto;
  padding: 24px 4px;
  text-decoration: none;
  transition: background 300ms ease;
}

a.kot-ledger-row:hover {
  background: rgba(38, 35, 31, 0.035);
}

a.kot-ledger-row:focus-visible {
  outline: 1.5px solid var(--kot-ink);
  outline-offset: 3px;
}

.kot-ledger-row--press {
  border-top: 1px solid var(--kot-hairline);
}

.kot-ledger-issue,
.kot-ledger-date {
  font-family: var(--kot-mono);
  font-size: 0.68rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--kot-muted);
  white-space: nowrap;
}

.kot-ledger-main {
  display: grid;
  gap: 7px;
}

.kot-ledger-title {
  font-family: var(--kot-serif);
  font-size: clamp(1.3rem, 2.4vw, 1.75rem);
  line-height: 1.18;
  transition: font-style 200ms ease;
}

a.kot-ledger-row:hover .kot-ledger-title {
  font-style: italic;
}

.kot-ledger-excerpt {
  color: var(--kot-muted);
  font-size: 0.95rem;
  line-height: 1.6;
  max-width: 58ch;
}

/* ── Request foot ── */
.kot-request {
  border-top: 1px solid var(--kot-hairline);
  margin: 0 auto;
  max-width: 980px;
  padding: clamp(56px, 8vh, 96px) clamp(20px, 5vw, 70px) clamp(72px, 10vh, 120px);
  text-align: center;
}

.kot-request-eyebrow {
  font-family: var(--kot-mono);
  font-size: 0.68rem;
  letter-spacing: 0.3em;
  margin: 0 0 18px;
  text-transform: uppercase;
  color: var(--kot-muted);
}

.kot-request h2 {
  font-family: var(--kot-serif);
  font-size: clamp(1.7rem, 3.4vw, 2.6rem);
  font-weight: 400;
  line-height: 1.16;
  margin: 0 auto 30px;
  max-width: 24ch;
  text-wrap: balance;
}

.kot-request-cta {
  align-items: center;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.12), transparent 46%),
    rgba(38, 35, 31, 0.95);
  border: 1px solid var(--kot-ink);
  border-radius: 999px;
  color: var(--kot-paper);
  display: inline-flex;
  font-size: 0.72rem;
  font-weight: 600;
  justify-content: center;
  letter-spacing: 0.16em;
  min-height: 48px;
  min-width: 230px;
  padding: 0 26px;
  text-decoration: none;
  text-transform: uppercase;
  transition: background 240ms ease;
}

.kot-request-cta:hover {
  background: #3a352f;
}

.kot-request-note {
  color: var(--kot-muted);
  font-size: 0.82rem;
  margin: 16px 0 0;
}

@media (max-width: 720px) {
  .kot-ring-stage { height: auto; }

  .kot-ledger-row {
    grid-template-columns: 1fr auto;
  }

  .kot-ledger-issue { grid-column: 1; }
  .kot-ledger-date { grid-column: 2; justify-self: end; }
  .kot-ledger-main { grid-column: 1 / -1; }
}

@media (prefers-reduced-motion: reduce) {
  .kot-ledger-row,
  .kot-request-cta,
  .kot-ledger-title {
    transition: none;
  }

  .kot-aura-blob {
    animation: none;
  }

  .kot-aura-layer {
    transition: none;
  }
}
`;

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/blog
const BLOGS_QUERY = `#graphql
  query Blog(
    $language: LanguageCode
    $blogHandle: String!
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(language: $language) {
    blog(handle: $blogHandle) {
      title
      handle
      seo {
        title
        description
      }
      articles(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor
      ) {
        nodes {
          ...ArticleItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }

      }
    }
  }
  fragment ArticleItem on Article {
    author: authorV2 {
      name
    }
    excerpt
    handle
    id
    image {
      id
      altText
      url
      width
      height
    }
    publishedAt
    title
    blog {
      handle
    }
  }
` as const;
