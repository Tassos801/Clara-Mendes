# Quiet Current activewear — launch record

Four Printful all-over-print products (leggings #302, studio bra #001A, biker shorts #308, studio tank #121), each in Moss / Mist and Clay / Oat, XS–XL (40 variants). The v2 "Mineral Wash" artwork and review live outside the repo in `Desktop/Clara-Mendes-Movement-Review-2026-10-07/v2`; the print files themselves are in the Printful File library as `qc2f*-{clay|moss}-{302|001A|308|121}-*.png`.

The storefront shows a product only when both gates are open: its handle is `true` in `PRODUCT_RELEASE_FLAGS` (`app/lib/catalogFilters.ts`), and it is Active and published to the storefront channel in Shopify.

## Status (8 October 2026)

| Step | State |
|---|---|
| v2 images (10 per product, per-colour variant images), copy, XS–XL size guides | Done |
| Shopify status Active; mapped variant availability | 10 mapped variants per product (40 total), now published to `Clara Mendes`. Shopify Admin shows 9,999 inventory per variant; configuration unchanged |
| Printful: import + map 40 variants to the v2 templates | Done: 40/40 synced, fulfillment enabled on every variant |
| Printful billing method | Done: a card is the account's primary method and the Clara Mendes store uses it (EUR) |
| PDP timings | #113: Printful windows (processes in 2–7, dispatched within 3–8 business days) on these four product types |
| Release flags | All four `true`: #114 merged and production validation/deployment succeeded (workflow `37685065415`). #115's collection admission fix also validated and deployed (workflow `37685612489`) |
| US fabric disclosure | Done: all four Shopify descriptions include the US shell; the bra also includes its US mesh lining, checked after reload |
| Shipping rates for these products | Done: all 40 variants in the EUR `Quiet Current activewear` profile; nine zones saved and checked after reload |
| Checkout delivery dates | Off, separately approved by the owner on 8 October 2026 and saved in Admin. Fresh Germany checkout keeps Standard €4.95 and removes "Ships next business day" |
| Publish the 4 products + `quiet-current` collection | Done: published only to `Clara Mendes` after the #114 deployment; all four appear in Shop All. The dedicated collection returns 200 and displays the four products after #115 |
| Live purchase path | Done: four PDPs, ten variant choices per PDP, four sampled cart variants and representative checkouts for all nine shipping zones. Test cart removed; Cart 0 persisted after reload |

Printful manual order confirmation is on: confirm each order in Printful on the day it arrives, because the 3–8 business-day dispatch promise allows only one business day for it. The owner declined samples, so the first order is the first physical QC.

The shop's type tabs now list Yoga Leggings, Sports Bra, Biker Shorts and Studio Top, and each published product is visible in Shop All and its matching type.

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

### On the storefront

The PDP states these rates beside the price and in full, so a shopper knows the fee before checkout. `APPAREL_SHIPPING_RATES` in `app/lib/storefrontBasics.ts` mirrors the nine zones above and is the single source for the PDP line ("Shipping €3.99 to Cyprus, €4.95 to the rest of the EU, the US and Japan, from €6.99 elsewhere. One fee per order"), the rate table in the PDP's Shipping row, and the "Shipping from €3.99" line in the collection hero. **If a rate changes in Shopify, change it there too**; checkout remains the authority and the copy says so.

### Checkout delivery dates

Shopify Admin > Settings > Shipping and delivery > Estimated delivery dates was checked on 7 October 2026: **Automated** was selected, with **Next business day** as its manual fallback fulfillment time. With Standard and transit time None, the rate preview showed “Estimated delivery Tue, Oct 13” based on fulfillment history, which could promise arrival before the activewear dispatch window had elapsed.

The live Cyprus checkout initially displayed "Ships next business day", with no predicted arrival date, despite the activewear's 3–8 business-day dispatch promise. The owner separately approved **Turn estimates off** on 8 October 2026. Shopify Admin saved **Off** and confirmed "Delivery date settings updated". A fresh Germany checkout retained Standard €4.95 and no longer displayed "Ships next business day". This store-wide change removes automated delivery estimates while preserving the saved shipping rates ([Shopify help](https://help.shopify.com/en/manual/fulfillment/setup/delivery-expectations/automated-delivery-dates)).

## Launch

The owner explicitly authorized launch on 7 October 2026: "make the new products sellable at the site". [#114](https://github.com/Tassos801/Clara-Mendes/pull/114) enabled the four flags and expected shop type list; its [production validation and deploy](https://github.com/Tassos801/Clara-Mendes/actions/runs/37685065415) succeeded. The four products and their collection were then published only to `Clara Mendes`. [#115](https://github.com/Tassos801/Clara-Mendes/pull/115) fixed collection route admission and also [validated and deployed](https://github.com/Tassos801/Clara-Mendes/actions/runs/37685612489) successfully; the dedicated collection now returns 200 and displays all four products. All nine shipping zones have a representative checkout check, and test cart cleanup is confirmed after reload. The owner separately approved switching the store-wide delivery-date setting Off on 8 October; it is saved and verified in fresh checkout.

The `quiet-current` collection must also pass the collection route's handle-only guard. The launch follow-up admits that handle when any Quiet Current product flag is enabled, while still hiding an empty Shopify result. Its regression test covers the published member, empty result and unrelated product-release cases.

The completed sequence was: deploy the release flags, publish the scoped products and collection, deploy the collection admission fix, verify the live PDP/cart/checkout path, and remove the test lines. Local code checks passed 345 tests, lint, typecheck, build and the Hydrogen route check.

## Live verification (8 October 2026)

All four products appear in Shop All with their expected product types. Each live PDP shows the US fabric disclosure (including the bra's mesh lining), XS–XL size guide, 2–7 business-day processing and 3–8 business-day dispatch. Each PDP displays ten variant choices: two colourways × five sizes. The browser purchase-path test exercised one sampled variant per product.

The [Quiet Current collection](https://shopclaramendes.com/collections/quiet-current) returns 200, shows the Quiet Current title and lists all four products at the same prices as their PDPs.

| Product | Retail price | Sample cart variant |
|---|---|---|
| [High-Waist Leggings](https://shopclaramendes.com/products/quiet-current-high-waist-leggings) | €79.00 | Clay / Oat, XL |
| [Studio Bra](https://shopclaramendes.com/products/quiet-current-studio-bra) | €69.00 | Moss / Mist, M |
| [High-Waist Biker Shorts](https://shopclaramendes.com/products/quiet-current-high-waist-biker-shorts) | €59.00 | Clay / Oat, S |
| [Studio Tank](https://shopclaramendes.com/products/quiet-current-studio-tank) | €55.00 | Moss / Mist, L |

The browser cart held one correctly selected variant of each product: four lines, subtotal €262.00. Synthetic checkouts covered one destination in each of the nine saved zones:

| Destination | Standard shipping | Four-product total |
|---|---|---|
| Cyprus | €3.99 | €265.99 |
| Germany | €4.95 | €266.95 |
| Serbia | €6.99 | €268.99 |
| Switzerland | €9.99 | €271.99 |
| United States | €4.95 | €266.95 |
| Japan | €4.95 | €266.95 |
| Canada | €6.99 | €268.99 |
| Australia | €6.99 | €268.99 |
| Brazil | €12.99 | €274.99 |

The four same-profile items shared one flat shipping rate at each destination, with no extra per-item shipping. Fresh checkout checks after the owner-approved Off setting displayed no "Ships next business day" text. No order was placed or payment details entered.

All four test lines were removed. A final collection-page reload confirmed Cart 0 persisted and all four product links remained visible. Local screenshots are saved in `/Users/tassosdimitriou/Desktop/shopify/artifacts/quiet-current-2026-10-07`, including `live-products.jpg` (four cards and persisted Cart 0), `live-shop.jpg`, `live-collection.jpg`, `live-cart.jpg`, representative checkout captures and `delivery-estimates-off.jpg`. The local `verification.md` records the completed evidence.

## PDP layout and collection hero (8 October 2026)

The descriptions are structured HTML (intro, feature list, fabric and care, a body size table, fit and made-to-order notes), but the PDP printed Shopify's plain-text `description`, which ran the list and size table together. For the four activewear types, `parseApparelDescription` (`app/lib/apparelCopy.ts`) now splits `descriptionHtml` into plain text: the intro becomes the lede under the title, then Details (open), Fabric & care, Size guide (a real table) and Shipping (the rate table) rows. No merchant HTML is rendered. Other products keep the plain-text description. Keep the description order intact when editing in Shopify: intro paragraph first, the list, fabric/care paragraphs, the size table, then fit notes and a paragraph starting "Made to order".

`/collections/quiet-current` has its own hero (`app/lib/collectionHeroes.ts`): a Mineral Wash backdrop with the two Printful flat-lay looks, generated by `v2/scripts/make_collection_hero.py` in the movement-review folder into `public/images/quiet-current/`. Other collections keep the shared interior hero.
