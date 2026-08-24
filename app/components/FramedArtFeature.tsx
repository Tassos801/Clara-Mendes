import {Link} from 'react-router';
import type {ClaraCardProduct} from './ClaraProductCard';
import {
  buildClassicFrameUrl,
  CLASSIC_FRAME_IMAGE_PATH,
  CLASSIC_FRAME_SIZE_LABELS,
} from '~/lib/classicFrame';
import {
  deriveCardPricing,
  formatCardPriceLabel,
} from '~/lib/productCardPricing';

export function FramedArtFeature({product}: {product: ClaraCardProduct}) {
  const price = formatCardPriceLabel(deriveCardPricing(product));

  return (
    <section
      className="framed-art-feature"
      aria-labelledby="framed-art-feature-title"
      data-chapter="moss"
    >
      <style suppressHydrationWarning>{framedArtFeatureCss}</style>
      <Link
        className="framed-art-feature__media"
        to={buildClassicFrameUrl()}
        prefetch="intent"
        aria-label="View the Natural classic frame"
      >
        <img
          alt="Natural classic frame only; artwork not included"
          height="2500"
          loading="lazy"
          src={CLASSIC_FRAME_IMAGE_PATH}
          width="2500"
        />
      </Link>

      <div className="framed-art-feature__copy" data-reveal>
        <p className="eyebrow">Frame only</p>
        <h2 id="framed-art-feature-title">Finish the piece your way.</h2>
        <p>
          A Natural classic picture frame sized to fit each Clara Mendes print.
          Solid satin-laminated wood, clear shatterproof Perspex, and a
          removable backloader make it easy to frame your chosen artwork.
        </p>
        <p className="framed-art-feature__preview-note">
          Frame only. Print, artwork, and decorative mat are not included.
          Natural wood grain may vary slightly.
        </p>

        <dl className="framed-art-feature__facts">
          <div>
            <dt>Available sizes</dt>
            <dd>{CLASSIC_FRAME_SIZE_LABELS.join(' · ')}</dd>
          </div>
          <div>
            <dt>Included</dt>
            <dd>Frame · Perspex · Backing · Hanger</dd>
          </div>
        </dl>

        <div className="framed-art-feature__actions">
          <Link
            className="primary-button"
            to={buildClassicFrameUrl()}
            prefetch="intent"
          >
            View frame{price ? ` · ${price}` : ''}
          </Link>
          <Link
            className="framed-art-feature__text-link"
            to="/collections/all?type=Art+Prints"
          >
            Shop art prints
          </Link>
        </div>
      </div>
    </section>
  );
}

const framedArtFeatureCss = `
.framed-art-feature {
  align-items: center;
  background: #24483d;
  color: #fffdf8;
  display: grid;
  gap: clamp(36px, 7vw, 110px);
  grid-template-columns: minmax(280px, 0.82fr) minmax(320px, 1.18fr);
  padding: clamp(58px, 8vw, 116px) clamp(18px, 6vw, 96px);
}

.framed-art-feature__media {
  background: #e9e4da;
  display: block;
  justify-self: end;
  max-width: 580px;
  overflow: hidden;
  width: 100%;
}

.framed-art-feature__media img {
  aspect-ratio: 1;
  display: block;
  height: auto;
  object-fit: cover;
  transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
  width: 100%;
}

.framed-art-feature__media:hover img,
.framed-art-feature__media:focus-visible img {
  transform: scale(1.012);
}

.framed-art-feature__copy {
  display: grid;
  gap: 24px;
  max-width: 660px;
}

.framed-art-feature__copy .eyebrow {
  color: #d9bb83;
  margin: 0;
}

.framed-art-feature__copy h2 {
  color: #fffdf8;
  font-family: var(--serif);
  font-size: clamp(2.8rem, 5vw, 5.25rem);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 0.96;
  margin: 0;
  max-width: 12ch;
  text-wrap: balance;
}

.framed-art-feature__copy > p:not(.eyebrow) {
  color: rgba(255, 253, 248, 0.78);
  font-size: 1.04rem;
  line-height: 1.75;
  margin: 0;
  max-width: 58ch;
}

.framed-art-feature__copy > .framed-art-feature__preview-note {
  color: rgba(255, 253, 248, 0.64);
  font-size: 0.82rem;
  line-height: 1.6;
}

.framed-art-feature__facts {
  border-bottom: 1px solid rgba(255, 253, 248, 0.2);
  border-top: 1px solid rgba(255, 253, 248, 0.2);
  display: grid;
  margin: 4px 0 0;
}

.framed-art-feature__facts div {
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(120px, 0.4fr) minmax(0, 1fr);
  padding: 16px 0;
}

.framed-art-feature__facts div + div {
  border-top: 1px solid rgba(255, 253, 248, 0.14);
}

.framed-art-feature__facts dt {
  color: #d9bb83;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.framed-art-feature__facts dd {
  color: #fffdf8;
  line-height: 1.55;
  margin: 0;
}

.framed-art-feature__actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}

.framed-art-feature__actions .primary-button {
  background: #fffdf8;
  color: #17342c;
}

.framed-art-feature__text-link {
  border-bottom: 1px solid rgba(255, 253, 248, 0.5);
  color: #fffdf8;
  padding: 10px 0 7px;
  text-decoration: none;
}

@media (max-width: 820px) {
  .framed-art-feature {
    align-items: start;
    grid-template-columns: 1fr;
  }

  .framed-art-feature__media {
    justify-self: start;
    max-width: 520px;
  }

  .framed-art-feature__copy h2 {
    font-size: clamp(2.7rem, 12vw, 4.2rem);
  }
}

@media (max-width: 520px) {
  .framed-art-feature__facts div {
    gap: 7px;
    grid-template-columns: 1fr;
  }

  .framed-art-feature__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .framed-art-feature__actions .primary-button,
  .framed-art-feature__text-link {
    justify-content: center;
    text-align: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .framed-art-feature__media img {
    transition: none;
  }
}
`;
