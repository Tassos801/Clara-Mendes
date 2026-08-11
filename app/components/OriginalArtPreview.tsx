import artCatalog from '../../data/original-art-catalog.json';
import {Link} from 'react-router';
import {
  formatOriginalArtPrice,
  type OriginalArtProductMap,
} from '~/lib/originalArt';

type OriginalArtPreviewProps = {
  products?: OriginalArtProductMap;
  compact?: boolean;
};

export function OriginalArtPreview({
  products = {},
  compact = false,
}: OriginalArtPreviewProps) {
  const items = compact
    ? artCatalog.filter((item) => item.sequence === 1)
    : artCatalog;
  const hasAvailableProducts = Object.keys(products).length > 0;

  return (
    <section
      className={`original-art-preview${
        compact ? ' original-art-preview--compact' : ''
      }`}
      aria-labelledby="original-art-preview-title"
    >
      <style suppressHydrationWarning>{previewCss}</style>

      <header className="original-art-preview__heading">
        <div>
          <p className="eyebrow">Original Clara Mendes art</p>
          <h2 id="original-art-preview-title">
            Five moods. One <i>considered</i> collection.
          </h2>
        </div>
        <div className="original-art-preview__intro">
          <p>
            {hasAvailableProducts
              ? 'Explore fifteen original works across five coordinated capsules, with product details and secure checkout on every available print.'
              : 'Fifteen original works across five coordinated capsules introduce the Clara Mendes collection, with more considered product types able to follow over time.'}
          </p>
          {compact ? (
            <Link className="text-link" to="/collections/all">
              {hasAvailableProducts
                ? 'Shop available prints'
                : 'Browse the print collection'}
            </Link>
          ) : null}
        </div>
      </header>

      <div className="original-art-preview__grid">
        {items.map((item) => {
          const liveProduct = products[item.handle];
          const formattedPrice = formatOriginalArtPrice(liveProduct?.price);
          const price =
            formattedPrice && liveProduct?.hasPriceRange
              ? `From ${formattedPrice}`
              : formattedPrice;
          const status = liveProduct
            ? liveProduct.availableForSale
              ? 'Available now'
              : 'Sold out'
            : 'Coming soon';
          const content = (
            <>
              <div className="original-art-card__image">
                <img
                  alt={item.alt}
                  decoding="async"
                  loading="lazy"
                  src={item.image}
                />
                <span className="original-art-card__status">{status}</span>
              </div>
              <div className="original-art-card__copy">
                <p className="original-art-card__capsule">{item.capsule}</p>
                <h3>{item.shortTitle}</h3>
                <p>{item.description}</p>
                <div className="original-art-card__meta">
                  <span>{item.palette}</span>
                  <span>
                    {liveProduct
                      ? (price ?? 'View product')
                      : 'Not yet released'}
                  </span>
                </div>
              </div>
            </>
          );

          return liveProduct ? (
            <Link
              aria-label={`View ${item.shortTitle}`}
              className="original-art-card original-art-card--link"
              key={item.handle}
              prefetch="intent"
              to={liveProduct.url}
            >
              {content}
            </Link>
          ) : (
            <article className="original-art-card" key={item.handle}>
              {content}
            </article>
          );
        })}
      </div>

      {compact ? (
        <p className="original-art-preview__note">
          Each capsule contains three complementary works — unframed giclée
          prints in three sizes up to 20 × 24 in, on 200gsm Enhanced Matte Art
          paper, printed to order.
        </p>
      ) : null}
    </section>
  );
}

const previewCss = `
.original-art-preview {
  background: #f4f0e8;
  color: #27231f;
  padding: clamp(68px, 9vw, 138px) clamp(18px, 5vw, 78px);
}

.original-art-preview__heading {
  align-items: end;
  display: grid;
  gap: clamp(28px, 5vw, 90px);
  grid-template-columns: minmax(0, 1.15fr) minmax(260px, 0.65fr);
  margin: 0 auto clamp(38px, 6vw, 84px);
  max-width: 1480px;
}

.original-art-preview__heading h2 {
  font-family: var(--serif);
  font-size: clamp(2.5rem, 5.3vw, 5.8rem);
  font-weight: 400;
  letter-spacing: -0.045em;
  line-height: 0.96;
  margin: 18px 0 0;
  max-width: 12ch;
}

.original-art-preview__heading h2 i {
  font-weight: 400;
}

.original-art-preview__intro {
  border-left: 1px solid rgba(39, 35, 31, 0.2);
  padding-left: clamp(20px, 3vw, 42px);
}

.original-art-preview__intro p,
.original-art-preview__note {
  color: #6f685e;
  font-size: clamp(0.92rem, 1.2vw, 1.08rem);
  line-height: 1.7;
  margin: 0 0 22px;
  max-width: 46ch;
}

.original-art-preview__grid {
  display: grid;
  gap: clamp(28px, 3vw, 50px) clamp(14px, 2vw, 30px);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0 auto;
  max-width: 1480px;
}

.original-art-card {
  min-width: 0;
}

.original-art-card--link {
  color: inherit;
  display: block;
  text-decoration: none;
}

.original-art-card__image {
  aspect-ratio: 4 / 5;
  background: #ded7cb;
  overflow: hidden;
  position: relative;
}

.original-art-card__image img {
  display: block;
  height: 100%;
  object-fit: cover;
  transition: transform 900ms cubic-bezier(0.22, 1, 0.36, 1);
  width: 100%;
}

.original-art-card:hover .original-art-card__image img {
  transform: scale(1.018);
}

.original-art-card__status {
  backdrop-filter: blur(8px);
  background: rgba(248, 245, 239, 0.82);
  bottom: 12px;
  color: #38332e;
  font-family: var(--sans);
  font-size: 0.62rem;
  font-weight: 600;
  left: 12px;
  letter-spacing: 0.16em;
  padding: 8px 10px;
  position: absolute;
  text-transform: uppercase;
}

.original-art-card__copy {
  padding: 18px 2px 0;
}

.original-art-card__capsule {
  color: #81796e;
  font-family: var(--sans);
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  margin: 0 0 8px;
  text-transform: uppercase;
}

.original-art-card__copy h3 {
  font-family: var(--serif);
  font-size: clamp(1.4rem, 2vw, 2rem);
  font-weight: 400;
  margin: 0 0 8px;
}

.original-art-card__copy > p:not(.original-art-card__capsule) {
  color: #6f685e;
  line-height: 1.55;
  margin: 0;
}

.original-art-card__meta {
  border-top: 1px solid rgba(39, 35, 31, 0.14);
  color: #777066;
  display: flex;
  flex-wrap: wrap;
  font-family: var(--sans);
  font-size: 0.68rem;
  gap: 8px 16px;
  justify-content: space-between;
  letter-spacing: 0.06em;
  margin-top: 16px;
  padding-top: 12px;
}

.original-art-preview--compact .original-art-preview__grid {
  gap: clamp(18px, 2.5vw, 36px);
}

@media (min-width: 981px) {
  .original-art-preview--compact .original-art-preview__grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.original-art-preview__note {
  margin: clamp(28px, 4vw, 56px) auto 0;
  max-width: 1480px;
}

@media (max-width: 820px) {
  .original-art-preview__heading {
    align-items: start;
    grid-template-columns: 1fr;
  }

  .original-art-preview__intro {
    border-left: 0;
    border-top: 1px solid rgba(39, 35, 31, 0.2);
    padding-left: 0;
    padding-top: 22px;
  }
}

@media (max-width: 680px) {
  .original-art-preview {
    padding-left: 14px;
    padding-right: 14px;
  }

  .original-art-preview__grid {
    gap: 28px 10px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .original-art-preview--compact .original-art-card:last-child {
    grid-column: 1 / -1;
    margin: 0 auto;
    width: calc(50% - 5px);
  }

  .original-art-card__copy {
    padding-top: 12px;
  }

  .original-art-card__copy > p:not(.original-art-card__capsule),
  .original-art-card__meta span:first-child {
    display: none;
  }

  .original-art-card__meta {
    border-top: 0;
    margin-top: 6px;
    padding-top: 0;
  }
}

@media (max-width: 390px) {
  .original-art-preview__grid {
    grid-template-columns: 1fr;
  }

  .original-art-preview--compact .original-art-card:last-child {
    grid-column: auto;
    width: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .original-art-card__image img {
    transition: none;
  }
}
`;
