# Clothing page watercolor

Created 8 October 2026 for this clothing-page implementation using the built-in image-generation tool. It is decorative digital artwork, not a photograph or a garment print file.

- `olive-mineral-master.png`: unmodified generated 1536 × 1024 RGBA master.
- `../../public/images/clothing/olive-mineral.webp`: optimized web export, preserving alpha.

Prompt direction: an airy olive branch with sparse translucent clay, oat and moss mineral washes; pigment variation and natural brush edges; Mediterranean warmth and contemporary editorial restraint; no lettering, logo, people or garments. Generated independently of supplier product media. No external stock assets were used.

Export: Sharp WebP quality 85, alpha quality 100, no enlargement. The same illustration is reused selectively to keep a coherent identity and one cached download across the homepage and clothing page.

All garment images are queried from Shopify's current product/variant media. The product cards never substitute generated artwork for real product mockups.

## Fern and mineral strata art (Quiet Current "B · Mineral Wash")

Built 8 October 2026 from the layers of the Quiet Current "B · Mineral Wash" garments. This is our own artwork, made for this project. The same layers are printed on the garments. The art is decorative. It is not a garment print file and not a product photo.

Files:

- `fern-moss-master.png` and `fern-clay-master.png`: one fern sprig, 811 × 1868 px, RGBA.
- `mineral-strata-moss-master.png` and `mineral-strata-clay-master.png`: soft overlapping ridges, 3600 × 1200 px (3:1), RGBA.
- `../../public/images/clothing/fern-moss.webp` and `fern-clay.webp`: web exports, 391 × 900 px.
- `../../public/images/clothing/mineral-strata-moss.webp` and `mineral-strata-clay.webp`: web exports, 1600 × 533 px.

All files have a transparent background. The alpha comes from the layer masks. The pigment variation of the masks is kept. Nothing is thresholded.

Source layers (in `B-mineral-wash/masters/layers/`):

- Fern: `308-left-leg-fern.png`. The mask runs from 0 to 77 of 255. It is cropped to the fern with 6% padding. The alpha is scaled so the densest stroke reaches 0.85. The cut stem end is faded out.
- Strata: `121-body-veil.png`, `121-body-stratum-1.png`, `121-body-stratum-2.png`, `121-body-stratum-3.png`. The 121 body panel loops (its left and right edges are the same side seam), so the ridges are a window on the loop. Each wash has its own offset, stretch and flip, so the ridges do not line up. The edges are faded to transparent.

Colours (read from the SVG masters, `moss-*.svg` and `clay-*.svg`):

| Colourway | Fern (`308-left-leg.svg`) | Garment ground | Wash colour used on the garment |
| --- | --- | --- | --- |
| Moss | `#595E53` | Moss `#6F7769` | Mist `#DFE4DC` (veil, stratum 1, stratum 2), Warm ivory `#FBFAF6` (stratum 3) |
| Clay | `#79584A` | Clay `#9C6F5D` | Oat `#F4F0E8` (veil, stratum 1, stratum 2), Warm ivory `#FBFAF6` (stratum 3) |

On the garments the washes are light and sit on a dark ground. On a light page the light washes are hard to see. So the page art uses the wash colour for the veil and stratum 1, and the ground colour (Moss or Clay) for a thin glaze on stratum 1 and for strata 2 and 3. Mask value times gain gives the opacity: veil ×1.5, stratum 1 wash ×1.8, stratum 1 ground ×0.2, stratum 2 ground ×0.38, stratum 3 ground ×0.52. Warm ivory is not used, because it cannot be seen on an ivory page.

Build (no network, same output every run):

```
node scripts/build-clothing-page-art.mjs --source "C:\Users\admin\Desktop\Clara-Mendes-Movement-Review-2026-10-07\v2\artwork\B-mineral-wash\masters"
```

Masters are written as RGBA PNG (ferns at most 2400 px on the long edge, strata at most 3600 px wide). Web exports are Sharp WebP, quality 72, alpha quality 72 (ferns at most 900 px on the long edge, strata at most 1600 px wide). Nothing is enlarged.

## Quiet Current looks (hero crop)

- `../../public/images/clothing/quiet-current-looks.webp`: 1360 × 1000 px, WebP quality 84.
- Cropped (x 1200–2560, full height) from `public/images/quiet-current/collection-hero.jpg`, the `/collections/quiet-current` hero made in PR #117. That image places the actual Printful flat-front mockups (Moss studio bra and leggings, Clay studio tank and leggings) on a Mineral Wash backdrop.
- The garments are supplier digital mockups, not photographs. The clothing page labels the image "Digital mockups".

## Smaller olive for the clothing page

- `../../public/images/clothing/olive-mineral-720.webp`: 720 × 480 px, WebP quality 80, made from `olive-mineral-master.png` (78 KB instead of 288 KB). Used as the hero accent on `/clothing`; the homepage keeps the full-size file.

