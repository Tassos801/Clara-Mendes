# Art for Everyday Living

Updated: 2026-07-24

## Collection Shape

The Clara Mendes original-art range now has a Draft product architecture for
every Prodigi family selected for expansion. Each product page uses the five
art capsules as the primary variant option, keeping the storefront compact
while still offering Quiet Form, Patina Blue, Neo Deco, Midnight Garden, and
Sunlit Mosaic.

The phone-case product adds a second device option for four verified iPhone 15
models. The 2026 calendar combines all five capsules into one edition.

| Product                                 | Shopify variants | Provisional retail | Prodigi mapping target              | Mapping evidence               |
| --------------------------------------- | ---------------: | -----------------: | ----------------------------------- | ------------------------------ |
| Large Fine Art Print — 16 × 20 in       |                5 |                $49 | GLOBAL-FAP-16X20                    | Candidate; verify in dashboard |
| Classic Framed Art Print — 16 × 20 in   |                5 |                $99 | GLOBAL-CFP-16X20                    | Candidate; verify in dashboard |
| Fine Art Greeting Card                  |                5 |                 $8 | GLOBAL-GRE-MOH-7X5-BLA              | Public catalogue               |
| Fine Art Postcard                       |                5 |                 $6 | GLOBAL-POST-MOH-7X5                 | Public catalogue               |
| Art-Cover Spiral Notebook               |                5 |                $24 | US-NB-LINED-6X8                     | Public catalogue               |
| Art-Cover Gratitude Journal             |                5 |                $32 | GJ-A5-SB-S-C-P                      | Public catalogue               |
| Clara Mendes Art Calendar 2026          |                1 |                $29 | CALENDAR-A4-L-DATED                 | Public catalogue               |
| Stretched Canvas Art — 16 × 20 in       |                5 |                $89 | GLOBAL-CAN-16X20                    | Public catalogue               |
| Art Canvas Tote                         |                5 |                $45 | H-BAG-CTB                           | Public catalogue               |
| Art Linen Cushion — 24 × 24 in          |                5 |                $69 | GLOBAL-CUSH-24X24-LIN               | Public catalogue               |
| Art Premium Fleece Blanket — 30 × 40 in |                5 |                $79 | GLOBAL-BLANKET-PREMIUM-FLEECE-30X40 | Public catalogue               |
| Art Snap Phone Case                     |               20 |                $34 | Device-specific GLOBAL-TECH SKUs    | Public catalogue               |

Total: 12 Draft products and 71 variants.

On 2026-07-24, the guarded sync created all 12 products in Shopify as
`DRAFT`. The live readback passed for 12/12 products, all 71 variants, expected
prices and inventory flags, and READY product images. None were published.

## Artwork Policy

The production files preserve the original Clara Mendes artwork. Product
adaptations use deterministic resizing, cropping, mirroring, framing, and
layout only. No artwork is repainted or replaced during format adaptation.

The original source files are approximately 1120 × 1400 pixels. Larger
wall-art files are exported to the dimensions requested by Prodigi, but this
does not prove physical sharpness. The large print, framed print, and canvas
must pass a physical sample review before publication.

Generated files are stored under the ignored
`output/prodigi-product-files/` directory. The generated manifest records each
file's dimensions, DPI metadata, and SHA-256 digest. Storefront preview images
are tracked under `public/images/art-product-extensions/`.

## Reproduction

```powershell
python .\scripts\prepare-art-product-extensions.py
python .\scripts\validate-art-product-files.py
node .\scripts\sync-art-product-extensions.mjs
```

The sync command is a dry run by default. After the preview images are
deployed and publicly reachable:

```powershell
node .\scripts\sync-art-product-extensions.mjs --apply
node .\scripts\audit-art-product-extensions.mjs
```

Both scripts require the existing Shopify Admin credential file. The sync
script creates or updates products as `DRAFT`; it does not publish them.

## Release Gates

Every family remains blocked from publication until:

1. The exact Shopify variant is mapped to the correct Prodigi SKU.
2. Prodigi crop, bleed, safe area, print side, and device template are checked.
3. Delivered cost is quoted for the priority US and Cyprus destinations.
4. Retail price and shipping method meet an approved margin.
5. Prodigi billing is configured and the indefinite order pause is
   re-verified.
6. At least one physical sample per material family passes colour, sharpness,
   trimming, construction, packaging, and tracking review.

The existing 8 × 10 art prints stay separate and unchanged. Their current
Prodigi mappings are not modified by this extension.
