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
