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

The JPEGs are Lanczos-resized exports, not native 300-DPI masters. Native source detail is about 140.2 PPI at 8 × 10 inches. Original SHA-256 hashes were checked after export. Provider crop, physical appearance and new SKU mappings remain unverified. No larger or framed variant was added.

## Storefront preparation

[app/lib/scifiArt.ts](../app/lib/scifiArt.ts) defines an independent release flag for each of the four handles. All flags are `false`. Catalogue listing, search, recommendations and generated product sitemaps continue excluding these staged prints even if a Shopify record is accidentally published.

After the first verified member is released, the shop gains a **Sci-fi & Cinema** filter at `/collections/all?capsule=scifi-cinema`. Its count and description reflect released members and state only the staged unframed 8 × 10 format. The five legacy capsules remain unchanged; no separate Sci-fi & Cinema landing page is introduced. Product-page print-size wording follows each product's actual Shopify options, so the single-size drafts do not promise larger formats.

[scripts/scifiArt.node-test.mjs](../scripts/scifiArt.node-test.mjs) covers default exclusion, accidental-publication protection, partial release, the existing capsules, and filter links.

## Release work remaining

1. Review composition and the source-detail limit for the 8 × 10 candidate files.
2. In the connected Prodigi account, map every exact `CM-SC-01`–`04` SKU to the established unframed 8 × 10 specification; upload the corresponding JPEG and verify crop, shipping and delivered cost. Existing-original mapping is not evidence of new-SKU mapping.
3. Confirm billing and order-edit settings apply to these mappings and set sellable inventory only after mapping is verified. Record proof that each new SKU is fulfilled automatically.
4. Remove the pending tags only after their respective reviews pass, publish to the intended sales channels, and enable only the verified handles in `SCIFI_ART_RELEASE_FLAGS`. Follow the repository validation and deployment workflow for that release commit.
5. Verify live image delivery, the Sci-fi & Cinema filter, product selection, and cart behavior.

No sample order, provider mapping, inventory release or Shopify publication has been performed for these designs. These are drafts and release preparation; production sales remain disabled.

## Provider access in this session

No configured local Prodigi API credential was found. The supported browser-control runtime was unavailable, so the connected Prodigi dashboard was not inspected or changed. The published Print API reference documents orders, quotes and product details; no supported endpoint for configuring Shopify SKU mappings was found. Configuration must be verified in the connected sales channel using Prodigi's documented dashboard workflow.

References: [Configure your products](https://www.prodigi.com/shopify-print-on-demand-app/support/configure-your-products/) and [Print API reference](https://www.prodigi.com/print-api/docs/reference/).
