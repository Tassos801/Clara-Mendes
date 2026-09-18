# Sci-fi & Cinema print staging

Updated: 2026-09-18

Four original compositions have been added to Clara Mendes as **Shopify Drafts**. The artwork was generated with the built-in image generator using invented worlds and structures. This is a staging record, not a storefront release.

| Design | Shopify product ID | SKU | Planned retail |
| --- | --- | --- | --- |
| Orbital Silence | 16078105313614 | CM-SC-01-8X10 | EUR 29.99 |
| Neon After Rain | 16078105477454 | CM-SC-02-8X10 | EUR 29.99 |
| Desert Signal | 16078105510222 | CM-SC-03-8X10 | EUR 29.99 |
| The Fold | 16078105575758 | CM-SC-04-8X10 | EUR 29.99 |

Each draft has one 8 × 10 inch / Unframed variant, one READY 1120 × 1400 artwork image, tracked inventory of zero, and DENY inventory policy. Tags include `Prodigi Mapping Pending` and `Print File Review Pending`. Fresh Admin readback and CDN image requests verified all four records. A before/after comparison verified the 29 pre-existing Clara Mendes products were unchanged.

## Assets and source detail

The independent catalogue definitions and exact generation briefs are in [data/scifi-cinema-catalog.json](../data/scifi-cinema-catalog.json). Four WebP review previews are under `public/images/product-art/scifi-cinema/`. This independent manifest is not consumed by the existing original-art sync, and its handles are not admitted by the storefront filters.

The local source pack is:

`C:/Users/admin/Desktop/4. Work & Projects/shopify/clara-mendes/output/design-collections/scifi-cinema-2026-09-18`

It contains the four unmodified 1122 × 1402 PNG originals; four 1120 × 1400 WebP previews; four 2400 × 3000 RGB JPEG candidates with 300-DPI metadata; scoped import scripts; the baseline; and `asset-validation.json`, `shopify-readback.json` and `final-verification.json`.

The JPEGs are Lanczos-resized exports, not native 300-DPI masters. Native source detail is about 140.2 PPI at 8 × 10 inches. Original SHA-256 hashes were checked after export. Provider crop, physical appearance and new SKU mappings remain unverified. No larger or framed variant was added.

## Release work remaining

- Review composition and the source-detail limit for the 8 × 10 candidate files.
- In the connected Prodigi account, map every exact `CM-SC-01`–`04` SKU to the established unframed 8 × 10 specification; upload the corresponding JPEG and verify crop, shipping and delivered cost. Existing-original mapping is not evidence of new-SKU mapping.
- Confirm billing and order-edit settings apply to these mappings and set sellable inventory only after mapping is verified.
- Add this independent manifest to storefront merchandising, including the four approved handles and the Sci-fi & Cinema capsule, without changing the older product records or running the all-original Draft-reset sync.
- Publish to the intended sales channels and verify image delivery, catalogue filtering, variant selection and cart behavior.

No sample order, provider mapping, inventory release, GitHub push, storefront deployment or Shopify publication was performed during staging.
