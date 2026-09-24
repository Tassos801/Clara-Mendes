import {
  useState,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent,
} from 'react';
import {Link} from 'react-router';
import {
  capsuleIndexCopy,
  capsuleTiles,
  closingTileSpan,
  type CapsuleTile,
} from '~/lib/capsuleIndex';

const TILES = capsuleTiles();
const COPY = capsuleIndexCopy(TILES);

/**
 * Every shop capsule as an artwork tile, closed by an "All works" tile that
 * spans whatever the last row has left at 2, 3 and 4 columns.
 */
export function CapsuleIndex() {
  const closingSpans = {
    '--span-2': closingTileSpan(TILES.length, 2),
    '--span-3': closingTileSpan(TILES.length, 3),
    '--span-4': closingTileSpan(TILES.length, 4),
  } as CSSProperties;

  return (
    <section
      aria-labelledby="capsule-index-title"
      className="capsule-index"
      data-chapter="linen"
    >
      <style suppressHydrationWarning>{capsuleIndexCss}</style>
      <header className="capsule-index__heading" data-reveal>
        <div>
          <p className="eyebrow">The collection</p>
          <h2 id="capsule-index-title">
            {COPY.moods} <i>Find yours.</i>
          </h2>
        </div>
        <div className="capsule-index__intro">
          <p>{COPY.works}</p>
          <Link className="text-link" to="/collections/all">
            Shop all works
          </Link>
        </div>
      </header>

      <div className="capsule-index__grid" data-reveal>
        {TILES.map((tile) => (
          <CapsuleTileLink key={tile.slug} tile={tile} />
        ))}
        <Link
          className="capsule-index__all"
          prefetch="intent"
          style={closingSpans}
          to="/collections/all"
        >
          <span className="capsule-index__all-count">{COPY.totalWorks}</span>
          <span className="capsule-index__all-label">original works</span>
          <span className="capsule-index__all-cta">
            Shop all <span aria-hidden>→</span>
          </span>
        </Link>
      </div>
    </section>
  );
}

function CapsuleTileLink({tile}: {tile: CapsuleTile}) {
  const [roomSrc, setRoomSrc] = useState<string | null>(null);
  const [roomReady, setRoomReady] = useState(false);

  // The room scene downloads on first mouse hover or keyboard focus only,
  // so touch visitors and the first paint never fetch it.
  const wakeRoom = () => {
    if (!roomSrc) setRoomSrc(tile.room);
  };
  const onPointerEnter = (event: PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      wakeRoom();
    }
  };
  const onFocus = (event: FocusEvent<HTMLAnchorElement>) => {
    if (event.currentTarget.matches(':focus-visible')) wakeRoom();
  };

  return (
    <Link
      aria-label={`${tile.title} capsule, ${tile.worksLabel}`}
      className="capsule-tile"
      onFocus={onFocus}
      onPointerEnter={onPointerEnter}
      prefetch="intent"
      to={tile.href}
    >
      <span className="capsule-tile__media">
        <img alt="" decoding="async" loading="lazy" src={tile.image} />
        {roomSrc ? (
          <img
            alt=""
            className="capsule-tile__room"
            data-ready={roomReady ? 'true' : 'false'}
            decoding="async"
            onLoad={() => setRoomReady(true)}
            src={roomSrc}
          />
        ) : null}
        <span className="capsule-tile__works">{tile.worksLabel}</span>
      </span>
      <span className="capsule-tile__title">
        {tile.title}
        <span aria-hidden className="capsule-tile__arrow">
          →
        </span>
      </span>
      <span className="capsule-tile__note">{tile.note}</span>
    </Link>
  );
}

const capsuleIndexCss = `
.capsule-index {
  background: linear-gradient(180deg, var(--color-paper) 0%, var(--color-soft) 100%);
  padding: clamp(64px, 9vw, 132px) clamp(18px, 4vw, 70px);
}

.capsule-index__heading {
  align-items: end;
  display: grid;
  gap: clamp(24px, 5vw, 90px);
  grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
  margin: 0 auto clamp(34px, 5vw, 72px);
  max-width: 1480px;
}

.capsule-index__heading h2 {
  color: var(--color-ink);
  font-family: var(--serif);
  font-size: clamp(2.6rem, 5.4vw, 5.6rem);
  font-weight: 400;
  letter-spacing: -0.05em;
  line-height: 0.95;
  margin: 0;
  text-wrap: balance;
}

.capsule-index__heading h2 i {
  color: var(--color-muted);
}

.capsule-index__intro {
  border-left: 1px solid rgba(38, 35, 31, 0.18);
  display: grid;
  gap: 18px;
  justify-items: start;
  padding-left: clamp(18px, 3vw, 40px);
}

.capsule-index__intro p {
  color: var(--color-muted);
  font-size: clamp(0.95rem, 1.2vw, 1.08rem);
  line-height: 1.7;
  margin: 0;
  max-width: 40ch;
}

.capsule-index__grid {
  display: grid;
  gap: clamp(26px, 3vw, 46px) clamp(12px, 1.8vw, 26px);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0 auto;
  max-width: 1480px;
}

.capsule-tile {
  align-content: start;
  color: inherit;
  display: grid;
  gap: 12px;
  min-width: 0;
  text-decoration: none;
}

/* reset.css underlines every a:hover; tiles and the closing tile opt out. */
.capsule-tile:hover,
.capsule-index__all:hover {
  text-decoration: none;
}

.capsule-tile__media {
  aspect-ratio: 4 / 5;
  background: #ded7cb;
  display: block;
  overflow: hidden;
  position: relative;
}

.capsule-tile__media img {
  display: block;
  height: 100%;
  inset: 0;
  object-fit: cover;
  position: absolute;
  transition:
    opacity 600ms ease,
    transform 900ms cubic-bezier(0.22, 1, 0.36, 1);
  width: 100%;
}

.capsule-tile__room {
  opacity: 0;
}

.capsule-tile:focus-visible .capsule-tile__room[data-ready='true'] {
  opacity: 1;
}

.capsule-tile:focus-visible {
  outline: 2px solid var(--color-ink);
  outline-offset: 6px;
}

.capsule-tile__works {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  background: rgba(248, 245, 239, 0.84);
  bottom: 12px;
  color: #38332e;
  font-family: var(--sans);
  font-size: 0.62rem;
  font-weight: 600;
  left: 12px;
  letter-spacing: 0.16em;
  padding: 7px 10px;
  position: absolute;
  text-transform: uppercase;
  z-index: 1;
}

.capsule-tile__title {
  align-items: baseline;
  color: var(--color-ink);
  display: flex;
  font-family: var(--serif);
  font-size: clamp(1.35rem, 2.1vw, 2.1rem);
  gap: 12px;
  justify-content: space-between;
  letter-spacing: -0.02em;
  line-height: 1.05;
}

.capsule-tile__arrow {
  font-family: var(--sans);
  font-size: 0.95rem;
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity 300ms ease, transform 300ms ease;
}

.capsule-tile__note {
  -webkit-box-orient: vertical;
  color: var(--color-muted);
  display: -webkit-box;
  font-size: 0.92rem;
  -webkit-line-clamp: 2;
  line-height: 1.55;
  overflow: hidden;
}

@media (hover: hover) {
  .capsule-tile:hover .capsule-tile__media img {
    transform: scale(1.03);
  }

  .capsule-tile:hover .capsule-tile__room[data-ready='true'] {
    opacity: 1;
  }

  .capsule-tile:hover .capsule-tile__arrow {
    opacity: 0.7;
    transform: none;
  }
}

.capsule-index__all {
  align-content: center;
  background: var(--color-ink);
  color: var(--color-paper);
  display: grid;
  gap: 10px;
  grid-column: span var(--span-2);
  justify-items: center;
  padding: 28px 18px;
  text-align: center;
  text-decoration: none;
  transition: background 400ms ease;
}

.capsule-index__all:hover {
  background: #3a342d;
}

.capsule-index__all:focus-visible {
  outline: 2px solid var(--color-ink);
  outline-offset: 6px;
}

.capsule-index__all-count {
  font-family: var(--serif);
  font-size: clamp(3.4rem, 6vw, 5.6rem);
  letter-spacing: -0.04em;
  line-height: 0.9;
}

.capsule-index__all-label {
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  opacity: 0.72;
  text-transform: uppercase;
}

.capsule-index__all-cta {
  border-bottom: 1px solid currentColor;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  margin-top: 12px;
  padding-bottom: 4px;
  text-transform: uppercase;
}

@media (min-width: 700px) {
  .capsule-index__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .capsule-index__all {
    grid-column: span var(--span-3);
  }
}

@media (min-width: 1100px) {
  .capsule-index__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .capsule-index__all {
    grid-column: span var(--span-4);
  }
}

@media (max-width: 820px) {
  .capsule-index__heading {
    align-items: start;
    grid-template-columns: 1fr;
  }

  .capsule-index__intro {
    border-left: 0;
    border-top: 1px solid rgba(38, 35, 31, 0.18);
    padding-left: 0;
    padding-top: 20px;
  }
}

@media (max-width: 520px) {
  .capsule-tile__note {
    display: none;
  }

  .capsule-tile__works {
    bottom: 8px;
    font-size: 0.56rem;
    left: 8px;
    padding: 6px 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .capsule-tile__media img,
  .capsule-tile__arrow,
  .capsule-index__all {
    transition: none;
  }

  .capsule-tile:hover .capsule-tile__media img {
    transform: none;
  }
}
`;
