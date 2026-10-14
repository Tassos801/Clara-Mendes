import {Link} from 'react-router';
import type {ArtistFeatureCard, ArtistProductFamily} from '~/lib/artistShops';

export type ArtistShopsFeatureProps = {
  artists: ArtistFeatureCard[];
  families: ArtistProductFamily[];
  /** Museum print collections the artists' works belong to. */
  collections: Array<{path: string; title: string}>;
};

/**
 * Homepage promotion for the artist shops: one card per public artist,
 * linking to their shop, and the way into /artists. Renders nothing until
 * an artist is public.
 */
export function ArtistShopsFeature({
  artists,
  collections,
  families,
}: ArtistShopsFeatureProps) {
  if (!artists.length) return null;
  const collection = collections.length === 1 ? collections[0] : null;
  return (
    <section className="artist-feature" aria-labelledby="home-artists-title">
      <div className="artist-feature-copy">
        <p className="artist-feature-eyebrow">New · Artist shops</p>
        <h2 id="home-artists-title">
          Shop by <em>artist</em>
        </h2>
        <p>
          Works by {listNames(artists.map((artist) => artist.shortName))},
          reproduced from public-domain museum images. Each artist has a shop of
          everything we make from their work.
        </p>
        {families.length > 1 ? (
          <ul className="artist-feature-families" aria-label="Available as">
            {families.map((family) => (
              <li key={family}>{family}</li>
            ))}
          </ul>
        ) : null}
        <div className="artist-feature-actions">
          <Link
            className="artist-feature-button"
            to="/artists"
            prefetch="intent"
          >
            Meet the artists
          </Link>
          {collection ? (
            <Link
              className="artist-feature-link"
              to={collection.path}
              prefetch="intent"
            >
              Shop {collection.title} <span aria-hidden="true">↗</span>
            </Link>
          ) : null}
        </div>
      </div>
      <ul className="artist-feature-grid">
        {artists.map((artist) => (
          <li key={artist.path}>
            <Link
              className="artist-feature-card"
              to={artist.path}
              prefetch="intent"
            >
              <span className="artist-feature-media">
                <img
                  alt={artist.imageAlt}
                  decoding="async"
                  height={1400}
                  loading="lazy"
                  src={artist.image}
                  width={1120}
                />
              </span>
              <span className="artist-feature-name">{artist.name}</span>
              <span className="artist-feature-meta">
                {artist.meta.join(' · ')}
              </span>
              <span className="artist-feature-count">
                {artist.works} {artist.works === 1 ? 'work' : 'works'} ·{' '}
                {artist.products}{' '}
                {artist.products === 1 ? 'product' : 'products'}
              </span>
              <span className="artist-feature-cta">
                Shop {artist.shortName} <span aria-hidden="true">↗</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function listNames(names: string[]) {
  if (names.length < 2) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}
