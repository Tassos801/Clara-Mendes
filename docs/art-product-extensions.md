# Art for Everyday Living

Updated: 2026-08-24

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
| Classic Framed Art Print — 16 × 20 in   |                5 |                €99 | GLOBAL-CFP-16X20                    | Verified live 2026-08-21       |
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

Total: 1 Active product and 11 Draft products, with 71 variants overall.

On 2026-07-24, the guarded sync created all 12 products in Shopify as
`DRAFT`. The live readback passed for 12/12 products, all 71 variants, expected
prices and inventory flags, and READY product images. None were published.

The 2026-07-28 preflight repeated the live 12/12 Draft audit and validated 94
production/review files plus 56 Shopify preview images. This proves local file
integrity and Shopify staging only. The 71 variants are not yet confirmed as
mapped inside the connected Prodigi account.

The 2026-08-10 readback still found all 12 families Draft and unpublished. The
blanket candidate's five Shopify variants were EUR 49 while this manifest
requires EUR 79, so its storefront release flag was returned to `false`.

On 2026-08-21, the Classic Framed Art Print became the first released family.
All five art variants are mapped for automatic Prodigi fulfilment to
`GLOBAL-CFP-16X20` with Natural frames, EMA 200gsm paper, no mat, Perspex
glazing, Excellent image quality, and Standard shipping. The owner approved
the EUR 99 retail price and waived a physical sample for this release. Shopify
status is Active and publication is limited to the `Clara Mendes` and
`Clara Mendes Headless` catalogs. The storefront release flag admits the frame
and the `Art for Everyday Living` collection; all other families stay hidden.

## Artwork Policy

The production files preserve the original Clara Mendes artwork. Product
adaptations use deterministic resizing, cropping, mirroring, framing, and
layout only. No artwork is repainted or replaced during format adaptation.

The original source files are approximately 1120 × 1400 pixels. Larger
wall-art files are exported to the dimensions requested by Prodigi, but this
does not prove physical sharpness. Physical sampling remains the default for
the large print and canvas; the owner explicitly waived it for the released
frame after reviewing the dashboard's Excellent quality result.

Generated files are stored under the ignored
`output/prodigi-product-files/` directory. The generated manifest records each
file's dimensions, DPI metadata, and SHA-256 digest. Storefront preview images
are tracked under `public/images/art-product-extensions/`.

The five Classic Framed Art Print previews are composed from Prodigi's own
Natural [Classic frame blank](https://www.prodigi.com/download/blanks/prodigi-classic-frame-blanks.zip)
and the unchanged live Shopify artwork. The generator enforces the product's
16:20 opening, Prodigi's published 20 mm frame face, and the configured no-mat
finish. It does not redraw the art or invent a different frame profile.

## Reproduction

```powershell
python .\scripts\prepare-art-product-extensions.py
node .\scripts\generate-classic-frame-mockups.mjs
node .\scripts\sync-classic-frame-mockups.mjs
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

The frame-media sync is a separate, released-product-safe path. It stages the
five local files directly to Shopify, waits for READY status, orders them first,
and associates one exact image with each Artwork variant. Removing superseded
Shopify media requires the separate `--delete-old` mode after explicit approval.

## Storefront Staging

The Hydrogen storefront hides every extension family via the allowlist in
`app/lib/catalogFilters.ts`. The phone case additionally has its full
storefront experience pre-built behind `EXTENSION_RELEASE_FLAGS`; its flip
procedure is `docs/phone-case-release.md`.

The released frame is presented as a complete ready-to-hang product, not a
frame-only add-on. `app/lib/classicFrame.ts` maps its five Artwork options only
to artwork I from the matching capsules. The homepage, main navigation, shop
toolbar, and those five exact unframed PDPs link to the corresponding framed
variant. Artwork II and III PDPs deliberately show no framed offer. The framed
PDP links back to the exact unframed print and states all three unframed sizes:
8 × 10, 16 × 20, and 20 × 24 in. The framed edition remains 16 × 20 in only.

Until superseded Admin media have been removed, the storefront also rejects
frame imagery that is not labelled as the Prodigi Natural classic frame with
no mat. Product cards prefer the mapped variant image and the framed PDP
gallery admits only the five supplier-accurate previews.

## Release Gates

Every unreleased family remains blocked from publication until:

1. The exact Shopify variant is mapped to the correct Prodigi SKU.
2. Prodigi crop, bleed, safe area, print side, and device template are checked.
3. Delivered cost is quoted for the priority US and Cyprus destinations.
4. Retail price and shipping method meet an approved margin.
5. Prodigi billing is configured and the indefinite order pause is
   re-verified.
6. At least one physical sample per material family passes colour, sharpness,
   trimming, construction, packaging, and tracking review.

The existing art prints (now sold in three sizes) stay separate and unchanged.
Their current Prodigi mappings are not modified by this extension.
