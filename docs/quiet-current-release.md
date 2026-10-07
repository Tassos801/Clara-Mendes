# Quiet Current activewear — release gate

Four Printful all-over-print products (leggings #302, studio bra #001A, biker shorts #308, studio tank #121), each in Moss / Mist and Clay / Oat, XS–XL (40 variants). The v2 "Mineral Wash" artwork and review live outside the repo in `Desktop/Clara-Mendes-Movement-Review-2026-10-07/v2`; the print files themselves are in the Printful File library as `qc2f*-{clay|moss}-{302|001A|308|121}-*.png`.

The storefront shows a product only when both gates are open: its handle is `true` in `PRODUCT_RELEASE_FLAGS` (`app/lib/catalogFilters.ts`), and it is Active and published to the storefront channel in Shopify.

## Status (7 October 2026)

| Step | State |
|---|---|
| v2 images (10 per product, per-colour variant images), copy, XS–XL size guides | Done |
| Shopify status Active; inventory untracked + continue selling (made to order) | Done, still unpublished |
| Printful: import + map 40 variants to the v2 templates | Done: 40/40 synced, fulfillment enabled on every variant |
| Printful billing method | Done: a card is the account's primary method and the Clara Mendes store uses it (EUR) |
| PDP timings | #113: Printful windows (processes in 2–7, dispatched within 3–8 business days) on these four product types |
| Release flags | Set back to `false` in #113 until launch. #111 set them `true`, but its deploy failed a test, so they never went live |
| Shipping rates for these products | Owner decision: see [Shipping](#shipping) |
| Publish the 4 products + `quiet-current` collection, and flip the 4 flags to `true` | Pending; do both in the same step, after the shipping decision |

Printful manual order confirmation is on: confirm each order in Printful on the day it arrives, because the 3–8 business-day dispatch promise allows only one business day for it. The owner declined samples, so the first order is the first physical QC.

While the flags are `true`, the shop's type tabs list Yoga Leggings, Sports Bra, Biker Shorts and Studio Top, and those tabs stay empty until the products are published. That is why the flags flip together with publishing.

## Timings and fabric

Printful's published fulfillment time for all-over synthetic garments is 2–5 business days in-house and 3–7 at partner facilities. It is counted from the business day after the order ([Printful help centre](https://help.printful.com/hc/en-us/articles/360014007980-How-long-does-fulfillment-take)). Printful's catalog estimates 10–12 business days from order to delivery in Cyprus for all four garments. Transit for all-over-print clothing (printful.com/shipping, checked 7 October 2026): Cyprus 3–7, Germany 3, US 3–6, Australia 2–5, Brazil 3–5 business days. That fits within the storefront's shared EU 5–10 and elsewhere 7–20 windows.

All four Shopify descriptions state Printful's EU fabric: shell 84% polyester / 16% elastane at 230 g/m², and the bra's mesh lining at 90% polyester / 10% elastane. Printful makes US orders in Mexico from a different fabric: 78% polyester / 22% elastane at 290 g/m² (since 14 September 2026), and the bra lining at 92% polyester / 8% spandex. The descriptions do not mention this yet. The owner decides whether to add a US line.

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

## Launch

1. Merge a PR that sets the four `quiet-current-*` flags in `PRODUCT_RELEASE_FLAGS` to `true`. Update the expected type list in `scripts/catalogFilters.node-test.mjs` in the same PR, and wait for the Oxygen deploy.
2. Publish the 4 products and the `quiet-current` collection to the storefront channel.
3. Check live: the PDP for each product (chip "Processes in 2–7 business days", Shipping row "dispatched within 3–8"), per-colour variant images, size guide, the four shop type tabs, add to cart, and shipping at checkout for Cyprus and one other EU country.
