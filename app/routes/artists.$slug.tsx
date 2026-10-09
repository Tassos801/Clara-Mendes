import {Link, redirect, useLoaderData} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {Route} from './+types/artists.$slug';
import {
  ClaraProductCard,
  type ClaraCardProduct,
} from '~/components/ClaraProductCard';
import {
  artistArtworks,
  artistFamilies,
  artistPath,
  artistProductsQuery,
  publicArtistBySlug,
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
    image: data.hero.image?.url ?? undefined,
    title: `${artist.name}: art prints and more | Clara Mendes`,
    // Family filters are views of one page.
    url: `${STOREFRONT_ORIGIN}${artist.path}`,
  });
};

export async function loader({context, params, request}: Route.LoaderArgs) {
  const entry = publicArtistBySlug(params.slug);
  if (!entry) throw new Response('Not found', {status: 404});
  const {artist} = entry;
  if (params.slug !== artist.slug) {
    throw redirect(`${artistPath(artist)}${new URL(request.url).search}`, 301);
  }

  // Shopify returns only Active products published to this channel; the
  // release gate decides which may be listed, and the artist's own handles
  // decide which of the tagged collection members are theirs.
  const data = await context.storefront.query(ARTIST_SHOP_QUERY, {
    variables: {query: artistProductsQuery(entry.products)},
  });
  const order = new Map(
    entry.products.map((product, index) => [product.handle, index]),
  );
  const products = filterDemoProducts(
    data.products.nodes as ClaraCardProduct[],
  )
    .filter((product) => order.has(product.handle))
    .sort((a, b) => (order.get(a.handle) ?? 0) - (order.get(b.handle) ?? 0));
  if (!products.length) throw new Response('Not found', {status: 404});

  const listed = entry.products.filter((product) =>
    products.some((live) => live.handle === product.handle),
  );
  const families = artistFamilies(listed);
  const requested = new URL(request.url).searchParams.get('type');
  const family =
    families.length > 1
      ? (families.find(
          (name) => name.toLowerCase() === requested?.toLowerCase(),
        ) ?? null)
      : null;
  const shown = family
    ? products.filter((product) =>
        listed.some(
          (entry) => entry.handle === product.handle && entry.family === family,
        ),
      )
    : products;
  const lead =
    products.find((product) =>
      listed.some(
        (entry) =>
          entry.handle === product.handle &&
          entry.artworkId === artist.representativeArtworkId,
      ),
    ) ?? products[0];

  return {
    artist: {
      bio: artist.bio,
      curatorNote: artist.curatorNote,
      kind: artist.kind,
      meta: [
        lifeDatesLabel(artist),
        artist.nationality,
        artist.tags?.movement,
      ].filter((value): value is string => Boolean(value)),
      name: artist.name,
      path: artistPath(artist),
    },
    artworks: artistArtworks(listed).map((artwork) => ({
      credit: artworkCreditLine(artwork),
      date: artwork.date,
      id: artwork.id,
      medium: artwork.medium,
      objectUrl: artwork.source.objectUrl,
      title: artwork.title,
    })),
    families,
    family,
    hero: {
      image: lead.featuredImage ?? null,
      title: lead.title,
    },
    products: shown,
    total: products.length,
  };
}

export default function ArtistShop() {
  const {artist, artworks, families, family, hero, products, total} =
    useLoaderData<typeof loader>();

  return (
    <div className="artists-page">
      <section className="artist-hero" aria-labelledby="artist-name">
        <div className="artist-hero__copy">
          <p className="eyebrow">
            <Link to="/artists" prefetch="intent">
              Artists
            </Link>{' '}
            / {artist.name}
          </p>
          <h1 id="artist-name">{artist.name}</h1>
          {artist.meta.length ? (
            <p className="artist-hero__meta">{artist.meta.join(' · ')}</p>
          ) : null}
          {artist.kind === 'studio' ? (
            <span className="artist-hero__label">Generated studio work</span>
          ) : null}
          {artist.bio ? <p className="artist-hero__bio">{artist.bio}</p> : null}
          {artist.curatorNote ? (
            <figure className="artist-hero__note">
              <p>{artist.curatorNote}</p>
              <figcaption>Curator’s note</figcaption>
            </figure>
          ) : null}
        </div>
        {hero.image ? (
          <figure className="artist-hero__figure">
            <Image
              alt={hero.image.altText ?? hero.title}
              aspectRatio="4/5"
              data={hero.image}
              loading="eager"
              sizes="(min-width: 900px) 40vw, 90vw"
            />
            <figcaption>{hero.title}</figcaption>
          </figure>
        ) : null}
      </section>

      <section className="artist-products" aria-labelledby="artist-products">
        <div className="section-heading-row">
          <h2 id="artist-products">
            {family ?? 'All products'}
          </h2>
          <p>
            {total} {total === 1 ? 'product' : 'products'}
          </p>
        </div>
        {families.length > 1 ? (
          <nav className="artist-families" aria-label="Product types">
            <Link
              aria-current={family ? undefined : 'page'}
              preventScrollReset
              to={artist.path}
            >
              All
            </Link>
            {families.map((name) => (
              <Link
                aria-current={family === name ? 'page' : undefined}
                key={name}
                preventScrollReset
                to={`${artist.path}?type=${encodeURIComponent(name)}`}
              >
                {name}
              </Link>
            ))}
          </nav>
        ) : null}
        <div className="product-grid">
          {products.map((product, index) => (
            <ClaraProductCard
              key={product.id}
              loading={index < 4 ? 'eager' : 'lazy'}
              product={product}
            />
          ))}
        </div>
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
