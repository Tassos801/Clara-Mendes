import {useRef, type CSSProperties} from 'react';
import {Link} from 'react-router';
import type {BookNookStorefrontProduct} from '~/components/BookNookCard';
import {
  BOOK_NOOKS_PATH,
  bookNookThemePath,
  bookNookThemesInUse,
} from '~/lib/bookNooks';
import {
  CURATED_CUTOUT_SIZE,
  curatedImages,
  type CuratedProduct,
} from '~/lib/curatedProducts';
import {formatMoney} from '~/lib/money';

export type BookNookShelfItem = {
  nook: CuratedProduct;
  number: number;
  product: BookNookStorefrontProduct;
};

/**
 * The books either side of the nooks carry the names of Clara Mendes
 * works and series. Heights are a share of the shelf height.
 */
const SPINES = [
  {title: 'Quiet Form', color: '#e6dccb', ink: '#3c3831', h: 0.84, w: 30},
  {title: '', color: '#3c3831', ink: '', h: 0.74, w: 18},
  {title: 'Patina Blue', color: '#5d706d', ink: '#efe7d8', h: 0.9, w: 32},
  {title: 'Karina of Time', color: '#9c6f5d', ink: '#f6eee2', h: 0.96, w: 36},
  {title: '', color: '#c9b79c', ink: '', h: 0.7, w: 20},
  {title: 'Midnight Garden', color: '#2f3a33', ink: '#d9cbb2', h: 0.88, w: 34},
  {title: '', color: '#b08a6e', ink: '', h: 0.8, w: 22},
  {
    title: 'Objects with Soul',
    color: '#6f7769',
    ink: '#f2ece1',
    h: 0.93,
    w: 34,
  },
  {title: 'Blue Drift', color: '#9fb0b8', ink: '#26231f', h: 0.78, w: 26},
  {title: '', color: '#4a3f36', ink: '', h: 0.86, w: 20},
  {title: 'Sunlit Mosaic', color: '#d8c7a5', ink: '#3c3831', h: 0.82, w: 30},
  {title: 'Butter Sun', color: '#e3cf8f', ink: '#3c3831', h: 0.72, w: 24},
] as const;

type ShelfSlot =
  | {kind: 'spine'; key: string; spine: (typeof SPINES)[number]; lean?: boolean}
  | {kind: 'nook'; key: string; item: BookNookShelfItem};

/** Books, a nook, a few books, the next nook … and a leaning book to end. */
function arrangeShelf(items: BookNookShelfItem[]): ShelfSlot[] {
  const slots: ShelfSlot[] = [];
  let next = 0;
  const books = (count: number) => {
    for (let i = 0; i < count; i += 1) {
      slots.push({
        kind: 'spine',
        key: `spine-${slots.length}`,
        spine: SPINES[next % SPINES.length],
      });
      next += 1;
    }
  };
  books(items.length === 1 ? 5 : 3);
  items.forEach((item, index) => {
    slots.push({kind: 'nook', key: item.nook.handle, item});
    books(index === items.length - 1 ? (items.length === 1 ? 4 : 3) : 2);
  });
  const last = slots[slots.length - 1];
  if (last?.kind === 'spine') last.lean = true;
  return slots;
}

export function BookNookShelf({
  deliveryCountries,
  items,
}: {
  deliveryCountries: string;
  items: BookNookShelfItem[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  if (!items.length) return null;

  const prices = items.map(({product}) => product.priceRange.minVariantPrice);
  const lowest = prices.reduce((min, price) =>
    Number(price.amount) < Number(min.amount) ? price : min,
  );
  const hasRange = prices.some((price) => price.amount !== lowest.amount);
  const themes = bookNookThemesInUse();
  const slots = arrangeShelf(items);
  const scrollable = items.length > 2;

  const scrollShelf = (direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({
      behavior: 'smooth',
      left: direction * scroller.clientWidth * 0.8,
    });
  };

  return (
    <section
      className="nook-shelf"
      aria-labelledby="nook-shelf-title"
      data-chapter="ink"
    >
      <div className="nook-shelf__copy" data-reveal>
        <p className="eyebrow">New · Book nooks</p>
        <h2 id="nook-shelf-title">
          A little light <i>between your books.</i>
        </h2>
        <p>
          Miniature worlds you build by hand over an evening or two, then slide
          onto the shelf beside the stories you love.
        </p>
        <p className="nook-shelf__meta">
          {hasRange ? 'From ' : ''}
          {formatMoney(lowest)}
          {deliveryCountries
            ? ` · Delivery included to ${deliveryCountries}`
            : ''}
        </p>
        <div className="nook-shelf__actions">
          <Link
            className="nook-shelf__cta"
            prefetch="intent"
            to={BOOK_NOOKS_PATH}
          >
            Explore book nooks
          </Link>
        </div>
        {themes.length ? (
          <p className="nook-shelf__themes">
            <span>Shelved by theme</span>
            {themes.map((theme) => (
              <Link key={theme.slug} to={bookNookThemePath(theme.slug)}>
                {theme.title}
              </Link>
            ))}
          </p>
        ) : null}
      </div>

      <div
        className={`nook-shelf__stage${scrollable ? ' nook-shelf__stage--scrollable' : ''}`}
        data-reveal
      >
        <div className="nook-shelf__scroller" ref={scrollerRef}>
          <div className="nook-shelf__track">
            {slots.map((slot) =>
              slot.kind === 'spine' ? (
                <span
                  aria-hidden
                  className={`nook-spine${slot.lean ? ' nook-spine--lean' : ''}`}
                  key={slot.key}
                  style={
                    {
                      '--spine-color': slot.spine.color,
                      '--spine-ink': slot.spine.ink,
                      '--spine-h': slot.spine.h,
                      '--spine-w': `${slot.spine.w}px`,
                    } as CSSProperties
                  }
                >
                  {slot.spine.title ? <span>{slot.spine.title}</span> : null}
                </span>
              ) : (
                <ShelfNook item={slot.item} key={slot.key} />
              ),
            )}
          </div>
        </div>
        {scrollable ? (
          <div className="nook-shelf__controls">
            <button
              aria-label="Scroll the shelf left"
              onClick={() => scrollShelf(-1)}
              type="button"
            >
              <span aria-hidden="true">&larr;</span>
            </button>
            <button
              aria-label="Scroll the shelf right"
              onClick={() => scrollShelf(1)}
              type="button"
            >
              <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        ) : null}
      </div>

      <style suppressHydrationWarning>{shelfCss}</style>
    </section>
  );
}

function ShelfNook({item}: {item: BookNookShelfItem}) {
  const {nook, number, product} = item;
  const name = nook.name ?? product.title;
  // The transparent cut-out stands on the plank; kits without one fall
  // back to their lamplit photograph.
  const fallback =
    curatedImages(nook.handle)[1] ?? curatedImages(nook.handle)[0];
  const image = nook.cutout
    ? {url: nook.cutout, ...CURATED_CUTOUT_SIZE}
    : fallback
      ? {
          url: fallback.url,
          width: fallback.width ?? undefined,
          height: fallback.height ?? undefined,
        }
      : null;

  return (
    <Link
      className={`nook-shelf__nook${nook.cutout ? '' : ' nook-shelf__nook--photo'}`}
      prefetch="intent"
      to={`/products/${product.handle}`}
    >
      <span className="nook-shelf__slot">
        {image ? (
          <img
            alt=""
            decoding="async"
            height={image.height}
            loading="lazy"
            src={image.url}
            width={image.width}
          />
        ) : null}
      </span>
      <span className="nook-shelf__label">
        <small>No. {String(number).padStart(2, '0')}</small>
        <strong>{name}</strong>
        <em>
          {product.availableForSale
            ? formatMoney(product.priceRange.minVariantPrice)
            : 'Sold out'}
        </em>
      </span>
    </Link>
  );
}

const shelfCss = `
.nook-shelf {
  --shelf-h: clamp(210px, 23vw, 330px);
  --plank-h: 18px;
  --nook-ease: cubic-bezier(0.25, 1, 0.5, 1);
  align-items: center;
  background:
    radial-gradient(ellipse 46% 58% at 68% 46%, rgba(255, 172, 92, 0.16), transparent 72%),
    radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255, 220, 170, 0.06), transparent 70%),
    linear-gradient(180deg, #19140f 0%, #241b14 58%, #1a1510 100%);
  color: #f2ece1;
  display: grid;
  gap: clamp(36px, 5vw, 72px);
  grid-template-columns: minmax(280px, 0.78fr) minmax(0, 1.22fr);
  overflow: hidden;
  padding: clamp(60px, 8vw, 116px) clamp(18px, 4vw, 70px);
}

.nook-shelf__copy {
  display: grid;
  gap: clamp(16px, 2vw, 24px);
}

.nook-shelf .eyebrow {
  color: rgba(242, 236, 225, 0.6);
  margin: 0;
}

.nook-shelf h2 {
  font-family: var(--serif);
  font-size: clamp(2.6rem, 5vw, 5.2rem);
  font-weight: 400;
  letter-spacing: -0.05em;
  line-height: 0.95;
  margin: 0;
  text-wrap: balance;
}

.nook-shelf h2 i {
  color: #e9c79d;
}

.nook-shelf__copy > p:not(.eyebrow):not(.nook-shelf__meta):not(.nook-shelf__themes) {
  color: rgba(242, 236, 225, 0.76);
  font-size: 1.04rem;
  line-height: 1.7;
  margin: 0;
  max-width: 42ch;
}

.nook-shelf__meta {
  color: rgba(242, 236, 225, 0.62);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  margin: 0;
  text-transform: uppercase;
}

.nook-shelf__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.nook-shelf__cta {
  align-items: center;
  background: #f2ece1;
  border-radius: 999px;
  color: #26231f;
  display: inline-flex;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  min-height: 48px;
  padding: 0 24px;
  text-decoration: none;
  text-transform: uppercase;
  transition: background 240ms ease, box-shadow 240ms ease;
}

.nook-shelf__cta:hover {
  background: #fff;
  box-shadow: 0 0 32px rgba(255, 186, 112, 0.35);
}

.nook-shelf__themes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 0;
}

.nook-shelf__themes span {
  color: rgba(242, 236, 225, 0.5);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  width: 100%;
}

.nook-shelf__themes a {
  color: #f2ece1;
  font-family: var(--serif);
  font-size: 1rem;
  font-style: italic;
  text-decoration: underline;
  text-decoration-color: rgba(242, 236, 225, 0.3);
  text-underline-offset: 4px;
}

.nook-shelf__themes a:hover {
  text-decoration-color: #e9c79d;
}

/* ── The shelf ── */
.nook-shelf__stage {
  min-width: 0;
  position: relative;
}

.nook-shelf__scroller {
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-padding-inline: 24px;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  /* pan-y keeps a vertical swipe that starts on the shelf scrolling the page. */
  touch-action: pan-x pan-y;
}

.nook-shelf__scroller::-webkit-scrollbar {
  display: none;
}

/* A long shelf fades into the dark at both ends instead of stopping dead. */
.nook-shelf__stage--scrollable .nook-shelf__scroller {
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 28px, #000 calc(100% - 56px), transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0, #000 28px, #000 calc(100% - 56px), transparent 100%);
}

.nook-shelf__track {
  align-items: flex-start;
  display: flex;
  gap: 2px;
  justify-content: center;
  min-width: 100%;
  padding: 28px 24px 0;
  position: relative;
  width: max-content;
}

/* The plank runs the full length of the track. */
.nook-shelf__track::after {
  background:
    linear-gradient(180deg, #9a7252 0%, #7a5940 22%, #5a402c 70%, #3f2d1f 100%);
  border-radius: 2px;
  box-shadow:
    inset 0 1px 0 rgba(255, 222, 184, 0.4),
    0 22px 36px rgba(0, 0, 0, 0.5);
  content: '';
  height: var(--plank-h);
  left: 0;
  position: absolute;
  right: 0;
  top: calc(28px + var(--shelf-h));
}

.nook-spine {
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.24), rgba(255, 255, 255, 0.1) 26%, rgba(255, 255, 255, 0) 55%, rgba(0, 0, 0, 0.2)),
    var(--spine-color);
  border-radius: 2px 2px 1px 1px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
  color: var(--spine-ink);
  display: grid;
  flex: 0 0 auto;
  height: calc(var(--shelf-h) * var(--spine-h));
  margin-top: calc(var(--shelf-h) * (1 - var(--spine-h)));
  place-items: center;
  position: relative;
  width: var(--spine-w);
}

.nook-spine::before,
.nook-spine::after {
  background: rgba(233, 199, 157, 0.5);
  content: '';
  height: 2px;
  left: 3px;
  position: absolute;
  right: 3px;
}

.nook-spine::before { top: 9%; }
.nook-spine::after { bottom: 9%; }

.nook-spine span {
  font-family: var(--serif);
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  max-height: 72%;
  overflow: hidden;
  text-transform: uppercase;
  transform: rotate(180deg);
  white-space: nowrap;
  writing-mode: vertical-rl;
}

.nook-spine--lean {
  margin-left: 10px;
  transform: rotate(-7deg);
  transform-origin: bottom left;
}

.nook-shelf__nook {
  color: inherit;
  display: grid;
  flex: 0 0 auto;
  justify-items: center;
  margin: 0 10px;
  scroll-snap-align: center;
  text-decoration: none;
}

.nook-shelf__slot {
  align-items: flex-end;
  display: flex;
  height: var(--shelf-h);
  justify-content: center;
  position: relative;
  width: calc(var(--shelf-h) * 0.8);
}

/* The nook's own lamp, brighter when you reach for it. */
.nook-shelf__slot::before {
  background: radial-gradient(circle at 50% 55%, rgba(255, 184, 104, 0.42), transparent 62%);
  content: '';
  inset: -6% -24% 4%;
  opacity: 0.55;
  position: absolute;
  transition: opacity 600ms var(--nook-ease), transform 600ms var(--nook-ease);
}

/* Contact shadow on the plank. */
.nook-shelf__slot::after {
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.55), transparent 70%);
  bottom: -6px;
  content: '';
  height: 14px;
  left: 8%;
  position: absolute;
  right: 8%;
}

.nook-shelf__slot img {
  display: block;
  filter: brightness(0.86) saturate(0.95);
  height: 100%;
  object-fit: contain;
  object-position: bottom;
  position: relative;
  transition: filter 600ms var(--nook-ease), transform 600ms var(--nook-ease);
  width: 100%;
  z-index: 1;
}

.nook-shelf__nook--photo .nook-shelf__slot img {
  border-radius: 3px;
  height: auto;
  max-height: 100%;
}

.nook-shelf__nook:hover .nook-shelf__slot::before,
.nook-shelf__nook:focus-visible .nook-shelf__slot::before {
  opacity: 1;
  transform: scale(1.08);
}

.nook-shelf__nook:hover .nook-shelf__slot img,
.nook-shelf__nook:focus-visible .nook-shelf__slot img {
  filter: brightness(1.08) saturate(1) drop-shadow(0 0 22px rgba(255, 186, 112, 0.4));
  transform: translateY(-4px);
}

.nook-shelf__nook:focus-visible {
  outline: none;
}

.nook-shelf__nook:focus-visible .nook-shelf__label {
  outline: 2px solid #e9c79d;
  outline-offset: 3px;
}

/* A library label clipped to the plank's edge. */
.nook-shelf__label {
  background: #efe7d8;
  border-top: 3px solid #b8925f;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.35);
  color: #26231f;
  display: grid;
  gap: 2px;
  margin-top: calc(var(--plank-h) + 12px);
  min-width: 132px;
  padding: 9px 14px 10px;
  text-align: center;
  transition: transform 400ms var(--nook-ease);
}

.nook-shelf__label small {
  color: #746f65;
  font-family: 'Courier Prime', 'Courier New', ui-monospace, monospace;
  font-size: 0.62rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.nook-shelf__label strong {
  font-family: var(--serif);
  font-size: 1.02rem;
  font-weight: 400;
  line-height: 1.2;
}

.nook-shelf__label em {
  color: #6f7769;
  font-size: 0.74rem;
  font-style: normal;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.nook-shelf__nook:hover .nook-shelf__label {
  transform: translateY(2px) rotate(-1deg);
}

.nook-shelf__controls {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 22px;
  padding-right: 24px;
}

.nook-shelf__controls button {
  background: transparent;
  border: 1px solid rgba(242, 236, 225, 0.3);
  border-radius: 999px;
  color: rgba(242, 236, 225, 0.8);
  cursor: pointer;
  height: 38px;
  width: 38px;
}

.nook-shelf__controls button:hover {
  border-color: #f2ece1;
  color: #fff;
}

@media (hover: none) {
  .nook-shelf__slot img {
    filter: brightness(1) saturate(1);
  }

  .nook-shelf__slot::before {
    opacity: 0.85;
  }
}

@media (max-width: 900px) {
  .nook-shelf {
    grid-template-columns: 1fr;
  }

  .nook-shelf__stage {
    margin: 0 calc(-1 * clamp(18px, 4vw, 70px));
  }
}

@media (max-width: 520px) {
  .nook-shelf {
    --shelf-h: 210px;
    --plank-h: 14px;
  }

  .nook-spine {
    width: calc(var(--spine-w) * 0.78);
  }

  .nook-spine span {
    font-size: 0.52rem;
  }

  .nook-shelf__label {
    min-width: 116px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nook-shelf__slot::before,
  .nook-shelf__slot img,
  .nook-shelf__label {
    transition: none;
  }
}
`;
