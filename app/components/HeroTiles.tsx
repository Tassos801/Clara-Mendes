import {Link} from 'react-router';
import {HERO_TILES} from '~/content/brand';
import type {HomeTilePrices} from '~/lib/homeTilePrices';

/**
 * The curiosity grid: six very different things we make, each with a
 * short aside. It sits in its own section directly under the full-screen
 * hero. Styles are in the homepage CSS string (`.hc-tiles`, `.hc-tile`,
 * `.hc-tile-tag`, `.hc-tile-price`). The first tile may be at the fold
 * edge, so it loads eagerly with high fetch priority; the rest load as
 * the shopper scrolls.
 *
 * `prices` comes from the route loader (`tilePriceLabels`), keyed by tile
 * `href`, in the buyer's market currency. A tile without a price simply
 * shows no chip; the link's accessible name carries the price when there
 * is one, so the chip itself is hidden from assistive tech.
 */
export function HeroTiles({prices = {}}: {prices?: HomeTilePrices}) {
  return (
    <ul className="hc-tiles" aria-label="A few of the things we make">
      {HERO_TILES.map((tile, index) => {
        const price = prices[tile.href];
        return (
          <li key={tile.href} className="hc-tile">
            <Link
              to={tile.href}
              prefetch="intent"
              aria-label={`${tile.image.alt} — ${tile.tag}${price ? `, ${price}` : ''}`}
            >
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
              {price ? (
                <span className="hc-tile-price" aria-hidden="true">
                  {price}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
