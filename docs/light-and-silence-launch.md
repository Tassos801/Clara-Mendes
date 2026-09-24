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

Released 2026-09-23 in all three sizes. The five products were staged as
Shopify Drafts on 2026-09-22; their ids were recorded on 2026-09-23. Prodigi
channel products 6133660 (Veil of Stone), 6133661 (Tidal Mirror), 6133662
(Winter Script), 6133672 (Fern in Shadow) and 6133674 (Where Mist Rests) map
every size to the listed provider SKU with the matching print file, **Excellent**
quality, full bleed, Standard shipping and automatic fulfilment, each read
back after a reload. `media --apply` verified five READY images per product;
`release --apply` untracked inventory, removed the pending tags, activated the
products, confirmed all 15 variants on the Storefront API after they were
published to Clara Mendes and Clara Mendes Headless in Admin, and wrote
`releasedSizes`. Live `verify` runs after the PR is merged and deployed.
## 2026-09-24 expansion — four Draft prints

Four new original, AI-generated monochrome nature studies extend the five-print
Light & Silence capsule. Their source prompts and hashes are recorded in
[`data/print-catalog.json`](../data/print-catalog.json); the 1122×1402 PNG sources
are in `scripts/assets/print-sources/light-and-silence/`.

| Print | Subject | Artwork |
| --- | --- | --- |
| Wind in Sand | Wind-shaped dune and fine sand ripples | [Preview](../public/images/product-art/light-and-silence/wind-in-sand.webp) |
| Shell at Low Tide | Weathered shell and soft reflection | [Preview](../public/images/product-art/light-and-silence/shell-at-low-tide.webp) |
| River in Motion | Flowing stream between dark stones | [Preview](../public/images/product-art/light-and-silence/river-in-motion.webp) |
| Cloud at Rest | One luminous cloud over open grassland | [Preview](../public/images/product-art/light-and-silence/cloud-at-rest.webp) |

`product prepare` exported 8×10, 16×20 and 20×24 RGB JPEGs for each new
print. Native detail is 140.2, 70.1 and 56.1 PPI respectively; the 20×24
export crops 4% of the 4:5 source. The 300-DPI export metadata does not
increase native detail. The owner approval of the first five prints does not
cover these four; acceptance of softness and the 20×24 crop is pending.

All four are Shopify **Drafts** with tracked zero inventory and no publication.
Each has the flat artwork first and four ordered, READY room images. Product
titles, copy, SEO, sizes and prices match the existing capsule. The 12 exact
variant-to-artwork mappings remain unverified in Prodigi. The full handoff
(including all nine prints) and print files are in the configured
`output/launches/light-and-silence/` folder. `product release` correctly refuses
to activate the Drafts until every new size has a verified mapping. Physical
print quality remains unverified until a proof or first order.

After owner acceptance, verify each of the 12 Prodigi rows with the matching
file and provider SKU, Excellent quality, full bleed, Standard shipping and
"Fulfilled by Prodigi automatically" after reload. Record channel product IDs
with `product mapped`, run `product release --apply`, merge/deploy the
released catalog and assets, then verify all 12 product-size cart combinations
on production.
