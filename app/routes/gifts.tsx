import {Link, useLoaderData} from 'react-router';
import {Analytics} from '@shopify/hydrogen';
import type {Route} from './+types/gifts';
import {
  ClaraProductCard,
  type ClaraCardProduct,
} from '~/components/ClaraProductCard';
import {StructuredData} from '~/components/StructuredData';
import {buildCollectionAnalyticsProducts} from './collections.all';
import {artProductByHandle, FAMILY_SPECS} from '~/lib/artProductCatalog';
import {
  filterDemoProducts,
  isStoreThemeProduct,
  SKY_PRODUCT_HANDLE,
} from '~/lib/catalogFilters';
import {
  christmasLineFor,
  christmasNotices,
  christmasRegionFor,
  christmasSeason,
  christmasLineLabel,
  formatOrderByDate,
  requestToday,
  type ChristmasLine,
} from '~/lib/christmasDelivery';
import {nothingBuyable} from '~/lib/deliveryReach';
import {YOUR_SKY_PAGE} from '~/lib/featurePages';
import {
  GIFT_HANDLES,
  GIFT_PAGE_COPY,
  GIFTS_PATH,
  giftProductQuery,
  groupGifts,
} from '~/lib/giftPage';
import {DEFAULT_MARKET_COUNTRY} from '~/lib/markets';
import {formatMoney, type MoneyAmount} from '~/lib/money';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/productCardFragment';
import {deriveCardPricing} from '~/lib/productCardPricing';
import {
  breadcrumbSchema,
  buildSeoMeta,
  collectionSchema,
  getCanonicalUrl,
} from '~/lib/seo';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';

// The Great Wave blanket's own product photo (Shopify CDN, sized per use).
const HERO_IMAGE =
  'https://cdn.shopify.com/s/files/1/1027/6533/0766/files/cm-floating-world-the-great-wave-off-kanagawa-blanket.webp?v=1792155046';

export const meta: Route.MetaFunction = ({data}) =>
  buildSeoMeta({
    description: GIFT_PAGE_COPY.metaDescription,
    image: `${HERO_IMAGE}&width=1200`,
    title: GIFT_PAGE_COPY.seoTitle,
    url: data?.seoUrl ?? `${STOREFRONT_ORIGIN}${GIFTS_PATH}`,
  });

type SkyTile = {
  price: MoneyAmount;
  image?: {url: string; altText?: string | null};
};

function printfulTechniqueFor(handle: string) {
  const art = artProductByHandle(handle);
  return art ? (FAMILY_SPECS[art.family].printfulTechnique ?? null) : null;
}

export async function loader({context, request}: Route.LoaderArgs) {
  const {storefront} = context;
  const buyerCountry = storefront.i18n.country;
  const today = requestToday(request);
  const region = christmasRegionFor(buyerCountry);

  // Handles and euro prices from the default market (handle isn't a
  // searchable field, so the query selects the curated product types).
  const index = await storefront.query(GIFT_INDEX_QUERY, {
    variables: {
      country: DEFAULT_MARKET_COUNTRY,
      query: giftProductQuery(),
    },
  });
  const curated = new Set(GIFT_HANDLES);
  const indexed = index.products.nodes.filter((node) =>
    curated.has(node.handle),
  );
  const eurPrices = new Map(
    indexed.map((node) => [node.handle, node.priceRange.minVariantPrice]),
  );

  // The cards in the buyer's market: their currency and availability.
  const cards = indexed.length
    ? await storefront.query(GIFT_CARDS_QUERY, {
        variables: {ids: indexed.map((node) => node.id)},
      })
    : {nodes: []};
  const products = cards.nodes.flatMap((node) =>
    node?.__typename === 'Product' ? [node as unknown as ClaraCardProduct] : [],
  );

  // Your Sky lives on its own page; it joins the bands as a link tile.
  const skyProduct = products.find(
    (product) => product.handle === SKY_PRODUCT_HANDLE,
  );
  const sky: SkyTile | null =
    skyProduct && isStoreThemeProduct(skyProduct) && !nothingBuyable(skyProduct)
      ? {
          price: deriveCardPricing(skyProduct).price!,
          image: skyProduct.featuredImage ?? undefined,
        }
      : null;

  // Only what the buyer can buy now: listed, released, and shipping to them.
  const buyable = filterDemoProducts(products).filter(
    (product) => !nothingBuyable(product),
  );
  const entries = [
    ...buyable.map((product) => ({
      kind: 'product' as const,
      handle: product.handle,
      product,
      price: deriveCardPricing(product).price,
      eurPrice: eurPrices.get(product.handle) ?? null,
    })),
    ...(sky && sky.price
      ? [
          {
            kind: 'sky' as const,
            handle: SKY_PRODUCT_HANDLE,
            sky,
            price: sky.price,
            eurPrice: eurPrices.get(SKY_PRODUCT_HANDLE) ?? null,
          },
        ]
      : []),
  ];
  const bands = groupGifts(entries);

  // Christmas order-by dates for the lines on this page, for this buyer.
  const lines = new Set<ChristmasLine>();
  for (const entry of entries) {
    const line =
      entry.kind === 'sky'
        ? 'prodigi-art'
        : christmasLineFor({
            ...entry.product,
            printfulTechnique: printfulTechniqueFor(entry.handle),
          });
    if (line) lines.add(line);
  }
  const season = christmasSeason(today);
  const christmas =
    season === 'open'
      ? {
          region,
          notices: christmasNotices(region, today)
            .filter((notice) => lines.has(notice.line))
            .map((notice) => ({
              line: notice.line,
              label: christmasLineLabel(notice.line, notice.region),
              date: formatOrderByDate(notice.date),
            })),
        }
      : null;

  return {
    bands,
    christmas,
    listed: buyable,
    seoUrl: getCanonicalUrl(request, GIFTS_PATH),
  };
}

export default function Gifts() {
  const {bands, christmas, listed, seoUrl} = useLoaderData<typeof loader>();
  const shopUrl = new URL('/collections/all', seoUrl).toString();
  let eager = true;

  return (
    <div className="collection-page gifts-page">
      <Analytics.CollectionView
        data={{collection: {handle: 'gifts', id: 'gallery:gifts'}}}
        customData={{products: buildCollectionAnalyticsProducts(listed)}}
      />
      <StructuredData
        data={[
          collectionSchema({
            description: GIFT_PAGE_COPY.metaDescription,
            products: listed,
            title: GIFT_PAGE_COPY.title,
            url: seoUrl,
          }),
          breadcrumbSchema({
            items: [
              {name: 'Shop', url: shopUrl},
              {name: GIFT_PAGE_COPY.title, url: seoUrl},
            ],
          }),
        ]}
      />

      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/collections/all">Shop</Link>
        <span aria-hidden="true">›</span>
        <span>{GIFT_PAGE_COPY.title}</span>
      </nav>

      <header className="gifts-hero">
        <div className="gifts-hero-copy">
          <p className="eyebrow">{GIFT_PAGE_COPY.eyebrow}</p>
          <h1>{GIFT_PAGE_COPY.title}</h1>
          <p className="gifts-subtitle">{GIFT_PAGE_COPY.subtitle}</p>
          <p className="gifts-lead">{GIFT_PAGE_COPY.lead}</p>
          {bands.length > 1 ? (
            <nav className="gifts-jump" aria-label="Price bands">
              {bands.map((band) => (
                <a key={band.key} href={`#gifts-${band.key}`}>
                  {band.heading}
                </a>
              ))}
            </nav>
          ) : null}
        </div>
        <figure className="gifts-hero-media">
          <img
            alt={GIFT_PAGE_COPY.heroAlt}
            fetchPriority="high"
            height="1000"
            sizes="(max-width: 880px) calc(100vw - 32px), 560px"
            src={`${HERO_IMAGE}&width=1000`}
            srcSet={`${HERO_IMAGE}&width=640 640w, ${HERO_IMAGE}&width=1000 1000w, ${HERO_IMAGE}&width=1400 1400w`}
            width="800"
          />
        </figure>
      </header>

      {christmas ? (
        <section className="gifts-christmas" aria-labelledby="gifts-christmas">
          <h2 id="gifts-christmas">{GIFT_PAGE_COPY.christmasHeading}</h2>
          {christmas.region === null ? (
            <p>
              We list Christmas order-by dates for EU and US addresses. For
              other countries, each product page shows its delivery time.
            </p>
          ) : christmas.notices.length ? (
            <>
              <dl>
                {christmas.notices.map((notice) => (
                  <div key={notice.line}>
                    <dt>{notice.label}</dt>
                    <dd>Order by {notice.date}</dd>
                  </div>
                ))}
              </dl>
              <p>
                For delivery in{' '}
                {christmas.region === 'eu' ? 'the EU' : 'the US'}.{' '}
                {GIFT_PAGE_COPY.christmasNote}
              </p>
            </>
          ) : (
            <p>{GIFT_PAGE_COPY.christmasPassed}</p>
          )}
        </section>
      ) : null}

      {bands.map((band) => (
        <section
          className="gifts-band"
          id={`gifts-${band.key}`}
          key={band.key}
          aria-labelledby={`gifts-${band.key}-heading`}
        >
          <h2 id={`gifts-${band.key}-heading`}>{band.heading}</h2>
          <div className="product-grid compact-grid">
            {band.products.map((entry) => {
              const loading = eager ? 'eager' : 'lazy';
              eager = false;
              return entry.kind === 'sky' ? (
                <SkyCard key={entry.handle} tile={entry.sky} />
              ) : (
                <ClaraProductCard
                  key={entry.handle}
                  product={entry.product}
                  loading={loading}
                />
              );
            })}
          </div>
        </section>
      ))}

      {bands.length === 0 ? (
        <p className="gifts-empty">
          These pieces are briefly unavailable.{' '}
          <Link className="text-link" to="/collections/all">
            Browse the shop
          </Link>
        </p>
      ) : null}

      <style suppressHydrationWarning>{giftsCss}</style>
    </div>
  );
}

function SkyCard({tile}: {tile: SkyTile}) {
  return (
    <Link className="gifts-sky-card" to={YOUR_SKY_PAGE.path} prefetch="intent">
      {tile.image ? (
        <img
          alt={tile.image.altText ?? 'Your Sky personalised star map'}
          loading="lazy"
          src={`${tile.image.url}${tile.image.url.includes('?') ? '&' : '?'}width=600`}
        />
      ) : null}
      <span className="eyebrow">Personalised</span>
      <span className="gifts-sky-title">Your Sky star map</span>
      <span className="gifts-sky-price">From {formatMoney(tile.price)}</span>
    </Link>
  );
}

const giftsCss = `
.gifts-page {
  padding-top: calc(var(--header-height) + 22px);
}
.gifts-hero {
  align-items: center;
  display: grid;
  gap: clamp(28px, 4.5vw, 64px);
  grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
  padding: clamp(26px, 4vw, 52px) 0 clamp(10px, 2vw, 22px);
}
.gifts-hero-copy h1 {
  font-family: var(--serif);
  font-size: clamp(2.6rem, 5.4vw, 4.2rem);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 1.02;
  margin: 10px 0 0;
}
.gifts-subtitle {
  color: var(--color-muted);
  font-size: 1.02rem;
  line-height: 1.6;
  margin: 14px 0 0;
}
.gifts-lead {
  border-top: 1px solid rgba(38, 35, 31, 0.14);
  font-size: 0.98rem;
  line-height: 1.7;
  margin: 22px 0 0;
  padding-top: 22px;
}
.gifts-jump {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
}
.gifts-jump a {
  border: 1px solid rgba(38, 35, 31, 0.2);
  border-radius: 999px;
  font-size: 0.86rem;
  padding: 7px 14px;
}
.gifts-jump a:hover {
  border-color: var(--color-ink);
}
.gifts-hero-media {
  margin: 0;
}
.gifts-hero-media img {
  aspect-ratio: 4 / 5;
  border: 1px solid rgba(38, 35, 31, 0.14);
  border-radius: 10px;
  display: block;
  height: auto;
  max-height: 620px;
  object-fit: cover;
  width: 100%;
}
.gifts-christmas {
  border: 1px solid rgba(38, 35, 31, 0.14);
  margin: clamp(24px, 3.5vw, 40px) 0 0;
  padding: 22px 24px;
}
.gifts-christmas h2 {
  font-family: var(--serif);
  font-size: 1.45rem;
  font-weight: 400;
  letter-spacing: -0.02em;
  margin: 0;
}
.gifts-christmas dl {
  display: grid;
  gap: 10px 28px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  margin: 16px 0 0;
}
.gifts-christmas dl div {
  display: grid;
  gap: 2px;
}
.gifts-christmas dt {
  color: var(--color-muted);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.gifts-christmas dd {
  font-size: 0.95rem;
  margin: 0;
}
.gifts-christmas p {
  color: var(--color-muted);
  font-size: 0.88rem;
  line-height: 1.6;
  margin: 14px 0 0;
}
.gifts-band {
  margin: clamp(40px, 6vw, 72px) 0 0;
  scroll-margin-top: calc(var(--header-height) + 16px);
}
.gifts-band > h2 {
  font-family: var(--serif);
  font-size: clamp(1.7rem, 3vw, 2.3rem);
  font-weight: 400;
  letter-spacing: -0.03em;
  margin: 0 0 18px;
}
.gifts-band:last-of-type {
  margin-bottom: clamp(52px, 7vw, 96px);
}
.gifts-sky-card {
  display: grid;
  align-content: start;
  gap: 6px;
}
.gifts-sky-card img {
  aspect-ratio: 4 / 5;
  background: var(--color-oat, #efe9df);
  border-radius: 6px;
  display: block;
  object-fit: cover;
  width: 100%;
}
.gifts-sky-title {
  font-family: var(--serif);
  font-size: 1.1rem;
}
.gifts-sky-price {
  color: var(--color-muted);
  font-size: 0.9rem;
}
.gifts-empty {
  color: var(--color-muted);
  margin: 28px 0 80px;
}
@media (max-width: 880px) {
  .gifts-hero {
    gap: 24px;
    grid-template-columns: 1fr;
  }
  .gifts-hero-media {
    order: -1;
  }
  .gifts-hero-media img {
    aspect-ratio: 4 / 3;
    max-height: none;
  }
  .gifts-christmas {
    padding: 18px;
  }
}
`;

const GIFT_INDEX_QUERY = `#graphql
  query GiftIndex(
    $country: CountryCode
    $language: LanguageCode
    $query: String!
  ) @inContext(country: $country, language: $language) {
    products(first: 250, query: $query) {
      nodes {
        id
        handle
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
` as const;

const GIFT_CARDS_QUERY = `#graphql
  query GiftCards(
    $country: CountryCode
    $ids: [ID!]!
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    nodes(ids: $ids) {
      __typename
      ... on Product {
        ...ClaraProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;
