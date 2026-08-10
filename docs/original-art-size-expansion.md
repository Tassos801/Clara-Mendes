# Original Art Size Expansion

Status: **8 × 10 and 16 × 20 live; 20 × 24 prepared behind the fulfilment gate**.

The fifteen active original-art products currently offer an unframed 8 × 10
inch print at €29.99 and a 16 × 20 inch print at €39.99 on Prodigi enhanced
matte art paper (`ART-FAP-EMA-16X20`). The approved next transition adds an
unframed 20 × 24 inch print at €49.99 (`GLOBAL-FAP-20X24`). The first two sizes
are 4:5. The 20 × 24 size is 5:6 and uses a centred full-bleed crop that removes
about 2% from the top and bottom instead of adding white side margins.

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

Prodigi's dashboard currently lists 4800 × 6000 as the recommended dimensions
for `ART-FAP-EMA-16X20`. Prodigi's authenticated product selector confirms
that this current account SKU ships from NL and supports Budget and Standard
delivery to Cyprus. The fifteen individual product variants still need their
corresponding files mapped and verified.

## Safe Shopify And Prodigi Release

First run the read-only live audit:

```powershell
node .\scripts\sync-original-art-size-variants.mjs
```

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
