import {Link} from 'react-router';
import {formatMoney, type MoneyAmount} from '~/lib/money';
import {
  TOUGH_CASE_ARTWORK_OPTION,
  TOUGH_CASE_DESIGNS,
  TOUGH_CASE_HANDLE,
  TOUGH_CASE_PHONES,
} from '~/lib/toughCase';

export type ToughCaseTeaserCase = {
  artwork: string;
  image: {url: string; altText?: string | null};
};

const CASE_PATH = `/products/${TOUGH_CASE_HANDLE}`;

function caseUrl(artwork: string) {
  return `${CASE_PATH}?${new URLSearchParams({
    [TOUGH_CASE_ARTWORK_OPTION]: artwork,
  }).toString()}`;
}

/**
 * Homepage teaser for the Art Tough Phone Case: a staggered row of case
 * previews, each opening the case page with its artwork preselected. The
 * loader renders it only while the case is released and has images.
 */
export function ToughCaseTeaser({
  cases,
  price,
}: {
  cases: ToughCaseTeaserCase[];
  price: MoneyAmount | null;
}) {
  return (
    <section
      className="case-teaser"
      id="phone-cases"
      aria-labelledby="case-teaser-title"
    >
      <div className="case-teaser__copy" data-reveal>
        <p className="eyebrow">New · Phone cases</p>
        <h2 id="case-teaser-title">The collection, in your pocket.</h2>
        <p className="case-teaser__sub">
          Every Clara Mendes artwork on a matte, dual-layer tough case for
          iPhone, Samsung Galaxy and Google Pixel.
        </p>
        <p className="case-teaser__price">
          {price ? `${formatMoney(price)} · ` : ''}
          {TOUGH_CASE_DESIGNS.length} artworks · {TOUGH_CASE_PHONES.length}{' '}
          phone models
        </p>
        <Link className="primary-button" to={CASE_PATH} prefetch="intent">
          Choose your case
        </Link>
      </div>
      <ul className="case-teaser__cases">
        {cases.map((entry) => (
          <li key={entry.artwork}>
            <Link to={caseUrl(entry.artwork)} prefetch="intent">
              <img
                alt={entry.image.altText || `${entry.artwork} phone case`}
                decoding="async"
                height={800}
                loading="lazy"
                src={entry.image.url}
                width={440}
              />
              <span>{entry.artwork}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
