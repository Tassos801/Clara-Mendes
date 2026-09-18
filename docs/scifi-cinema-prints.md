# Sci-fi & Cinema prints

Updated: 2026-09-18

Four original compositions were **released on 2026-09-18** with owner approval. The artwork was generated with the built-in image generator using invented worlds and structures. All four are Active in Shopify, published to the Clara Mendes (Hydrogen) and Clara Mendes Headless channels, and `released: true` in `data/print-catalog.json` (originally `SCIFI_ART_RELEASE_FLAGS`, replaced by the product pipeline the same day).

| Design          | Shopify product ID | SKU           | Retail    |
| --------------- | ------------------ | ------------- | --------- |
| Orbital Silence | 16078105313614     | CM-SC-01-8X10 | EUR 29.99 |
| Neon After Rain | 16078105477454     | CM-SC-02-8X10 | EUR 29.99 |
| Desert Signal   | 16078105510222     | CM-SC-03-8X10 | EUR 29.99 |
| The Fold        | 16078105575758     | CM-SC-04-8X10 | EUR 29.99 |

Each product has one 8 × 10 inch / Unframed variant and one READY 1120 × 1400 artwork image. At release the variants were switched to untracked inventory with DENY policy — the same print-on-demand pattern as the fifteen existing originals — and the `Prodigi Mapping Pending` and `Print File Review Pending` tags were removed. Staging verified the 29 pre-existing Clara Mendes products were unchanged.

## Assets and source detail

The catalogue definitions and exact generation briefs now live in [data/print-catalog.json](../data/print-catalog.json) (the `scifi-cinema` collection); later launches follow [add-products-runbook.md](add-products-runbook.md). Four WebP review previews are under `public/images/product-art/scifi-cinema/`. That file is not consumed by the existing fifteen-original Draft-reset sync.

The local source pack is:

`C:/Users/admin/Desktop/4. Work & Projects/shopify/clara-mendes/output/design-collections/scifi-cinema-2026-09-18`

It contains the four unmodified 1122 × 1402 PNG originals; four 1120 × 1400 WebP previews; four 2400 × 3000 RGB JPEG candidates with 300-DPI metadata; scoped import scripts; the baseline; and `asset-validation.json`, `shopify-readback.json` and `final-verification.json`.

The JPEGs are Lanczos-resized exports, not native 300-DPI masters. Native source detail is about 140.2 PPI at 8 × 10 inches. Original SHA-256 hashes were checked after export. Provider crop and SKU mappings were verified on 2026-09-18 (below); physical appearance remains unverified. No larger or framed variant was added.

## Storefront

Each print's `released` field in [data/print-catalog.json](../data/print-catalog.json), read by [app/lib/printCatalog.ts](../app/lib/printCatalog.ts), is its release gate. All four are `true` since 2026-09-18. A print that is not released stays out of catalogue listing, search, recommendations and generated product sitemaps even if its Shopify record is published.

The shop has a **Sci-fi & Cinema** filter at `/collections/all?capsule=scifi-cinema`. Its count and description reflect released members and state only the staged unframed 8 × 10 format. The five legacy capsules remain unchanged; no separate Sci-fi & Cinema landing page is introduced. Product-page print-size wording follows each product's actual Shopify options, so the single-size drafts do not promise larger formats.

[scripts/printCatalog.node-test.mjs](../scripts/printCatalog.node-test.mjs) covers staged exclusion (an injected fixture catalog), the released state, accidental-publication protection, partial release, the existing capsules, and filter links.

## Release — 2026-09-18

1. Prodigi mapping verified for all four SKUs (below).
2. Owner accepted the ~140 PPI native source detail for 8 × 10 and approved release of all four.
3. Shopify: inventory untracked (DENY), pending tags removed, status Active, published to the Clara Mendes and Clara Mendes Headless channels. Storefront API readback: all four `availableForSale` at EUR 29.99. Not published to Facebook & Instagram or Google & YouTube.
4. Storefront: all four flags enabled; filter, product page (8 × 10-only copy) and add-to-cart checked on the dev server before merge.

Still open: no sample order has been placed, so physical print quality is unverified — the first order is the first QC. Larger and framed formats are not offered; they would need higher-resolution masters.

## Prodigi mapping — done 2026-09-18

Configured and read back in the connected Prodigi dashboard (channel `99660041-3904-4706-813c-00caf0030e1a`).

| Design          | Channel product | Provider SKU     | Placement               | Quality   | Shipping | Fulfilment |
| --------------- | --------------- | ---------------- | ----------------------- | --------- | -------- | ---------- |
| Orbital Silence | 6103444         | ART-FAP-EMA-8X10 | 100 %, 0 / 0, no border | Excellent | Standard | Automatic  |
| Neon After Rain | 6103445         | ART-FAP-EMA-8X10 | 100 %, 0 / 0, no border | Excellent | Standard | Automatic  |
| Desert Signal   | 6103446         | ART-FAP-EMA-8X10 | 100 %, 0 / 0, no border | Excellent | Standard | Automatic  |
| The Fold        | 6103447         | ART-FAP-EMA-8X10 | 100 %, 0 / 0, no border | Excellent | Standard | Automatic  |

`ART-FAP-EMA-8X10` with Standard shipping is the same specification the fifteen existing originals use for 8 × 10 unframed (checked on Quiet Form I, channel product 5656798). The editor recommends 2400 × 3000 px at 300 dpi, which the candidate JPEGs match exactly, so each placement is full bleed with no crop; every crop was inspected in the editor. File hashes were checked against the local checklist before upload.

Dashboard quote, single item, ex tax, to CY from NL: Standard EUR 5.00 + EUR 10.25 = **EUR 15.25**; Budget EUR 8.75. This is the same cost structure as the existing EUR 29.99 8 × 10 prints.

Prodigi rates the pixel count of the upload, so "Excellent" does not reflect the ~140 PPI native detail. Physical print quality is unverified; the first order, or a sample, is the first QC.

Reference: [Configure your products](https://www.prodigi.com/shopify-print-on-demand-app/support/configure-your-products/).
