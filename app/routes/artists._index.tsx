import {Link, useLoaderData} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {Route} from './+types/artists._index';
import {
  artistPath,
  artistProductsQuery,
  publicArtists,
} from '~/lib/artistShops';
import {lifeDatesLabel} from '~/lib/artRegistry';
import {filterDemoProducts} from '~/lib/catalogFilters';
import {buildSeoMeta} from '~/lib/seo';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';
import styles from '~/styles/artists.css?url';

export const links: Route.LinksFunction = () => [
  {rel: 'stylesheet', href: styles},
];

export const meta: Route.MetaFunction = ({data}) =>
  buildSeoMeta({
    description:
      'Every artist whose work Clara Mendes prints, each with a shop of everything we sell of theirs.',
    image: data?.shareImage ?? undefined,
    title: 'Artists | Clara Mendes',
    url: `${STOREFRONT_ORIGIN}/artists`,
  });

/** Letter headings only help once the list is long enough to scan. */
const LETTER_GROUPS_FROM = 9;

export async function loader({context}: Route.LoaderArgs) {
  const artists = publicArtists();
  if (!artists.length) throw new Response('Not found', {status: 404});

  // Shopify returns only Active products published to this channel; the
  // release gate then decides which of those may be listed.
  const data = await context.storefront.query(ARTISTS_INDEX_QUERY, {
    variables: {
      query: artistProductsQuery(artists.flatMap((entry) => entry.products)),
    },
  });
  const live = new Map(
    filterDemoProducts(data.products.nodes).map((product) => [
      product.handle,
      product,
    ]),
  );

  const cards = artists.flatMap(({artist, products}) => {
    const listed = products.filter((product) => live.has(product.handle));
    if (!listed.length) return [];
    const lead =
      listed.find(
        (product) => product.artworkId === artist.representativeArtworkId,
      ) ?? listed[0];
    return [
      {
        count: listed.length,
        dates: lifeDatesLabel(artist),
        image: live.get(lead.handle)?.featuredImage ?? null,
        letter: artist.sortName.charAt(0).toUpperCase(),
        meta: [
          lifeDatesLabel(artist),
          artist.nationality,
          artist.tags?.movement,
        ].filter(Boolean),
        name: artist.name,
        path: artistPath(artist),
      },
    ];
  });
  if (!cards.length) throw new Response('Not found', {status: 404});

  return {
    artists: cards,
    shareImage: cards[0].image?.url ?? null,
  };
}

export default function Artists() {
  const {artists} = useLoaderData<typeof loader>();
  const groups =
    artists.length >= LETTER_GROUPS_FROM
      ? [...new Set(artists.map((artist) => artist.letter))].map((letter) => ({
          letter,
          artists: artists.filter((artist) => artist.letter === letter),
        }))
      : [{letter: null, artists}];

  return (
    <div className="artists-page">
      <header className="artists-intro">
        <p className="eyebrow">Clara Mendes / Artists</p>
        <h1>Artists</h1>
        <p>
          Every artist whose work we print. Each has a shop of everything we
          sell of theirs, with where each work comes from.
        </p>
      </header>

      {groups.map((group) => (
        <section
          className="artists-letter"
          key={group.letter ?? 'all'}
          aria-label={group.letter ? `Artists: ${group.letter}` : 'All artists'}
        >
          {group.letter ? <h2>{group.letter}</h2> : null}
          <ul className="artists-grid">
            {group.artists.map((artist, index) => (
              <li key={artist.path}>
                <Link className="artist-card" prefetch="intent" to={artist.path}>
                  <div className="artist-card__media">
                    {artist.image ? (
                      <Image
                        alt=""
                        aspectRatio="4/5"
                        data={artist.image}
                        loading={index < 3 ? 'eager' : 'lazy'}
                        sizes="(min-width: 900px) 30vw, 90vw"
                      />
                    ) : null}
                  </div>
                  <h3 className="artist-card__name">{artist.name}</h3>
                  <p className="artist-card__meta">
                    {[
                      ...artist.meta,
                      `${artist.count} ${artist.count === 1 ? 'product' : 'products'}`,
                    ].join(' · ')}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const ARTISTS_INDEX_QUERY = `#graphql
  query ArtistsIndex(
    $country: CountryCode
    $language: LanguageCode
    $query: String!
  ) @inContext(country: $country, language: $language) {
    products(first: 100, query: $query) {
      nodes {
        handle
        title
        vendor
        productType
        tags
        storefrontApproved: metafield(namespace: "custom", key: "storefront_approved") {
          type
          value
        }
        fulfillmentVerified: metafield(namespace: "custom", key: "fulfillment_verified") {
          type
          value
        }
        featuredImage {
          id
          url
          altText
          width
          height
        }
      }
    }
  }
` as const;
