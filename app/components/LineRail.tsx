import {Link} from 'react-router';
import type {LineRailEntry} from '~/lib/lineRail';

/**
 * The product lines as a row of miniature mounted prints under the homepage
 * hero: one centred row on desktop, a swipe row on phones and tablets whose
 * last visible print is cut at the edge so the row reads as scrollable. Each
 * link is named by its label, so the photo in the mount is decorative.
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
              <span className="line-rail__mount">
                {/* The window clips the hover zoom inside the paper inset. */}
                <span className="line-rail__window">
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
  padding: clamp(28px, 4vw, 44px) clamp(16px, 2.5vw, 48px);
}

/* Sized so eleven prints fit one row from 1200px: 80px mounts there, 120px
   from about 1820px. */
.line-rail__list {
  --mount: clamp(80px, 6.6vw, 120px);
  display: flex;
  gap: clamp(18px, 1.7vw, 36px);
  justify-content: center;
  list-style: none;
  margin: 0;
  padding: 0;
}

/* The label starts at the mount's left edge, as a caption under a print. */
.line-rail__link {
  align-items: flex-start;
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

/* A square paper mount: a 4px paper inset inside a fine neutral rule. */
.line-rail__mount {
  background: var(--color-paper);
  border: 1px solid var(--color-soft);
  box-sizing: border-box;
  display: block;
  height: var(--mount);
  padding: 4px;
  transition: border-color 200ms ease;
  width: var(--mount);
}

.line-rail__window {
  display: block;
  height: 100%;
  overflow: hidden;
  width: 100%;
}

.line-rail__window img {
  display: block;
  height: 100%;
  object-fit: cover;
  transition: transform 600ms cubic-bezier(0.25, 1, 0.5, 1);
  width: 100%;
}

.line-rail__link:hover .line-rail__mount,
.line-rail__link:focus-visible .line-rail__mount {
  border-color: var(--color-clay);
}

.line-rail__link:hover img,
.line-rail__link:focus-visible img {
  transform: scale(1.04);
}

.line-rail__label {
  font-family: var(--sans);
  font-size: var(--text-base);
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.2;
  white-space: nowrap;
}

/* From 1200px to 1439px the mounts are 80px to 95px wide. One type step
   down keeps the longest label ("Book Nooks") within its mount, so the
   prints stay evenly spaced. */
@media (min-width: 1200px) and (max-width: 1439px) {
  .line-rail__label {
    font-size: var(--text-sm);
  }
}

/* Below 1200px eleven desktop prints no longer fit, so the row swipes. */
@media (max-width: 1199px) {
  .line-rail {
    padding: 20px 0;
  }

  /* The block padding keeps the focus outline inside the scroll box. */
  .line-rail__list {
    --mount: 88px;
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

/* A mouse cannot swipe: a narrow desktop window gets a thin scrollbar. */
@media (max-width: 1199px) and (hover: hover) and (pointer: fine) {
  .line-rail__list {
    scrollbar-color: var(--color-clay) transparent;
    scrollbar-width: thin;
  }

  .line-rail__list::-webkit-scrollbar {
    display: block;
    height: 6px;
  }

  .line-rail__list::-webkit-scrollbar-thumb {
    background: var(--color-clay);
    border-radius: 3px;
  }
}

@media (hover: none) {
  .line-rail__link:hover:not(:focus-visible) .line-rail__mount {
    border-color: var(--color-soft);
  }

  .line-rail__link:hover:not(:focus-visible) img {
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .line-rail__mount,
  .line-rail__window img {
    transition: none;
  }

  .line-rail__link:hover img,
  .line-rail__link:focus-visible img {
    transform: none;
  }
}
`;
