# Original Art Size Expansion

Status: **prepared locally; no larger Shopify variant is live or staged yet**.

The fifteen active original-art products currently offer one unframed 8 × 10
inch print at the legacy €29.00 price. The approved transition moves that size
to €29.99 and adds an unframed 16 × 20 inch print at €39.99 on Prodigi enhanced
matte art paper (`GLOBAL-FAP-16X20`). Both sizes use the same 4:5 aspect ratio,
so the artwork composition does not require a crop change.

The Hydrogen product route renders Shopify's `Size` values. Its flat artwork is
always visible, while room mockups and the true-scale sofa diagram follow the
selected 8 × 10 or 16 × 20 variant.

## Production Files

Run:

```powershell
python .\scripts\prepare-original-art-size-assets.py
```

The command produces one ignored 4800 × 6000 pixel, 300-DPI JPEG per artwork
under `output/product-art/print-16x20-300dpi/` and writes a hash manifest beside
them. The manifest records the approximately 1120 × 1400 source dimensions.
The larger files are high-quality resizes; the larger pixel dimensions do not
create additional native artwork detail.

Prodigi's dashboard currently lists 4800 × 6000 as the recommended dimensions
for `GLOBAL-FAP-16X20`. The five existing capsule-representative uploads are
rated **Excellent** and mapped for automatic fulfillment. The fifteen individual
product variants still need their corresponding files mapped and verified.

## Safe Shopify And Prodigi Release

First run the read-only live audit:

```powershell
node .\scripts\sync-original-art-size-variants.mjs
```

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
2. Select `GLOBAL-FAP-16X20`.
3. Upload the matching `*-16x20-300dpi.jpg` file.
4. Confirm the editor uses full bleed with no unexpected crop.
5. Confirm image quality is **Excellent**.
6. Keep the approved **Standard** shipping preference.

Only after all fifteen mappings pass, activate the variants:

```powershell
node .\scripts\sync-original-art-size-variants.mjs --activate --prodigi-confirmed=GLOBAL-FAP-16X20
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

Running `npm run catalog:art:mockups` still generates all 60 mockups. Future
media append runs plan four mockups per product, for five images including the
flat artwork.
