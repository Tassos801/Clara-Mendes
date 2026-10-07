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
| US fabric disclosure | Done: all four Shopify descriptions include the US shell; the bra also includes its US mesh lining, checked after reload |
| Shipping rates for these products | Done: all 40 variants in the EUR `Quiet Current activewear` profile; nine zones saved and checked after reload |
| Checkout delivery dates | Review before launch: store-wide Automated is on, with Next business day fallback; rate preview shows an Oct 13 arrival that can conflict with the activewear dispatch window |
| Publish the 4 products + `quiet-current` collection, and flip the 4 flags to `true` | Pending owner approval; deploy the flags before publishing |

Printful manual order confirmation is on: confirm each order in Printful on the day it arrives, because the 3–8 business-day dispatch promise allows only one business day for it. The owner declined samples, so the first order is the first physical QC.

While the flags are `true`, the shop's type tabs list Yoga Leggings, Sports Bra, Biker Shorts and Studio Top, and those tabs stay empty until the products are published. That is why the flags flip together with publishing.

## Timings and fabric

Printful's published fulfillment time for all-over synthetic garments is 2–5 business days in-house and 3–7 at partner facilities. It is counted from the business day after the order ([Printful help centre](https://help.printful.com/hc/en-us/articles/360014007980-How-long-does-fulfillment-take)). Printful's catalog estimates 10–12 business days from order to delivery in Cyprus for all four garments. Transit for all-over-print clothing (printful.com/shipping, checked 7 October 2026): Cyprus 3–7, Germany 3, US 3–6, Australia 2–5, Brazil 3–5 business days. That fits within the storefront's shared EU 5–10 and elsewhere 7–20 windows.

All four Shopify descriptions state Printful's EU fabric: shell 84% polyester / 16% elastane at 230 g/m², and the bra's mesh lining at 90% polyester / 10% elastane. They now also include: “Orders shipped to the US are made with a heavier shell: 78% polyester, 22% elastane; 290 g/m².” The bra additionally discloses its US mesh lining (92% polyester, 8% elastane). The owner handoff records that all four saved descriptions were checked after reload on 7 October 2026.

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

All 40 variants are assigned to the custom EUR profile `Quiet Current activewear` (Shopify profile `148183646542`). The previous app-created profile `Printful: Hats, Bags, Pillowcases, All over prints, Socks, Aprons, Flip Flops, Camper mug (#PF-FRG42)` remains in place with 0 products. The custom profile's nine zones were saved and verified after a fresh reload on 7 October 2026. Each zone has one flat option named Standard, with transit time set to None.

| Zone | Countries | Rate |
|---|---|---|
| Cyprus | CY | €3.99 |
| European Union | The other 26 EU countries | €4.95 |
| Europe outside the EU | Andorra, Albania, Bosnia & Herzegovina, Monaco, Moldova, Montenegro, North Macedonia, Serbia, San Marino, Ukraine, Vatican City | €6.99 |
| EFTA | Switzerland, Iceland, Liechtenstein, Norway | €9.99 |
| United States | US | €4.95 |
| Japan | JP | €4.95 |
| Canada | CA | €6.99 |
| Australia & New Zealand | AU, NZ | €6.99 |
| Rest of world (incl. Brazil) | The remaining 158 enabled market countries/regions | €12.99 |

These zones cover all 205 countries/regions currently offered by Shopify Markets (47 in the named zones, 158 in rest of world). Countries outside active markets remain excluded; adding a shipping zone does not activate a market. The non-EU Europe rate follows the owner's handoff choice. Printful's own shipping charge for these products was recorded as EUR 3.89–10.99; these are customer checkout rates, not supplier-cost guarantees.

### Checkout delivery dates

Live Shopify Admin > Settings > Shipping and delivery > Estimated delivery dates was checked on 7 October 2026: **Automated** is selected, and its manual fallback fulfillment time is **Next business day**. With Standard and transit time None, the rate preview still shows “Estimated delivery Tue, Oct 13” based on fulfillment history. This can promise arrival before the full 3–8 business-day activewear dispatch window has elapsed.

The setting is store-wide and was left unchanged. Before launch, resolve it with the owner; turning delivery estimates Off removes predicted dates while keeping custom rate descriptions/transit times ([Shopify help](https://help.shopify.com/en/manual/fulfillment/setup/delivery-expectations/automated-delivery-dates)). A store-wide Next business day fallback does not represent made-to-order activewear. Record any approved change here and verify the real checkout during launch.

## Launch

1. After explicit owner approval and resolution of the checkout delivery-date setting, merge a PR that sets the four `quiet-current-*` flags in `PRODUCT_RELEASE_FLAGS` to `true`. Update the expected type list in `scripts/catalogFilters.node-test.mjs` in the same PR, and wait for the Oxygen deploy.
2. Publish the 4 products and the `quiet-current` collection to the storefront channel.
3. Check live: the PDP for each product (chip "Processes in 2–7 business days", Shipping row "dispatched within 3–8"), per-colour variant images, size guide, the four shop type tabs, add to cart, and shipping at checkout for Cyprus, one other EU country and representative international destinations (US, Switzerland and Brazil). Use synthetic details, stop before payment, and remove the test cart items.
