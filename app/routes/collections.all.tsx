import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/collections.all';
import {
  ClaraProductCard,
  type ClaraCardProduct,
} from '~/components/ClaraProductCard';
import {
  filterDemoCollections,
  filterDemoProducts,
  HOME_GOODS_COLLECTIONS,
} from '~/lib/catalogFilters';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/productCardFragment';

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

export type CollectionViewData = {
  activeHandle: string;
  collections: CollectionLink[];
  description?: string | null;
  heading: string;
  products: ClaraCardProduct[];
};

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'Clara Mendes | Shop All'},
    {
      name: 'description',
      content:
        'Shop supplier-sourced home objects through Clara Mendes and Shopify checkout.',
    },
  ];
};

export async function loader({context}: Route.LoaderArgs) {
  const data = await context.storefront.query(ALL_COLLECTION_QUERY, {
    variables: {
      first: 24,
    },
  });

  return {
    activeHandle: 'all',
    collections: filterDemoCollections(data.collections.nodes as CollectionLink[]),
    description:
      'Curated home objects selected for quiet rooms, useful rituals, and slower living.',
    heading: 'Shop All',
    products: filterDemoProducts(data.products.nodes as ClaraCardProduct[]),
  } satisfies CollectionViewData;
}

export default function AllCollection() {
  const data = useLoaderData<typeof loader>();
  return <CollectionView data={data} />;
}

export function CollectionView({data}: {data: CollectionViewData}) {
  const categories = [
    {id: 'all', handle: 'all', title: 'All'},
    ...data.collections,
  ];

  return (
    <div className="collection-page cv-root">
      <style suppressHydrationWarning>{collectionCss}</style>

      <section className="cv-hero" aria-labelledby="cv-hero-title">
        <div className="cv-hero-noise" />
        <div className="cv-hero-vignette" />

        <div className="cv-hero-inner">
          <p className="cv-eyebrow">Curated Home Goods</p>
          <h1 id="cv-hero-title" className="cv-title">
            <i>{splitTitle(data.heading).italic}</i>
            {splitTitle(data.heading).rest
              ? ' ' + splitTitle(data.heading).rest
              : ''}
          </h1>
          {data.description ? (
            <p className="cv-tagline">{data.description}</p>
          ) : null}
        </div>

        <div className="cv-coords">Secure checkout / tracked delivery</div>
        <div className="cv-hero-rule" aria-hidden />
      </section>

      <nav className="cv-filter" aria-label="Collection categories">
        {categories.map((collection) => (
          <Link
            key={collection.id}
            to={
              collection.handle === 'all'
                ? '/collections/all'
                : `/collections/${collection.handle}`
            }
            className={`cv-filter-link${
              collection.handle === data.activeHandle ? ' is-active' : ''
            }`}
          >
            <span className="cv-filter-label">{collection.title}</span>
            <span className="cv-filter-underline" aria-hidden />
          </Link>
        ))}
        {data.collections.length === 0
          ? HOME_GOODS_COLLECTIONS.map((collection) => (
              <span
                aria-disabled="true"
                className="cv-filter-link cv-filter-link--preview"
                key={collection.id}
              >
                <span className="cv-filter-label">{collection.title}</span>
                <span className="cv-filter-underline" aria-hidden />
              </span>
            ))
          : null}
      </nav>

      {data.products.length > 0 ? (
        <section className="cv-grid" aria-label="Products">
          {data.products.map((product, index) => (
            <div
              key={product.id}
              className="cv-card-wrap"
              style={{animationDelay: `${Math.min(index, 11) * 70}ms`}}
            >
              <ClaraProductCard
                product={product}
                loading={index < 4 ? 'eager' : 'lazy'}
              />
            </div>
          ))}
        </section>
      ) : (
        <section className="empty-state collection-empty">
          <p className="eyebrow">Sourcing now</p>
          <h2>The first home-goods edit is being sourced.</h2>
          <p>
            Lighting, textiles, ceramics, storage, and small accents will
            appear here once supplier partners are confirmed.
          </p>
          <Link className="primary-button" to="/our-story">
            Read the story
          </Link>
        </section>
      )}
    </div>
  );
}

function splitTitle(str: string): {italic: string; rest: string} {
  const parts = str.split(' ');
  if (parts.length === 1) return {italic: parts[0], rest: ''};
  return {italic: parts[0], rest: parts.slice(1).join(' ')};
}

const ALL_COLLECTION_QUERY = `#graphql
  query AllCollection(
    $country: CountryCode
    $first: Int!
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: $first, sortKey: BEST_SELLING) {
      nodes {
        ...ClaraProductCard
      }
    }
    collections(first: 12) {
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

const collectionCss = `
.cv-root {
  --cv-bg-base: #6B655B;
  --cv-ink: #26231f;
  --cv-muted: #746f65;
  --cv-paper: #fbfaf6;
  --cv-ease: cubic-bezier(0.25, 1, 0.5, 1);
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.cv-hero {
  position: relative;
  overflow: hidden;
  background-color: var(--cv-bg-base);
  background-image:
    linear-gradient(180deg, rgba(30,28,24,0.35) 0%, rgba(107,101,91,0.05) 45%, rgba(107,101,91,0) 100%),
    url(https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=2560&auto=format&fit=crop);
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
  margin: 0 0 28px;
  color: #fff;
  text-wrap: balance;
  opacity: 0;
  animation: cvFade 2.4s var(--cv-ease) forwards 0.5s;
}

.cv-title i {
  font-style: italic;
  font-weight: 400;
}

.cv-tagline {
  color: rgba(255,255,255,0.76);
  font-size: clamp(1rem, 1.8vw, 1.28rem);
  line-height: 1.65;
  margin: 0;
  max-width: min(58ch, calc(100vw - 36px));
  opacity: 0;
  animation: cvFade 2.4s var(--cv-ease) forwards 1.1s;
}

.cv-coords {
  position: absolute;
  bottom: clamp(30px, 5vw, 56px);
  left: clamp(18px, 4vw, 70px);
  z-index: 2;
  font-family: var(--sans);
  font-variant-numeric: tabular-nums;
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.4);
  opacity: 0;
  animation: cvFade 2s var(--cv-ease) forwards 1.6s;
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

.cv-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px clamp(26px, 3.4vw, 48px);
  padding: clamp(26px, 3.2vw, 38px) clamp(18px, 4vw, 70px);
  border-bottom: 1px solid rgba(38, 35, 31, 0.12);
  background: var(--cv-paper);
  opacity: 0;
  animation: cvFade 1.8s var(--cv-ease) forwards 0.3s;
}

.cv-filter-link {
  position: relative;
  color: var(--cv-muted);
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  padding: 4px 0;
  transition: color 400ms var(--cv-ease);
}

.cv-filter-link:hover { color: var(--cv-ink); }

.cv-filter-link--preview {
  cursor: default;
  opacity: 0.58;
}

.cv-filter-link--preview:hover {
  color: var(--cv-muted);
}

.cv-filter-underline {
  position: absolute;
  left: 0; right: 0;
  bottom: -2px;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 500ms var(--cv-ease);
}

.cv-filter-link:hover .cv-filter-underline { transform: scaleX(0.6); }

.cv-filter-link.is-active {
  color: var(--cv-ink);
  font-style: italic;
  font-family: var(--serif);
  font-size: 0.95rem;
  letter-spacing: 0.02em;
  text-transform: none;
  font-weight: 400;
}

.cv-filter-link.is-active .cv-filter-underline {
  transform: scaleX(1);
  background: var(--cv-ink);
}

.cv-grid {
  display: grid;
  gap: clamp(28px, 3vw, 52px) clamp(18px, 2.4vw, 36px);
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: clamp(42px, 5.5vw, 80px) clamp(18px, 4vw, 70px)
           clamp(72px, 9vw, 130px);
  background: var(--cv-paper);
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
@media (max-width: 780px) {
  .cv-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .cv-hero { min-height: 50vh; }
}
@media (max-width: 520px) {
  .cv-tagline,
  .collection-empty p {
    max-width: none;
    width: calc(100vw - 70px);
  }

  .cv-filter {
    display: grid;
    gap: 18px 20px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cv-filter-link {
    max-width: 100%;
    width: fit-content;
  }

  .cv-grid { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .cv-eyebrow, .cv-title, .cv-tagline, .cv-coords,
  .cv-hero-rule, .cv-filter, .cv-card-wrap {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
`;
