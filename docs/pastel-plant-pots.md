# Pastel Forms Plant Pots

Prepared 2026-09-30 at the owner's request: a minimal pastel series for Prodigi
plant pots. The original preview and Draft staging are recorded below;
the owner approved a purchase launch on 2026-10-02.

## 2026-10-02 Launch Evidence

The owner approved EUR 29.99 per pot plus EUR 6.99 shipping, explicitly using
the first paid order as the physical quality check. No sample was purchased.
`sampleReviewed` remains false. The owner also accepted possible recipient
import charges; `deliveredCostsVerified` remains false because the supplier
quote is not an all-inclusive landed cost. Do not interpret either approval
metafield as proof of a physical sample or a completed fulfillment cycle.

All four exact Shopify products were mapped in the connected Clara Mendes
Prodigi sales channel. Each saved mapping was reloaded and showed
**Fulfilled by Prodigi automatically**, SKU `PLANT-POT`, quality **Excellent**,
Standard shipping, rotation 0, scale 100%, and zero left/top offsets. Each
matching 2291 x 1287 production JPEG was uploaded; saved editor previews were
checked. This is digital preflight, not physical print verification.

| Design     | Shopify product | Shopify variant | Prodigi listing |
| ---------- | --------------- | --------------- | --------------- |
| Blush Arc  | 16109127205198  | 61019627422030  | 6220718         |
| Sage Stem  | 16109129204046  | 61019635450190  | 6220719         |
| Blue Drift | 16109129498958  | 61019636367694  | 6220720         |
| Butter Sun | 16109129793870  | 61019636826446  | 6220722         |

Authenticated single-pot Standard quotes were checked for all EU-27 countries.
The item was EUR 8.22, shipping EUR 11.38-11.39, total EUR 19.60-19.61,
with EUR 0.00 quote tax. CY, DE, GR, FR, AT, BE, BG, IE and IT returned
EUR 19.60; the remaining 18 returned EUR 19.61. Origin was GB and the
service was Royal Mail Airmail Untracked. Express/StandardPlus/Overnight
were unavailable in the CY/DE checks. These are quotes, not paid invoices.

The correct connected account has a primary saved billing method and an
existing 24-hour order-edit window; neither setting was changed. IOSS was
checked in the account UI and is blank. Product pages and the shipping policy
must disclose the UK origin, untracked post and possible import taxes,
duties and handling fees. See the current
[Prodigi customs FAQ](https://support.prodigi.com/hc/en-us/articles/24939117383964-EU-Customs-Changes-from-1-July-2026-FAQ).

Shopify profile `147873595726`, **Pastel Forms plant pots**, was created and
reopened: exactly four products, all 27 EU countries, Standard - untracked
UK post, EUR 6.99, 5-10 business-day transit estimate. Other shipping profiles
were not changed. The current Storefront API enabled-country readback also
returned precisely EU-27. Pot-only orders use this rate; mixed orders may
combine charges from other profiles.

Shopify prices are EUR 29.99, inventory is untracked for made-to-order
sales, both approval metafields are true, and the four products are Active.
The four exact products were included in only **Clara Mendes (Hydrogen)**
and **Clara Mendes Headless** through Shopify Admin's bulk publication tool.
The production Storefront API then returned all four available variants.
All 108 one-pot carts (four designs x EU-27) retained the exact variant,
price and Standard shipping rate with a Clara Mendes checkout URL. EUR
markets returned EUR 29.99 + EUR 6.99; existing local-currency markets used
their Shopify conversions. An actual browser checkout showed the Blush Arc
line, EUR 6.99 shipping and EUR 36.98 total for a test Cyprus address.
No contact email, payment details or order submission was supplied.

The storefront release enables the four explicit product flags and the
Plant Pots type. `/pastel-forms` reads channel-visible localized prices and
links each swatch to its matching PDP; missing, unpublished or disabled
products still show Coming soon. Activation alone is not purchase-path proof.
Operational readbacks live under `output/launches/pastel-plant-pots/` (ignored).

The production build preview passed all four swatches and all four PDPs at
1440 x 1000, 390 x 844 and 320 x 667, with decoded images, correct EUR prices
and links, no horizontal overflow and no page errors. Each pot's actual
Add to Cart flow retained its title, size, quantity one and EUR 29.99, and
offered the correct checkout host. Lint, typecheck, build, all 317 Node tests
and 73 relative documentation links passed. These browser checks did not
place an order; deployment and fresh production readback remain separate.

### First Paid Order Review

Within the existing 24-hour hold, check the exact CM-POT SKU, `PLANT-POT`,
artwork, crop, quantity, address and Standard shipping in Prodigi. Investigate
missing imports before production and make cancellation/refund decisions in
the appropriate dashboard. At dispatch, confirm Shopify fulfillment status;
do not expect a tracking number for this service. Ask for clear photos of the
received pot to review colour, wrap alignment, drainage, rim and damage.
Record any import charge and the actual supplier invoice. If a material
defect or cost problem occurs, set only the affected pot to Draft while it is
investigated. No automatic paid-order import or physical delivery is claimed
until that first order proves it.

## Artwork And Assets

- Four original designs: Blush Arc, Sage Stem, Blue Drift and Butter Sun.
- Source and colour palette: [manifest](../data/pastel-plant-pots.json).
- The official [Prodigi plant-pot page](https://www.prodigi.com/products/home-and-living/home-decor/plant-pots/)
  lists candidate SKU `PLANT-POT`, glossy ceramic, a drainage hole and
  90 x 102 mm physical dimensions. The downloaded template specifies
  194 x 109 mm at 300 dpi: 2291 x 1287 pixels.
- Vector sources and 300-dpi sRGB JPEG exports live in
  `assets/plant-pots/artwork/`. Regenerate with
  `node scripts/generate-pastel-pot-assets.mjs`.
- Original generated design mockups live in `assets/plant-pots/mockups/`;
  web exports live in `public/images/pastel-plant-pots/`. These show proposed
  designs, not physical samples or a verified supplier crop.

## Original Shopify Staging (2026-09-30)

`node scripts/stage-pastel-plant-pots.mjs --env-dir <existing-env-directory>`
is read-only by default. `--apply` creates missing Drafts only; it refuses
to overwrite any existing record that does not match the expected safe shape.

At staging, each pot had one size variant, a design-specific preview, a production-artwork
image, zero tracked stock and DENY policy. Both approval metafields were
false. EUR 24.99 was a provisional, unpublished price, not a cost-approved offer.
`PLANT-POT` was recorded as a candidate, not an automatic fulfillment mapping.

The live 2026-09-30 Shopify readback verified four Drafts and eight READY
images. Products: `16109127205198` (Blush), `16109129204046` (Sage),
`16109129498958` (Blue), `16109129793870` (Butter). No publication mutation
was performed. The installed app has only read/write_products scopes;
publication readback itself requires read_publications and was unavailable.
Detailed readback and exact production-file handoff are generated under
`output/launches/pastel-plant-pots/` (ignored operational output).

## Original Public Preview (2026-09-30)

`/pastel-forms` was a collection preview with artwork swatches, individual
mockups and dimensions. It showed Coming soon, had no price or checkout control,
and was linked from the homepage and footer. Its sitemap entry was the preview
page, not the four Draft product URLs. All four handles were explicitly false
in `PRODUCT_RELEASE_FLAGS`; no existing product or fulfillment flow changed.

Original purchase-release gates (resolved or explicitly waived above):

1. Attach each exact print file to `PLANT-POT` in the connected Prodigi account
   and read back automatic fulfillment and supplier image quality.
2. Quote delivered costs for Cyprus and intended EU markets; set a suitable
   Shopify shipping profile and approve sustainable retail pricing.
3. Review a physical sample, or record an explicit owner sample waiver.
4. Publish approved products to the correct Headless channel, add Plant Pots
   to the standalone product-type map, release the four flags, and verify
   every pot's live PDP, cart and shipping-rate path.

No supplier order, sample purchase or paid advertising was performed.
