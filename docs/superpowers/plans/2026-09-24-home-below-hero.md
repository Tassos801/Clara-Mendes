# Homepage below the hero — gallery walk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure everything below the "Objects with soul" hero into the
approved gallery walk: slim trust line, film on an ink band, Ready now, an
image-led capsule index, Your Sky, Living edit, the edit grid, and a "From
the studio" close.

**Architecture:** Capsule tiles are pure data (`app/lib/capsuleIndex.ts`,
plain-Node testable) derived from `listShopCapsules()`, rendered by a new
`CapsuleIndex` component that carries its own CSS string like
`HomepageEditorial`. `_index.tsx` drops the text carousel, the compact
`OriginalArtPreview`, the stock-photo story block and the collections query,
and gains the studio close. Film band styling lives with the other film
styles in `app/styles/app.css`.

**Tech Stack:** Hydrogen / React Router 7, TypeScript, node:test source and
data tests, CSS-in-TS strings.

Spec: `docs/superpowers/specs/2026-09-24-home-below-hero-design.md`.
Worktree: `C:\Users\admin\Desktop\Mine\shopify\clara-wt-home`, branch
`fable/home-after-objects`.

---

## File map

| File | Responsibility |
| --- | --- |
| Create `app/lib/capsuleIndex.ts` | Tile data, room-scene paths, heading copy, closing-tile span maths |
| Create `scripts/capsuleIndex.node-test.mjs` | Data tests incl. every image exists on disk |
| Create `app/components/CapsuleIndex.tsx` | Section markup, lazy room reveal, own CSS |
| Create `scripts/homeLayout.node-test.mjs` | Pins the approved section order and the removals |
| Modify `app/routes/_index.tsx` | Loader/query trim, new order, studio close, CSS |
| Modify `app/styles/app.css` (`.home-film`) | Full-bleed ink film band |
| Modify `app/content/homeEditorial.ts` | Living edit title |
| Modify `docs/llm-wiki/modules/routes-and-pages.md`, `docs/llm-wiki/log.md` | Wiki |

---

### Task 0: Worktree setup

- [ ] **Step 1: Install dependencies and copy env**

```bash
cd /c/Users/admin/Desktop/Mine/shopify/clara-wt-home
cp ../clara-mendes/.env .env   # never print it
npm ci
```
Expected: `added N packages`. If npm ci fails on `@emnapi` (Windows lockfile
gotcha), run `npm install --no-save` and do not commit lockfile changes.

- [ ] **Step 2: Baseline**

Run: `npm test`
Expected: all pass (baseline before edits).

---

### Task 1: Capsule tile data

**Files:**
- Create: `app/lib/capsuleIndex.ts`
- Test: `scripts/capsuleIndex.node-test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {listShopCapsules} from '../app/lib/capsules.ts';
import {
  capsuleIndexCopy,
  capsuleTiles,
  closingTileSpan,
} from '../app/lib/capsuleIndex.ts';

const PUBLIC = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
);
const onDisk = (src) =>
  existsSync(path.join(PUBLIC, ...src.split('/').filter(Boolean)));

test('every shop capsule gets a tile whose artwork and room scene exist', () => {
  const tiles = capsuleTiles();
  assert.equal(tiles.length, listShopCapsules().length);
  assert.ok(tiles.some((tile) => tile.slug === 'light-and-silence'));
  assert.ok(tiles.some((tile) => tile.slug === 'scifi-cinema'));
  for (const tile of tiles) {
    assert.ok(onDisk(tile.image), `${tile.slug} artwork missing: ${tile.image}`);
    assert.ok(onDisk(tile.room), `${tile.slug} room scene missing: ${tile.room}`);
    assert.ok(tile.works > 0, `${tile.slug} has no released works`);
  }
});

test('launch capsules open their landing page, pipeline ones the shop filter', () => {
  const bySlug = new Map(capsuleTiles().map((tile) => [tile.slug, tile]));
  assert.equal(bySlug.get('quiet-form').href, '/collections/quiet-form');
  assert.equal(
    bySlug.get('scifi-cinema').href,
    '/collections/all?capsule=scifi-cinema',
  );
});

test('room scenes: 20x24 room detail for launch capsules, living room for pipeline prints', () => {
  const bySlug = new Map(capsuleTiles().map((tile) => [tile.slug, tile]));
  assert.equal(
    bySlug.get('quiet-form').room,
    '/images/product-art-mockups/quiet-form/quiet-form-01-room-detail-20x24.webp',
  );
  const light = bySlug.get('light-and-silence');
  const print = light.image.split('/').pop().replace(/\.webp$/, '');
  assert.equal(
    light.room,
    `/images/product-art-mockups/light-and-silence/${print}-living-room.jpg`,
  );
});

test('works labels are singular for one work', () => {
  const [one, three] = capsuleTiles([
    {handles: ['a'], image: '/images/product-art/x/a.webp', note: 'n', slug: 'x', title: 'X'},
    {handles: ['a', 'b', 'c'], image: '/images/product-art/y/a.webp', note: 'n', slug: 'y', title: 'Y'},
  ]);
  assert.equal(one.worksLabel, '1 work');
  assert.equal(three.worksLabel, '3 works');
});

test('heading copy counts capsules and works from the tiles', () => {
  const copy = capsuleIndexCopy(
    [3, 3, 3, 3, 3, 4, 5].map((works) => ({works})),
  );
  assert.equal(copy.moods, 'Seven moods.');
  assert.equal(copy.totalWorks, 24);
  assert.equal(
    copy.works,
    'Twenty-four original works, in capsules that hang together.',
  );
});

test('the closing tile always completes the last row', () => {
  assert.equal(closingTileSpan(7, 4), 1);
  assert.equal(closingTileSpan(7, 3), 2);
  assert.equal(closingTileSpan(7, 2), 1);
  assert.equal(closingTileSpan(8, 4), 4);
  for (const count of [5, 6, 7, 8, 9, 10]) {
    for (const columns of [2, 3, 4]) {
      const span = closingTileSpan(count, columns);
      assert.ok(span >= 1 && span <= columns);
      assert.equal((count + span) % columns, 0, `${count} tiles, ${columns} columns`);
    }
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test scripts/capsuleIndex.node-test.mjs`
Expected: FAIL, `Cannot find module '../app/lib/capsuleIndex.ts'`.

- [ ] **Step 3: Implement**

`app/lib/capsuleIndex.ts`:

```ts
// Relative imports keep this module loadable by the plain-Node test runner.
import {
  CAPSULES,
  listShopCapsules,
  shopCapsulePath,
  type Capsule,
} from './capsules.ts';
import {capitalize, countWord} from './catalogSummary.ts';

export type CapsuleTile = {
  href: string;
  /** Lead artwork, shown at rest. */
  image: string;
  note: string;
  /** The same print on a wall, revealed on hover or keyboard focus. */
  room: string;
  slug: string;
  title: string;
  works: number;
  worksLabel: string;
};

const MOCKUPS = '/images/product-art-mockups';

/**
 * Room scene for a capsule's lead print. Launch capsules use the 20×24
 * room-detail mockup (their sofa set carries a size ruler); print-catalog
 * collections use the pipeline's living-room scene for the same print.
 */
export function capsuleRoomImage(capsule: Pick<Capsule, 'image' | 'slug'>) {
  if (CAPSULES.some((launch) => launch.slug === capsule.slug)) {
    return `${MOCKUPS}/${capsule.slug}/${capsule.slug}-01-room-detail-20x24.webp`;
  }
  const print = capsule.image
    .split('/')
    .pop()
    ?.replace(/\.webp$/, '');
  return `${MOCKUPS}/${capsule.slug}/${print}-living-room.jpg`;
}

/** One tile per shop capsule; released print-catalog collections join automatically. */
export function capsuleTiles(
  capsules: Capsule[] = listShopCapsules(),
): CapsuleTile[] {
  return capsules.map((capsule) => {
    const works = capsule.handles.length;
    return {
      href: shopCapsulePath(capsule.slug),
      image: capsule.image,
      note: capsule.note,
      room: capsuleRoomImage(capsule),
      slug: capsule.slug,
      title: capsule.title,
      works,
      worksLabel: `${works} ${works === 1 ? 'work' : 'works'}`,
    };
  });
}

export function capsuleIndexCopy(tiles: Array<Pick<CapsuleTile, 'works'>>) {
  const totalWorks = tiles.reduce((sum, tile) => sum + tile.works, 0);
  return {
    moods: `${capitalize(countWord(tiles.length))} moods.`,
    totalWorks,
    works: `${capitalize(countWord(totalWorks))} original works, in capsules that hang together.`,
  };
}

/**
 * Columns the closing "All works" tile spans so the grid's last row is
 * always full: the rest of the row, or a whole row when the capsules
 * already fill theirs.
 */
export function closingTileSpan(tileCount: number, columns: number) {
  return columns - (tileCount % columns);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test scripts/capsuleIndex.node-test.mjs`
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/lib/capsuleIndex.ts scripts/capsuleIndex.node-test.mjs
git commit -m "Capsule index data: tiles, room scenes, closing-tile span"
```

---

### Task 2: CapsuleIndex component

**Files:**
- Create: `app/components/CapsuleIndex.tsx`

- [ ] **Step 1: Write the component**

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/CapsuleIndex.tsx
git commit -m "CapsuleIndex: artwork tiles with room reveal and an All works close"
```

---

### Task 3: Homepage order, loader and studio close

**Files:**
- Test: `scripts/homeLayout.node-test.mjs`
- Modify: `app/routes/_index.tsx`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = readFileSync(path.join(ROOT, 'app/routes/_index.tsx'), 'utf8');
const markup = home.slice(
  home.indexOf('<div className="commerce-home">'),
  home.indexOf('const HOMEPAGE_QUERY'),
);

test('below the hero follows the approved gallery-walk order', () => {
  const order = [
    'className="home-root"',
    'className="home-trust-band"',
    '<BrandFilm',
    'className="home-shop-accelerator"',
    '<CapsuleIndex',
    '<YourSkyTeaser',
    '<HomepageEditorial',
    'className="featured-grid-section"',
    'className="home-studio"',
  ];
  const positions = order.map((marker) => markup.indexOf(marker));
  positions.forEach((position, index) =>
    assert.notEqual(position, -1, `missing ${order[index]}`),
  );
  assert.deepEqual(
    [...positions].sort((a, b) => a - b),
    positions,
    'homepage sections are out of order',
  );
});

test('the film sits on the ink chapter', () => {
  assert.match(markup, /<BrandFilm[^>]*chapter="ink"/);
});

test('the text carousel, stale Five moods grid and stock photo are gone', () => {
  assert.doesNotMatch(home, /featured-collections|category-carousel/);
  assert.doesNotMatch(home, /OriginalArtPreview/);
  assert.doesNotMatch(home, /story-section|home-story-return/);
  assert.doesNotMatch(home, /collections\(first:/);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test scripts/homeLayout.node-test.mjs`
Expected: FAIL (`missing <CapsuleIndex`, carousel still present).

- [ ] **Step 3: Edit imports** in `app/routes/_index.tsx`

Replace the import block lines 1-37 so that:
- `OriginalArtPreview` import is removed; `CapsuleIndex` is imported:
  `import {CapsuleIndex} from '~/components/CapsuleIndex';`
- from `~/lib/catalogFilters` keep only `filterDemoProducts`,
  `isDemoProduct`, `isReleasedExtensionHandle`.
- from `~/lib/originalArt` keep only `buildOriginalArtQuery`,
  `ORIGINAL_ART_QUERY_FIRST`.
- Delete the `HomeCollection` type (lines 44-58).

- [ ] **Step 4: Trim the loader** — return shape becomes:

```ts
    return {
      featuredPrints: pickFeaturedPrints(
        filterDemoProducts(
          (data.originalArtProducts?.nodes ?? []) as ClaraCardProduct[],
        ),
      ),
      frameProduct:
        data.frameProduct && !isDemoProduct(data.frameProduct)
          ? (data.frameProduct as ClaraCardProduct)
          : null,
      products: filterDemoProducts(data.products.nodes as ClaraCardProduct[]),
      seoUrl: getCanonicalUrl(request, '/'),
    };
  } catch {
    return {
      featuredPrints: [] as ClaraCardProduct[],
      frameProduct: null as ClaraCardProduct | null,
      products: [] as ClaraCardProduct[],
      seoUrl: getCanonicalUrl(request, '/'),
    };
  }
```

and in `HOMEPAGE_QUERY` delete the `collections(first: 12) { … }` subtree.

- [ ] **Step 5: Trim the component body** — destructure only
`featuredPrints, frameProduct, products, seoUrl`; delete
`collectionTrackRef`, `hasLiveCollections`, `categoryItems` and
`scrollCollectionCarousel`.

- [ ] **Step 6: Markup below the hero**

- `<BrandFilm className="home-film" chapter="ink" eyebrow="The film" />`
- Delete the `collection-intro home-commerce-intro` section and the
  `featured-collections` section; insert `<CapsuleIndex />` right after the
  Ready now (`home-shop-accelerator`) block.
- Delete `<OriginalArtPreview … />`.
- Replace the `story-section home-story-return` section and the
  `home-journal-teaser` section with:

```tsx
      <section
        aria-labelledby="home-studio-title"
        className="home-studio"
        data-chapter="ink"
      >
        <h2 className="home-studio__title" id="home-studio-title">
          From the studio
        </h2>
        <div className="home-studio__grid">
          <Link
            className="studio-card"
            data-reveal
            prefetch="intent"
            to="/our-story"
          >
            <img
              alt=""
              className="studio-card__image"
              decoding="async"
              height={1350}
              loading="lazy"
              src="/images/product-art-mockups/light-and-silence/where-mist-rests-wide-interior.jpg"
              width={1080}
            />
            <span className="studio-card__copy">
              <span className="studio-card__eyebrow">Our story</span>
              <span className="studio-card__title">
                Printed to order, one piece at a time.
              </span>
              <span className="studio-card__cta">Read our story →</span>
            </span>
          </Link>

          <Link
            className="journal-teaser-card"
            data-reveal
            prefetch="intent"
            to="/blogs/karina-of-time"
          >
            <div className="journal-teaser-sky" aria-hidden>
              <div className="journal-teaser-cloud" />
            </div>
            <span className="journal-teaser-copy">
              <span className="journal-teaser-eyebrow">The journal</span>
              <span className="journal-teaser-title">
                Karina <i>of</i> Time
              </span>
              <span className="journal-teaser-line">
                <span lang="el">καρίνα</span> — Greek, the keel. Notes on the
                prints, the capsules, and the rooms they live in.
              </span>
              <span className="journal-teaser-cta">Enter the journal →</span>
            </span>
          </Link>
        </div>
      </section>
```

- [ ] **Step 7: Run the layout and landing tests**

Run: `node --test scripts/homeLayout.node-test.mjs scripts/mobileLanding.node-test.mjs scripts/liquidGlass.node-test.mjs`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add app/routes/_index.tsx scripts/homeLayout.node-test.mjs
git commit -m "Homepage: gallery-walk order, capsule index, studio close"
```

---

### Task 4: Styles — trust line, film band, studio, dead CSS

**Files:**
- Modify: `app/routes/_index.tsx` (`homeCss`)
- Modify: `app/styles/app.css` (`.home-film`)

- [ ] **Step 1: Trust line** — replace `.home-trust-band` and
`.home-trust-band p` / `p:last-child` rules with:

```css
.home-trust-band {
  align-items: center;
  background: var(--color-ink);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(251, 250, 246, 0.7);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  padding: 16px clamp(18px, 4vw, 70px);
  row-gap: 8px;
}

.home-trust-band p {
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  line-height: 1.4;
  margin: 0;
  padding: 0 clamp(14px, 2.6vw, 34px);
  position: relative;
  text-transform: uppercase;
}

.home-trust-band p + p::before {
  background: currentColor;
  border-radius: 50%;
  content: '';
  height: 3px;
  left: 0;
  opacity: 0.55;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 3px;
}
```

and inside `@media (max-width: 768px)` replace the `.home-trust-band p`
rule with:

```css
  .home-trust-band {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    padding: 12px 6px;
  }

  .home-trust-band p {
    font-size: 0.58rem;
    letter-spacing: 0.12em;
    padding: 0 6px;
    text-align: center;
  }
```

- [ ] **Step 2: Film band** — in `app/styles/app.css` replace the
`.home-film` rule with:

```css
.home-film {
  background: var(--color-ink);
  padding: clamp(48px, 7vw, 96px)
    max(clamp(18px, 4vw, 70px), calc((100% - 1240px) / 2));
}

.home-film .brand-film-eyebrow,
.home-film .brand-film-caption {
  color: rgba(251, 250, 246, 0.6);
}

.home-film .brand-film-frame {
  box-shadow: 0 40px 90px -40px rgba(0, 0, 0, 0.8);
}
```

(the `@media (max-width: 720px) .home-film` padding rule stays.)

- [ ] **Step 3: Delete dead homepage CSS** in `homeCss`:
`.home-commerce-intro`, every `.featured-collection*` and
`.featured-collections*` rule (desktop, inside `@media (max-width: 768px)`,
and the whole `@media (max-width: 480px)` block that only holds
`.featured-collections-track .featured-collection-card`), and
`.home-story-return`. Keep the first `@media (max-width: 480px)` block (nav
grid). Keep the short-mobile block before the first
`@media (prefers-reduced-motion: reduce)` (pinned by mobileLanding test).

- [ ] **Step 4: Studio close CSS** — replace `.home-journal-teaser` and the
`.journal-teaser-card` rule with:

```css
.home-studio {
  display: grid;
  gap: clamp(18px, 2.4vw, 30px);
  padding: clamp(56px, 8vw, 110px) clamp(18px, 4vw, 70px);
}

.home-studio__title {
  color: var(--color-muted);
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  margin: 0 auto;
  max-width: 1240px;
  text-transform: uppercase;
  width: 100%;
}

.home-studio__grid {
  display: grid;
  gap: clamp(14px, 2vw, 26px);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0 auto;
  max-width: 1240px;
  width: 100%;
}

.studio-card,
.journal-teaser-card {
  border-radius: 28px;
  box-shadow: 0 30px 70px rgba(20, 15, 10, 0.3);
  color: #f2ece1;
  display: grid;
  isolation: isolate;
  min-height: clamp(340px, 34vw, 460px);
  overflow: hidden;
  position: relative;
  text-decoration: none;
  transition: transform 300ms ease, box-shadow 300ms ease;
}

.studio-card:hover,
.journal-teaser-card:hover {
  box-shadow: 0 36px 84px rgba(20, 15, 10, 0.42);
  transform: translateY(-3px);
}

.studio-card:focus-visible,
.journal-teaser-card:focus-visible {
  outline: 2px solid var(--color-ink);
  outline-offset: 4px;
}

.studio-card__image {
  height: 100%;
  inset: 0;
  object-fit: cover;
  object-position: 50% 28%;
  position: absolute;
  transition: transform 900ms cubic-bezier(0.22, 1, 0.36, 1);
  width: 100%;
}

.studio-card:hover .studio-card__image {
  transform: scale(1.03);
}

.studio-card::after {
  background: linear-gradient(180deg, rgba(20, 17, 13, 0) 36%, rgba(20, 17, 13, 0.74) 100%);
  content: '';
  inset: 0;
  position: absolute;
  z-index: 1;
}

.studio-card__copy {
  align-content: end;
  display: grid;
  gap: 10px;
  justify-items: start;
  padding: clamp(24px, 3.4vw, 44px);
  position: relative;
  z-index: 2;
}

.studio-card__eyebrow,
.studio-card__cta {
  font-family: 'Courier Prime', 'Courier New', ui-monospace, monospace;
  text-transform: uppercase;
}

.studio-card__eyebrow {
  font-size: 0.68rem;
  letter-spacing: 0.32em;
  opacity: 0.8;
}

.studio-card__title {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(1.8rem, 3.2vw, 2.7rem);
  line-height: 1.05;
  max-width: 16ch;
  text-shadow: 0 2px 24px rgba(10, 8, 6, 0.35);
}

.studio-card__cta {
  font-size: 0.7rem;
  letter-spacing: 0.24em;
  margin-top: 6px;
  opacity: 0.9;
}

.journal-teaser-card {
  background: linear-gradient(180deg, #100d0a 0%, #3a2b1e 55%, #9a6b52 100%);
}

@media (max-width: 820px) {
  .home-studio__grid {
    grid-template-columns: 1fr;
  }

  .studio-card,
  .journal-teaser-card {
    border-radius: 22px;
    min-height: 320px;
  }
}
```

and in `.journal-teaser-copy` change `min-height: 300px;` to
`min-height: 100%;`. In the journal reduced-motion block add
`.studio-card, .studio-card__image { transition: none; }`.

- [ ] **Step 5: Run everything**

Run: `npm test && npm run typecheck && npm run lint`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add app/routes/_index.tsx app/styles/app.css
git commit -m "Homepage styles: slim trust line, ink film band, studio close"
```

---

### Task 5: Living edit title

**Files:** Modify `app/content/homeEditorial.ts:7`

- [ ] **Step 1:** `title: 'Made for the rooms you live in.',`
- [ ] **Step 2:** `npm test` → pass. Commit
  `git commit -am "Living edit: stop repeating Original art"`.

---

### Task 6: Codegen, build, wiki

- [ ] **Step 1:** `npm run codegen` → `storefrontapi.generated.d.ts`
  loses the collections fields; `npm run typecheck` passes.
- [ ] **Step 2:** `npm run build` → success.
- [ ] **Step 3:** Update `docs/llm-wiki/modules/routes-and-pages.md` §Home
  Page (new order, capsule index from `listShopCapsules()`, studio close,
  `filterDemoCollections` no longer a homepage dependency) and append a
  dated entry to `docs/llm-wiki/log.md`.
- [ ] **Step 4:** Commit `Homepage gallery walk: codegen and wiki`.

---

### Task 7: Visual verification

- [ ] **Step 1:** Add a `home-dev` entry to `.claude/launch.json` (port
  3000, `npm run dev`) in the worktree and start it with `preview_start`.
- [ ] **Step 2:** 1440 × 900: screenshot trust line + film band, capsule
  index (rest and hover on one tile — room image fades in; network shows
  no room request before hover), studio close.
- [ ] **Step 3:** 390 × 844 and 320 × 568: no horizontal scroll
  (`document.documentElement.scrollWidth === innerWidth`), 2-column tiles
  with the All works tile closing the last row, stacked studio cards.
- [ ] **Step 4:** Reduced motion emulation: page renders, no transforms.
- [ ] **Step 5:** Console: no hydration errors.

### Task 8: PR

- [ ] **Step 1:** Push `fable/home-after-objects`, open the PR with the
  before (live) and after screenshots and the test output.
