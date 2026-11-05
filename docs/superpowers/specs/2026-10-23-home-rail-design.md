# Short homepage: hero, line rail, priced tiles, collection, letters

Approved by the owner on 2026-10-23 from a desktop + mobile mockup. The homepage keeps the full-screen landing and loses everything that does not lead to a purchase within the first scroll.

## Decisions

- **Short page.** Hero → line rail → six priced curiosity tiles → trust strip → "The collection so far" → Letters from Nicosia → site footer. The artist-shops band, Your Sky teaser, clothing feature, book-nook shelf, tough-case teaser, pastel-pot teaser, brand film, living edit, framed-art feature and story band leave the homepage. Each line keeps its own page; the rail and the tiles lead there.
- **The film is no longer embedded anywhere** on the storefront. It stays on the CDN and in `video/`.
- **Rail directly under the hero**, on an oat band, as in the mockup.
- **Header after the hero.** The homepage hides the global glass header behind the hero's own pill. Once the pill scrolls out of view the global `header.site-header` returns (fade-down, 320 ms, none under reduced motion) and hides again when the pill comes back. Without JavaScript the page behaves as before.
- **Price chips on the tiles.** Each curiosity tile shows the lowest purchasable price of one named product ("From €26.99", "€39.99") in the buyer's market currency. The tile may link somewhere wider (an artist shop, the clothing page); the chip prices the thing in the picture.
- Not chosen: a dashed "Next?" circle to the sign-up, a returning-visitor rail.

## Line rail

`app/lib/lineRail.ts` holds the entries; `app/components/LineRail.tsx` renders them. A line appears only when released, with the same gates as the navigation (`publicArtists`, `releasedBookNooks`, `PRODUCT_RELEASE_FLAGS`, `PERSONALISED_RELEASE_FLAGS`).

| Label | Link | Picture |
|---|---|---|
| Prints | `/collections/all?type=Art+Prints` | Quiet Form I |
| Artists | `/artists` | The Great Wave |
| Clothing | `/clothing` | the studio tank in Moss |
| Book Nooks | `/book-nooks` | Twilight Library |
| Cases | `/products/art-tough-phone-case` | the Midnight Garden II case |
| Your Sky | `/your-sky` | a framed star map |
| Pots | `/pastel-forms` | Butter Sun |

Desktop: one centred row, circles of 96–120 px, a 2 px clay ring with a white gap, sentence-case label below. Phone: a horizontal snap-scrolling row of 88 px circles with the fourth cut at the edge. The link's name is the label; the picture is decorative.

## Price chips

`app/content/brand.ts` gives each tile a `priceHandle`. `app/lib/homeTilePrices.ts` fetches the six products in one `@inContext` query and turns them into labels with the card rules (`deriveCardPricing`, `formatCardPriceLabel`): only variants on sale count, a product with nothing on sale gets no chip, and a product that fails the store's visibility gate gets no chip. The chip sits top-right on the tile; the italic tag keeps bottom-left.

| Tile | Priced product |
|---|---|
| Quiet Form I | `quiet-form-i-art-print` |
| The Great Wave | `the-great-wave-off-kanagawa-art-print` |
| Phone case | `art-tough-phone-case` |
| Tank top | `quiet-current-studio-tank` |
| Pot | `butter-sun-pastel-plant-pot` |
| Book nook | `twilight-library-diy-book-nook-kit` |

## Loader

Two Storefront queries in parallel, each allowed to fail on its own: the lead prints (unchanged) and the tile prices. The clothing fetch, the book-nook, frame and tough-case queries leave the loader with their bands.

## Tests

- `scripts/lineRail.node-test.mjs`: entry data, gating, the rail's scroll and motion rules.
- `scripts/homeTilePrices.node-test.mjs`: query shape, label rules, currency follows the data.
- `scripts/brand.node-test.mjs`: every `priceHandle` is sellable and unique; the case tile prices the case.
- `scripts/homeRail.node-test.mjs`: section order, header rules, chip CSS, cursor gate, and a guard that the removed bands and their files stay gone.
- `scripts/mobileLanding.node-test.mjs` and `scripts/liquidGlass.node-test.mjs` keep pinning the hero.

## Out of scope

The nine-link hero navigation still wraps at 1440 px. Pots do not ship to the US but the chip shows the EUR price; the product page says so. Rail images reuse the tile images rather than purpose-cut circles.
