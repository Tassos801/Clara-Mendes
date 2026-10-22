import {Link} from 'react-router';
import {HERO_TILES} from '~/content/brand';

/**
 * The curiosity grid: six very different things we make, each with a
 * short aside. Styles are in the homepage CSS string (`.hm-tiles`,
 * `.hm-tile`, `.hm-tile-tag`). The first tile is the page's largest
 * early image, so it loads eagerly with high priority; the rest lazily.
 */
export function HeroTiles() {
  return (
    <ul className="hm-tiles" aria-label="A few of the things we make">
      {HERO_TILES.map((tile, index) => (
        <li key={tile.href} className="hm-tile">
          <Link to={tile.href} prefetch="intent" aria-label={`${tile.image.alt} — ${tile.tag}`}>
            <img
              alt={tile.image.alt}
              decoding="async"
              height={tile.image.height}
              // All six sit above the fold; lazy tiles painted late on live.
              loading="eager"
              // React 18 passes unknown lower-case attributes through.
              {...(index === 0 ? {fetchpriority: 'high'} : {})}
              src={tile.image.src}
              width={tile.image.width}
            />
            <span className="hm-tile-tag" aria-hidden="true">
              {tile.tag}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
