# Quiet Current activewear — release gate

Four Printful all-over-print products (leggings #302, studio bra #001A, biker shorts #308, studio tank #121), each in Moss / Mist and Clay / Oat, XS–XL (40 variants). The v2 "Mineral Wash" artwork and review live outside the repo in `Desktop/Clara-Mendes-Movement-Review-2026-10-07/v2`; the print files themselves are in the Printful File library as `qc2f*-{clay|moss}-{302|001A|308|121}-*.png`.

The storefront shows a product only when both gates are open: its handle is `true` in `PRODUCT_RELEASE_FLAGS` (`app/lib/catalogFilters.ts`), and it is Active and published to the storefront channel in Shopify.

## Status (7 October 2026)

| Step | State |
|---|---|
| v2 images (10 per product, per-colour variant images), copy, XS–XL size guides | Done |
| Shopify status Active; inventory untracked + continue selling (made to order) | Done, still unpublished |
| Printful: import + map 40 variants to the v2 templates | Done: 40/40 synced, fulfillment enabled on every variant |
| Printful billing method | Missing: the account and the Clara Mendes store have no billing method. Owner to add |
| Release flags | Merged in #111 (before mapping finished; harmless while the products are unpublished) |
| Shipping rates for these products | Owner decision: see [Shipping](#shipping) |
| Publish the 4 products + `quiet-current` collection to the storefront channel | Pending; the last switch, after billing and shipping |

Printful manual order confirmation is on. The owner declined samples, so the first order is the first physical QC.

## Printful mapping

Printful store `18868484`. Each Shopify variant is synced from a saved product template, one per product and colourway:

| Product (Printful sync product) | Template | Print files |
|---|---|---|
| High-Waist Leggings (`479128495`) | `Quiet Current v2 - {Clay Oat, Moss Mist} - Leggings - REVIEW` | `qc2f-{c}-302-legs`, `-front-waist`, `-back-waist` |
| Studio Bra (`479128480`) | `Quiet Current v2 - {Clay Oat, Moss Mist} - Bra - REVIEW` | `qc2f-{c}-001A-front`, `-back`; white piping; no inside label |
| High-Waist Biker Shorts (`479128485`) | `Quiet Current v2 - {Clay Oat, Moss Mist} - Biker Shorts - REVIEW` | `qc2f-{c}-308-right-leg`, `-left-leg`, `-front-waist`, `-back-waist`, `-pocket` |
| Studio Tank (`479128490`) | `Quiet Current v2 - {Clay Oat, Moss Mist} - Tank - REVIEW` | `qc2f3-{c}-121-body` (owner picked qc2f3 over the earlier qc2f and qc2f2 bodies) |

Ignore the older `B Mineral Wash` and `A Quiet Form` review templates.

Verified on 7 October 2026 by reloading each product page: every variant's Printful size matches its Shopify size, and every variant's print-file thumbnails match its own colourway's files in the File library.

To re-map a variant, unsync it, reload the page, then use Choose product → Product templates. Without the reload, Printful reopens the design maker with the old design. Let each sync finish before starting the next, because a sync still in flight can pick up the next template's design.

## Shipping

The 40 variants sit in the Shopify profile Printful created, `Printful: Hats, Bags, Pillowcases, All over prints, Socks, Aprons, Flip Flops, Camper mug (#PF-FRG42)` (fulfillment location: the Printful app). Its flat rates display in USD, while the store's own profiles and the rate card in the [fulfillment wiki](llm-wiki/modules/fulfillment.md) are in EUR:

| Zone | Rate |
|---|---|
| Europe (incl. Cyprus and the rest of the EU) | $4.99 |
| United States | $4.69 |
| Japan | $4.89 |
| Canada | $7.29 |
| Australia & New Zealand | $7.99 |
| EFTA | $10.39 |
| Brazil | $12.49 |
| Rest of world | $12.49 |
| United Kingdom | $4.59 (inactive: UK is not in a market) |

Printful's own shipping charge for these products is EUR 3.89–10.99. Before publishing, decide whether to keep this profile or move the four products into a EUR profile in line with the rest of the catalog.

## After publishing

Publish the 4 products and the `quiet-current` collection to the storefront channel, then check live: PDP for each product, per-colour variant images, size guide, add to cart, and shipping at checkout for Cyprus and one other EU country.
