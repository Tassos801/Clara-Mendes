import type {CSSProperties} from 'react';
import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/artists._index';
import {StructuredData} from '~/components/StructuredData';
import {
  artistFamilies,
  artistFamilyLabel,
  artistIndexEntry,
  artistProductsQuery,
  collectPages,
  publicArtists,
  type ArtistIndexWork,
  type ArtistProductFamily,
} from '~/lib/artistShops';
import {filterDemoProducts} from '~/lib/catalogFilters';
import {formatMoney, type MoneyAmount} from '~/lib/money';
import {breadcrumbSchema, buildSeoMeta} from '~/lib/seo';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';
import styles from '~/styles/artists.css?url';

export const links: Route.LinksFunction = () => [
  {rel: 'stylesheet', href: styles},
];

const PAGE_URL = `${STOREFRONT_ORIGIN}/artists`;

export const meta: Route.MetaFunction = ({data}) => {
  const names = data?.artists.map((artist) => artist.shortName) ?? [];
  return buildSeoMeta({
    description: data
      ? `Shop by artist: ${listWords(names)}. Public-domain museum works printed to order as ${listWords(data.families.map(artistFamilyLabel)).toLowerCase()}.`
      : 'The artists behind the museum works Clara Mendes prints.',
    image: data?.shareImage ?? undefined,
    // Name the artists while the list is short enough to read in a title.
    title:
      names.length && names.length <= 3
        ? `Artists: ${listWords(names)} | Clara Mendes`
        : 'Artists | Clara Mendes',
    url: PAGE_URL,
  });
};

/** Letter headings only help once the list is long enough to scan. */
const LETTER_GROUPS_FROM = 9;

/** Works hung beside each artist; narrow phones show two (artists.css). */
const WALL_WORKS = 3;

export async function loader({context}: Route.LoaderArgs) {
  const artists = publicArtists();
  if (!artists.length) throw new Response('Not found', {status: 404});

  // Shopify returns only Active products published to this channel; the
  // release gate then decides which of those may be listed.
  const query = artistProductsQuery(
    artists.flatMap((entry) => entry.products),
  );
  const nodes = await collectPages((after) =>
    context.storefront
      .query(ARTISTS_INDEX_QUERY, {variables: {after, query}})
      .then((page) => page.products),
  );
  const live = new Map(
    filterDemoProducts(nodes).map((product) => [product.handle, product]),
  );

  const rows = artists.flatMap(({artist, products}) => {
    const listed = products.filter((product) => live.has(product.handle));
    if (!listed.length) return [];
    const prices = listed.map(
      (product) => live.get(product.handle)!.priceRange.minVariantPrice,
    );
    const entry = artistIndexEntry(artist, listed);
    return [
      {
        ...entry,
        fromPrice: prices.reduce<MoneyAmount>(
          (lowest, price) =>
            Number(price.amount) < Number(lowest.amount) ? price : lowest,
          prices[0],
        ),
        leadImage:
          live.get(
            (listed.find(
              (product) =>
                product.artworkId === artist.representativeArtworkId,
            ) ?? listed[0]).handle,
          )?.featuredImage?.url ?? null,
        letter: artist.sortName.charAt(0).toUpperCase(),
      },
    ];
  });
  if (!rows.length) throw new Response('Not found', {status: 404});

  return {
    artists: rows,
    families: artistFamilies(
      artists.flatMap(({products}) =>
        products.filter((product) => live.has(product.handle)),
      ),
    ),
    shareImage: rows[0].leadImage,
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
      <StructuredData
        data={[
          breadcrumbSchema({
            items: [
              {name: 'Home', url: `${STOREFRONT_ORIGIN}/`},
              {name: 'Artists', url: PAGE_URL},
            ],
          }),
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Artists',
            url: PAGE_URL,
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: artists.map((artist, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: artist.name,
                url: `${STOREFRONT_ORIGIN}${artist.path}`,
              })),
            },
          },
        ]}
      />

      <header className="artists-intro">
        <p className="eyebrow">Clara Mendes / Artists</p>
        <h1>Artists</h1>
        <p>
          Public-domain works from museum open-access collections, printed to
          order. Pick an artist to see everything we make from their work and
          where each original is held.
        </p>
      </header>

      {groups.map((group, groupIndex) => {
        // Names sit under the letter headings when there are any.
        const Name = group.letter ? 'h3' : 'h2';
        return (
          <section
            className="artists-letter"
            key={group.letter ?? 'all'}
            aria-label={
              group.letter ? `Artists: ${group.letter}` : 'All artists'
            }
          >
            {group.letter ? <h2>{group.letter}</h2> : null}
            <ul className="artists-list">
              {group.artists.map((artist, index) => (
                <li className="artist-row" key={artist.path}>
                  <div className="artist-row__copy">
                    <Name className="artist-row__name">
                      {/* Stretched over the row, so the whole row opens the
                          shop while the link's name stays the artist's. */}
                      <Link
                        className="artist-row__link"
                        prefetch="intent"
                        to={artist.path}
                      >
                        {artist.name}
                      </Link>
                    </Name>
                    {artist.meta.length ? (
                      <p className="artist-row__meta">
                        {artist.meta.join(' · ')}
                      </p>
                    ) : null}
                    {artist.note ? (
                      <p className="artist-row__note">{artist.note}</p>
                    ) : null}
                    <p className="artist-row__offer">
                      <strong>
                        {artist.works.length}{' '}
                        {artist.works.length === 1 ? 'work' : 'works'}
                      </strong>
                      {' · '}from {formatMoney(artist.fromPrice)}
                    </p>
                    <p className="artist-row__families">
                      {familiesLine(artist.families)}
                    </p>
                    <span className="artist-row__cta" aria-hidden="true">
                      Shop {artist.shortName} <span>→</span>
                    </span>
                  </div>
                  <div
                    className="artist-row__wall"
                    style={wallStyle(artist.works.slice(0, WALL_WORKS))}
                  >
                    {artist.works.slice(0, WALL_WORKS).map((work, workIndex) => (
                      <img
                        alt={`${work.title} by ${artist.name}`}
                        decoding="async"
                        height={work.height}
                        key={work.src}
                        // Narrow phones hide the third work; lazy keeps it
                        // from loading there.
                        loading={
                          groupIndex === 0 && index === 0 && workIndex < 2
                            ? 'eager'
                            : 'lazy'
                        }
                        src={work.src}
                        // Grow in proportion to the shape, so a row of mixed
                        // landscape and portrait sheets shares one height.
                        style={{
                          aspectRatio: `${work.width} / ${work.height}`,
                          flexGrow: work.width / work.height,
                        }}
                        width={work.width}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/**
 * The wall's widest useful width, as shape ratios and gap counts for
 * artists.css: every work then stands at most --wall-max-height tall. The
 * "-2" values are for narrow phones, which show the first two works.
 */
function wallStyle(works: ArtistIndexWork[]) {
  const ratio = (count: number) =>
    works
      .slice(0, count)
      .reduce((sum, work) => sum + work.width / work.height, 0)
      .toFixed(3);
  return {
    '--wall-count-gaps': Math.max(works.length - 1, 0),
    '--wall-count-gaps-2': Math.max(Math.min(works.length, 2) - 1, 0),
    '--wall-ratio': ratio(works.length),
    '--wall-ratio-2': ratio(2),
  } as CSSProperties;
}

/** "Art prints, framed art and canvas art", as the artist shop names them. */
function familiesLine(families: ArtistProductFamily[]) {
  const sentence = listWords(families.map(artistFamilyLabel)).toLowerCase();
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function listWords(words: readonly string[]) {
  if (words.length < 2) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
}

const ARTISTS_INDEX_QUERY = `#graphql
  query ArtistsIndex(
    $after: String
    $country: CountryCode
    $language: LanguageCode
    $query: String!
  ) @inContext(country: $country, language: $language) {
    products(first: 100, after: $after, query: $query) {
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
          url
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
` as const;
