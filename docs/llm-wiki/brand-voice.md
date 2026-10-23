# Brand Voice

Snapshot: 2026-10-22 (branch `claude/brand-line`). Design:
[brand line spec](../superpowers/specs/2026-10-22-brand-line-design.md).

## The line

*We don't know what we'll make next. We like art, and we promise it won't be
boring.* It replaced "original art" as the umbrella claim, because the shop
also sells museum reproductions, clothing, plant pots, phone cases and book
nooks. The homepage hero shows it word for word (`BRAND.hero.headline`,
`BRAND.hero.line`).

## Where copy lives

All brand sentences are in `app/content/brand.ts` (`BRAND`: hero, collection,
Our Story, Shop All, footer, SEO and manifest descriptions). Pages import them instead of holding their own strings, so a
wording change is one edit. The module uses relative imports only, so plain
Node tests can load it.

Labels:

- **our own work** / "our own prints": the studio capsules.
- **borrowed from museums** / "museum masterpieces": the artist-shop
  reproductions (Hokusai, Hiroshige, Kandinsky, Mondrian).
- Everything else is called what it is (phone case, tank top, pot, book nook).
- "Original" stays only where it means the source image, for example "print
  of the original artwork" on case and clothing pages.

## Copy guard

`scripts/brand.node-test.mjs` fails when any `.ts`/`.tsx` line under `app/`
(comment lines excepted) says "original art", "original work(s)", "original
piece", "something original", "original Clara Mendes" or "objects with soul".
It also pins the hero line and links and the 155-character limit on the home,
default and Our Story descriptions.

## Homepage order

Since 2026-10-23 the homepage is hero → line rail → trust strip → Letters from
Nicosia, then the site footer. The curiosity tiles (with their price chips) and
"The collection so far" left with every other band; each line keeps its own
page, and the rail leads there. Design:
[home rail spec](../superpowers/specs/2026-10-23-home-rail-design.md).

## Line rail

`app/lib/lineRail.ts` lists the product lines as circles under the hero
(Prints, Artists, Clothing, Book Nooks, Cases, Your Sky, Pots), each with a
link and a decorative picture; `app/components/LineRail.tsx` renders them, one
centred row on desktop and a snap-scrolling row on phones. A line shows only
when released, with the navigation's gates (`publicArtists`,
`releasedBookNooks`, `PRODUCT_RELEASE_FLAGS`, `PERSONALISED_RELEASE_FLAGS`).
Tests: `scripts/lineRail.node-test.mjs`.

## The collection so far

`app/lib/leadPrints.ts` lists the first work of every capsule of our own: the
founding capsules (`sequence === 1` in `data/original-art-catalog.json`), then
the first released print of each released studio collection in
`data/print-catalog.json`, plus `leadPrintsQuery()` (capsule tags AND
`product_type:"Art Prints"`, `LEAD_PRINTS_QUERY_FIRST` = 60) and
`LEAD_PRINT_HANDLES` for `buildOriginalArtProductMap`
(`app/lib/originalArt.ts`). `app/components/OriginalArtPreview.tsx` renders
the lead prints when compact and the fifteen founding prints otherwise. Since
the homepage cut (2026-10-23) no route renders the compact block or runs that
query; Shop All shows the full block, with the `BRAND.collection` copy, as its
empty-listing fallback. Tests: `scripts/leadPrints.node-test.mjs`.

## Shop All "Featured" order

With the default Featured sort, `loadFeaturedListing` in
`app/routes/collections.all.tsx` loads all studio and all museum products into
memory (20 × 100 cap each), then lists:

1. Studio products rotated by product line (`app/lib/listingLines.ts`):
   `LINE_ORDER` = prints, cases, clothing, nooks, pots, cards, sky, other; one
   of each line per round, Shopify order kept within a line.
   `productLine` maps product types to lines (garment types to clothing,
   personalised types to sky).
2. Museum products in `sortMuseumProducts` order
   (`app/lib/museumListingOrder.ts`).

`pageByIndex` (`app/lib/listingPage.ts`) pages that array with `i.<index>`
cursors in the shape Hydrogen's `Pagination` expects; an unknown or stale
cursor throws `ListingCursorError`, and the route redirects to page one. The
count is exact (`totalCount` = list length). Explicit sorts keep Shopify's
order. Tests: `scripts/listingLines.node-test.mjs`,
`scripts/listingPage.node-test.mjs`.

Related: [Routes and pages](modules/routes-and-pages.md),
[Catalog and products](modules/catalog-and-products.md).
