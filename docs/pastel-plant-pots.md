# Pastel Forms Plant Pots

Prepared 2026-09-30 at the owner's request: a minimal pastel series for Prodigi
plant pots, with a public collection preview and Shopify Draft staging.

## Artwork And Assets

- Four original designs: Blush Arc, Sage Stem, Blue Drift and Butter Sun.
- Source and colour palette: [manifest](../data/pastel-plant-pots.json).
- The official [Prodigi plant-pot page](https://www.prodigi.com/products/home-and-living/home-decor/plant-pots/)
  lists candidate SKU `PLANT-POT`, glossy ceramic, a drainage hole and
  90 x 102 mm physical dimensions. The downloaded template specifies
  194 x 109 mm at 300 dpi: 2291 x 1287 pixels.
- Vector sources and 300-dpi sRGB JPEG exports live in
  `assets/plant-pots/artwork/`. Regenerate with
  `node scripts/generate-pastel-pot-assets.mjs`.
- Original generated design mockups live in `assets/plant-pots/mockups/`;
  web exports live in `public/images/pastel-plant-pots/`. These show proposed
  designs, not physical samples or a verified supplier crop.

## Shopify Staging

`node scripts/stage-pastel-plant-pots.mjs --env-dir <existing-env-directory>`
is read-only by default. `--apply` creates missing Drafts only; it refuses
to overwrite any existing record that does not match the expected safe shape.

Each pot has one size variant, a design-specific preview, a production-artwork
image, zero tracked stock and DENY policy. Both approval metafields remain
false. EUR 24.99 is a provisional, unpublished price, not a cost-approved offer.
`PLANT-POT` is recorded as a candidate, not an automatic fulfillment mapping.

The live 2026-09-30 Shopify readback verified four Drafts and eight READY
images. Products: `16109127205198` (Blush), `16109129204046` (Sage),
`16109129498958` (Blue), `16109129793870` (Butter). No publication mutation
was performed. The installed app has only read/write_products scopes;
publication readback itself requires read_publications and was unavailable.
Detailed readback and exact production-file handoff are generated under
`output/launches/pastel-plant-pots/` (ignored operational output).

## Public Preview And Release

`/pastel-forms` is a collection preview with artwork swatches, individual
mockups and dimensions. It shows Coming soon, has no price or checkout control,
and is linked from the homepage and footer. Its sitemap entry is the preview
page, not the four Draft product URLs. All four handles remain explicitly false
in `PRODUCT_RELEASE_FLAGS`; no existing product or fulfillment flow changed.

Remaining purchase-release gates:

1. Attach each exact print file to `PLANT-POT` in the connected Prodigi account
   and read back automatic fulfillment and supplier image quality.
2. Quote delivered costs for Cyprus and intended EU markets; set a suitable
   Shopify shipping profile and approve sustainable retail pricing.
3. Review a physical sample, or record an explicit owner sample waiver.
4. Publish approved products to the correct Headless channel, add Plant Pots
   to the standalone product-type map, release the four flags, and verify
   every pot's live PDP, cart and shipping-rate path.

No supplier order, sample purchase or paid advertising was performed.
