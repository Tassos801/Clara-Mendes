# Sci-fi & Cinema print staging

Updated: 2026-09-18

Four original compositions have been added to Clara Mendes as **Shopify Drafts**. The artwork was generated with the built-in image generator using invented worlds and structures. Storefront support is prepared with all four release flags disabled.

| Design          | Shopify product ID | SKU           | Planned retail |
| --------------- | ------------------ | ------------- | -------------- |
| Orbital Silence | 16078105313614     | CM-SC-01-8X10 | EUR 29.99      |
| Neon After Rain | 16078105477454     | CM-SC-02-8X10 | EUR 29.99      |
| Desert Signal   | 16078105510222     | CM-SC-03-8X10 | EUR 29.99      |
| The Fold        | 16078105575758     | CM-SC-04-8X10 | EUR 29.99      |

Each draft has one 8 × 10 inch / Unframed variant, one READY 1120 × 1400 artwork image, tracked inventory of zero, and DENY inventory policy. Tags include `Prodigi Mapping Pending` and `Print File Review Pending`. Fresh Admin readback and CDN image requests verified all four records. A before/after comparison verified the 29 pre-existing Clara Mendes products were unchanged.

## Assets and source detail

The independent catalogue definitions and exact generation briefs are in [data/scifi-cinema-catalog.json](../data/scifi-cinema-catalog.json). Four WebP review previews are under `public/images/product-art/scifi-cinema/`. This independent manifest is not consumed by the existing fifteen-original Draft-reset sync.

The local source pack is:

`C:/Users/admin/Desktop/4. Work & Projects/shopify/clara-mendes/output/design-collections/scifi-cinema-2026-09-18`

It contains the four unmodified 1122 × 1402 PNG originals; four 1120 × 1400 WebP previews; four 2400 × 3000 RGB JPEG candidates with 300-DPI metadata; scoped import scripts; the baseline; and `asset-validation.json`, `shopify-readback.json` and `final-verification.json`.

The JPEGs are Lanczos-resized exports, not native 300-DPI masters. Native source detail is about 140.2 PPI at 8 × 10 inches. Original SHA-256 hashes were checked after export. Provider crop and SKU mappings were verified on 2026-09-18 (below); physical appearance remains unverified. No larger or framed variant was added.

## Storefront preparation

[app/lib/scifiArt.ts](../app/lib/scifiArt.ts) defines an independent release flag for each of the four handles. All flags are `false`. Catalogue listing, search, recommendations and generated product sitemaps continue excluding these staged prints even if a Shopify record is accidentally published.

After the first verified member is released, the shop gains a **Sci-fi & Cinema** filter at `/collections/all?capsule=scifi-cinema`. Its count and description reflect released members and state only the staged unframed 8 × 10 format. The five legacy capsules remain unchanged; no separate Sci-fi & Cinema landing page is introduced. Product-page print-size wording follows each product's actual Shopify options, so the single-size drafts do not promise larger formats.

[scripts/scifiArt.node-test.mjs](../scripts/scifiArt.node-test.mjs) covers default exclusion, accidental-publication protection, partial release, the existing capsules, and filter links.

## Release work remaining

1. Review composition and the source-detail limit for the 8 × 10 candidate files.
2. ~~Map every `CM-SC-01`–`04` SKU in Prodigi~~ — done 2026-09-18, see _Prodigi mapping_ below.
3. Set sellable inventory behavior for the four variants (account-level billing and 24h auto-release already apply channel-wide).
4. Remove the pending tags only after their respective reviews pass, publish to the intended sales channels, and enable only the verified handles in `SCIFI_ART_RELEASE_FLAGS`. Follow the repository validation and deployment workflow for that release commit.
5. Verify live image delivery, the Sci-fi & Cinema filter, product selection, and cart behavior.

Provider mapping is complete. No sample order, inventory release or Shopify publication has been performed for these designs. These are drafts and release preparation; production sales remain disabled.

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
