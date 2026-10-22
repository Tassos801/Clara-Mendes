# Brand line: "We don't know what we'll make next" design

Approved by the owner on 2026-10-22. It covers item 1 of the 2026-10-22 site review: the brand claims "original art" everywhere, yet the shop also sells museum reproductions, clothing, plant pots, phone cases and book nooks. The owner's line embraces that range: *We don't know what we'll make next. We like art, and we promise it won't be boring.*

## Decisions

- Scope: words, order and a louder look. The look is direction A, "cabinet of curiosities": the warm palette and serif stay, and the surprise comes from the mix of products, not from loud styling.
- "Original" is no longer the umbrella word. Product families get honest labels: **our own work** (the capsules), **borrowed from museums** (Hokusai, Hiroshige, Kandinsky, Mondrian), and plain names for everything else.
- All brand copy comes from one module, `app/content/brand.ts`. Pages read from it rather than holding their own strings.

## Copy

| Where | New |
|---|---|
| Home hero H1 | We don't know what we'll make next. |
| Home hero line | We like art, and we promise it won't be boring. |
| Home hero buttons | See what we made (`/collections/all`) · Our story (`/our-story`) |
| Home hero footnote | Prints · phone cases · clothing · plant pots · book nooks · whatever's next |
| Collection section | **The collection so far.** Our own work: {works} pieces in {capsules} capsules, printed to order. (Counts come from `CATALOG`, as they do now.) |
| Living edit | Title: Art, made to live with. Footer tags: Our own prints · Tactile materials · Everyday living |
| Story band | **It started with fifteen prints. Then it got interesting.** Now there's clothing, ceramics, phone cases and book nooks. Next? We honestly don't know. |
| Our Story H1 / intro | **We like art. That's the plan.** Clara Mendes started with fifteen prints of our own. Then we put art on phone cases, clothing and plant pots, and borrowed a few masterpieces from museums. We don't know what comes next. We promise it won't be boring. |
| Our Story close | Come back soon. It'll be different. |
| Shop All heading / title | Everything we've made so far |
| Footer blurb | We like art and follow it wherever it goes: our own prints, works borrowed from museums, and things you use every day. (The existing shipping sentence is kept.) |
| Home SEO title | Art Prints, Clothing and Curious Objects \| Clara Mendes |
| Home and default SEO description | We like art and follow it wherever it goes: our own prints, museum masterpieces, phone cases, clothing, plant pots and book nooks. Never boring. |
| Collection fallback description | A Clara Mendes collection: art on things worth living with. |
| Capsule pages | "three original works" → "three works of our own" |
| Journal description | notes on art, colour, and whatever we're making next |
| Web manifest description | Our own prints, museum masterpieces, clothing, phone cases, plant pots and book nooks. |

Unchanged: capsule names and mood lines, the trust strip, product specs, and "print of the original artwork" on phone-case and clothing pages (there "original" means the source image, not a brand claim).

## Homepage

The new order, with our own work, borrowed work and objects alternating:

1. Hero: the curiosity grid (new)
2. Trust strip
3. The collection so far: the `OriginalArtPreview` card style, showing one lead print from each of the 7 capsules (currently 5 founding prints). This one section replaces "Five moods", the capsule carousel and the collection intro.
4. Artist shops
5. Your Sky teaser (moved up)
6. Clothing
7. Book nooks
8. Phone-case teaser
9. Pastel Forms
10. Film, then the living edit
11. Story band and journal

Removed: the "Start with an original piece" accelerator, the "More from the edit" grid, the capsule carousel and the collection intro.

### Curiosity hero

- **Tiles.** 6 tiles on desktop and 4 on mobile, below the headline. Each tile has an image, a short italic tag on a white chip, and a link:

  | Tile | Tag | Links to |
  |---|---|---|
  | Quiet Form I | our own print | its product page |
  | The Great Wave | a borrowed Hokusai | the Hokusai artist shop |
  | Midnight Garden II case | a phone case | the case product page |
  | Studio Tank | a tank top? | `/clothing` |
  | Butter Sun | yes, a pot | `/pastel-forms` |
  | A book nook | a tiny world for your shelf | `/book-nooks` |

  Mobile shows the first four.
- **Config.** The tiles live in `brand.ts` as static data (image URL, width, height, alt, tag, href), so the hero adds no extra storefront query.
- **Load and motion.** The headline and line are visible on the first frame: no opacity-0 start and no delayed fade. The tiles may fade in, but text never waits on them. The first tile loads eagerly with high fetch priority.
- **Removed.** The yellow-chair background photo, and the cursor orb with its press-and-hold navigation.

## Shop All "Featured"

- **Own products.** These are rotated by product line in a fixed order: art prints, phone cases, clothing, book nooks, plant pots, cards, Your Sky, then any other line. A line can cover several Shopify product types; for example, clothing includes Studio Top, Sports Bra, Biker Shorts and Yoga Leggings. Within each line, the current Shopify order is kept. To do this, the loader fetches all own products into memory, as it already does for museum products, with the same 20 × 100 safety cap. It then pages the result in memory.
- **Museum works.** These follow the own products, in their current order.
- **Count.** The count shows the real total ("Showing 24 of N") when the total is known. Explicit sorts and filtered views keep today's behaviour.

## Tests and verification

- Unit test for the line-rotation order: a stable order within each line, and unknown lines placed last.
- A copy guard test scans `app/`. It fails on "Original art", "original work", "original piece", "something original" or "Objects with soul", except in a short allowlist of product-spec lines.
- Existing tests are updated for the new copy and section order. Typecheck, lint and build pass.
- Dev-server sweep with desktop (1440) and mobile (375) screenshots of the homepage, Our Story and Shop All. After merge, the same pages are checked live, with screenshots.

## Out of scope

A maker or person on Our Story, email capture, book-nook prices (€62.10), navigation consistency, the 404 page header, and the image order on product pages.
