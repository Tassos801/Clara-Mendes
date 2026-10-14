import {useEffect, useRef, useState} from 'react';
import {
  Form,
  Link,
  redirect,
  useLoaderData,
  useLocation,
  useNavigation,
  useSearchParams,
} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {Route} from './+types/artists.$slug';
import {
  ClaraProductCard,
  type ClaraCardProduct,
} from '~/components/ClaraProductCard';
import {
  ARTIST_SORTS,
  artistArtworks,
  artistElsewhere,
  artistFacetValue,
  artistPath,
  artistProductsQuery,
  artistShopView,
  publicArtistBySlug,
  type ArtistFacetGroup,
} from '~/lib/artistShops';
import {artworkCreditLine, lifeDatesLabel} from '~/lib/artRegistry';
import {filterDemoProducts} from '~/lib/catalogFilters';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/productCardFragment';
import {buildSeoMeta} from '~/lib/seo';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';
import styles from '~/styles/artists.css?url';

export const links: Route.LinksFunction = () => [
  {rel: 'stylesheet', href: styles},
];

export const meta: Route.MetaFunction = ({data}) => {
  if (!data) return [{title: 'Artist not found | Clara Mendes'}];
  const {artist} = data;
  return buildSeoMeta({
    description: firstSentence(artist.bio),
    image: data.portrait?.url ?? undefined,
    title: `${artist.name}: art prints and more | Clara Mendes`,
    // Refine and sort are views of one page.
    url: `${STOREFRONT_ORIGIN}${artist.path}`,
  });
};

/** Designs in the "featured" slideshow beside the biography. */
const FEATURED_COUNT = 3;

export async function loader({context, params, request}: Route.LoaderArgs) {
  const entry = publicArtistBySlug(params.slug);
  if (!entry) throw new Response('Not found', {status: 404});
  const {artist} = entry;
  const url = new URL(request.url);
  if (params.slug !== artist.slug) {
    throw redirect(`${artistPath(artist)}${url.search}`, 301);
  }

  // Shopify returns only Active products published to this channel; the
  // release gate decides which may be listed, and the artist's own handles
  // decide which of the tagged collection members are theirs.
  const data = await context.storefront.query(ARTIST_SHOP_QUERY, {
    variables: {query: artistProductsQuery(entry.products)},
  });
  const live = new Map(
    filterDemoProducts(data.products.nodes as ClaraCardProduct[]).map(
      (product) => [product.handle, product],
    ),
  );
  const listed = entry.products.filter((product) => live.has(product.handle));
  if (!listed.length) throw new Response('Not found', {status: 404});

  const view = artistShopView(listed, url.searchParams);
  const cardOf = (handle: string) => live.get(handle)!;
  const lead =
    listed.find(
      (product) => product.artworkId === artist.representativeArtworkId,
    ) ?? listed[0];
  const featured = [lead, ...listed.filter((product) => product !== lead)]
    .slice(0, FEATURED_COUNT)
    .map((product) => {
      const card = cardOf(product.handle);
      // The first room scene after the flat artwork, as on the product page.
      const scene =
        card.images?.nodes.find(
          (image) => image.url !== card.featuredImage?.url,
        ) ?? card.featuredImage;
      return {
        handle: product.handle,
        image: scene ?? null,
        title: product.title,
      };
    })
    .filter((slide) => slide.image);
  const artworks = artistArtworks(listed);

  return {
    artist: {
      bio: artist.bio,
      curatorNote: artist.curatorNote,
      elsewhere: artistElsewhere(artist, artworks),
      kind: artist.kind,
      meta: [
        lifeDatesLabel(artist),
        artist.nationality,
        artist.tags?.movement,
      ].filter((value): value is string => Boolean(value)),
      name: artist.name,
      path: artistPath(artist),
    },
    artworks: artworks.map((artwork) => ({
      credit: artworkCreditLine(artwork),
      date: artwork.date,
      id: artwork.id,
      medium: artwork.medium,
      objectUrl: artwork.source.objectUrl,
      title: artwork.title,
    })),
    featured,
    groups: view.groups,
    activeCount: view.activeCount,
    portrait: cardOf(lead.handle).featuredImage
      ? {...cardOf(lead.handle).featuredImage!, title: lead.title}
      : null,
    products: view.products.map((product) => cardOf(product.handle)),
    sort: view.sort,
    total: listed.length,
  };
}

export default function ArtistShop() {
  const {
    activeCount,
    artist,
    artworks,
    featured,
    groups,
    portrait,
    products,
    sort,
    total,
  } = useLoaderData<typeof loader>();

  return (
    <div className="artists-page artist-shop">
      <nav className="artist-crumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link prefetch="intent" to="/">
              Home
            </Link>
          </li>
          <li>
            <Link prefetch="intent" to="/artists">
              Artists
            </Link>
          </li>
          <li aria-current="page">{artist.name}</li>
        </ol>
      </nav>

      <header className="artist-masthead">
        <h1>{artist.name}</h1>
        {artist.kind === 'studio' ? (
          <span className="artist-hero__label">Generated studio work</span>
        ) : null}
      </header>

      <section className="artist-about" aria-labelledby="artist-about">
        <div className="artist-about__copy">
          {portrait ? (
            <div className="artist-about__portrait">
              <Image
                alt={`Detail of ${portrait.title}`}
                aspectRatio="1/1"
                data={portrait}
                loading="eager"
                sizes="168px"
              />
            </div>
          ) : null}
          <h2 id="artist-about">About the artist</h2>
          {artist.meta.length ? (
            <p className="artist-hero__meta">{artist.meta.join(' · ')}</p>
          ) : null}
          {artist.bio ? (
            <p className="artist-about__bio">{artist.bio}</p>
          ) : null}
          {artist.curatorNote ? (
            <figure className="artist-about__note">
              <p>{artist.curatorNote}</p>
              <figcaption>Curator’s note</figcaption>
            </figure>
          ) : null}
          {artist.elsewhere.length ? (
            <div className="artist-about__elsewhere">
              <p>See more of their work at</p>
              <ul>
                {artist.elsewhere.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} rel="noreferrer" target="_blank">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        {featured.length ? <FeaturedDesigns slides={featured} /> : null}
      </section>

      <section className="artist-listing" aria-labelledby="artist-products">
        <h2 className="sr-only" id="artist-products">
          Shop {artist.name}
        </h2>
        <ArtistListing
          activeCount={activeCount}
          byline={artist.name}
          groups={groups}
          path={artist.path}
          products={products}
          sort={sort}
          total={total}
        />
      </section>

      {artworks.length ? (
        <section className="artist-works" aria-labelledby="artist-works">
          <h2 id="artist-works">About the works</h2>
          <ol>
            {artworks.map((artwork) => (
              <li key={artwork.id}>
                <h3>{artwork.title}</h3>
                <p>
                  {artwork.date}. {artwork.medium}.
                </p>
                <p>{artwork.credit}</p>
                <a
                  className="text-link"
                  href={artwork.objectUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Museum record
                </a>
              </li>
            ))}
          </ol>
          <p className="artist-works__disclaimer">
            Reproduced from public-domain museum images. Clara Mendes is not
            affiliated with or endorsed by the museums.
          </p>
        </section>
      ) : null}

      <p className="artists-back">
        <Link className="text-link" prefetch="intent" to="/artists">
          All artists
        </Link>
      </p>
    </div>
  );
}

type Slide = {
  handle: string;
  image: {
    altText?: string | null;
    height?: number | null;
    id?: string;
    url: string;
    width?: number | null;
  } | null;
  title: string;
};

/**
 * A few of the artist's designs in a room, one at a time. Swipe or use the
 * numbered buttons; nothing advances on its own.
 */
function FeaturedDesigns({slides}: {slides: Slide[]}) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const current = slides[Math.min(active, slides.length - 1)];

  const show = (index: number) => {
    const element = track.current;
    if (!element) return;
    element.scrollTo({behavior: 'smooth', left: index * element.clientWidth});
    setActive(index);
  };

  return (
    <div
      aria-label="Featured designs"
      aria-roledescription="carousel"
      className="artist-featured"
      role="region"
    >
      <div
        className="artist-featured__track"
        onScroll={(event) => {
          const element = event.currentTarget;
          const index = Math.round(element.scrollLeft / element.clientWidth);
          if (index !== active) setActive(index);
        }}
        ref={track}
      >
        {slides.map((slide, index) => (
          <figure
            aria-label={`${index + 1} of ${slides.length}: ${slide.title}`}
            aria-roledescription="slide"
            className="artist-featured__slide"
            key={slide.handle}
          >
            <Link
              prefetch="intent"
              tabIndex={-1}
              to={`/products/${slide.handle}`}
            >
              <Image
                alt={slide.image!.altText ?? slide.title}
                aspectRatio="1/1"
                data={slide.image!}
                loading={index === 0 ? 'eager' : 'lazy'}
                sizes="(min-width: 900px) 48vw, 92vw"
              />
            </Link>
          </figure>
        ))}
      </div>
      <div className="artist-featured__bar">
        {slides.length > 1 ? (
          <div className="artist-featured__pager">
            {slides.map((slide, index) => (
              <button
                aria-label={`Show ${slide.title}`}
                aria-pressed={index === active}
                key={slide.handle}
                onClick={() => show(index)}
                type="button"
              >
                {String(index + 1).padStart(2, '0')}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <Link
          aria-label={`Shop ${current.title}`}
          className="artist-featured__shop"
          prefetch="intent"
          to={`/products/${current.handle}`}
        >
          Shop this design
          <span aria-hidden className="artist-featured__arrow">
            <svg fill="none" height="14" viewBox="0 0 16 16" width="14">
              <path
                d="M6 3.5 10.5 8 6 12.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
          </span>
        </Link>
      </div>
    </div>
  );
}

/**
 * Refine (left, or a sheet on phones), sort and the grid. Every choice lives
 * in the URL; without JavaScript the panel is a plain GET form.
 */
function ArtistListing({
  activeCount,
  byline,
  groups,
  path,
  products,
  sort,
  total,
}: {
  activeCount: number;
  byline: string;
  groups: ArtistFacetGroup[];
  path: string;
  products: ClaraCardProduct[];
  sort: string;
  total: number;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Show a choice as made while its page loads.
  const pending =
    navigation.location?.pathname === location.pathname
      ? new URLSearchParams(navigation.location.search)
      : searchParams;
  const isChecked = (key: string, value: string) =>
    pending
      .getAll(key)
      .some((entry) => artistFacetValue(key, entry) === value);

  const update = (mutate: (params: URLSearchParams) => void) => {
    // From the pending URL, so quick successive clicks all count.
    const next = new URLSearchParams(pending);
    mutate(next);
    void setSearchParams(next, {preventScrollReset: true});
  };
  const toggle = (key: string, value: string) =>
    update((params) => {
      const kept = params
        .getAll(key)
        .filter((entry) => artistFacetValue(key, entry) !== value);
      params.delete(key);
      for (const entry of kept) params.append(key, entry);
      if (!isChecked(key, value)) params.append(key, value);
    });
  const clear = () =>
    update((params) => {
      for (const group of groups) params.delete(group.key);
      params.delete('type');
    });

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.documentElement.classList.add('artist-refine-open');
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.classList.remove('artist-refine-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const close = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  const count = `${products.length} ${products.length === 1 ? 'product' : 'products'}`;

  // The form wraps the panel only: each card's quick add is a form of its
  // own, and forms cannot nest. The sort menu joins it by id.
  return (
    <div className="artist-listing__layout">
      <aside
        aria-label="Refine"
        className="artist-refine"
        data-open={open ? 'true' : undefined}
        id="artist-refine"
      >
        <Form
          action={path}
          className="artist-refine__form"
          id={REFINE_FORM_ID}
          method="get"
        >
          <div className="artist-refine__head">
            <p className="artist-refine__title">Refine</p>
            {activeCount ? (
              <button
                className="artist-refine__clear"
                onClick={clear}
                type="button"
              >
                Clear all
              </button>
            ) : null}
            <button
              aria-label="Close filters"
              className="artist-refine__close"
              onClick={close}
              ref={closeRef}
              type="button"
            >
              <svg
                aria-hidden
                fill="none"
                height="16"
                viewBox="0 0 16 16"
                width="16"
              >
                <path
                  d="M3.5 3.5l9 9M12.5 3.5l-9 9"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
          </div>
          <div className="artist-refine__groups">
            {groups.map((group) => (
              <details className="artist-refine__group" key={group.key} open>
                <summary>
                  {group.label}
                  <svg
                    aria-hidden
                    fill="none"
                    height="14"
                    viewBox="0 0 16 16"
                    width="14"
                  >
                    <path
                      d="M3.5 6 8 10.5 12.5 6"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                    />
                  </svg>
                </summary>
                <ul>
                  {group.options.map((option) => {
                    const id = `refine-${group.key}-${option.value}`;
                    const checked = isChecked(group.key, option.value);
                    return (
                      <li key={option.value}>
                        <input
                          checked={checked}
                          disabled={!option.count && !checked}
                          id={id}
                          name={group.key}
                          onChange={() => toggle(group.key, option.value)}
                          type="checkbox"
                          value={option.value}
                        />
                        <label htmlFor={id}>
                          <span>{option.label}</span>
                          <span className="artist-refine__count">
                            {option.count}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </details>
            ))}
          </div>
          <noscript>
            <button className="artist-refine__apply" type="submit">
              Apply
            </button>
          </noscript>
          <div className="artist-refine__foot">
            <button
              className="artist-refine__done"
              onClick={close}
              type="button"
            >
              Show {count}
            </button>
          </div>
        </Form>
      </aside>
      {open ? (
        <button
          aria-label="Close filters"
          className="artist-refine__scrim"
          onClick={close}
          tabIndex={-1}
          type="button"
        />
      ) : null}

      <div className="artist-listing__results">
        <div className="artist-listing__toolbar">
          <button
            aria-controls="artist-refine"
            aria-expanded={open}
            className="artist-listing__filter"
            onClick={() => setOpen(true)}
            ref={toggleRef}
            type="button"
          >
            <svg
              aria-hidden
              fill="none"
              height="16"
              viewBox="0 0 16 16"
              width="16"
            >
              <path
                d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.5"
              />
            </svg>
            Filter{activeCount ? ` (${activeCount})` : ''}
          </button>
          <p aria-live="polite" className="artist-listing__count">
            {products.length === total
              ? count
              : `${products.length} of ${total} products`}
          </p>
          <label className="artist-listing__sort">
            <span>Sort by:</span>
            <select
              form={REFINE_FORM_ID}
              name="sort"
              onChange={(event) => {
                const value = event.currentTarget.value;
                update((params) => {
                  if (value === 'featured') params.delete('sort');
                  else params.set('sort', value);
                });
              }}
              value={pending.get('sort') ?? sort}
            >
              {ARTIST_SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {products.length ? (
          <div className="artist-grid">
            {products.map((product, index) => (
              <ClaraProductCard
                byline={byline}
                key={product.id}
                loading={index < 3 ? 'eager' : 'lazy'}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div className="artist-listing__empty">
            <p>Nothing matches every choice.</p>
            <button className="text-link" onClick={clear} type="button">
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const REFINE_FORM_ID = 'artist-refine-form';

function firstSentence(text: string) {
  const sentence = text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;
  return sentence.length > 160 ? `${sentence.slice(0, 157)}…` : sentence;
}

const ARTIST_SHOP_QUERY = `#graphql
  query ArtistShop(
    $country: CountryCode
    $language: LanguageCode
    $query: String!
  ) @inContext(country: $country, language: $language) {
    products(first: 100, query: $query) {
      nodes {
        ...ClaraProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;
