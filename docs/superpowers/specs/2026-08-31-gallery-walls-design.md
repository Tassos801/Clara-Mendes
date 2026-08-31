# Wall Sets — buy the complete gallery wall

Date: 2026-08-31. Status: designed for immediate build; no owner gate — uses
only the 15 Active prints, creates no Shopify products, and changes no prices.

## Why

The store's fifteen prints compete as single commodity posters. Sold as
curated three-print walls they become a different product: a finished room
decision with a higher order value (three cart lines instead of one) and a
real customer problem solved — "what goes together and how do I hang it".
The capsules already are coherent triptychs; this feature makes that
coherence purchasable in one action instead of three separate decisions.

## What the customer sees

Seven named wall sets, each three prints in one size:

- The five capsule walls — Quiet Form, Patina Blue, Neo Deco, Midnight
  Garden, Sunlit Mosaic — purchasable directly on their existing capsule
  landing pages (`/collections/<capsule-slug>`).
- Two cross-capsule curator mixes on new curated gallery pages (same
  `/collections/` namespace and rendering path as the existing ten):
  - *The Terracotta Thread* — Quiet Form III · Sunlit Mosaic II · Patina
    Blue II (sienna and terracotta warmth stitched by cobalt).
  - *Ink & Cream* — Quiet Form I · Neo Deco II · Midnight Garden II
    (charcoal, ink and oxblood on ivory and cream).

On each of those seven pages a **"Buy the complete wall"** module renders:
the three prints in display order, one size selector (8 × 10 / 16 × 20 /
20 × 24 — one size for the whole wall, as a gallery wall should hang), the
summed price for the chosen size, a single add-to-cart action that adds all
three lines in one submit, and a free downloadable **hanging guide** PDF
for the chosen size.

The existing `wall-art-sets-of-3` gallery page becomes the hub: it gains a
set index linking all seven walls. Each print PDP links to the wall(s) it
hangs in. Discovery copy stays inside existing surfaces — no new nav
namespace.

The hanging guide (`/api/hanging-guide/<slug>-<size>.pdf`, generated on
demand with the already-bundled pdf-lib) is one A4 page: the three frames
drawn to scale with metric outer dimensions (from `PRINT_SIZE_SPECS`), 7 cm
spacing, the 145 cm centre-line rule, and the print titles in display
order. No personalisation, no signing; cacheable.

## Architecture

- `app/lib/wallSets.ts` — the seven set definitions (slug it mounts on,
  display name, one-line story, three print handles in display order) plus
  pure helpers: lookup by page slug, sets-containing-handle, price summing
  over fetched variants, hanging-guide filename codec, and guide geometry
  derived from `PRINT_SIZE_SPECS`. Data and math only; no fetching.
- `app/components/WallSetPurchase.tsx` — the purchase module. Receives the
  three products (with size variants) from the route loader; renders
  selector, summed price, and the existing cart `LinesAdd` flow with three
  merchandise lines. Renders nothing unless every member product is
  purchasable with the released size variants — the released-variants-only
  invariant stays intact.
- `app/routes/collections.$handle.tsx` — in the capsule and gallery
  branches, when the slug matches a wall set, the loader additionally
  queries the set's three products by handle (through the existing
  `catalogFilters` allowlist) and passes them to `WallSetPurchase`.
- Two new entries in `app/lib/galleryPages.ts` for the mix pages, written
  by hand like the existing ten (editorial, related links, capsule cards),
  each targeting its palette keyword.
- `app/routes/api.hanging-guide.$file.tsx` — parses `<slug>-<size>.pdf`,
  validates against the set table, draws the PDF with pdf-lib. Unknown
  slug/size → 404.
- SEO: mix pages get unique titles/descriptions via `app/lib/seo.ts` and
  join the custom sitemap child exactly like other gallery pages; set
  module adds ItemList JSON-LD on its host pages.

## Decisions and rejected alternatives

- **No new route namespace.** An earlier draft proposed `/gallery-walls/*`;
  the store already renders curated editorial pages at
  `/collections/<slug>` and already owns the `wall-art-sets-of-3` keyword
  page. Sets mount there instead of duplicating the pattern.
- **No new Shopify products, no bundle SKU.** A bundled product would need
  its own fulfilment mapping and owner sign-off; three plain lines fulfil
  exactly as today. A set discount, if wanted later, is a Shopify automatic
  discount the owner creates admin-side; storefront copy stays silent about
  discounts until one exists.
- **No release flag.** Pure storefront UX over live products — the same
  class of change as the capsule landing pages, which shipped unflagged.
  Rollback is a revert.
- **One size per wall.** Mixed sizes complicate the picker, the guide, and
  the wall itself; per-print sizing stays available on the PDPs.
- **Frames unmentioned.** The owner retired the complete framed print on
  2026-08-24 and the frame-only replacement is gated on sourcing; set pages
  and the guide reference print sizes only.

## Testing

`scripts/wallSets.node-test.mjs`: every set has exactly three handles, all
handles exist in `data/original-art-catalog.json`, mount slugs are unique
and resolve to a capsule page or gallery page, the two mixes span three
distinct capsules, guide geometry sums (widths + spacing) match the layout
constants, and the guide filename codec round-trips every set × size and
rejects malformed input. Routes are exercised by lint/typecheck/build plus
browser verification with screenshots before merge.
