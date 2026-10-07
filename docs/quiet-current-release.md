# Quiet Current activewear — release gate

Four Printful all-over-print products (leggings #302, studio bra #001A, biker shorts #308, studio tank #121), each in Moss / Mist and Clay / Oat, XS–XL (40 variants). The v2 "Mineral Wash" artwork and review live outside the repo in `Desktop/Clara-Mendes-Movement-Review-2026-10-07/v2`.

The storefront shows a product only when both gates are open: its handle is `true` in `PRODUCT_RELEASE_FLAGS` (`app/lib/catalogFilters.ts`), and it is Active and published to the storefront channel in Shopify.

## Status (7 October 2026)

| Step | State |
|---|---|
| v2 images (10 per product, per-colour variant images), copy, XS–XL size guides | Done |
| Shopify status Active; inventory untracked + continue selling (made to order) | Done, still unpublished |
| Printful: import + map 40 variants to the v2 templates | Partial: leggings Clay / Oat 5/5. Leggings Moss / Mist, bra, shorts and tank still to map |
| Printful billing method | Owner adding |
| Release flags (this change) | In this PR |
| Publish the 4 products + `quiet-current` collection to the storefront channel | Pending; the last switch |
| Shipping rates for these products | To confirm before publishing |

Merge only when every variant is mapped in Printful. An order for an unmapped variant is not sent to Printful. Printful manual order confirmation is on. The owner declined samples, so the first order is the first physical QC.
