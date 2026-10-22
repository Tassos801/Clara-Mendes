# Brand Line Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "original art" brand claim with the owner's line ("We don't know what we'll make next. We like art, and we promise it won't be boring."), give the homepage a curiosity-grid hero and a shorter, alternating section order, and make Shop All's Featured order rotate through the product lines.

**Architecture:** All brand copy moves to one module, `app/content/brand.ts`, which pages import. The homepage hero becomes static markup (no cursor effects, no delayed fades) with a tile grid configured in `brand.ts`. Shop All's Featured listing loads the studio set and the museum set fully into memory (the museum set already is), rotates the studio set by product line, and pages the combined list by index with `i.<n>` cursors. A node test guards against the old claims returning.

**Tech Stack:** Hydrogen 2026.4 (React Router 7, React 18.3), TypeScript, CSS-in-JS strings per route, Node 24 `node --test` scripts in `scripts/*.node-test.mjs` that import `.ts` files directly (relative imports only; the `~` alias does not resolve in node).

**Spec:** `docs/superpowers/specs/2026-10-22-brand-line-design.md`

**Worktree:** `C:\Users\admin\Desktop\Mine\shopify\clara-wt-brand`, branch `claude/brand-line`, based on `origin/main` 56bccdf. Run every command from this directory.

**Conventions that matter here:**
- Tests: `npm test` runs all node tests (about a minute). Run one file with `node --test scripts/<name>.node-test.mjs`.
- Checks: `npm run typecheck`, `npm run lint`, `npm run build`.
- Files under `app/lib` and `app/content` that tests import must use relative imports with the `.ts` extension (see the header comment in `app/lib/museumListingOrder.ts`). Components and routes keep the `~/` alias.
- Commit after each task. Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Windows: git warns "LF will be replaced by CRLF"; ignore it.

---

## File structure

| File | Responsibility |
|---|---|
| Create `app/content/brand.ts` | Every brand sentence (hero, section headings, Our Story, Shop All, footer, SEO) and the hero tile configuration. One place to edit the voice. |
| Create `app/lib/listingLines.ts` | Maps a product type to a product line and rotates a list so the lines alternate. Pure functions. |
| Create `app/lib/listingPage.ts` | Pages an in-memory list with `i.<index>` cursors in the shape `Pagination` expects. Pure functions. |
| Create `app/lib/leadPrints.ts` | The lead print of each studio capsule (7 today), with image, title, description and handle, and the Storefront query that fetches their live state. |
| Create `app/components/HeroTiles.tsx` | The curiosity grid: six tagged product tiles from `brand.ts`. Markup only; styles live in the homepage CSS string. |
| Modify `app/routes/_index.tsx` | New hero, new section order, dead code and CSS removed, loader slimmed. |
| Modify `app/components/OriginalArtPreview.tsx` | "The collection so far": lead prints of all studio capsules in the existing card style, new copy. |
| Modify `app/lib/originalArt.ts` | `buildOriginalArtProductMap` takes the expected handles as a parameter. |
| Modify `app/routes/collections.all.tsx` | Featured listing: rotate studio set by line, page in memory, real total in the count; heading, title, eyebrow and descriptions from `brand.ts`. |
| Modify `app/lib/museumListingOrder.ts` | Remove the studio-cursor paging functions that `collections.all.tsx` no longer uses. |
| Modify `app/routes/our-story.tsx`, `app/components/ClaraShell.tsx`, `app/content/homeEditorial.ts`, `app/lib/seo.ts`, `app/lib/webManifest.ts`, `app/lib/capsulePages.ts`, `app/lib/capsules.ts`, `app/lib/productCopy.ts`, `app/routes/blogs.$blogHandle._index.tsx`, `app/routes/collections.$handle.tsx`, `public/llms.txt` | Copy only. |
| Create `scripts/brand.node-test.mjs`, `scripts/listingLines.node-test.mjs`, `scripts/listingPage.node-test.mjs`, `scripts/leadPrints.node-test.mjs` | New tests. |
| Modify `scripts/mobileLanding.node-test.mjs`, `scripts/museumListingOrder.node-test.mjs` | Tests of removed behaviour are replaced or deleted. |

---

### Task 1: Brand voice module

**Files:**
- Create: `app/content/brand.ts`
- Test: `scripts/brand.node-test.mjs`

- [ ] **Step 1: Write the failing test**

Create `scripts/brand.node-test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {BRAND, HERO_TILES} from '../app/content/brand.ts';

test('the hero carries the owner line, visible word for word', () => {
  assert.equal(BRAND.hero.headline, "We don't know what we'll make next.");
  assert.equal(BRAND.hero.line, "We like art, and we promise it won't be boring.");
  assert.equal(BRAND.hero.primaryCta.href, '/collections/all');
  assert.equal(BRAND.hero.secondaryCta.href, '/our-story');
});

test('six hero tiles, each with an image, a tag and a site-relative link', () => {
  assert.equal(HERO_TILES.length, 6);
  for (const tile of HERO_TILES) {
    assert.match(tile.href, /^\//, `${tile.tag} links inside the site`);
    assert.ok(tile.image.src.length > 0);
    assert.ok(tile.image.width > 0 && tile.image.height > 0);
    assert.ok(tile.image.alt.length > 10, `${tile.tag} has a real alt text`);
    assert.ok(tile.tag.length > 0);
  }
  assert.equal(HERO_TILES[0].tag, 'our own print');
  assert.equal(HERO_TILES[1].tag, 'a borrowed Hokusai');
});

test('no brand sentence falls back on "original" as the umbrella word', () => {
  const text = JSON.stringify(BRAND);
  assert.doesNotMatch(text, /original art/i);
  assert.doesNotMatch(text, /original works?/i);
  assert.doesNotMatch(text, /something original/i);
});

test('SEO descriptions fit the 155-character truncation', () => {
  assert.ok(BRAND.seo.defaultDescription.length <= 155);
  assert.ok(BRAND.seo.homeDescription.length <= 155);
  assert.ok(BRAND.ourStory.description.length <= 155);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/brand.node-test.mjs`
Expected: FAIL, "Cannot find module … app/content/brand.ts".

- [ ] **Step 3: Create the module**

Create `app/content/brand.ts`:

```ts
/**
 * The brand voice in one place. Pages import these sentences instead of
 * holding their own, so the line reads the same everywhere and a change
 * is one edit. "Original" is no longer the umbrella claim: the capsules
 * are "our own work", museum reproductions are "borrowed from museums",
 * and everything else is called what it is.
 *
 * Relative imports only: scripts/brand.node-test.mjs loads this file in
 * plain Node, which cannot resolve the Vite "~" alias.
 */

export type HeroTile = {
  href: string;
  image: {alt: string; height: number; src: string; width: number};
  /** Short italic chip on the tile. Lower case, no full stop. */
  tag: string;
};

/**
 * The curiosity grid. Six very different things we make, each with a
 * small aside. Desktop shows all six; phones show the first four, so
 * the first four must stand on their own.
 */
export const HERO_TILES: readonly HeroTile[] = [
  {
    href: '/products/quiet-form-i-art-print',
    image: {
      alt: 'Quiet Form I: warm ivory arches and a charcoal circle, an art print of our own',
      height: 1400,
      src: '/images/product-art/quiet-form/quiet-form-01.webp',
      width: 1120,
    },
    tag: 'our own print',
  },
  {
    href: '/artists/hokusai',
    image: {
      alt: 'The Great Wave off Kanagawa by Hokusai, printed on a white-bordered sheet',
      height: 1280,
      src: '/images/product-art/floating-world/the-great-wave-off-kanagawa.sheet.webp',
      width: 1600,
    },
    tag: 'a borrowed Hokusai',
  },
  {
    href: '/products/art-tough-phone-case?Artwork=Midnight+Garden+I',
    image: {
      alt: 'A phone case printed edge to edge with the Midnight Garden artwork',
      height: 2000,
      src: '/images/art-product-extensions/snap-phone-case/midnight-garden.webp',
      width: 1600,
    },
    tag: 'a phone case',
  },
  {
    href: '/clothing',
    image: {
      alt: 'The Quiet Current studio tank in Moss / Mist, laid flat',
      height: 1125,
      src: 'https://cdn.shopify.com/s/files/1/1027/6533/0766/files/01-moss-flat-front_e847210a-10f9-4c6c-b296-0eedb07b5afd.jpg?width=900',
      width: 900,
    },
    tag: 'a tank top?',
  },
  {
    href: '/pastel-forms',
    image: {
      alt: 'The Butter Sun ceramic plant pot, pale yellow with a soft sun mark',
      height: 1254,
      src: '/images/pastel-plant-pots/butter-sun.webp',
      width: 1254,
    },
    tag: 'yes, a pot',
  },
  {
    href: '/book-nooks',
    image: {
      alt: 'The Twilight Library book nook, a lit miniature room between books',
      height: 1250,
      src: '/images/curated/twilight-library-diy-book-nook-kit/03-front.webp',
      width: 1000,
    },
    tag: 'a tiny world for your shelf',
  },
];

export const BRAND = {
  hero: {
    headline: "We don't know what we'll make next.",
    line: "We like art, and we promise it won't be boring.",
    primaryCta: {href: '/collections/all', label: 'See what we made'},
    secondaryCta: {href: '/our-story', label: 'Our story'},
    footnote:
      "Prints · phone cases · clothing · plant pots · book nooks · whatever's next",
  },
  collection: {
    eyebrow: 'Our own work',
    title: 'The collection so far.',
    /** `${works}` and `${capsules}` are number words from catalogSummary. */
    intro: (works: string, capsules: string) =>
      `Our own work: ${works} pieces in ${capsules} capsules, printed to order.`,
    cta: 'Shop the prints',
    note:
      'Unframed giclée prints in up to three sizes, on 200gsm Enhanced Matte Art paper, printed to order.',
  },
  livingEdit: {
    title: 'Art, made to live with.',
    footer: ['Our own prints', 'Tactile materials', 'Everyday living'],
  },
  storyBand: {
    eyebrow: 'Our story',
    title: 'It started with fifteen prints. Then it got interesting.',
    body: "Now there's clothing, ceramics, phone cases and book nooks. Next? We honestly don't know.",
    cta: 'Read the story',
  },
  ourStory: {
    title: "We like art. That's the plan.",
    intro: [
      'Clara Mendes started with fifteen prints of our own. Then we put art on phone cases, clothing and plant pots, and borrowed a few masterpieces from museums.',
      "We don't know what comes next. We promise it won't be boring.",
    ],
    capsulesLede:
      'Each capsule is a small family of our own works, composed so a single print carries a room and a pair or trio reads as one arrangement. Buy one now and add its companions later.',
    caseNote:
      'Every one of our own prints on a matte, dual-layer tough case for iPhone, Samsung Galaxy and Google Pixel.',
    closing: "Come back soon. It'll be different.",
    /** Meta description; kept under 155 characters. */
    description:
      "Clara Mendes started with fifteen prints of our own. Now: museum masterpieces, phone cases, clothing, plant pots and book nooks. Never boring.",
  },
  shopAll: {
    heading: "Everything we've made so far",
    eyebrow: 'Our own work, borrowed masterpieces, curious objects',
    description:
      'Shop Clara Mendes: our own art prints, museum masterpieces, canvas, cards, phone cases, ceramic plant pots, book nook kits and activewear.',
    printsOnlyDescription:
      'Shop our own Clara Mendes art prints, from quiet geometry to cinematic imagined worlds.',
    collectionFallback: 'A Clara Mendes collection: art on things worth living with.',
  },
  footer: {
    blurb:
      'We like art and follow it wherever it goes: our own prints, works borrowed from museums, and things you use every day.',
  },
  seo: {
    homeTitle: 'Art Prints, Clothing and Curious Objects | Clara Mendes',
    homeDescription:
      'We like art and follow it wherever it goes: our own prints, museum masterpieces, phone cases, clothing, plant pots and book nooks. Never boring.',
    defaultDescription:
      'We like art and follow it wherever it goes: our own prints, museum masterpieces, phone cases, clothing, plant pots and book nooks. Never boring.',
    manifestDescription:
      'Our own prints, museum masterpieces, clothing, phone cases, plant pots and book nooks.',
    journalDescription:
      "Karina of Time — καρίνα, Greek for keel — is the Clara Mendes journal: notes on art, colour, and whatever we're making next. New issues by email.",
  },
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/brand.node-test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add app/content/brand.ts scripts/brand.node-test.mjs
git commit -m "Add the brand voice module

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Product lines and line rotation

**Files:**
- Create: `app/lib/listingLines.ts`
- Test: `scripts/listingLines.node-test.mjs`

Context: `isClothingProductType` lives in `app/lib/clothing.ts` (exact garment types such as "Studio Top", "Sports Bra", "Biker Shorts", "Yoga Leggings"). `isPersonalisedProductType` lives in `app/lib/storefrontBasics.ts`. Shopify product types seen in the shop: Art Prints, Framed Art, Canvas Art, Hanger Prints, Acrylic Prints, Metal Prints, Cards, Postcards, Phone Cases, Mugs, Cushions, Blankets, Plant Pots, Book Nooks, plus the garment types.

- [ ] **Step 1: Write the failing test**

Create `scripts/listingLines.node-test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LINE_ORDER,
  productLine,
  rotateByLine,
} from '../app/lib/listingLines.ts';

const p = (id, productType) => ({id, productType});

test('product types map to the lines the shop rotates through', () => {
  assert.deepEqual(LINE_ORDER, [
    'prints',
    'cases',
    'clothing',
    'nooks',
    'pots',
    'cards',
    'sky',
    'other',
  ]);
  assert.equal(productLine(p(1, 'Art Prints')), 'prints');
  assert.equal(productLine(p(1, 'Phone Cases')), 'cases');
  assert.equal(productLine(p(1, 'Studio Top')), 'clothing');
  assert.equal(productLine(p(1, 'Yoga Leggings')), 'clothing');
  assert.equal(productLine(p(1, 'Book Nooks')), 'nooks');
  assert.equal(productLine(p(1, 'Plant Pots')), 'pots');
  assert.equal(productLine(p(1, 'Cards')), 'cards');
  assert.equal(productLine(p(1, 'Postcards')), 'cards');
  assert.equal(productLine(p(1, 'Canvas Art')), 'other');
  assert.equal(productLine(p(1, null)), 'other');
  assert.equal(productLine({id: 1}), 'other');
});

test('rotation alternates lines and keeps each line in its given order', () => {
  const input = [
    p('tank', 'Studio Top'),
    p('bra', 'Sports Bra'),
    p('nook1', 'Book Nooks'),
    p('nook2', 'Book Nooks'),
    p('pot1', 'Plant Pots'),
    p('case', 'Phone Cases'),
    p('print1', 'Art Prints'),
    p('print2', 'Art Prints'),
    p('canvas', 'Canvas Art'),
  ];
  const out = rotateByLine(input).map((x) => x.id);
  assert.deepEqual(out, [
    'print1',
    'case',
    'tank',
    'nook1',
    'pot1',
    'canvas',
    'print2',
    'bra',
    'nook2',
  ]);
  // Nothing lost, nothing duplicated, input untouched.
  assert.equal(out.length, input.length);
  assert.equal(new Set(out).size, input.length);
  assert.equal(input[0].id, 'tank');
});

test('rotation of an empty or single-line list is a copy of the input', () => {
  assert.deepEqual(rotateByLine([]), []);
  const prints = [p('a', 'Art Prints'), p('b', 'Art Prints')];
  const out = rotateByLine(prints);
  assert.deepEqual(out.map((x) => x.id), ['a', 'b']);
  assert.notEqual(out, prints);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/listingLines.node-test.mjs`
Expected: FAIL, cannot find `app/lib/listingLines.ts`.

- [ ] **Step 3: Write the module**

Create `app/lib/listingLines.ts`:

```ts
// Relative imports keep this module loadable by the plain-Node test runner.
import {isClothingProductType} from './clothing.ts';
import {isPersonalisedProductType} from './storefrontBasics.ts';

/**
 * Product lines of the studio's own products, in the order the shop's
 * "Featured" listing rotates through them: one print, one case, one
 * garment, one nook, one pot, one card, one star map, one of anything
 * else, then round again. The mix is the brand, so the first screen of
 * the shop shows it instead of whatever line was released last.
 */
export const LINE_ORDER = [
  'prints',
  'cases',
  'clothing',
  'nooks',
  'pots',
  'cards',
  'sky',
  'other',
] as const;

export type Line = (typeof LINE_ORDER)[number];

const TYPE_LINES: Record<string, Line> = {
  'Art Prints': 'prints',
  'Phone Cases': 'cases',
  'Book Nooks': 'nooks',
  'Plant Pots': 'pots',
  Cards: 'cards',
  Postcards: 'cards',
};

export function productLine(product: {productType?: string | null}): Line {
  const type = product.productType?.trim();
  if (!type) return 'other';
  if (TYPE_LINES[type]) return TYPE_LINES[type];
  if (isClothingProductType(type)) return 'clothing';
  if (isPersonalisedProductType(type)) return 'sky';
  return 'other';
}

/**
 * Round-robin over the lines: the first product of each line in
 * LINE_ORDER, then the second of each, and so on. Within a line the
 * input order is kept. Returns a new array; the input is not changed.
 */
export function rotateByLine<T extends {productType?: string | null}>(
  products: readonly T[],
): T[] {
  const buckets = new Map<Line, T[]>(LINE_ORDER.map((line) => [line, []]));
  for (const product of products) buckets.get(productLine(product))!.push(product);
  const out: T[] = [];
  let took = true;
  while (took) {
    took = false;
    for (const line of LINE_ORDER) {
      const next = buckets.get(line)!.shift();
      if (next) {
        out.push(next);
        took = true;
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/listingLines.node-test.mjs`
Expected: PASS, 3 tests. If `isPersonalisedProductType` is not exported from `storefrontBasics.ts` under that name, open the file and use the exported name; do not re-implement it.

- [ ] **Step 5: Commit**

```bash
git add app/lib/listingLines.ts scripts/listingLines.node-test.mjs
git commit -m "Add product lines and line rotation for the shop listing

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: In-memory index paging

**Files:**
- Create: `app/lib/listingPage.ts`
- Test: `scripts/listingPage.node-test.mjs`

Context: Hydrogen's `getPaginationVariables(request, {pageBy: 24})` returns either `{first, endCursor?}` or `{last, startCursor?}`. The `<Pagination>` component reads `pageInfo` and builds `?cursor=<endCursor>&direction=next` URLs. `ListingCursorError`, `ListingConnection` and `ListingPaginationVariables` already exist in `app/lib/museumListingOrder.ts`; reuse them.

- [ ] **Step 1: Write the failing test**

Create `scripts/listingPage.node-test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {ListingCursorError} from '../app/lib/museumListingOrder.ts';
import {indexCursor, pageByIndex} from '../app/lib/listingPage.ts';

const ITEMS = Array.from({length: 10}, (_, i) => `p${i}`);

test('the first page, forward paging and the last page', () => {
  const page1 = pageByIndex({first: 4}, ITEMS);
  assert.deepEqual(page1.nodes, ['p0', 'p1', 'p2', 'p3']);
  assert.deepEqual(page1.pageInfo, {
    endCursor: 'i.3',
    hasNextPage: true,
    hasPreviousPage: false,
    startCursor: 'i.0',
  });

  const page2 = pageByIndex({first: 4, endCursor: page1.pageInfo.endCursor}, ITEMS);
  assert.deepEqual(page2.nodes, ['p4', 'p5', 'p6', 'p7']);
  assert.equal(page2.pageInfo.hasPreviousPage, true);

  const page3 = pageByIndex({first: 4, endCursor: page2.pageInfo.endCursor}, ITEMS);
  assert.deepEqual(page3.nodes, ['p8', 'p9']);
  assert.deepEqual(page3.pageInfo, {
    endCursor: 'i.9',
    hasNextPage: false,
    hasPreviousPage: true,
    startCursor: 'i.8',
  });
});

test('backward paging mirrors forward paging', () => {
  const last = pageByIndex({last: 4}, ITEMS);
  assert.deepEqual(last.nodes, ['p6', 'p7', 'p8', 'p9']);
  assert.equal(last.pageInfo.hasNextPage, false);
  assert.equal(last.pageInfo.hasPreviousPage, true);

  const prev = pageByIndex({last: 4, startCursor: last.pageInfo.startCursor}, ITEMS);
  assert.deepEqual(prev.nodes, ['p2', 'p3', 'p4', 'p5']);

  const first = pageByIndex({last: 4, startCursor: prev.pageInfo.startCursor}, ITEMS);
  assert.deepEqual(first.nodes, ['p0', 'p1']);
  assert.equal(first.pageInfo.hasPreviousPage, false);
  assert.equal(first.pageInfo.hasNextPage, true);
});

test('an empty list pages to an empty page', () => {
  assert.deepEqual(pageByIndex({first: 24}, []), {
    nodes: [],
    pageInfo: {
      endCursor: null,
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
    },
  });
});

test('cursors this listing did not issue are rejected', () => {
  assert.equal(indexCursor(7), 'i.7');
  for (const cursor of ['s.abc', 'm.3', 'i.', 'i.x', 'i.1234567', '7']) {
    assert.throws(
      () => pageByIndex({first: 4, endCursor: cursor}, ITEMS),
      ListingCursorError,
      cursor,
    );
  }
  // Past the end (the list shrank since the cursor was issued).
  assert.throws(() => pageByIndex({first: 4, endCursor: 'i.10'}, ITEMS), ListingCursorError);
  assert.throws(() => pageByIndex({last: 4, startCursor: 'i.11'}, ITEMS), ListingCursorError);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/listingPage.node-test.mjs`
Expected: FAIL, cannot find `app/lib/listingPage.ts`.

- [ ] **Step 3: Write the module**

Create `app/lib/listingPage.ts`:

```ts
// Relative imports keep this module loadable by the plain-Node test runner.
import {
  ListingCursorError,
  type ListingConnection,
  type ListingPaginationVariables,
} from './museumListingOrder.ts';

const PREFIX = 'i.';

/** Cursor for the product at `index` of an in-memory listing. */
export function indexCursor(index: number) {
  return `${PREFIX}${index}`;
}

function parseIndexCursor(cursor: string): number {
  const raw = cursor.startsWith(PREFIX) ? cursor.slice(PREFIX.length) : '';
  if (!/^\d{1,6}$/.test(raw))
    throw new ListingCursorError(`Unknown listing cursor: ${cursor}`);
  return Number(raw);
}

/**
 * One page of a listing held in memory, with the cursor semantics
 * @shopify/hydrogen's Pagination expects: `{first, endCursor}` pages
 * forward from after the cursor, `{last, startCursor}` pages backward
 * from before it, and no cursor means the first or the last page.
 * Cursors are positions, so forward and backward paging never repeat or
 * skip a product. A position past the end (the list shrank) is a
 * ListingCursorError, which the route turns into a redirect to page one.
 */
export function pageByIndex<T>(
  variables: ListingPaginationVariables,
  items: readonly T[],
): ListingConnection<T> {
  let start: number;
  let end: number; // exclusive
  if ('first' in variables) {
    const after =
      variables.endCursor ? parseIndexCursor(variables.endCursor) : -1;
    if (after >= items.length && items.length > 0)
      throw new ListingCursorError(`Cursor ${after} is past the end`);
    start = after + 1;
    end = Math.min(items.length, start + variables.first);
  } else {
    const before =
      variables.startCursor
        ? parseIndexCursor(variables.startCursor)
        : items.length;
    if (before > items.length)
      throw new ListingCursorError(`Cursor ${before} is past the end`);
    end = before;
    start = Math.max(0, end - variables.last);
  }
  const nodes = items.slice(start, end);
  return {
    nodes,
    pageInfo: {
      endCursor: nodes.length ? indexCursor(end - 1) : null,
      hasNextPage: end < items.length,
      hasPreviousPage: start > 0,
      startCursor: nodes.length ? indexCursor(start) : null,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/listingPage.node-test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add app/lib/listingPage.ts scripts/listingPage.node-test.mjs
git commit -m "Add index paging for in-memory shop listings

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Lead prints of every studio capsule

**Files:**
- Create: `app/lib/leadPrints.ts`
- Modify: `app/lib/originalArt.ts:65-72` (`buildOriginalArtProductMap` gains an `expectedHandles` parameter)
- Modify: `app/components/OriginalArtPreview.tsx`
- Test: `scripts/leadPrints.node-test.mjs`

Context:
- `data/original-art-catalog.json` has the 15 founding prints (`handle, title, shortTitle, capsule, sequence, description, alt, image, palette`). `sequence === 1` marks each capsule's lead.
- `data/print-catalog.json` (via `PRINT_CATALOG` in `app/lib/printCatalog.ts`) holds the later collections. Studio ones today: `scifi-cinema` ("Sci-fi & Cinema", 4 prints) and `light-and-silence` ("Light & Silence", 5 prints). Each print has `slug, title, sequence, description, alt, released`. `printHandle(print)` gives the product handle, `printImagePath(collection, print)` the 4:5 artwork image, `collectionKind(collection)` is `'studio'` or `'museum'`, `releasedPrintCollections()` lists collections with at least one released print.
- `listShopCapsules()` in `app/lib/capsules.ts` returns the five founding capsules plus released print-catalog collections, with `kind` set only on the latter.
- The catalog sync tags every print with its collection title, which is why `buildCapsuleTagQuery` works for all capsules.

- [ ] **Step 1: Write the failing test**

Create `scripts/leadPrints.node-test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {catalogCounts} from '../app/lib/catalogSummary.ts';
import {LEAD_PRINTS, leadPrintsQuery} from '../app/lib/leadPrints.ts';

test('one lead print per studio capsule, founding capsules first', () => {
  assert.equal(LEAD_PRINTS.length, catalogCounts().capsules);
  assert.deepEqual(
    LEAD_PRINTS.slice(0, 5).map((p) => p.capsule),
    ['Quiet Form', 'Patina Blue', 'Neo Deco', 'Midnight Garden', 'Sunlit Mosaic'],
  );
  for (const print of LEAD_PRINTS) {
    assert.match(print.handle, /-art-print$/);
    assert.match(print.image, /^\/images\/product-art\//);
    assert.ok(print.shortTitle.length > 0);
    assert.ok(print.description.length > 0);
    assert.ok(print.alt.length > 0);
  }
  const scifi = LEAD_PRINTS.find((p) => p.capsule === 'Sci-fi & Cinema');
  assert.ok(scifi, 'Sci-fi & Cinema has a lead print');
  assert.equal(scifi.handle, 'orbital-silence-art-print');
  assert.equal(scifi.palette, null);
});

test('the lead-print query selects studio prints by capsule tag', () => {
  const query = leadPrintsQuery();
  assert.match(query, /tag:"Quiet Form"/);
  assert.match(query, /tag:"Sci-fi & Cinema"/);
  assert.doesNotMatch(query, /Floating World/);
  assert.match(query, /product_type:"Art Prints"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/leadPrints.node-test.mjs`
Expected: FAIL, cannot find `app/lib/leadPrints.ts`.

- [ ] **Step 3: Write the module**

Create `app/lib/leadPrints.ts`:

```ts
// Relative imports keep this module loadable by the plain-Node test runner.
import artCatalog from '../../data/original-art-catalog.json' with {type: 'json'};
import {
  collectionKind,
  printHandle,
  printImagePath,
  releasedPrintCollections,
  PRINT_CATALOG,
  type PrintCatalog,
} from './printCatalog.ts';

export type LeadPrint = {
  alt: string;
  capsule: string;
  description: string;
  handle: string;
  image: string;
  /** Colour words; the founding catalog has them, the print catalog does not. */
  palette: string | null;
  shortTitle: string;
};

/**
 * The first work of every capsule of our own, for "The collection so
 * far" on the homepage: the five founding capsules from
 * data/original-art-catalog.json, then each released studio collection
 * of data/print-catalog.json in catalog order.
 */
export function leadPrints(printCatalog: PrintCatalog = PRINT_CATALOG): LeadPrint[] {
  const founding: LeadPrint[] = artCatalog
    .filter((item) => item.sequence === 1)
    .map((item) => ({
      alt: item.alt,
      capsule: item.capsule,
      description: item.description,
      handle: item.handle,
      image: item.image,
      palette: item.palette,
      shortTitle: item.shortTitle,
    }));
  const later: LeadPrint[] = releasedPrintCollections(printCatalog).flatMap(
    (released) => {
      const collection = printCatalog.collections.find(
        (entry) => entry.slug === released.slug,
      );
      if (!collection || collectionKind(collection) !== 'studio') return [];
      const lead = [...collection.prints]
        .filter((print) => print.released === true)
        .sort((a, b) => a.sequence - b.sequence)[0];
      if (!lead) return [];
      return [
        {
          alt: lead.alt ?? lead.title,
          capsule: collection.title,
          description: lead.description,
          handle: printHandle(lead),
          image: printImagePath(collection, lead),
          palette: null,
          shortTitle: lead.title,
        },
      ];
    },
  );
  return [...founding, ...later];
}

export const LEAD_PRINTS: LeadPrint[] = leadPrints();

/** Handles the homepage expects live state for. */
export const LEAD_PRINT_HANDLES = LEAD_PRINTS.map((print) => print.handle);

/**
 * Storefront `products(query:)` selecting the studio capsules' prints: the
 * capsule tags the catalog sync writes, narrowed to the print product
 * type. Handles are not searchable, so tags carry the selection.
 */
export function leadPrintsQuery(printCatalog: PrintCatalog = PRINT_CATALOG) {
  const titles = [
    ...new Set(leadPrints(printCatalog).map((print) => print.capsule)),
  ];
  const tags = titles.map((title) => `tag:"${title.replaceAll('"', '\\"')}"`);
  return `(${tags.join(' OR ')}) AND product_type:"Art Prints"`;
}

/** Enough for every print of every studio capsule, with headroom. */
export const LEAD_PRINTS_QUERY_FIRST = 60;
```

If the print-catalog print type has no `alt` field in `PrintCatalogPrint` (check `app/lib/printCatalog.ts:51-80`), use `lead.title` for `alt` and drop the `??`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/leadPrints.node-test.mjs`
Expected: PASS, 2 tests. If the test's count of capsules fails, read `catalogCounts()` in `app/lib/catalogSummary.ts` and make `leadPrints` match it (same source of truth: founding catalog + released studio collections).

- [ ] **Step 5: Let `buildOriginalArtProductMap` accept the expected handles**

In `app/lib/originalArt.ts`, change the signature:

```ts
export function buildOriginalArtProductMap(
  products: Array<ClaraCardProduct | null | undefined>,
  expected: readonly string[] = ORIGINAL_ART_HANDLES,
): OriginalArtProductMap {
  const expectedHandles = new Set(expected.map((handle) => handle.toLowerCase()));
```

Keep the rest of the function as it is. Existing callers pass one argument and are unchanged.

- [ ] **Step 6: Rewrite `OriginalArtPreview` for the collection so far**

Replace the top of `app/components/OriginalArtPreview.tsx` down to the end of the `return`'s `<header>` with:

```tsx
import artCatalog from '../../data/original-art-catalog.json';
import {Link} from 'react-router';
import {BRAND} from '~/content/brand';
import {capitalize, catalogCounts, countWord} from '~/lib/catalogSummary';
import {LEAD_PRINTS, type LeadPrint} from '~/lib/leadPrints';
import {
  formatOriginalArtPrice,
  type OriginalArtProductMap,
} from '~/lib/originalArt';

type OriginalArtPreviewProps = {
  products?: OriginalArtProductMap;
  compact?: boolean;
};

const CATALOG = catalogCounts();

/** The founding catalog's rows, in the lead-print shape. */
const FOUNDING: LeadPrint[] = artCatalog.map((item) => ({
  alt: item.alt,
  capsule: item.capsule,
  description: item.description,
  handle: item.handle,
  image: item.image,
  palette: item.palette,
  shortTitle: item.shortTitle,
}));

/**
 * Compact (homepage): "The collection so far", the lead print of every
 * studio capsule. Full (shop fallback): the fifteen founding prints.
 */
export function OriginalArtPreview({
  products = {},
  compact = false,
}: OriginalArtPreviewProps) {
  const items = compact ? LEAD_PRINTS : FOUNDING;
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
          <p className="eyebrow">{BRAND.collection.eyebrow}</p>
          <h2 id="original-art-preview-title">{BRAND.collection.title}</h2>
        </div>
        <div className="original-art-preview__intro">
          <p>
            {capitalize(
              BRAND.collection.intro(
                countWord(CATALOG.works),
                countWord(CATALOG.capsules),
              ),
            )}
          </p>
          {compact ? (
            <Link
              className="text-link"
              to="/collections/all?type=Art+Prints"
            >
              {hasAvailableProducts
                ? BRAND.collection.cta
                : 'Browse the print collection'}
            </Link>
          ) : null}
        </div>
      </header>
```

In the card body, the palette span becomes conditional:

```tsx
                <div className="original-art-card__meta">
                  {item.palette ? <span>{item.palette}</span> : <span />}
                  <span>
```

Replace the compact note at the bottom:

```tsx
      {compact ? (
        <p className="original-art-preview__note">{BRAND.collection.note}</p>
      ) : null}
```

In `previewCss`, the compact grid is five columns at ≥981px. Make it fit any count: replace

```css
@media (min-width: 981px) {
  .original-art-preview--compact .original-art-preview__grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
```

with

```css
@media (min-width: 981px) {
  .original-art-preview--compact .original-art-preview__grid {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
}
```

and delete the two `.original-art-preview--compact .original-art-card:last-child` rules (the 680px and 390px ones), which centred a fifth card and would mis-place a seventh.

Note `capitalize` is applied because `countWord` returns lower-case words ("twenty-four") and the sentence starts with "Our own work:", which is already capitalised; if `capitalize` changes nothing, that is fine. Check `capitalize` exists in `app/lib/catalogSummary.ts` (the homepage imports it today).

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: no errors. (`app/routes/_index.tsx` still passes the old map; it compiles because the new parameter is optional.)

- [ ] **Step 8: Commit**

```bash
git add app/lib/leadPrints.ts scripts/leadPrints.node-test.mjs app/lib/originalArt.ts app/components/OriginalArtPreview.tsx
git commit -m "Show the lead print of every studio capsule as the collection so far

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: The curiosity hero

**Files:**
- Create: `app/components/HeroTiles.tsx`
- Modify: `app/routes/_index.tsx` (hero JSX, hero CSS, effects, `links`, meta)
- Modify: `scripts/mobileLanding.node-test.mjs`

Context, current state of `app/routes/_index.tsx`:
- Lines 106–215: refs (`blurRef, dotRef, outlineRef, orbRef, titleRef, subRef, collectionTrackRef`) and two `useEffect`s driving a custom cursor, a parallax blur layer and a press-and-hold orb that navigates to the shop. All of it goes.
- Lines 139–156: `links` preloads `/images/backdrops/hero-interior.jpg` and the mobile WebP. Both preloads go. The files stay on disk (`app/styles/app.css:238` uses the JPEG for collection heroes).
- Lines 464–590: the hero section. Keep the `<header className="hm-header-top">…</header>` block exactly as it is (phone menu button, brand, nav, icons). Everything else inside `.home-root` is replaced.
- CSS string `homeCss` starts at line 968. Selectors to delete entirely: `.hm-layer-sharp`, `.hm-layer-blur`, the 720px media block that swaps their image, `.hm-noise-overlay`, `.hm-noise-overlay::after`, `.hm-vignette`, `.hm-interaction-anchor`, every `.hm-orb-btn*` rule, `.hm-label-enter`, `.hm-cursor-dot`, `.hm-cursor-outline`, `.hm-coords`, `@keyframes hmOrbPulse`, `@keyframes hmFadeInSlow`, the `@media (hover: hover) and (pointer: fine)` block that sets `cursor: none`, and the `cursor: auto` reset at the top of the 768px block. Inside the 768px and the 768px-and-max-height-680px blocks, delete the rules for `.hm-hero-text`, `.hm-prompt-main`, `.hm-prompt-sub`, `.hm-hero-actions`, `.hm-hero-action`, `.hm-interaction-anchor`, `.hm-label-enter`, `.hm-coords`, `.hm-cursor-dot`, `.hm-cursor-outline` and the `.hm-ui-layer` grid override; keep the header rules (`.hm-header-top`, `.hm-menu-button`, `.hm-header-icons`, `.hm-nav-group`, `.hm-brand`, `.hm-nav-text`, `.hm-header-top .market-selector *`). In the `prefers-reduced-motion` block, remove `.hm-prompt-main, .hm-prompt-sub, .hm-coords, .hm-label-enter, .hm-orb-btn::before` and put `.hm-tile` there instead (see below).
- `scripts/liquidGlass.node-test.mjs` requires `.hm-header-top` and `.hm-hero-action` rules to contain `backdrop-filter`. Keep that.

- [ ] **Step 1: Replace the mobile landing test with the new hero's contract**

Overwrite `scripts/mobileLanding.node-test.mjs`:

```js
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const homepageSource = readFileSync(
  path.join(ROOT, 'app/routes/_index.tsx'),
  'utf8',
);

function cssBlock(selectorRegex, source = homepageSource) {
  const match = source.match(new RegExp(`${selectorRegex}\\s*\\{([^}]*)\\}`, 's'));
  assert.ok(match, `missing rule ${selectorRegex}`);
  return match[1];
}

test('the headline is visible on the first frame: no fade, no delay', () => {
  const main = cssBlock('\\.hm-prompt-main');
  assert.doesNotMatch(main, /opacity:\s*0/);
  assert.doesNotMatch(main, /animation:/);
  const sub = cssBlock('\\.hm-prompt-sub');
  assert.doesNotMatch(sub, /opacity:\s*0/);
  assert.doesNotMatch(sub, /animation:/);
  assert.doesNotMatch(homepageSource, /hmFadeInSlow/);
});

test('the cursor orb, custom cursor and interior backdrop are gone', () => {
  for (const gone of [
    'hm-orb-btn',
    'hm-cursor-dot',
    'hm-cursor-outline',
    'hm-layer-blur',
    'hm-interaction-anchor',
    'hero-interior',
    'cursor: none',
  ]) {
    assert.ok(!homepageSource.includes(gone), `${gone} should be removed`);
  }
});

test('phones get one calm header row that opens the site menu', () => {
  const start = homepageSource.indexOf('@media (max-width: 768px) {');
  assert.notEqual(start, -1);
  const css = homepageSource.slice(start, homepageSource.indexOf('@media', start + 10));
  assert.match(css, /\.hm-nav-group\s*\{[^}]*display:\s*none;/s);
  assert.match(css, /\.hm-menu-button,\s*\.hm-header-icons\s*\{[^}]*display:\s*inline-flex;/s);
  assert.match(homepageSource, /onClick=\{\(\) => open\('mobile'\)\}/);
  assert.match(homepageSource, /aria-label="Open menu"/);
});

test('phones show four tiles in two columns under the headline', () => {
  const start = homepageSource.indexOf('@media (max-width: 768px) {');
  const css = homepageSource.slice(start, homepageSource.indexOf('@media', start + 10));
  assert.match(css, /\.hm-tiles\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s);
  assert.match(css, /\.hm-tile:nth-child\(n \+ 5\)\s*\{[^}]*display:\s*none;/s);
  assert.match(css, /\.hm-hero-body\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s);
});
```

Run: `node --test scripts/mobileLanding.node-test.mjs`
Expected: FAIL (the old hero is still there).

- [ ] **Step 2: Create the tiles component**

Create `app/components/HeroTiles.tsx`:

```tsx
import {Link} from 'react-router';
import {HERO_TILES} from '~/content/brand';

/**
 * The curiosity grid: six very different things we make, each with a
 * short aside. Styles are in the homepage CSS string (`.hm-tiles`,
 * `.hm-tile`, `.hm-tile-tag`). The first tile is the page's largest
 * early image, so it loads eagerly with high priority; the rest lazily.
 */
export function HeroTiles() {
  return (
    <ul className="hm-tiles" aria-label="A few of the things we make">
      {HERO_TILES.map((tile, index) => (
        <li key={tile.href} className="hm-tile">
          <Link to={tile.href} prefetch="intent" aria-label={`${tile.image.alt} — ${tile.tag}`}>
            <img
              alt={tile.image.alt}
              decoding="async"
              height={tile.image.height}
              loading={index === 0 ? 'eager' : 'lazy'}
              // React 18 passes unknown lower-case attributes through.
              {...(index === 0 ? {fetchpriority: 'high'} : {})}
              src={tile.image.src}
              width={tile.image.width}
            />
            <span className="hm-tile-tag" aria-hidden="true">
              {tile.tag}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

If TypeScript rejects `fetchpriority` on `<img>`, cast the spread: `{...(index === 0 ? ({fetchpriority: 'high'} as Record<string, string>) : {})}`.

- [ ] **Step 3: Rewrite the hero markup in `app/routes/_index.tsx`**

Add imports near the top:

```tsx
import {HeroTiles} from '~/components/HeroTiles';
import {BRAND} from '~/content/brand';
```

Delete `const HERO_INTERIOR_MOBILE = …;` and `useRef`/`useNavigate` usage: remove `useRef` from the React import if nothing else uses it, remove `useNavigate` from the react-router import, and delete the seven refs and both `useEffect`s that reference `blurRef`, `dotRef`, `outlineRef`, `orbRef`, `titleRef`, `subRef`. (Keep `collectionTrackRef` and `scrollCollectionCarousel` until Task 6 removes the carousel; if they are in the same `useEffect`, keep only what they need.) Check that `useEffect` is still imported if anything else uses it.

Replace `links`:

```tsx
export const links: Route.LinksFunction = () => [
  {rel: 'stylesheet', href: artistFeatureStyles},
];
```

Replace `meta`:

```tsx
export const meta: Route.MetaFunction = ({data}) => {
  return buildSeoMeta({
    description: BRAND.seo.homeDescription,
    title: BRAND.seo.homeTitle,
    url: data?.seoUrl ?? `${STOREFRONT_ORIGIN}/`,
  });
};
```

Replace everything from `<section className="home-root" aria-labelledby="home-title">` to its closing `</section>` with:

```tsx
      <section className="home-root" aria-labelledby="home-title">
        <div className="hm-ui-layer">
          <header className="hm-header-top">
            {/* unchanged: keep the existing header block verbatim */}
          </header>

          <div className="hm-hero-body">
            <div className="hm-hero-text">
              <h1 id="home-title" className="hm-prompt-main">
                {BRAND.hero.headline}
              </h1>
              <p className="hm-prompt-sub">{BRAND.hero.line}</p>
              <div className="hm-hero-actions">
                <Link
                  className="hm-hero-action hm-hero-action--primary"
                  to={BRAND.hero.primaryCta.href}
                >
                  {BRAND.hero.primaryCta.label}
                </Link>
                <Link className="hm-hero-action" to={BRAND.hero.secondaryCta.href}>
                  {BRAND.hero.secondaryCta.label}
                </Link>
              </div>
              <p className="hm-hero-foot">{BRAND.hero.footnote}</p>
            </div>

            <HeroTiles />
          </div>
        </div>
      </section>
```

The comment line stands for the existing `<header className="hm-header-top">…</header>` block; paste it back unchanged.

- [ ] **Step 4: Rewrite the hero CSS**

In `homeCss`, replace the `.home-root` rule and everything down to (not including) `.hm-nav-text` with:

```css
.home-root {
  --hm-text-main: #26231f;
  --hm-text-muted: rgba(38, 35, 31, 0.68);
  --hm-ease-fluid: cubic-bezier(0.25, 1, 0.5, 1);
  --hm-font-serif: Georgia, 'Times New Roman', serif;
  --hm-font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  position: relative;
  background-color: var(--color-soft);
  color: var(--hm-text-main);
  font-family: var(--hm-font-sans);
  -webkit-font-smoothing: antialiased;
  isolation: isolate;
}

.hm-ui-layer {
  position: relative;
  z-index: 10;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: clamp(36px, 6vw, 84px);
  padding: 2rem 5rem clamp(48px, 7vw, 96px);
}
```

Replace the `.hm-header-top` rule's background and border so the glass reads on the light background (keep `backdrop-filter`):

```css
.hm-header-top {
  backdrop-filter: blur(24px) saturate(1.25);
  -webkit-backdrop-filter: blur(24px) saturate(1.25);
  background:
    linear-gradient(135deg, rgba(255,255,255,0.6), transparent 48%),
    rgba(255, 255, 255, 0.34);
  border: 1px solid rgba(38, 35, 31, 0.14);
  border-radius: 24px;
  box-shadow:
    0 18px 46px rgba(38, 35, 31, 0.08),
    inset 0 1px 0 rgba(255,255,255,0.7);
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 14px 18px;
}
```

Replace the block from `.hm-hero-text` through `.hm-hero-action--primary:hover` with:

```css
.hm-hero-body {
  align-items: center;
  display: grid;
  gap: clamp(32px, 5vw, 80px);
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
}

.hm-hero-text {
  max-width: 34rem;
}

.hm-prompt-main {
  font-family: var(--hm-font-serif);
  font-size: clamp(2.6rem, 5.2vw, 4.6rem);
  line-height: 1.02;
  font-weight: 400;
  letter-spacing: -0.025em;
  margin: 0 0 1.2rem;
  color: var(--hm-text-main);
  text-wrap: balance;
}

.hm-prompt-sub {
  font-family: var(--hm-font-serif);
  font-size: clamp(1.05rem, 1.5vw, 1.35rem);
  line-height: 1.5;
  color: var(--hm-text-muted);
  margin: 0;
  max-width: 30ch;
}

.hm-hero-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: clamp(24px, 3vw, 36px);
}

.hm-hero-action {
  align-items: center;
  backdrop-filter: blur(18px) saturate(1.25);
  -webkit-backdrop-filter: blur(18px) saturate(1.25);
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(38, 35, 31, 0.28);
  border-radius: 999px;
  color: var(--hm-text-main);
  display: inline-flex;
  font-size: 0.72rem;
  font-weight: 600;
  justify-content: center;
  letter-spacing: 0.16em;
  min-height: 46px;
  min-width: 150px;
  padding: 0 20px;
  text-decoration: none;
  text-transform: uppercase;
  transition: background 240ms ease, border-color 240ms ease, color 240ms ease;
}

.hm-hero-action:hover {
  background: rgba(255, 255, 255, 0.78);
  border-color: rgba(38, 35, 31, 0.5);
}

.hm-hero-action--primary {
  background: #26231f;
  border-color: #26231f;
  color: #f6f1e8;
}

.hm-hero-action--primary:hover {
  background: #000;
  border-color: #000;
  color: #fff;
}

.hm-hero-foot {
  color: var(--hm-text-muted);
  font-family: var(--hm-font-sans);
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  margin: clamp(20px, 3vw, 32px) 0 0;
  text-transform: uppercase;
}

/* ── The curiosity grid ── four columns, the Hokusai and the book nook
   each two wide, so the eye reads a cabinet of very different things. */
.hm-tiles {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  list-style: none;
  margin: 0;
  padding: 0;
}

.hm-tile {
  min-width: 0;
}

.hm-tile a {
  aspect-ratio: 4 / 5;
  background: #ded7cb;
  border-radius: 6px;
  display: block;
  overflow: hidden;
  position: relative;
}

.hm-tile:nth-child(2) a,
.hm-tile:nth-child(6) a {
  aspect-ratio: 8 / 5;
}

.hm-tile:nth-child(2),
.hm-tile:nth-child(6) {
  grid-column: span 2;
}

.hm-tile img {
  display: block;
  height: 100%;
  object-fit: cover;
  transition: transform 900ms var(--hm-ease-fluid);
  width: 100%;
}

.hm-tile a:hover img,
.hm-tile a:focus-visible img {
  transform: scale(1.03);
}

.hm-tile a:focus-visible {
  outline: 2px solid #26231f;
  outline-offset: 3px;
}

.hm-tile-tag {
  background: rgba(251, 250, 246, 0.94);
  border-radius: 3px;
  bottom: 10px;
  color: #26231f;
  font-family: var(--hm-font-serif);
  font-size: 0.86rem;
  font-style: italic;
  left: 10px;
  line-height: 1;
  padding: 6px 9px;
  position: absolute;
}
```

Delete the rules listed in Context. In the `@media (max-width: 768px) {` block, after the header rules, add:

```css
  .hm-ui-layer {
    gap: 28px;
    padding: 1rem 1.25rem 2.4rem;
  }

  .hm-hero-body {
    gap: 26px;
    grid-template-columns: minmax(0, 1fr);
  }

  .hm-prompt-main {
    font-size: clamp(2.2rem, 10.5vw, 2.8rem);
  }

  .hm-hero-actions {
    gap: 10px;
  }

  .hm-hero-action {
    flex: 1 1 140px;
    min-height: 44px;
    min-width: 0;
  }

  /* Phones show the first four tiles, square, two across. */
  .hm-tiles {
    gap: 10px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hm-tile:nth-child(2),
  .hm-tile:nth-child(6) {
    grid-column: auto;
  }

  .hm-tile a,
  .hm-tile:nth-child(2) a,
  .hm-tile:nth-child(6) a {
    aspect-ratio: 1 / 1;
  }

  .hm-tile:nth-child(n + 5) {
    display: none;
  }
```

Delete the whole `@media (max-width: 768px) and (max-height: 680px) {…}` block if nothing but removed selectors remains in it; if `.hm-brand` sizing is there, keep only that rule.

Replace the hero part of the `prefers-reduced-motion` block with:

```css
@media (prefers-reduced-motion: reduce) {
  .hm-tile img {
    transition: none;
  }
}
```

- [ ] **Step 5: Run the hero tests and typecheck**

Run: `node --test scripts/mobileLanding.node-test.mjs scripts/liquidGlass.node-test.mjs && npm run typecheck`
Expected: both test files PASS; typecheck clean. Unused imports (`useRef`, `useNavigate`) are lint errors: run `npm run lint` and remove what it flags.

- [ ] **Step 6: Commit**

```bash
git add app/components/HeroTiles.tsx app/routes/_index.tsx scripts/mobileLanding.node-test.mjs
git commit -m "Replace the interior hero with the curiosity grid and the owner line

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Homepage order, removed sections and loader diet

**Files:**
- Modify: `app/routes/_index.tsx` (JSX order, loader, GraphQL query, CSS)

Target order inside `<div className="commerce-home">` after the hero:

1. `home-trust-band` (unchanged)
2. `<OriginalArtPreview products={leadPrintProducts} compact />` (moved up from near the bottom)
3. `<ArtistShopsFeature …/>` (unchanged)
4. `<YourSkyTeaser />` (moved up)
5. `<ClothingFeature picks={clothingPicks} />`
6. `<BookNookShelf …/>`
7. `{caseTeaser ? <ToughCaseTeaser {...caseTeaser} /> : null}`
8. Pastel Forms section (unchanged markup)
9. `<BrandFilm …/>` then `<HomepageEditorial />` then `{frameProduct ? <FramedArtFeature …/> : null}` (the framed feature stays where it is relative to the editorial; it renders only while the classic frame is released)
10. Story band (new copy), then the journal teaser (unchanged)

Removed: the `home-shop-accelerator` section ("Start with an original piece"), the `collection-intro home-commerce-intro` section, the `featured-collections` carousel, the `featured-grid-section` / `home-empty-catalog` pair ("More from the edit").

- [ ] **Step 1: Reorder and prune the JSX**

Make the JSX match the target order. Replace the story band's copy:

```tsx
      <section className="story-section home-story-return" data-chapter="ink">
        <div className="story-image" aria-hidden />
        <div className="story-copy" data-reveal>
          <p className="eyebrow">{BRAND.storyBand.eyebrow}</p>
          <h2>{BRAND.storyBand.title}</h2>
          <p>{BRAND.storyBand.body}</p>
          <Link className="text-link" to="/our-story">
            {BRAND.storyBand.cta}
          </Link>
        </div>
      </section>
```

- [ ] **Step 2: Slim the loader and the query**

In `HOMEPAGE_QUERY` (around line 880), remove the `products(first: $first, sortKey: BEST_SELLING, query: $productsQuery)` field and the `collections(...)` field, and their variables `$first` and `$productsQuery`. Rename the `originalArtProducts: products(first: $artFirst, query: $artQuery)` field to `leadPrints: products(first: $artFirst, query: $artQuery)` (keep its selection set).

In the loader:
- Variables: drop `first` and `productsQuery`; set `artFirst: LEAD_PRINTS_QUERY_FIRST` and `artQuery: leadPrintsQuery()`.
- Return `leadPrintProducts: buildOriginalArtProductMap((data.leadPrints?.nodes ?? []) as ClaraCardProduct[], LEAD_PRINT_HANDLES)` instead of `originalArtProducts`.
- Drop `collections`, `featuredPrints`, `products` from both the success and the catch return. In the catch, `leadPrintProducts: {} as OriginalArtProductMap`.
- Delete `FEATURED_PRINT_HANDLES`, `pickFeaturedPrints`, `MUSEUM_CLAUSE`, `EDIT_QUERY`, the `HomeCollection` type, and in the component: `quickShopProducts`, `featuredProducts`, `categoryItems`, `hasLiveCollections`, `collectionTrackRef`, `scrollCollectionCarousel` and any `useEffect` left over for them.
- Imports to remove once unused: `buildOriginalArtQuery`, `ORIGINAL_ART_QUERY_FIRST`, `ORIGINAL_ART_COLLECTIONS`, `pickVariedProducts`, `withDeliveryReach`, `museumTagClause`, `studioSearchQuery`, `listShopCapsules`/`shopCapsulePath` (keep if `MUSEUM_COLLECTIONS` still uses them; it does), `filterDemoCollections`, `capitalize`/`countWord`/`CATALOG` constants if no longer used in this file. Add imports: `LEAD_PRINT_HANDLES, LEAD_PRINTS_QUERY_FIRST, leadPrintsQuery` from `~/lib/leadPrints`.

Let `npm run lint` and `npm run typecheck` drive the final list; do not leave unused symbols.

- [ ] **Step 3: Prune the CSS**

Delete from `homeCss`: `.home-commerce-intro`, every `.home-shop-accelerator*` rule (desktop and the 768px block, including the scrollbar rules), every `.featured-collections*`, `.featured-collection-*` rule (desktop, 768px and the 480px block; delete the 480px block if empty), `.featured-grid-section`, `.home-empty-catalog`.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint && node --test scripts/mobileLanding.node-test.mjs scripts/liquidGlass.node-test.mjs scripts/mobileShopping.node-test.mjs`
Expected: all clean. `grep -n "original" app/routes/_index.tsx` should list nothing but identifiers such as `OriginalArtPreview`/`OriginalArtProductMap`.

- [ ] **Step 5: Commit**

```bash
git add app/routes/_index.tsx
git commit -m "Reorder the homepage around the mix and drop the repeated sections

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Shop All — rotated Featured order, real count, new words

**Files:**
- Modify: `app/routes/collections.all.tsx`
- Modify: `app/lib/museumListingOrder.ts` (remove unused paging)
- Modify: `scripts/museumListingOrder.node-test.mjs` (remove tests of removed paging)

Context: `loadFeaturedListing` (around line 900) currently pages the studio set with Storefront cursors and loads the museum set fully (`loadMuseum`, 20 pages × 100). `CollectionViewData` (around line 120) is shared with `collections.$handle.tsx` and `collections.clothing.tsx`. The count renders at `<p className="cv-count">` inside `<Pagination>`. The heading's first word is italicised by `splitTitle`.

- [ ] **Step 1: Add `totalCount` to the view data**

In the `CollectionViewData` type add:

```ts
  /** Size of the whole listing when it is known (the in-memory Featured order). */
  totalCount?: number;
```

Replace the count paragraph:

```tsx
            <p className="cv-count">
              {typeof data.totalCount === 'number'
                ? `Showing ${nodes.length} of ${data.totalCount} ${
                    data.totalCount === 1 ? 'product' : 'products'
                  }`
                : `${nodes.length}${hasNextPage ? '+' : ''} ${
                    nodes.length === 1 && !hasNextPage ? 'product' : 'products'
                  }`}
            </p>
```

- [ ] **Step 2: Rewrite `loadFeaturedListing`**

Replace the function with:

```ts
/**
 * The default listing, in memory: the studio's own products rotated by
 * product line (app/lib/listingLines.ts), then museum products in
 * listing order (app/lib/museumListingOrder.ts), paged by index
 * (app/lib/listingPage.ts). Both sets are small enough to hold (a few
 * hundred cards); a page is one slice, and the count is exact.
 */
async function loadFeaturedListing({
  museumClause,
  paginationVariables,
  request,
  searchQuery,
  storefront,
}: {
  museumClause: string;
  paginationVariables: ListingPaginationVariables;
  request: Request;
  searchQuery: string | null;
  storefront: ListingStorefront;
}) {
  const sortInput = getProductsSortInput('featured');
  const loadAll = async (query: string) => {
    const products: ClaraCardProduct[] = [];
    let after: string | null = null;
    // A safety cap: 20 pages of 100 is far beyond any release.
    for (let page = 0; page < 20; page += 1) {
      const result: ShopListingProductsQuery = await storefront.query(
        SHOP_LISTING_PRODUCTS_QUERY,
        {variables: {...sortInput, endCursor: after, first: 100, query}},
      );
      ensurePaginatedData(request, result);
      products.push(...(result.products.nodes as ClaraCardProduct[]));
      if (!result.products.pageInfo.hasNextPage) break;
      after = result.products.pageInfo.endCursor ?? null;
    }
    return filterDemoProducts(products);
  };

  const [links, studio, museum] = await Promise.all([
    storefront.query(SHOP_COLLECTION_LINKS_QUERY),
    loadAll(studioSearchQuery(searchQuery, museumClause)),
    loadAll(museumSearchQuery(searchQuery, museumClause)),
  ]);
  const items = [...rotateByLine(studio), ...sortMuseumProducts(museum)];

  let products: ListingConnection<ClaraCardProduct>;
  try {
    products = pageByIndex(paginationVariables, items);
  } catch (error) {
    if (!(error instanceof ListingCursorError)) throw error;
    // A cursor this listing did not issue: start from the first page.
    const url = new URL(request.url);
    url.searchParams.delete('cursor');
    url.searchParams.delete('direction');
    throw redirect(`${url.pathname}${url.search}`);
  }
  return {collections: links.collections, products, totalCount: items.length};
}
```

Adjust imports: add `rotateByLine` from `~/lib/listingLines`, `pageByIndex` from `~/lib/listingPage`, keep `ListingConnection`, `ListingCursorError`, `ListingPaginationVariables`, `museumSearchQuery`, `sortMuseumProducts`, `studioSearchQuery`, `featuredMuseumClause` from `~/lib/museumListingOrder`; remove `studioThenMuseumPage`, `studioPageVariables`, `studioConnection` from that import. `SHOP_LISTING_PRODUCTS_QUERY` must still accept `$endCursor, $first, $query, $reverse, $sortKey`; if its variables list also has `$last`/`$startCursor`, leave them.

In the loader, where `data` is built, pass the total through:

```ts
    totalCount: 'totalCount' in data ? data.totalCount : undefined,
```

(add this line to the returned object; `data` from the plain `ALL_COLLECTION_QUERY` path has no `totalCount`).

- [ ] **Step 3: New words on Shop All**

- In `meta`: `title: isCapsule ? \`${heading} Capsule\` : BRAND.shopAll.heading` and the fallback description `BRAND.shopAll.description`.
- In the loader's `description` chain replace the three plain strings:
  - `'Shop Clara Mendes art and museum prints, canvas, …'` → `BRAND.shopAll.description`
  - `'Shop original Clara Mendes art prints, from quiet geometry…'` → `BRAND.shopAll.printsOnlyDescription`
  - `'Shop 15 original Clara Mendes art prints across five…'` → `BRAND.shopAll.printsOnlyDescription`
- `heading: capsule ? capsule.title : isBookNooks ? 'Book Nooks' : BRAND.shopAll.heading`
- The hero eyebrow `'Original art & considered products'` → `BRAND.shopAll.eyebrow`.
- Add `import {BRAND} from '~/content/brand';`.

Check `splitTitle("Everything we've made so far")` renders *Everything* in italics and the rest upright; if `splitTitle` splits on the first space, that is the intended look.

- [ ] **Step 4: Remove the unused studio-cursor paging**

In `app/lib/museumListingOrder.ts`, delete everything from the `// --- paging --` comment onward **except** `ListingPageInfo`, `ListingConnection`, `ListingPaginationVariables` and `ListingCursorError` (move those four above the deleted region). Delete `StudioPageRequest`, `ListingSources`, `StorefrontPageVariables`, `studioPageVariables`, `studioConnection`, `studioCursor`, `museumCursor`, `parseListingCursor`, `studioThenMuseumPage` and the private helpers `wrap`, `pageFromStudio`, `pageAfterMuseum`, `pageBeforeMuseum`.

In `scripts/museumListingOrder.node-test.mjs`, remove the imports of the deleted functions and delete these tests, which only exercised them: "All products: studio first, then museum by type, no duplicates or gaps", "a deep page loaded directly pages both ways without repeats", "the Floating World filter opens with its ten prints", "a studio-only search lists exactly as before", "the end of the studio set is read in reverse, as the API requires", "cursors this listing did not issue are rejected". Also delete any fixture helpers only they used (look for a fake `storefront`/`sources` builder above them). Keep the ranking, tag-clause, sort and artist-shop tests.

Run: `grep -rn "studioThenMuseumPage\|studioPageVariables\|studioConnection\|parseListingCursor\|museumCursor\|studioCursor" app scripts` — expected: no output.

- [ ] **Step 5: Verify**

Run: `node --test scripts/museumListingOrder.node-test.mjs scripts/listingPage.node-test.mjs scripts/googleCommerce.node-test.mjs scripts/mobileShopping.node-test.mjs && npm run typecheck && npm run lint`
Expected: all PASS, no errors.

- [ ] **Step 6: Commit**

```bash
git add app/routes/collections.all.tsx app/lib/museumListingOrder.ts scripts/museumListingOrder.node-test.mjs
git commit -m "Rotate the shop's Featured order through the product lines and count exactly

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Our Story copy

**Files:**
- Modify: `app/routes/our-story.tsx`

- [ ] **Step 1: Replace the copy**

Add `import {BRAND} from '~/content/brand';`.

- `PAGE_DESCRIPTION`: `const PAGE_DESCRIPTION = BRAND.ourStory.description;` (the `WORKS`/`CAPSULES` constants stay; the capsules section still uses them).
- The `RANGE` phone-case entry's `note` → `BRAND.ourStory.caseNote`.
- The hero:

```tsx
            <h1 id="os-title" className="os-story-title">
              {BRAND.ourStory.title}
            </h1>
            <div className="os-story-body">
              {BRAND.ourStory.intro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
```

- The capsules lede paragraph (`os-section-lede` under "The capsules") → `{BRAND.ourStory.capsulesLede}`.
- The closing section's `<h2>Live with something original.</h2>` → `<h2>{BRAND.ourStory.closing}</h2>`.

The `.os-story-title` styles may italicise an `<i>`; the new title has none, which is fine.

- [ ] **Step 2: Verify**

Run: `grep -n -i "original" app/routes/our-story.tsx && npm run typecheck && node --test scripts/liquidGlass.node-test.mjs`
Expected: grep prints nothing (or only an identifier), typecheck clean, test PASS.

- [ ] **Step 3: Commit**

```bash
git add app/routes/our-story.tsx
git commit -m "Tell the story as it is: we like art, and it got interesting

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: The remaining claims, and the guard that keeps them out

**Files:**
- Modify: `app/components/ClaraShell.tsx:212-216`, `app/content/homeEditorial.ts:6-7`, `app/lib/seo.ts:72-73`, `app/lib/webManifest.ts:22-23`, `app/lib/capsulePages.ts:37`, `app/lib/capsules.ts:113,115`, `app/lib/productCopy.ts:25-33`, `app/routes/blogs.$blogHandle._index.tsx:23-24`, `app/routes/collections.$handle.tsx:130,320,433`, `public/llms.txt:3,12`
- Test: `scripts/brand.node-test.mjs` (add the guard)

- [ ] **Step 1: Add the copy guard to `scripts/brand.node-test.mjs`**

Append:

```js
import {readdirSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !/\.d\.ts$/.test(name) ? [full] : [];
  });
}

const BANNED = [
  /original art\b/i,
  /original works?\b/i,
  /original piece/i,
  /something original/i,
  /original clara mendes/i,
  /objects with soul/i,
];

test('no page claims "original art" as the brand again', () => {
  const offenders = [];
  for (const file of sourceFiles(path.join(ROOT, 'app'))) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      // Comments may describe history; shoppers never read them.
      if (/^(\/\/|\*|\/\*)/.test(trimmed)) return;
      if (BANNED.some((pattern) => pattern.test(line)))
        offenders.push(`${path.relative(ROOT, file)}:${index + 1}: ${trimmed}`);
    });
  }
  assert.deepEqual(offenders, []);
});
```

Move the new `import` lines to the top of the file with the others (ESM imports must be top-level).

Run: `node --test scripts/brand.node-test.mjs`
Expected: FAIL, listing roughly fifteen offending lines across the files above.

- [ ] **Step 2: Fix each offender**

Add `import {BRAND} from '~/content/brand';` where a route or component needs it; `app/lib/*` files import relatively: `import {BRAND} from '../content/brand.ts';`.

- `app/components/ClaraShell.tsx`, footer paragraph:
  ```tsx
        <p>
          {BRAND.footer.blurb} We ship across the EU and to most other
          countries; each product page shows how its item is delivered.
        </p>
  ```
- `app/content/homeEditorial.ts`: `footer: BRAND.livingEdit.footer,` and `title: BRAND.livingEdit.title,` (import from `./brand.ts`; keep `as const` working — if TypeScript complains about the readonly tuple, type `footer` as `readonly string[]` where `HomepageEditorial` consumes it).
- `app/lib/seo.ts`: `export const DEFAULT_META_DESCRIPTION = BRAND.seo.defaultDescription;`
- `app/lib/webManifest.ts`: `description: BRAND.seo.manifestDescription,`
- `app/lib/capsulePages.ts:37`: "The capsule holds three original works, giclée-printed" → "The capsule holds three works of our own, giclée-printed".
- `app/lib/capsules.ts:113`: `${count} original Clara Mendes ${prints}` → `${count} Clara Mendes ${prints} of our own`; line 115: "Three coordinated original Clara Mendes prints." → "Three coordinated Clara Mendes prints of our own."
- `app/lib/productCopy.ts`: "all-over print of the original artwork" is fine (the word means the source image). Lines starting "Original Clara Mendes artwork …" → "Clara Mendes artwork …" (three lines: snap case, greeting card, postcard).
- `app/routes/blogs.$blogHandle._index.tsx`: `const KARINA_DESCRIPTION = BRAND.seo.journalDescription;`
- `app/routes/collections.$handle.tsx:130` and `:320`: → `BRAND.shopAll.collectionFallback`; `:433` eyebrow → `Our own prints — a capsule of three`.
- `public/llms.txt`: line 3 "Twenty-four original Clara Mendes works across" → "We like art and follow it wherever it goes. Twenty-four works of our own across"; line 12 "The capsule prints are original Clara Mendes compositions; no licensed" → "The capsule prints are our own compositions; no licensed". (Not scanned by the guard; keep it consistent by hand.)

Any offender the guard lists that is not in this list: rewrite it in the same voice (our own work / borrowed from museums), never by adding an allowlist.

- [ ] **Step 3: Verify**

Run: `node --test scripts/brand.node-test.mjs && npm run typecheck && npm run lint`
Expected: guard PASS with an empty offender list; typecheck and lint clean.

- [ ] **Step 4: Commit**

```bash
git add -A app public/llms.txt scripts/brand.node-test.mjs
git commit -m "Retire 'original art' as the umbrella claim everywhere, and guard it

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Full checks, dev-server sweep, pull request

**Files:** none new.

- [ ] **Step 1: Full test suite and build**

Run: `npm test` then `npm run build`
Expected: every test file passes; build completes. Fix anything red before going on (likely candidates: a test that read a removed homepage string, or a type widened by `totalCount`).

- [ ] **Step 2: Dev-server sweep (done by the coordinator in the browser pane)**

Start the dev server with `preview_start` (see `.claude/launch.json`; the entry runs from the `clara-mendes` checkout, so point it at this worktree or add an entry for it). Check, with screenshots at 1440 wide and at the mobile preset:

1. `/`: headline and line visible immediately on load (no fade); six tiles on desktop, four on mobile; the section order of Task 6; no console errors; `.hm-prompt-main` computed opacity is `1` at first paint (`javascript_tool`).
2. `/collections/all`: first screen alternates print, case, garment, nook, pot, card, star map; the count reads "Showing 24 of N"; "Load more" reaches the museum works and never repeats a product; `?sort=price-asc` (or whatever `getCollectionSortValue` accepts) still works; `?cursor=m.3&direction=next` redirects to page one.
3. `/our-story`: new title, two intro paragraphs, closing line.
4. Footer blurb on any page; `view-source:` meta description of `/` and `/our-story`.

- [ ] **Step 3: Open the pull request**

```bash
git push -u origin claude/brand-line
gh pr create --title "Brand line: we don't know what we'll make next" --body "$(cat <<'EOF'
## Summary
- The brand stops claiming "original art" everywhere and says what it is: *We don't know what we'll make next. We like art, and we promise it won't be boring.*
- Homepage: curiosity-grid hero (six tagged products, headline visible on first paint, cursor gimmicks and interior backdrop removed); sections trimmed from 16 to 11 and reordered so our own work, borrowed work and objects alternate; Your Sky moved up.
- Shop All "Featured": the studio set rotates by product line (print, case, garment, nook, pot, card, star map), then museum works; the count is exact.
- All brand copy lives in `app/content/brand.ts`; a node test fails if the old claims come back.
- Spec: `docs/superpowers/specs/2026-10-22-brand-line-design.md`

## Test plan
- `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`
- Dev-server sweep with desktop and mobile screenshots: `/`, `/collections/all` (first page, load more, bad cursor), `/our-story`
- After merge: live check of the same pages with screenshots

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

The owner merges (auto-merge is not enabled on this repo by the assistant). After merge, the live check with screenshots is owed.

---

## Self-review

**Spec coverage.** Copy table → Tasks 1, 4 (collection section), 5 (hero), 6 (story band, living edit via Task 9), 7 (Shop All), 8 (Our Story), 9 (footer, SEO, manifest, journal, capsule pages, collection fallback). Homepage order and removals → Task 6. Hero tiles, config in `brand.ts`, first-frame headline, eager first tile, removed backdrop and orb → Tasks 1 and 5. Shop All rotation by line, in-memory paging with the 20×100 cap, exact count, explicit sorts untouched → Tasks 2, 3, 7. Tests: rotation (Task 2), copy guard (Task 9), existing tests updated (Tasks 5, 7), typecheck/lint/build and the sweep (Task 10). Out-of-scope items are not touched.

**Placeholders.** None: every code step shows the code; the one "keep verbatim" comment refers to an existing block the engineer copies back, not to work left undone.

**Type consistency.** `BRAND` keys used later (`hero.headline/line/primaryCta/secondaryCta/footnote`, `collection.*`, `livingEdit.*`, `storyBand.*`, `ourStory.*`, `shopAll.*`, `footer.blurb`, `seo.*`) all exist in Task 1. `LEAD_PRINTS`, `LEAD_PRINT_HANDLES`, `LEAD_PRINTS_QUERY_FIRST`, `leadPrintsQuery` (Task 4) match their uses in Task 6. `rotateByLine` (Task 2) and `pageByIndex`/`indexCursor` (Task 3) match Task 7. `buildOriginalArtProductMap(products, expected)` (Task 4) matches Task 6's call. `totalCount` is optional on `CollectionViewData`, so the other collection routes compile unchanged.
