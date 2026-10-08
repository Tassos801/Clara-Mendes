import {Image} from '@shopify/hydrogen';
import {Link} from 'react-router';
import {
  CLOTHING_HERO_ACCENT,
  CLOTHING_HOME_FEATURE,
} from '~/lib/clothingEditorial';
import type {clothingFeaturePicks} from '~/lib/clothingPresentation';

export type ClothingFeaturePick = ReturnType<
  typeof clothingFeaturePicks
>[number];

export function ClothingFeature({picks}: {picks: ClothingFeaturePick[]}) {
  if (!picks.length) return null;
  return (
    <section className="clothing-feature" aria-labelledby="home-clothing-title">
      <div className="clothing-feature-copy">
        <p className="clothing-eyebrow">{CLOTHING_HOME_FEATURE.eyebrow}</p>
        <h2 id="home-clothing-title">
          {CLOTHING_HOME_FEATURE.title}
          <br />
          <em>{CLOTHING_HOME_FEATURE.titleEmphasis}</em>
        </h2>
        <p>{CLOTHING_HOME_FEATURE.text}</p>
        <Link className="clothing-link" to="/clothing" prefetch="intent">
          Shop clothing <span aria-hidden="true">↗</span>
        </Link>
        <img
          className="clothing-feature-botanical"
          src={CLOTHING_HERO_ACCENT}
          alt=""
          width="1536"
          height="1024"
          loading="lazy"
        />
      </div>
      <div className="clothing-feature-products">
        {picks.map((pick) => (
          <Link
            className="clothing-feature-product"
            to={pick.url}
            key={pick.id}
            prefetch="intent"
          >
            {pick.image ? (
              <Image
                data={pick.image}
                alt={`${pick.title}${pick.colour ? ` in ${pick.colour}` : ''}`}
                sizes="(min-width: 800px) 27vw, 45vw"
                loading="lazy"
              />
            ) : null}
            <span>
              <span>
                {pick.title}
                {pick.colour ? <small>{pick.colour}</small> : null}
              </span>
              <span aria-hidden="true">↗</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
