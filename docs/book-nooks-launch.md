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
sitemap gate. It requires a release flag, Shopify product and variant ids,
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
