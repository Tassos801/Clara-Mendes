import {Link} from 'react-router';
import type {LineRailEntry} from '~/lib/lineRail';

/**
 * The product lines as a row of circles under the homepage hero: one
 * centred row on desktop, a swipe row on phones whose fourth circle is cut
 * at the edge so the row reads as scrollable. Each link is named by its
 * label, so the photo inside the ring is decorative.
 */
export function LineRail({entries}: {entries: readonly LineRailEntry[]}) {
  if (!entries.length) return null;

  return (
    <nav aria-label="Shop by line" className="line-rail">
      <style suppressHydrationWarning>{lineRailCss}</style>
      <ul className="line-rail__list">
        {entries.map((entry, index) => (
          <li className="line-rail__item" key={entry.key}>
            <Link className="line-rail__link" prefetch="intent" to={entry.href}>
              <span className="line-rail__ring">
                <img
                  alt=""
                  decoding="async"
                  height={entry.image.height}
                  loading={index < 2 ? 'eager' : 'lazy'}
                  src={entry.image.src}
                  style={
                    entry.objectPosition
                      ? {objectPosition: entry.objectPosition}
                      : undefined
                  }
                  width={entry.image.width}
                />
              </span>
              <span className="line-rail__label">{entry.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const lineRailCss = `
.line-rail {
  background: var(--color-oat, #f4f0e8);
  padding: clamp(28px, 4vw, 44px) clamp(16px, 4vw, 48px);
}

.line-rail__list {
  --ring: clamp(96px, 9vw, 120px);
  display: flex;
  gap: clamp(20px, 3vw, 44px);
  justify-content: center;
  list-style: none;
  margin: 0;
  padding: 0;
}

.line-rail__link {
  align-items: center;
  color: var(--color-ink);
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-decoration: none;
}

.line-rail__link:focus-visible {
  border-radius: 8px;
  outline: 2px solid var(--color-ink);
  outline-offset: 4px;
}

.line-rail__ring {
  background: #fff;
  border: 2px solid var(--color-clay);
  border-radius: 50%;
  box-sizing: border-box;
  display: block;
  height: var(--ring);
  overflow: hidden;
  padding: 3px;
  transition: border-width 200ms ease;
  width: var(--ring);
}

.line-rail__ring img {
  border-radius: 50%;
  display: block;
  height: 100%;
  object-fit: cover;
  transition: transform 600ms cubic-bezier(0.25, 1, 0.5, 1);
  width: 100%;
}

.line-rail__link:hover .line-rail__ring,
.line-rail__link:focus-visible .line-rail__ring {
  border-width: 3px;
}

.line-rail__link:hover img,
.line-rail__link:focus-visible img {
  transform: scale(1.04);
}

.line-rail__label {
  font-family: var(--sans);
  font-size: 0.95rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.2;
  white-space: nowrap;
}

/* Below 981px seven desktop circles no longer fit, so the row swipes. */
@media (max-width: 980px) {
  .line-rail {
    padding: 20px 0;
  }

  /* The block padding keeps the focus outline inside the scroll box. */
  .line-rail__list {
    --ring: 88px;
    gap: 16px;
    justify-content: flex-start;
    overflow-x: auto;
    padding: 8px 0 8px 20px;
    scroll-padding-inline: 20px;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .line-rail__list::-webkit-scrollbar {
    display: none;
  }

  .line-rail__item {
    flex: 0 0 auto;
    scroll-snap-align: start;
  }

  /* Auto margins centre a row that fits and fall to 0 once it overflows. */
  .line-rail__item:first-child {
    margin-left: auto;
  }

  /* End padding of a scroll box is not scrollable everywhere; the item's is. */
  .line-rail__item:last-child {
    margin-right: auto;
    padding-right: 20px;
  }
}

@media (hover: none) {
  .line-rail__link:hover:not(:focus-visible) .line-rail__ring {
    border-width: 2px;
  }

  .line-rail__link:hover:not(:focus-visible) img {
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .line-rail__ring,
  .line-rail__ring img {
    transition: none;
  }

  .line-rail__link:hover img,
  .line-rail__link:focus-visible img {
    transform: none;
  }
}
`;
