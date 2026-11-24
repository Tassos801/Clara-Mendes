import {useEffect, useRef} from 'react';
import {Link} from 'react-router';
import {
  BLACK_FRIDAY_ANNOUNCEMENT,
  BLACK_FRIDAY_ANNOUNCEMENT_SHORT,
  BLACK_FRIDAY_PATH,
} from '~/lib/blackFriday';
import {useBlackFridayWeek} from '~/lib/useBlackFridayWeek';

/**
 * The sitewide Black Friday week line, above the floating header. The root
 * loader decides from the request time whether it renders at all; a tab
 * left open past the end also drops it, at the end (useBlackFridayWeek).
 *
 * It is fixed above the header pill. `--announcement-height` (SSR estimate
 * per width below, then the measured height) moves the pill down and is
 * added to `--header-height`, so every page offset, sticky panel and
 * scroll margin that reads `--header-height` makes room for it.
 */
export function BlackFridayAnnouncement() {
  const ref = useRef<HTMLParagraphElement>(null);
  const ended = !useBlackFridayWeek();

  useEffect(() => {
    const element = ref.current;
    const root = document.documentElement;
    if (!element || ended || typeof ResizeObserver === 'undefined') return;
    const sync = () =>
      root.style.setProperty(
        '--announcement-height',
        `${Math.ceil(element.getBoundingClientRect().height)}px`,
      );
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--announcement-height');
    };
  }, [ended]);

  if (ended) return null;

  return (
    <>
      <p className="announcement-bar" ref={ref}>
        <Link
          to={BLACK_FRIDAY_PATH}
          prefetch="intent"
          aria-label={BLACK_FRIDAY_ANNOUNCEMENT}
        >
          {/* Phones get one short line (the full one took three). */}
          <span className="announcement-bar__long" aria-hidden="true">
            {BLACK_FRIDAY_ANNOUNCEMENT}
          </span>
          <span className="announcement-bar__short" aria-hidden="true">
            {BLACK_FRIDAY_ANNOUNCEMENT_SHORT}
          </span>
        </Link>
      </p>
      <style suppressHydrationWarning>{css}</style>
    </>
  );
}

const css = `
:root:has(.announcement-bar) {
  --announcement-height: 34px;
  --header-height: calc(76px + var(--announcement-height));
}
/* Server-side estimates: one line from about 800 px, two below, and the
   short phone line from 720 px down. The client then sets the measured
   height. */
@media (max-width: 799px) {
  :root:has(.announcement-bar) { --announcement-height: 52px; }
}
@media (max-width: 720px) {
  :root:has(.announcement-bar) {
    --announcement-height: 30px;
    --header-height: calc(68px + var(--announcement-height));
  }
}
@media (max-width: 480px) {
  :root:has(.announcement-bar) {
    --header-height: calc(60px + var(--announcement-height));
  }
}
.announcement-bar {
  background: var(--color-ink, #26231f);
  color: #fbfaf6;
  font-size: var(--text-xs);
  left: 0;
  letter-spacing: 0.01em;
  line-height: 1.4;
  margin: 0;
  overflow-wrap: anywhere;
  padding: 8px 16px;
  position: fixed;
  right: 0;
  text-align: center;
  top: 0;
  z-index: 30;
}
.announcement-bar a {
  color: inherit;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}
.announcement-bar__short {
  display: none;
}
.announcement-bar a:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
html:has(.announcement-bar) .site-header {
  height: calc(var(--header-height) - 16px - var(--announcement-height));
  top: calc(8px + var(--announcement-height));
}
/* The homepage's hero starts at the very top; push it below the line. */
html:has(.announcement-bar):has(.home-root) main {
  padding-top: var(--announcement-height);
}
@media (max-width: 720px) {
  .announcement-bar__long {
    display: none;
  }
  .announcement-bar__short {
    display: inline;
  }
  .announcement-bar__short::after {
    content: ' →';
  }
  .announcement-bar a {
    text-decoration: none;
  }
  .announcement-bar {
    font-size: var(--text-xs);
    line-height: 1.35;
    padding: 6px 16px;
  }
}
`;
