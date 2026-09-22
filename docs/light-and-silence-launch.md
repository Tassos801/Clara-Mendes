# Light & Silence print launch

Five original, AI-generated monochrome nature compositions prepared for the
existing print pipeline. They are photo-inspired artwork, not photographs by
Minor White or any other named photographer. The product copy says how the
images were made.

| Print | Image brief | Artwork |
| --- | --- | --- |
| Veil of Stone | Grazing sunlight across limestone folds | [Preview](../public/images/product-art/light-and-silence/veil-of-stone.webp) |
| Tidal Mirror | One curling ripple across a tidal pool | [Preview](../public/images/product-art/light-and-silence/tidal-mirror.webp) |
| Winter Script | Bare branches in a misty woodland | [Preview](../public/images/product-art/light-and-silence/winter-script.webp) |
| Fern in Shadow | One side-lit fern against dark forest | [Preview](../public/images/product-art/light-and-silence/fern-in-shadow.webp) |
| Where Mist Rests | Fog between layered mountain ridges | [Preview](../public/images/product-art/light-and-silence/where-mist-rests.webp) |

The five original PNGs are saved in
`scripts/assets/print-sources/light-and-silence/`. They were generated with the
built-in image generator on 2026-09-22, one prompt per print. Each prompt asked
for a unique 4:5 black-and-white nature image with a silver-gelatin-inspired
tonal range and no existing photograph, photographer attribution, text, frame,
or watermark. The five subject briefs above distinguish the prompts. Four
blank interior backgrounds were generated for the room scenes, then the
`product rooms` step composited each exact artwork into all four settings.

## Prepared sizes and quality gate

The owner approved the store's existing unframed size and price schedule:
8×10 (€29.99), 16×20 (€39.99), and 20×24 (€49.99). `product prepare` exported
five WebP storefront images and 15 RGB JPEG print files with 300-DPI metadata
to the local launch folder. The generated source pixels are 1122×1402:

| Size | Export pixels | Native detail | Crop |
| --- | --- | --- | --- |
| 8×10 | 2400×3000 | 140.2 PPI | 0% |
| 16×20 | 4800×6000 | 70.1 PPI | 0% |
| 20×24 | 6000×7200 | 56.1 PPI | 4% |

The print JPEGs are enlarged exports; the 300-DPI metadata does not add native
detail. After reviewing the previews, the owner approved the source softness
and 20×24 crop for all three sizes on 2026-09-22. This satisfies the owner
acceptance gate in the [add-products runbook](add-products-runbook.md).
Physical print quality remains unverified until a proof or first order.

## Current launch state

The catalog entries have `released: false`. All five web images, four room
images per print, and the room hash manifest are prepared. `npm run product --
status light-and-silence` reports the next step. Shopify staging requires a
valid Admin session or `SHOPIFY_ADMIN_ACCESS_TOKEN`; Prodigi mapping is done in
its dashboard for each of the 15 size variants. After mapping, run `media`,
`release`, and live `verify` per the runbook. Until release, the collection is
absent from customer-facing shop filters and product listings.
