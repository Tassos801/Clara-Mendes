# Homepage below the hero — gallery walk: design

Date: 2026-09-24 · Status: approved by owner in conversation (scope
"Restructure", approach A "Gallery walk", design approved with the film
on a dark background) · Branch: `fable/home-after-objects`

## 1. Goal and decisions

Owner ask: "make our landing page, after Objects with soul, more
attractive". The hero stays as it is. Everything below it is restructured.

Problems on the live page (2026-09-24, 1440 px):

1. The capsule carousel is text only: about 900 px of capsule names with
   no artwork, on an art shop.
2. One message four times: "Start with an original piece" / "Original
   work, ready to live with" / "Original art, made to live with" /
   "Original art first, room to grow".
3. Capsules appear twice (text carousel, then "Five moods"), and "Five
   moods" is stale: five capsules, while the shop has seven (Sci-fi &
   Cinema, Light & Silence came from the print pipeline).
4. "Considered editions" uses a stock room photo (`story-shelf.jpg`) with
   no Clara Mendes art in it.
5. Flat rhythm: about nine cream sections in a row; only Your Sky breaks it.

| Decision | Choice |
| --- | --- |
| Scope | Restructure: keep every destination, reorder, merge, cut |
| Approach | A, gallery walk: film and Ready now stay where the owner put them (PR #71) |
| Film | Same player, now on a full-bleed dark ink band |
| Capsules | One image-led capsule index replaces the intro, the text carousel and "Five moods" |
| Closing | "From the studio": Our story card (own art in a room) + existing journal card |

## 2. Page order

| # | Section | Change |
| --- | --- | --- |
| 0 | Hero "Objects with soul" | unchanged |
| 1 | Trust band | one slim line, same three claims, dot separated |
| 2 | The film | full-bleed ink band, chapter `ink`, frame capped at 1240 px |
| 3 | Ready now | unchanged |
| 4 | Capsule index | new (§3) |
| 5 | Your Sky teaser | unchanged |
| 6 | Living edit | title "Made for the rooms you live in." |
| 7 | Framed art (conditional), More from the edit | content unchanged |
| 8 | From the studio | new (§4); replaces "Considered editions" and the standalone journal section |

Rhythm: dark (hero, film) → light (Ready now, capsules) → night (Your Sky)
→ light (rooms, edit) → studio close → dark footer.

Removed from the homepage: the "The collection" intro, the text carousel
and its scroll handler, `<OriginalArtPreview compact>` (the component
stays; `/collections/all` uses it), the `story-section` block, and the
`collections(first: 12)` subtree of `HOMEPAGE_QUERY` (it only fed the
carousel).

## 3. Capsule index

- Component `app/components/CapsuleIndex.tsx`; pure data in
  `app/lib/capsuleIndex.ts` (plain-Node testable, relative imports).
- Data: `listShopCapsules()`, so every released print-catalog collection
  appears automatically. Tile link: `shopCapsulePath(slug)`.
- Heading: eyebrow "The collection"; h2 "{Seven} moods. *Find yours.*"
  (count word from `countWord`); side line "{Twenty-four} original works,
  in capsules that hang together." with link "Shop all works".
- Tile: artwork `capsule.image` at 4:5, capsule title (serif), note (muted,
  two lines max), "{n} works". Whole tile is one link.
- Room reveal (hover devices only): on first `pointerenter` or `focus` the
  tile's room image `src` is set, and it fades in over the artwork while
  hovered or focused. Nothing downloads on touch or before first hover.
  Room image: launch capsules
  `/images/product-art-mockups/{slug}/{slug}-01-room-detail-20x24.webp`;
  print-catalog collections `/images/product-art-mockups/{slug}/{print}-living-room.jpg`
  where `{print}` is the file stem of `capsule.image`.
- Grid: 4 columns ≥ 1100 px, 3 columns 700–1099 px, 2 columns below.
  Last tile "All works": ink background, "{24} original works", "Shop all
  →", linking `/collections/all`. It spans the leftover columns of the last
  row at each breakpoint (`span = cols - n % cols`, a full row when n is a
  multiple), set as inline custom properties so rows always close.
- Reveal: existing `data-reveal` on heading and grid. Reduced motion: no
  image scale and no crossfade transition.
- Chapter `linen`.

## 4. From the studio

- Section `home-studio`, chapter `ink`, eyebrow "From the studio".
- Two cards, equal height, side by side ≥ 820 px, stacked below.
- Our story card: image
  `/images/product-art-mockups/light-and-silence/where-mist-rests-wide-interior.jpg`
  (cover, focal centre), copy over a bottom scrim: eyebrow "Our story",
  title "Printed to order, one piece at a time.", CTA "Read our story" →
  `/our-story`.
- Journal card: the existing Karina of Time teaser markup and styles,
  moved into the second slot (dusk gradient, drifting cloud, unchanged
  copy).

## 5. Copy

| Where | Before | After |
| --- | --- | --- |
| Capsule index h2 | "Original work, ready to live with." / "Five moods. One considered collection." | "Seven moods. Find yours." |
| Living edit title | "Original art, made to live with." | "Made for the rooms you live in." |
| Closing | "Original art first, room to grow." | "Printed to order, one piece at a time." |

Ready now ("Start with an original piece.") and More from the edit keep
their copy.

## 6. Definition of done and testing

1. Live order matches §2 on desktop and mobile; no horizontal page scroll
   at 390 px and 320 px.
2. Seven capsule tiles with artwork; All works tile closes the last row at
   4, 3 and 2 columns; hover or focus shows the room on desktop; no room
   image request on first load.
3. Film plays from the dark band; caption and eyebrow readable on ink.
4. No stock photo and no "Original art first" block on the homepage.
5. Node tests: every capsule's artwork and room image exist on disk;
   span maths for n = 7, 8, 9 at 4, 3 and 2 columns; heading count words.
6. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` pass.
7. Screenshots of the dev server before and after at 1440 × 900 and
   390 × 844, plus reduced motion.
