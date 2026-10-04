# CJ book nook launch

Verified 2026-10-03. The owner selected CJdropshipping; no new paid subscription
or automatic supplier payment was enabled.

The pilot is **Twilight Library — DIY Book Nook Kit**, €69, with delivery
included to Cyprus and Germany. It is curated by Clara Mendes and supplied in
the manufacturer's packaging. The manufacturer's photos show 194 pieces,
14+, an estimated 2–3 hour build, touch-switch battery-powered lighting and an
assembled size of 12 × 10.5 × 17.5 cm. Battery type and inclusion were not
confirmed; the listing makes no claim about either. Physical quality has not
been checked through a sample order.

## Product and supplier readback

- Handle: `twilight-library-diy-book-nook-kit`; type `Book Nooks`; vendor
  `Clara Mendes`.
- Shopify product: `gid://shopify/Product/16116237140302`.
- Variant: `gid://shopify/ProductVariant/61052466069838`.
- Supplier SKU: `CJYZ280136101AZ`, Glimmer Book Pavilion, 730 g.
- Shopify reads €69, taxable physical product, tracked CJ inventory of 5,663,
  and sell-when-out-of-stock off. Supplier stock was factory stock; CJ's own
  warehouse stock was zero, so the processing estimate remains an estimate.
- CJ Store Products shows the same Shopify product id and the correct book
  nook SPU `CJYZ2801361`, China warehouse, default CJPacket Liquid Line.
- Six real supplier photographs were imported; conflicting supplier text
  about ages 7–14, other dimensions and music was removed.
- Only the Clara Mendes and Clara Mendes Headless publications are selected.
- Delivery profile `gid://shopify/DeliveryProfile/147927040334`,
  `Book Nooks — CJ`, contains one product, fulfils only from cjdropshipping,
  and has one Cyprus/Germany zone with free `Tracked delivery — included`.
  Other products' profiles were not modified.

The generic registry in [curated-products.json](../data/curated-products.json)
feeds the existing catalog allowlist, type tabs, navigation, product copy and
sitemap gate. Storefront presentation (themes, `/book-nooks`, the homepage
shelf and branded images) is described in the
[book nook catalogue](book-nooks-catalog.md). It requires a release flag, Shopify product and variant ids,
a shipping-profile id, verified fulfilment, supplier SKU, shipping copy and
verified destinations. Unknown supplier imports remain hidden.

## Delivery and import VAT

Cyprus: CJPacket Liquid Line quoted $17.67 carrier freight plus $3.50 duty,
$9.62 product, total **$30.79 before VAT**. Distribution: 69% 8–15 days,
22% 16–21, 9% 24+ after dispatch. Processing: 1–3 days for 90% of orders.
The cheaper 12–50 day partly untracked lane was not selected.

Germany: CJPacket Ordinary I quoted $11.58 freight and $9.62 product. The
page's **$23.08 total includes $1.83 wholesale-value VAT and $0.05 IOSS fee**;
it is not a pre-VAT landed cost. The delivery estimate is 8–18 days after
1–3 day processing. Review the destination-specific carrier before paying
an actual order; the connected product's default is the Cyprus lane.

CJ declaration settings were saved for all 27 EU destinations: **Store Order
Amount** and **Declare with CJ's IOSS**. This avoids basing declarations on
wholesale value when customer order data exists. CJ charges VAT and an IOSS
handling fee at supplier payment; the page quote is not the final retail-value
VAT invoice. Shopify currently shows EU tax "Not collecting", no registration
in the store region, inclusive prices with a 0% assumed rate, and checkout
import-duty collection unset. These global tax settings were not changed.
CJ's static DDU notice still exists, so the storefront does not guarantee that
customs or carriers can never request another charge. Customers are told to
contact the store before paying any unexpected charge.

The live Shopify shipping policy was updated with a separate kit section.
Print processing/delivery wording now explicitly applies to printed products;
the existing plant-pot terms remain intact.

## Margin planning, not an invoice

Reference FX: ECB 2 October 2026, $1.1225 per euro. These estimates include a
3% FX buffer on supplier payment, 19% CJ import VAT on the full €69 sale value
(conservative while its taxable base is unconfirmed), a handling fee of 3%
of that VAT, assumed payment fees of 2.9% + €0.30, and a 5% return reserve.
Germany also reserves $3.50 duty because its quoted lane did not itemize duty.
Actual processor fees, customs, multiple-item orders and CJ payment totals may
differ.

| One kit at €69                                                        |     Cyprus |    Germany |
| --------------------------------------------------------------------- | ---------: | ---------: |
| Buffered supplier total, including estimated VAT and fee              |     €42.16 |     €36.57 |
| Payment fee assumption                                                |      €2.30 |      €2.30 |
| Returns reserve                                                       |      €3.45 |      €3.45 |
| Contribution before ads, overhead and separate merchant VAT liability |     €21.09 |     €26.68 |
| After a further €11.02 merchant VAT reserve                           | **€10.07** | **€15.66** |

The extra merchant VAT reserve is a downside scenario, not an assertion that
VAT must be paid twice. Merchant accounting and CJ's invoice must establish
the actual treatment; no VAT registrations or legal declarations were made.
€59 was rejected because it leaves too little room for these uncertainties.
No advertising spend has been started.

## Verification

Local validation passed: 320 tests, type checking, lint, production build and
Hydrogen route checks. The local storefront shows the Book Nooks navigation,
filtered collection and €69 kit page with assembly and destination-specific
shipping copy. Storefront API test carts returned free tracked delivery and
€69 totals for Cyprus and Germany; France returned no eligible delivery
option. All three isolated test carts were emptied. The shipping policy was
read back from Shopify with the kit section present.

## Ten-kit lineup, 2026-10-04

The owner approved nine more kits at €69. Each is set up like the pilot:
type `Book Nooks`, vendor `Clara Mendes`, taxable, only the Clara Mendes and
Clara Mendes Headless publications, delivery profile `Book Nooks — CJ`, and
connected in CJ to the China warehouse with CJPacket Liquid Line as the
default. Variant ids are in the registry; the number is the shelf order.

| No. | Kit               | Theme       | Supplier SKU    | Shopify product  | Cyprus quote               |
| --- | ----------------- | ----------- | --------------- | ---------------- | -------------------------- |
| 01  | Twilight Library  | `libraries` | CJYZ280136101AZ | `16116237140302` | $9.62 + $21.17 = $30.79    |
| 02  | Alley After Rain  | `streets`   | CJYZ200795802BY | `16116510359886` | $7.32 + $21.17 = $28.49    |
| 03  | Firefly Forest    | `gardens`   | CJYZ200666309IR | `16116525662542` | $7.96 + $21.55 = $29.51    |
| 04  | Sorcerer's Shop   | `magic`     | CJYZ239182902BY | `16118275965262` | $7.96 + $17.16 = $25.12    |
| 05  | Sea Breeze        | `streets`   | CJYZ176390802BY | `16118279373134` | $8.60 + $23.89 = $32.49    |
| 06  | Christmas Fantasy | `gardens`   | CJYZ188445602BY | `16118272393550` | $7.96 + $21.35 = $29.31    |
| 07  | Magic Meal        | `magic`     | CJYZ231633101AZ | `16118274687310` | $8.13 + $20.21 = $28.34    |
| 08  | Colmar Town       | `streets`   | CJYZ211860402BY | `16118277570894` | $9.29 + $20.59 = $29.88    |
| 09  | Eternal Fragrance | `gardens`   | CJYZ239788601AZ | `16118273868110` | $8.13 + $20.97 = $29.10    |
| 10  | Underwater World  | `magic`     | CJYZ200666313MN | `16118281306446` | $7.96 + freight not quoted |

The Cyprus quote is the CJ list price plus Liquid Line freight and $3.50
duty, before VAT, as CJ showed it on 2026-10-04. Underwater World shares Firefly
Forest's CJ listing; its freight was not quoted separately. Every quoted kit
except Sea Breeze is at or below the pilot's $30.79, so the pilot's margin
table is the conservative case. Sea Breeze is $1.70 higher: about €1.56
less, roughly €19.53 contribution before the merchant VAT reserve and €8.51
after it. Germany was quoted for one of the new kits (CJPacket
Ordinary, $11.76, 8–18 days; the pilot's lane was $11.58). The actual payment
quote governs each order.

The suppliers publish no piece counts or build times for these nine, so the
storefront shows the finished size instead and claims neither. The details
say the lights run on button-cell batteries and that batteries and glue may
not be included. Age 15+ is stated only where the manufacturer shows it.
Physical quality has not been checked for any of them.

Storefront API test carts for all ten kits returned a €69.00 total with
`Tracked delivery — included` at €0 and the expected SKU for Cyprus and
Germany; France returned no delivery option. All test carts were emptied.

## Listing a kit through CJ

What the nine kits showed, in the order it matters:

1. **CJ List publishes everywhere.** The product is created Active on every
   Shopify sales channel. Straight after listing, restrict it to Clara Mendes
   and Clara Mendes Headless. The Shopify Catalog (agentic) channel cannot
   be switched off there.
2. **Pick the lane and profile in the list form.** Choose the
   `Book Nooks — CJ` delivery profile, and set Cyprus to CJPacket Liquid
   Line. CJ may default to CJPacket Eub (12–50 days, partly untracked).
   Set product type and vendor through the form too.
3. **One Shopify listing per CJ product.** CJ refuses a second listing
   ("This item has already been listed"), even for another design in a
   multi-design listing. Either find the design's own CJ listing (Sea
   Breeze) or duplicate an existing kit in Shopify as a draft without media.
   Then change the title, description, option value and SKU, and in CJ open
   Store Products → Unconnected → Specific Sync, match the design and connect
   it with Liquid Line and the profile (Underwater World). Set it Active only
   after CJ reads the connection back.
4. **Read back.** Check the publications (two), the profile, the CJ
   connection and SKU, and run a test cart per destination before setting
   `released: true`.

## First paid order

1. Confirm the Shopify order imports to CJ with this exact variant/SKU and
   actual retail order amount; do not substitute a product based on title.
2. Choose the verified lane for the destination, check tracking, duty, IOSS
   VAT and fee in the **actual payment quote**, and reconcile its margin.
3. Pay the CJ supplier order promptly after review. Syncing is not supplier
   payment; automatic payment was not enabled in this launch.
4. Verify tracking returns to Shopify, customer notification, dispatch and
   delivery. Check parts, instructions and lighting on the first sample or
   customer report. Do not promise custom Clara Mendes packaging.
5. Pause the curated release and Shopify product if mapping, inventory,
   delivery service or costs cease to support the offer. Do not alter other
   catalog release flags.

Sources: [CJ product](https://www.cjdropshipping.com/product/cottage-diy-flicker-book-nook-3d-handmade-assembly-architecture-model-p-2603240308031611100.html),
[CJ IOSS guide](https://cjdropshipping.com/article-details/1417069937033351168),
[CJ VAT help](https://cjdropshipping.com/help-center?keyWord=VAT&navType=search&searchType=content),
[ECB USD rate](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-usd.en.html).
