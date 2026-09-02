import {Link} from 'react-router';
import {YOUR_SKY_PAGE} from '~/lib/featurePages';

/**
 * Homepage teaser for Your Sky: the night band from the feature page, its
 * framed map, and the same headline, sub and price line, so the copy has
 * one source of truth in `featurePages.ts`.
 */
export function YourSkyTeaser() {
  const {hero, path, title} = YOUR_SKY_PAGE;

  return (
    <section
      className="sky-teaser"
      aria-labelledby="sky-teaser-title"
      data-chapter="ink"
    >
      <div className="sky-teaser__copy" data-reveal>
        <p className="eyebrow">Your Sky</p>
        <h2 id="sky-teaser-title">{hero.headline}</h2>
        <p className="sky-teaser__sub">{hero.sub}</p>
        <p className="sky-teaser__price">{hero.priceLine}</p>
        <Link className="primary-button sky-teaser__cta" to={path}>
          {hero.cta}
        </Link>
      </div>
      <Link
        className="sky-teaser__figure"
        to={path}
        aria-label={`${hero.cta} — ${title}`}
      >
        <img
          alt={hero.image.alt}
          decoding="async"
          height={hero.image.height}
          loading="lazy"
          src={hero.image.src}
          width={hero.image.width}
        />
      </Link>
    </section>
  );
}
