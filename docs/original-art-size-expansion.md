# Original Art Size Expansion

Status: **all three sizes live** (20 × 24 activated 2026-08-10).

The fifteen active original-art products offer an unframed 8 × 10 inch print at
€29.99, a 16 × 20 inch print at €39.99 (`ART-FAP-EMA-16X20`), and a 20 × 24
inch print at €49.99 (`GLOBAL-FAP-20X24`), all on Prodigi enhanced matte art
paper. The first two sizes are 4:5. The 20 × 24 size is 5:6 and uses a centred
full-bleed crop that removes about 2% from the top and bottom instead of adding
white side margins. All 15 `CM-...-20X24` mappings were verified individually in
Prodigi before activation: 6000 × 7200 file, Excellent print quality, exact-fit
full bleed with 0 cm border, automatic fulfilment, Standard shipping. Prodigi
markets `GLOBAL-FAP-20X24` as 50x60cm / 20x24"; its dashboard recommends
5906 × 7087 px (300 DPI for the metric 50 × 60 cm print area), which the
6000 × 7200 files exceed at the same 5:6 ratio.

The Hydrogen product route renders Shopify's `Size` values. Its flat artwork is
always visible, while room mockups and the true-scale sofa diagram follow the
selected 8 × 10, 16 × 20, or 20 × 24 variant.

## Production Files

Run:

```powershell
python .\scripts\prepare-original-art-size-assets.py
```

The default command produces one ignored 4800 × 6000 pixel, 300-DPI JPEG per artwork
under `output/product-art/print-16x20-300dpi/` and writes a hash manifest beside
them. The manifest records the approximately 1120 × 1400 source dimensions.
The larger files are high-quality resizes; the larger pixel dimensions do not
create additional native artwork detail.

For 20 × 24 run:

```powershell
python .\scripts\prepare-original-art-size-assets.py --size=20x24
```

This produces 6000 × 7200 pixel, 300-DPI JPEGs under
`output/product-art/print-20x24-300dpi/`. Its manifest records the exact centred
crop box, output hashes, and deterministic `CM-...-20X24` Shopify SKUs.

Prodigi's dashboard lists 4800 × 6000 as the recommended dimensions for
`ART-FAP-EMA-16X20`. Prodigi's authenticated product selector confirms that
this account SKU ships from NL and supports Budget and Standard delivery to
Cyprus. All fifteen variants of both expansion sizes are mapped and verified in
the Prodigi sales channel.

## Safe Shopify And Prodigi Release

First run the read-only live audit:

```powershell
node .\scripts\sync-original-art-size-variants.mjs
```

The production catalog audit
(`node .\scripts\audit-original-art-catalog.mjs`) requires exactly the three
approved size variants and seven READY images per product. Missing 16 × 20 or
20 × 24 variants, or a missing size-specific mockup pair, fails the audit
instead of accepting a partial pre-release state. The 20 × 24 workflow also
requires its prerequisite 16 × 20 variant to remain ACTIVE, not merely staged.

Audit or mutate the 20 × 24 transition only with `--size=20x24`:

```powershell
node .\scripts\sync-original-art-size-variants.mjs --size=20x24
node .\scripts\sync-original-art-size-variants.mjs --size=20x24 --stage
node .\scripts\sync-original-art-size-variants.mjs --size=20x24 --activate --prodigi-confirmed=GLOBAL-FAP-20X24
node .\scripts\sync-original-art-size-variants.mjs --size=20x24 --pause
```

Staging creates the €49.99 variants with tracked zero inventory and `DENY`, so
they cannot be bought while Prodigi mapping is incomplete. Activation is
rejected unless the exact connected-account SKU is explicitly confirmed.

Stage all fifteen variants using the fixed approved prices:

```powershell
node .\scripts\sync-original-art-size-variants.mjs --stage
```

Staging creates deterministic `CM-...-16X20` SKUs at €39.99 with tracked zero
inventory and an inventory policy of `DENY`. They cannot be purchased while
the Prodigi configuration is incomplete. In the same guarded transition it
changes only the existing 8 × 10 price from €29.00 to €29.99; the existing SKU,
inventory behavior, product status, and publication are preserved. A read-back
must show all larger variants unavailable at zero inventory before staging is
considered complete.

For every staged SKU in the Prodigi sales channel:

1. Enable automatic fulfillment.
2. Select `ART-FAP-EMA-16X20`.
3. Upload the matching `*-16x20-300dpi.jpg` file.
4. Confirm the editor uses full bleed with no unexpected crop.
5. Confirm image quality is **Excellent**.
6. Keep the approved **Standard** shipping preference.

Only after all fifteen mappings pass, activate the variants:

```powershell
node .\scripts\sync-original-art-size-variants.mjs --activate --prodigi-confirmed=ART-FAP-EMA-16X20
```

Activation makes the mapped variants sellable and replaces the fixed-size
description line with truthful two-size copy. It does not change product status,
publication, existing 8 × 10 SKUs, or existing 8 × 10 Prodigi mappings.

If the larger variants must be stopped while preserving their configuration:

```powershell
node .\scripts\sync-original-art-size-variants.mjs --pause
```

The pause command turns inventory tracking back on at zero quantity, making all
16 × 20 variants unavailable while leaving the 8 × 10 products sellable.

Prices are constants in `scripts/lib/original-art-size-plan.mjs`; the workflow
rejects `--price` overrides so a run cannot silently depart from €29.99 and
€39.99.

## Room Mockups

The two existing 8 × 10 mockup filenames and alt texts remain unchanged. Two
new 16 × 20 scenes use explicit `-16x20` filename suffixes and size-specific
alt text. The context scene doubles the existing 8 × 10 print width from
`0.192` to `0.384` against the same lamp, preserving true relative scale.

Generate only the 30 new larger mockups:

```powershell
npm run catalog:art:mockups:large
```

`npm run catalog:art:mockups:bigger` generates only the 30 new 20 × 24 scenes.
Running `npm run catalog:art:mockups` generates all 90 mockups. Future media
append runs plan six mockups per product, for seven images including the flat
artwork.
