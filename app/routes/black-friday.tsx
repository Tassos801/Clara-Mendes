import {Link, useLoaderData} from 'react-router';
import {Analytics} from '@shopify/hydrogen';
import type {Route} from './+types/black-friday';
import {
  ClaraProductCard,
  type ClaraCardProduct,
} from '~/components/ClaraProductCard';
import {buildCollectionAnalyticsProducts} from './collections.all';
import {
  BLACK_FRIDAY_COPY,
  BLACK_FRIDAY_GROUPS,
  BLACK_FRIDAY_PATH,
  blackFridayNow,
  blackFridayStatus,
  interleave,
  productTypeQuery,
} from '~/lib/blackFriday';
import {filterDemoProducts} from '~/lib/catalogFilters';
import {
  christmasLineLabel,
  christmasNotices,
  formatOrderByDate,
  requestToday,
} from '~/lib/christmasDelivery';
import {nothingBuyable} from '~/lib/deliveryReach';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/productCardFragment';
import {buildSeoMeta, getCanonicalUrl} from '~/lib/seo';
import {SHOP_PATH} from '~/lib/navLinks';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';

/** Cards per group; "See all" opens the shop filtered to the group's types. */
const GROUP_LIMIT = 8;
/** Per type in a group of several types, which are then taken in turn. */
const MIXED_TYPE_LIMIT = 4;

export const meta: Route.MetaFunction = ({data}) =>
  buildSeoMeta({
    description: BLACK_FRIDAY_COPY.metaDescription,
    // Outside the window the page only says the offer is not on.
    noIndex: data?.status !== 'open',
    title: BLACK_FRIDAY_COPY.seoTitle,
    url: data?.seoUrl ?? `${STOREFRONT_ORIGIN}${BLACK_FRIDAY_PATH}`,
  });

type GroupsResult = {
  [alias: `g${number}_${number}`]: {nodes: ClaraCardProduct[]} | null;
};

export async function loader({context, request}: Route.LoaderArgs) {
  const status = blackFridayStatus(blackFridayNow(request));
  const seoUrl = getCanonicalUrl(request, BLACK_FRIDAY_PATH);
  if (status !== 'open') {
    return {status, seoUrl, groups: [], listed: [], christmas: []};
  }

  const data = await context.storefront.query<GroupsResult>(
    BLACK_FRIDAY_GROUPS_QUERY,
    {cache: context.storefront.CacheShort()},
  );
  const groups = BLACK_FRIDAY_GROUPS.map((group, index) => {
    const products = interleave(
      group.productTypes.map((_, typeIndex) =>
        filterDemoProducts(data[`g${index}_${typeIndex}`]?.nodes ?? []).filter(
          (product) => !nothingBuyable(product),
        ),
      ),
      GROUP_LIMIT,
    );
    const params = new URLSearchParams();
    for (const type of group.productTypes) params.append('type', type);
    return {
      key: group.key,
      heading: group.heading,
      percent: group.percent,
      note: group.note ?? null,
      products,
      allUrl: `${SHOP_PATH}?${params.toString()}`,
    };
  }).filter((group) => group.products.length > 0);

  // The EU order-by dates for the lines on sale (no book nooks: not in the
  // offer), while each date is still ahead.
  const christmas = christmasNotices('eu', requestToday(request))
    .filter((notice) => notice.line !== 'book-nooks')
    .map((notice) => ({
      line: notice.line,
      label: christmasLineLabel(notice.line, 'eu'),
      date: formatOrderByDate(notice.date),
    }));

  return {
    status,
    seoUrl,
    groups,
    listed: groups.flatMap((group) => group.products),
    christmas,
  };
}

export default function BlackFriday() {
  const {christmas, groups, listed, status} = useLoaderData<typeof loader>();
  let eager = true;

  if (status !== 'open') {
    return (
      <div className="black-friday-page">
        <header className="black-friday-hero">
          <p className="eyebrow">Clara Mendes</p>
          <h1>{BLACK_FRIDAY_COPY.title}</h1>
          <p className="black-friday-lead">
            {status === 'before'
              ? BLACK_FRIDAY_COPY.before
              : BLACK_FRIDAY_COPY.ended}
          </p>
          <p>
            <Link className="text-link" to={SHOP_PATH}>
              Browse the shop
            </Link>
          </p>
        </header>
        <style suppressHydrationWarning>{css}</style>
      </div>
    );
  }

  return (
    <div className="black-friday-page">
      <Analytics.CollectionView
        data={{
          collection: {handle: 'black-friday', id: 'gallery:black-friday'},
        }}
        customData={{products: buildCollectionAnalyticsProducts(listed)}}
      />

      <header className="black-friday-hero">
        <p className="eyebrow">{BLACK_FRIDAY_COPY.dates}</p>
        <h1>{BLACK_FRIDAY_COPY.title}</h1>
        <dl className="black-friday-offer">
          <div>
            <dt>20% off</dt>
            <dd>{BLACK_FRIDAY_COPY.twenty}</dd>
          </div>
          <div>
            <dt>10% off</dt>
            <dd>{BLACK_FRIDAY_COPY.ten}</dd>
          </div>
        </dl>
        <p className="black-friday-excluded">{BLACK_FRIDAY_COPY.excluded}</p>
        <p className="black-friday-lead">{BLACK_FRIDAY_COPY.cart}</p>
        {groups.length > 1 ? (
          <nav className="black-friday-jump" aria-label="Offer groups">
            {groups.map((group) => (
              <a key={group.key} href={`#bf-${group.key}`}>
                {group.heading}
              </a>
            ))}
          </nav>
        ) : null}
      </header>

      {christmas.length ? (
        <section className="black-friday-christmas" aria-labelledby="bf-xmas">
          <h2 id="bf-xmas">Order by, for Christmas in the EU</h2>
          <dl>
            {christmas.map((notice) => (
              <div key={notice.line}>
                <dt>{notice.label}</dt>
                <dd>Order by {notice.date}</dd>
              </div>
            ))}
          </dl>
          <p>
            Estimates for delivery by 24 December, not guarantees. Each product
            page shows its own delivery time.
          </p>
        </section>
      ) : null}

      {groups.map((group) => (
        <section
          className="black-friday-group"
          id={`bf-${group.key}`}
          key={group.key}
          aria-labelledby={`bf-${group.key}-heading`}
        >
          <div className="black-friday-group-head">
            <h2 id={`bf-${group.key}-heading`}>
              {group.heading} <span>{group.percent}% off</span>
            </h2>
            <Link className="text-link" to={group.allUrl} prefetch="intent">
              See all
            </Link>
          </div>
          {group.note ? (
            <p className="black-friday-group-note">{group.note}</p>
          ) : null}
          <div className="product-grid compact-grid">
            {group.products.map((product) => {
              const loading = eager ? 'eager' : 'lazy';
              eager = false;
              return (
                <ClaraProductCard
                  key={product.handle}
                  product={product}
                  loading={loading}
                />
              );
            })}
          </div>
        </section>
      ))}

      {groups.length === 0 ? (
        <p className="black-friday-lead">
          These pieces are briefly unavailable.{' '}
          <Link className="text-link" to={SHOP_PATH}>
            Browse the shop
          </Link>
        </p>
      ) : null}

      <style suppressHydrationWarning>{css}</style>
    </div>
  );
}

const css = `
.black-friday-page {
  padding-top: calc(var(--header-height) + 22px);
  padding-bottom: clamp(52px, 7vw, 96px);
}
.black-friday-hero {
  max-width: 760px;
  padding: clamp(26px, 4vw, 52px) 0 clamp(10px, 2vw, 22px);
}
.black-friday-hero h1 {
  font-family: var(--serif);
  font-size: clamp(2.6rem, 5.4vw, 4.2rem);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 1.02;
  margin: 10px 0 0;
}
.black-friday-offer {
  display: grid;
  gap: 14px;
  margin: 24px 0 0;
}
.black-friday-offer div {
  display: grid;
  gap: 4px 18px;
  grid-template-columns: 5.5rem minmax(0, 1fr);
}
.black-friday-offer dt {
  font-family: var(--serif);
  font-size: 1.35rem;
  line-height: 1.2;
}
.black-friday-offer dd {
  font-size: 1rem;
  line-height: 1.6;
  margin: 0;
}
.black-friday-excluded {
  color: var(--color-muted);
  font-size: 0.92rem;
  line-height: 1.6;
  margin: 16px 0 0;
}
.black-friday-lead {
  border-top: 1px solid rgba(38, 35, 31, 0.14);
  font-size: 0.98rem;
  line-height: 1.7;
  margin: 18px 0 0;
  padding-top: 18px;
}
.black-friday-jump {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
}
.black-friday-jump a {
  border: 1px solid rgba(38, 35, 31, 0.2);
  border-radius: 999px;
  font-size: 0.86rem;
  padding: 7px 14px;
}
.black-friday-jump a:hover {
  border-color: var(--color-ink);
}
.black-friday-christmas {
  border: 1px solid rgba(38, 35, 31, 0.14);
  margin: clamp(24px, 3.5vw, 40px) 0 0;
  padding: 22px 24px;
}
.black-friday-christmas h2 {
  font-family: var(--serif);
  font-size: 1.45rem;
  font-weight: 400;
  letter-spacing: -0.02em;
  margin: 0;
}
.black-friday-christmas dl {
  display: grid;
  gap: 10px 28px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  margin: 16px 0 0;
}
.black-friday-christmas dl div {
  display: grid;
  gap: 2px;
}
.black-friday-christmas dt {
  color: var(--color-muted);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.black-friday-christmas dd {
  font-size: 0.95rem;
  margin: 0;
}
.black-friday-christmas p {
  color: var(--color-muted);
  font-size: 0.88rem;
  line-height: 1.6;
  margin: 14px 0 0;
}
.black-friday-group {
  margin: clamp(40px, 6vw, 72px) 0 0;
  scroll-margin-top: calc(var(--header-height) + 16px);
}
.black-friday-group-head {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  justify-content: space-between;
  margin: 0 0 18px;
}
.black-friday-group-head h2 {
  font-family: var(--serif);
  font-size: clamp(1.7rem, 3vw, 2.3rem);
  font-weight: 400;
  letter-spacing: -0.03em;
  margin: 0;
}
.black-friday-group-head h2 span {
  color: var(--color-muted);
  font-family: var(--sans);
  font-size: 0.9rem;
  letter-spacing: 0.04em;
  margin-left: 6px;
  white-space: nowrap;
}
.black-friday-group-note {
  color: var(--color-muted);
  font-size: 0.9rem;
  margin: -10px 0 16px;
}
@media (max-width: 880px) {
  .black-friday-christmas {
    padding: 18px;
  }
  .black-friday-offer div {
    grid-template-columns: 1fr;
  }
}
`;

/**
 * One aliased `products(query:)` field per product type of each offer group
 * (`g<group>_<type>` in BLACK_FRIDAY_GROUPS order), best sellers first.
 * Built from the groups, so it is not a codegen document; the loader types
 * it.
 */
const BLACK_FRIDAY_GROUPS_QUERY = `
  query BlackFridayGroups(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    ${BLACK_FRIDAY_GROUPS.flatMap((group, index) =>
      group.productTypes.map(
        (type, typeIndex) =>
          `g${index}_${typeIndex}: products(first: ${
            group.productTypes.length > 1 ? MIXED_TYPE_LIMIT : GROUP_LIMIT
          }, sortKey: BEST_SELLING, query: ${JSON.stringify(
            productTypeQuery(type),
          )}) { nodes { ...ClaraProductCard } }`,
      ),
    ).join('\n    ')}
  }
  ${PRODUCT_CARD_FRAGMENT}`;
