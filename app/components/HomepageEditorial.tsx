import {Image} from '@shopify/hydrogen';
import {Link} from 'react-router';
import type {ClaraCardProduct} from './ClaraProductCard';
import {
  buildHomeEditorialItems,
  HOME_EDITORIAL_COPY,
} from '~/content/homeEditorial';

type HomepageEditorialProps = {
  products: ClaraCardProduct[];
};

export function HomepageEditorial({products}: HomepageEditorialProps) {
  const items = buildHomeEditorialItems(products);
  const [leadItem, ...supportingItems] = items;

  return (
    <section
      aria-labelledby="home-editorial-title"
      className="home-editorial"
      data-chapter="umber"
    >
      <style suppressHydrationWarning>{editorialCss}</style>
      <div aria-hidden className="home-editorial__rule" />

      <div className="home-editorial__layout">
        <figure
          className="home-editorial__figure home-editorial__figure--lead"
          data-reveal
        >
          <Link
            className="home-editorial__figure-link"
            prefetch="intent"
            to={leadItem.href}
          >
            <span className="home-editorial__media">
              {leadItem.kind === 'product' ? (
                <Image
                  alt={leadItem.alt}
                  data={leadItem.image}
                  loading="lazy"
                  sizes="(min-width: 981px) 56vw, 100vw"
                />
              ) : (
                <img
                  alt={leadItem.alt}
                  decoding="async"
                  height={leadItem.image.height}
                  loading="lazy"
                  src={leadItem.image.url}
                  width={leadItem.image.width}
                />
              )}
            </span>
            <figcaption>
              {leadItem.caption}
              <span aria-hidden>View</span>
            </figcaption>
          </Link>
        </figure>

        <div className="home-editorial__copy" data-reveal>
          <p className="eyebrow">{HOME_EDITORIAL_COPY.eyebrow}</p>
          <h2 id="home-editorial-title">{HOME_EDITORIAL_COPY.title}</h2>
          <p>{HOME_EDITORIAL_COPY.body}</p>
          <Link
            className="text-link home-editorial__cta"
            to={HOME_EDITORIAL_COPY.ctaHref}
          >
            {HOME_EDITORIAL_COPY.ctaLabel}
          </Link>
        </div>

        <div
          aria-label="Clara Mendes editorial products"
          className="home-editorial__supporting"
          data-reveal
        >
          {supportingItems.map((item) => (
            <figure className="home-editorial__figure" key={item.id}>
              <Link
                className="home-editorial__figure-link"
                prefetch="intent"
                to={item.href}
              >
                <span className="home-editorial__media">
                  {item.kind === 'product' ? (
                    <Image
                      alt={item.alt}
                      data={item.image}
                      loading="lazy"
                      sizes="(min-width: 981px) 25vw, 50vw"
                    />
                  ) : (
                    <img
                      alt={item.alt}
                      decoding="async"
                      height={item.image.height}
                      loading="lazy"
                      src={item.image.url}
                      width={item.image.width}
                    />
                  )}
                </span>
                <figcaption>
                  {item.caption}
                  <span aria-hidden>View</span>
                </figcaption>
              </Link>
            </figure>
          ))}
        </div>
      </div>

      <div aria-hidden className="home-editorial__footer">
        {HOME_EDITORIAL_COPY.footer.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </section>
  );
}

const editorialCss = `
.home-editorial {
  background: linear-gradient(180deg, var(--color-paper) 0%, #f6f2eb 100%);
  display: grid;
  gap: clamp(26px, 4vw, 58px);
  padding: clamp(64px, 9vw, 132px) clamp(18px, 4vw, 70px)
    clamp(52px, 7vw, 96px);
}

.home-editorial__rule {
  background: rgba(38, 35, 31, 0.16);
  height: 1px;
  width: 100%;
}

.home-editorial__layout {
  align-items: start;
  display: grid;
  gap: clamp(18px, 2vw, 30px);
  grid-template-columns: repeat(12, minmax(0, 1fr));
}

.home-editorial__figure {
  margin: 0;
  min-width: 0;
}

.home-editorial__figure-link {
  color: inherit;
  display: grid;
  gap: 12px;
  text-decoration: none;
}

.home-editorial__media {
  background: var(--color-soft);
  display: block;
  overflow: hidden;
}

.home-editorial__media img {
  display: block;
  filter: saturate(0.9) contrast(0.98);
  height: 100%;
  object-fit: cover;
  transition: filter 500ms ease, transform 900ms cubic-bezier(0.22, 1, 0.36, 1);
  width: 100%;
}

.home-editorial__figure-link:hover .home-editorial__media img {
  filter: saturate(1) contrast(1);
  transform: scale(1.015);
}

.home-editorial__figure figcaption,
.home-editorial__footer {
  color: var(--color-muted);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  line-height: 1.45;
  text-transform: uppercase;
}

.home-editorial__figure figcaption {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.home-editorial__figure figcaption span {
  font-size: 0.58rem;
  opacity: 0;
  transition: opacity 250ms ease;
}

.home-editorial__figure-link:hover figcaption span,
.home-editorial__figure-link:focus-visible figcaption span {
  opacity: 0.72;
}

.home-editorial__figure--lead {
  grid-column: 1 / span 7;
  grid-row: 1 / span 2;
}

.home-editorial__figure--lead .home-editorial__media {
  aspect-ratio: 5 / 6;
}

.home-editorial__copy {
  align-content: start;
  display: grid;
  gap: clamp(20px, 2.5vw, 34px);
  grid-column: 8 / -1;
  padding-bottom: clamp(18px, 3vw, 42px);
  padding-left: clamp(4px, 1vw, 18px);
}

.home-editorial__copy h2 {
  color: var(--color-ink);
  font-family: var(--serif);
  font-size: clamp(3.2rem, 6.4vw, 7rem);
  font-weight: 400;
  letter-spacing: -0.055em;
  line-height: 0.9;
  margin: 0;
  max-width: 11ch;
  text-wrap: balance;
}

.home-editorial__copy > p:not(.eyebrow) {
  color: var(--color-muted);
  font-size: 1.08rem;
  line-height: 1.72;
  margin: 0;
  max-width: 520px;
}

.home-editorial__cta {
  justify-self: start;
  margin-top: clamp(2px, 1vw, 12px);
}

.home-editorial__supporting {
  align-items: end;
  display: grid;
  gap: clamp(14px, 1.7vw, 24px);
  grid-column: 7 / -1;
  grid-row: 2;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  padding-top: clamp(20px, 3.5vw, 54px);
}

.home-editorial__supporting .home-editorial__figure:first-child {
  margin-top: clamp(34px, 7vw, 112px);
}

.home-editorial__supporting .home-editorial__figure:first-child
  .home-editorial__media {
  aspect-ratio: 4 / 5;
}

.home-editorial__supporting .home-editorial__figure:last-child
  .home-editorial__media {
  aspect-ratio: 5 / 4;
}

.home-editorial__footer {
  border-top: 1px solid rgba(38, 35, 31, 0.12);
  display: flex;
  gap: clamp(18px, 5vw, 88px);
  justify-content: flex-end;
  padding-top: clamp(18px, 2.5vw, 30px);
}

@media (max-width: 980px) {
  .home-editorial {
    gap: 32px;
    padding-bottom: 54px;
    padding-top: 58px;
  }

  .home-editorial__layout {
    gap: 28px;
    grid-template-columns: 1fr;
  }

  .home-editorial__copy,
  .home-editorial__figure--lead,
  .home-editorial__supporting {
    grid-column: 1;
    grid-row: auto;
    padding: 0;
  }

  .home-editorial__copy {
    gap: 22px;
    order: 1;
  }

  .home-editorial__figure--lead {
    order: 2;
  }

  .home-editorial__supporting {
    gap: 14px;
    grid-template-columns: 1fr 1fr;
    order: 3;
  }

  .home-editorial__copy h2 {
    font-size: clamp(2.8rem, 13vw, 4.2rem);
    letter-spacing: -0.05em;
    line-height: 0.88;
  }

  .home-editorial__copy > p:not(.eyebrow) {
    font-size: 1.02rem;
    line-height: 1.78;
  }

  .home-editorial__figure--lead .home-editorial__media {
    aspect-ratio: 4 / 5;
  }

  .home-editorial__supporting .home-editorial__figure:first-child {
    margin-top: 0;
  }

  .home-editorial__supporting .home-editorial__figure:last-child
    .home-editorial__media {
    aspect-ratio: 4 / 5;
  }

  .home-editorial__figure figcaption,
  .home-editorial__footer {
    font-size: 0.62rem;
    letter-spacing: 0.14em;
  }

  .home-editorial__footer {
    justify-content: flex-start;
    overflow: hidden;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-editorial__media img,
  .home-editorial__figure figcaption span {
    transition: none;
  }
}
`;
