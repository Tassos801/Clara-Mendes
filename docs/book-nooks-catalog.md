# Book nook catalogue

Prepared 2026-10-03. How book nooks are presented on the storefront, and the
steps for adding the next kit. Supplier, delivery-profile, VAT and first-order
checks for each kit follow the [CJ book nook launch](book-nooks-launch.md).

## Where nooks appear

| Surface                                    | Source                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| Homepage "Night Shelf" (after _Ready now_) | `app/components/BookNookShelf.tsx` — cut-outs between titled book spines    |
| `/book-nooks` landing page                 | `app/routes/book-nooks.tsx`, `app/styles/book-nooks.css`                    |
| Product page                               | `app/routes/products.$handle.tsx` — name, theme, spec grid, related nooks   |
| Shop grid, search, cart, recommendations   | `withCuratedImages` / `curatedDisplayTitle` in `app/lib/curatedProducts.ts` |
| Navigation, footer, sitemap                | `releasedBookNooks()` in `app/lib/bookNooks.ts`                             |

Everything reads `data/curated-products.json`. A nook appears only when its
entry passes the release gate in `releasedCuratedProducts()` **and** Shopify
returns the product to the storefront channel. Order in the file is shelf
order and the catalogue number ("No. 01"). The `?type=Book+Nooks` shop filter
still works; navigation links to `/book-nooks`.

## Themes

Defined in `BOOK_NOOK_THEMES` (`app/lib/bookNooks.ts`). A theme is shown only
once a released nook uses it, so themes can be added before their kits.

| Slug        | Title               | For                                                 |
| ----------- | ------------------- | --------------------------------------------------- |
| `libraries` | Libraries & Studies | Reading rooms, studies, archives (Twilight Library) |
| `streets`   | Streets & Shops     | Alleys, bookshops, cafés, corner stores             |
| `magic`     | Magic & Myth        | Apothecaries, wizard towers, enchanted forests      |
| `gardens`   | Gardens & Seasons   | Greenhouses, blossom lanes, snowy evenings          |
| `night`     | Night & Mystery     | Detective offices, observatories, starlit rooftops  |

`/book-nooks?theme=<slug>` filters the page; theme views canonicalise to
`/book-nooks`.

## Branded images

Supplier photographs carry infographic text, dimension lines and saturated
colour. `npm run curated:images` (`scripts/prepare-curated-product-images.mjs`)
turns them into one consistent set per kit:

- 1000 × 1250 (4:5) WebP in `public/images/curated/<handle>/`
- supplier text, dimension lines and inset panels cropped or masked away
- one shared grade: orange cast pulled toward the brand neutrals, saturation
  0.86, slightly lifted shadows, soft vignette on photographs, fixed-seed grain
- linen (`#f4f0e8`) backdrop for studio and detail layouts
- a transparent 600 × 750 `cutout.webp` for the homepage shelf, derived from
  the studio image (white ground flood-filled from outside the outline, edge
  eroded and feathered)

These are cropped and graded manufacturer photographs, not new photography or
a sample. Nothing is added to the object itself.

| Layout   | Recipe                         | Use                                               |
| -------- | ------------------------------ | ------------------------------------------------- |
| `studio` | `outline: [[x, y], …]`         | Object shot on white → on linen. **Image 1.**     |
| `photo`  | `crop: [x, y, w, h]`           | Clean lifestyle shot. Image 2 is the lamplit one. |
| `extend` | `crop` of a narrow clean strip | Front shots with infographic panels beside them   |
| `grid`   | `tiles: [[x, y, w, h], …]`     | 2-column detail grid from a supplier collage      |

Image 1 (studio) is the card image; image 2 shows on hover ("lights on") and
is the `/book-nooks` hero. Coordinates are in source-image pixels.

The storefront serves this set; **Shopify product media is unchanged.**
Checkout, order emails, CJ and Google Merchant still use the supplier photos
until the branded files are uploaded to the product in Shopify Admin.

## Adding a book nook

1. Import, price and verify the kit in Shopify and CJ as in the
   [launch record](book-nooks-launch.md): product type `Book Nooks`, vendor
   `Clara Mendes`, the two storefront publications, a verified delivery
   profile and test carts per destination. The CJ steps that are easy to miss
   (channels, Cyprus lane, one listing per CJ product) are in
   [listing a kit through CJ](book-nooks-launch.md#listing-a-kit-through-cj).
2. Fetch the supplier photos (Storefront API, read-only):
   `npm run curated:images -- --fetch --handle <handle>`
   → `assets/curated-products/<handle>/supplier-N.jpg`
3. Write coordinate grids for choosing crops:
   `npm run curated:images -- --grid --handle <handle>`
   → `output/curated-images/<handle>/grid-*.png` (ignored by git)
4. Add the entry to `data/curated-products.json`, with `released: false`.
   Copy the Twilight Library entry and change every field:
   - `name`, `theme`, `tagline` — the display name, a slug from the table
     above and one line of lede
   - `description` (SEO and structured data) and `details` (short notes the
     spec grid does not cover)
   - `specs` — `sizeCm: [w, d, h]` and `lighting` are required; `pieces`,
     `buildHours: [min, max]` and `minAge` only when the manufacturer
     publishes them. State only what the listing can stand behind (battery
     type and inclusion were not confirmed for Twilight Library, so nothing
     is claimed). Without pieces or build time, cards show the finished size.
   - `processing`, `shipping`, `verifiedDeliveryCountries` from the verified
     lane
   - `cutout` and `images` with recipes: studio first, lamplit photo second.
     A studio recipe may give a `crop` rectangle instead of an `outline` when
     the kit stands alone on clean white; a grid tile may be
     `{source, crop}` to take a detail from another supplier photo.
5. Generate and inspect: `npm run curated:images -- --handle <handle>`, then
   look at every file. No supplier text, lines or panels may remain.
6. After fulfilment and delivery are verified, set `released: true` and run
   `npm test`. `scripts/bookNooks.node-test.mjs` requires a name, known theme,
   tagline, processing estimate, size, lighting, a studio-first image set at
   1000 × 1250 and a transparent cut-out for every released nook.
7. Check `/book-nooks`, the homepage shelf and the product page at desktop and
   phone widths.

`npm run curated:images -- --check` confirms every declared file exists at
the right size.

## Shopify follow-ups

- Upload the branded set to the Shopify product media (Admin) so checkout,
  emails and feeds match the storefront.
- CJ imports leave supplier variant options (`Style`, `Color`,
  `Please Input: English`). The storefront hides them on cart lines; checkout
  still shows them. Twilight Library's now reads
  `Style: Twilight Library` (was `Glimmer Book Pavilion`; variant id
  unchanged). Rename the others in Shopify Admin the same way, then confirm
  the CJ mapping (by variant and SKU) still reads back.
- Shopify descriptions for the nine 2026-10-04 kits are the plain text typed
  in CJ's list form. The storefront uses the registry copy; tidy the Admin
  text before feeds or emails rely on it.
