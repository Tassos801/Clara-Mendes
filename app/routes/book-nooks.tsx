import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/book-nooks';
import {
  BookNookCard,
  type BookNookStorefrontProduct,
} from '~/components/BookNookCard';
import {
  BOOK_NOOK_PRODUCT_TYPE,
  BOOK_NOOKS_PATH,
  bookNookDeliveryCountries,
  bookNookThemePath,
  bookNookThemesInUse,
  buildBookNookShelf,
  getBookNookTheme,
  releasedBookNooks,
} from '~/lib/bookNooks';
import {curatedImages, formatDeliveryCountries} from '~/lib/curatedProducts';
import {formatMoney} from '~/lib/money';
import {buildSeoMeta} from '~/lib/seo';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';
import styles from '~/styles/book-nooks.css?url';

export const links: Route.LinksFunction = () => [
  {rel: 'stylesheet', href: styles},
];

export const meta: Route.MetaFunction = ({data}) => {
  const theme = data?.theme;
  return buildSeoMeta({
    description: theme
      ? `${theme.title} book nooks: ${theme.note} DIY miniature worlds for your bookshelf, curated by Clara Mendes.`
      : 'Book nooks are miniature worlds you build by hand and slide between your books. DIY kits curated by Clara Mendes, filed by theme.',
    image: data?.shareImage
      ? `${STOREFRONT_ORIGIN}${data.shareImage}`
      : undefined,
    title: theme
      ? `${theme.title} Book Nooks | Clara Mendes`
      : 'Book Nooks — Small Worlds for Your Shelf | Clara Mendes',
    // Theme views are filters of one page, not separate pages.
    url: `${STOREFRONT_ORIGIN}${BOOK_NOOKS_PATH}`,
  });
};

export async function loader({context, request}: Route.LoaderArgs) {
  const nooks = releasedBookNooks();
  if (!nooks.length) throw new Response('Not found', {status: 404});

  const data = await context.storefront.query(BOOK_NOOKS_QUERY, {
    variables: {query: `product_type:"${BOOK_NOOK_PRODUCT_TYPE}"`},
  });
  // Shopify returns only products published to this channel; the registry
  // decides which of those are released, and in what order they shelve.
  const shelf = buildBookNookShelf(
    data.products.nodes as BookNookStorefrontProduct[],
  );
  if (!shelf.length) throw new Response('Not found', {status: 404});

  const theme = getBookNookTheme(
    new URL(request.url).searchParams.get('theme'),
  );
  const prices = shelf.map(({product}) => product.priceRange.minVariantPrice);
  const lowest = prices.reduce((min, price) =>
    Number(price.amount) < Number(min.amount) ? price : min,
  );
  const lead = shelf[0];
  const leadImages = curatedImages(lead.nook.handle);

  return {
    deliveryCountries: formatDeliveryCountries(bookNookDeliveryCountries()),
    fromPrice: formatMoney(lowest),
    hasPriceRange: prices.some((price) => price.amount !== lowest.amount),
    hero: {
      handle: lead.product.handle,
      image: leadImages[1] ?? leadImages[0] ?? null,
      name: lead.nook.name ?? lead.product.title,
    },
    shareImage: leadImages[1]?.url ?? leadImages[0]?.url ?? null,
    shelf: theme ? shelf.filter(({nook}) => nook.theme === theme.slug) : shelf,
    theme,
    themes: bookNookThemesInUse(),
    total: shelf.length,
  };
}

const RITUAL = [
  {
    title: 'Choose a world',
    copy: 'Libraries, streets, gardens and stranger places. Each kit is one small room, filed here by theme.',
  },
  {
    title: 'Build it slowly',
    copy: 'Wooden pieces assembled by hand over an evening or two. Every kit lists its pieces, size and the supplier’s build-time estimate.',
  },
  {
    title: 'Shelve it',
    copy: 'Slide the finished scene between your books. Kits with lighting glow softly in the gap; each listing says how it is lit.',
  },
];

export default function BookNooks() {
  const {
    deliveryCountries,
    fromPrice,
    hasPriceRange,
    hero,
    shelf,
    theme,
    themes,
    total,
  } = useLoaderData<typeof loader>();

  return (
    <div className="nook-page">
      <section className="nook-hero" aria-labelledby="nook-hero-title">
        <div className="nook-hero__copy">
          <p className="eyebrow">Clara Mendes / Book nooks</p>
          <h1 id="nook-hero-title">
            Small worlds <i>for your shelf</i>
          </h1>
          <p className="nook-hero__sub">
            Miniature rooms you build by hand and slide between your books — a
            quiet project for slow evenings, and a small light that stays.
          </p>
          <p className="nook-hero__meta">
            <span>
              {total} {total === 1 ? 'world' : 'worlds'} on the shelf
            </span>
            <span>
              {hasPriceRange ? 'From ' : ''}
              {fromPrice}
            </span>
            {deliveryCountries ? (
              <span>Delivery included to {deliveryCountries}</span>
            ) : null}
          </p>
        </div>
        {hero.image ? (
          <Link
            className="nook-hero__figure"
            prefetch="intent"
            to={`/products/${hero.handle}`}
            aria-label={`View ${hero.name}`}
          >
            <img
              alt={hero.image.altText ?? hero.name}
              loading="eager"
              height={hero.image.height ?? undefined}
              src={hero.image.url}
              width={hero.image.width ?? undefined}
            />
            <span className="nook-hero__caption">{hero.name}</span>
          </Link>
        ) : null}
      </section>

      <nav className="nook-themes" aria-label="Book nook themes">
        <Link
          aria-current={theme ? undefined : 'page'}
          preventScrollReset
          to={BOOK_NOOKS_PATH}
        >
          All <span>{total}</span>
        </Link>
        {themes.map((entry) => (
          <Link
            aria-current={theme?.slug === entry.slug ? 'page' : undefined}
            key={entry.slug}
            preventScrollReset
            to={bookNookThemePath(entry.slug)}
          >
            {entry.title} <span>{entry.count}</span>
          </Link>
        ))}
      </nav>

      <section
        className="nook-collection"
        aria-label={theme ? `${theme.title} book nooks` : 'All book nooks'}
      >
        {theme ? <p className="nook-collection__note">{theme.note}</p> : null}
        {shelf.length ? (
          <div className="nook-grid">
            {shelf.map(({nook, number, product}, index) => (
              <BookNookCard
                key={nook.handle}
                loading={index < 4 ? 'eager' : 'lazy'}
                nook={nook}
                number={number}
                product={product}
              />
            ))}
            {!theme && total < 4 ? (
              <div className="nook-slot">
                <strong>More worlds are on their way.</strong>
                <p>
                  Each kit joins the shelf once its supplier, delivery and price
                  have been checked.
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="nook-collection__empty">
            No kits in this theme yet.{' '}
            <Link className="text-link" to={BOOK_NOOKS_PATH}>
              See every book nook
            </Link>
          </p>
        )}
      </section>

      <section className="nook-ritual" aria-labelledby="nook-ritual-title">
        <h2 id="nook-ritual-title">How a book nook comes together</h2>
        <ol>
          {RITUAL.map((step, index) => (
            <li key={step.title}>
              <span aria-hidden>{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </li>
          ))}
        </ol>
      </section>

      <aside className="nook-delivery" aria-label="Book nook delivery">
        <p>
          Kits ship from our fulfilment partner, separately from art prints.
          {deliveryCountries
            ? ` Delivery is included to ${deliveryCountries}.`
            : ''}{' '}
          Each listing shows its own processing and delivery estimates.
        </p>
        <Link className="text-link" to="/policies/shipping-policy">
          Shipping policy
        </Link>
      </aside>
    </div>
  );
}

const BOOK_NOOKS_QUERY = `#graphql
  query BookNooks(
    $country: CountryCode
    $language: LanguageCode
    $query: String!
  ) @inContext(country: $country, language: $language) {
    products(first: 50, query: $query) {
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
  }
` as const;
