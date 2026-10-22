import {Link} from 'react-router';
import {HERO_TILES} from '~/content/brand';

/**
 * The curiosity grid: six very different things we make, each with a
 * short aside. It sits in its own section directly under the full-screen
 * hero. Styles are in the homepage CSS string (`.hc-tiles`, `.hc-tile`,
 * `.hc-tile-tag`). The first tile may be at the fold edge, so it loads
 * eagerly with high fetch priority; the rest load as the shopper scrolls.
 */
export function HeroTiles() {
  return (
    <ul className="hc-tiles" aria-label="A few of the things we make">
      {HERO_TILES.map((tile, index) => (
        <li key={tile.href} className="hc-tile">
          <Link to={tile.href} prefetch="intent" aria-label={`${tile.image.alt} — ${tile.tag}`}>
            <img
              alt={tile.image.alt}
              decoding="async"
              height={tile.image.height}
              // The first tile may be at the fold edge; the rest load as
              // the shopper scrolls.
              loading={index === 0 ? 'eager' : 'lazy'}
              // React 18 passes unknown lower-case attributes through.
              {...(index === 0 ? {fetchpriority: 'high'} : {})}
              src={tile.image.src}
              width={tile.image.width}
            />
            <span className="hc-tile-tag" aria-hidden="true">
              {tile.tag}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
