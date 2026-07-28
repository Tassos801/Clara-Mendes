# Clara Mendes Original Art Launch

Updated: 2026-07-28

## Launch Decision

Clara Mendes will lead with a focused owned collection rather than another
large catalog of generic supplier products. The catalog contains fifteen
original 4:5 wall-art works across five coordinated capsules:

| Capsule         | Products                   | Palette                                          |
| --------------- | -------------------------- | ------------------------------------------------ |
| Quiet Form      | Quiet Form I, II, III      | Ivory, oat, sand, terracotta, charcoal           |
| Patina Blue     | Patina Blue I, II, III     | Chalk, indigo, cobalt, slate, sienna             |
| Neo Deco        | Neo Deco I, II, III        | Antique cream, black, oxblood, green, muted gold |
| Midnight Garden | Midnight Garden I, II, III | Midnight navy, teal, plum, antique cream, copper |
| Sunlit Mosaic   | Sunlit Mosaic I, II, III   | Terracotta, saffron, olive, cobalt, warm cream   |

The initial sellable format is deliberately limited to one unframed 8 × 10 inch
print. Shopify's base catalog price is EUR 29; Shopify Markets currently
presents USD 34 to the US storefront. Larger sizes must not be added until a
higher-resolution production workflow and physical samples have passed review.

## Asset State And Provenance

- The first nine source artworks were generated with the built-in OpenAI image
  generator on 2026-07-23 from original, text-free briefs.
- Six more complex source artworks were generated on 2026-07-24 as the
  Midnight Garden and Sunlit Mosaic triptychs.
- Sources are normalized to a 4:5 RGB production canvas before export.
- The artwork contains no product mockup, room scene, frame, logo, signature,
  readable text, or watermark.
- Web previews are optimized WebP files under
  `public/images/product-art/<capsule>/`.
- Local 2400 × 3000, 300-DPI JPEG production files are prepared under
  `output/product-art/print-8x10-300dpi/`. Resizing creates the required file
  dimensions but is not evidence of physical print quality.
- AI generation cannot guarantee that no visual resemblance exists anywhere in
  the wider art market. Run a visual-similarity and trademark review before
  paid scale.

The catalog metadata and stable product handles live in
`data/original-art-catalog.json`. Rebuild the web and sample assets with:

```powershell
python .\scripts\prepare-original-art-assets.py
```

## Product Extension Asset Lab

`data/art-product-extensions.json` defines a Draft-only collection of twelve
additional product families, including larger prints, framed prints, paper
goods, textiles, a tote, a calendar, canvas, and selected phone cases. These
records are not launch approval. Any `verified-public` Prodigi SKU still
requires confirmation inside the connected account, a real shipping quote,
margin review, and a physical sample before it can be sold.

Generate the deterministic production candidates and storefront review
previews with:

```powershell
python .\scripts\prepare-art-product-extensions.py
```

The production files and manifest stay under the ignored
`output/prodigi-product-files/` directory. Lightweight review previews are
committed under `public/images/art-product-extensions/`. The separate
`scripts/sync-art-product-extensions.mjs` command creates or updates the Shopify
records as **DRAFT** only after an explicit `--apply`; it never publishes them.
See
[Art for Everyday Living](art-product-extensions.md) for the full product
architecture, reproduction commands, and release gates.

## Shopify Product Staging

`scripts/sync-original-art-catalog.mjs` idempotently upserts all fifteen products
by handle. It creates them as **DRAFT**, adds the public artwork, and creates one
8 × 10 inch variant at $29.

Preview without changing Shopify:

```powershell
npm run catalog:art:dry-run
```

After the web assets are deployed and Admin credentials with `write_products`
scope are available:

```powershell
npm run catalog:art:sync
```

This remains a staging/reset command: applying it will set the 15 originals to
Draft at the EUR 29 base price. It is not an idempotent representation of the
current Active state and must not be run merely to "refresh" the live products.

For an owner-built Dev Dashboard app, configure `SHOPIFY_CLIENT_ID`,
`SHOPIFY_CLIENT_SECRET`, and `SHOPIFY_ADMIN_STORE`. The sync exchanges those
credentials for Shopify's short-lived Admin token automatically. A legacy
`SHOPIFY_ADMIN_ACCESS_TOKEN` remains supported as a fallback.

Shopify's current `productSet` mutation supports product files, options,
variants, SKUs, prices, and Draft status in one idempotent operation:
https://shopify.dev/docs/api/admin-graphql/latest/mutations/productSet

## Storefront Availability Behavior

The storefront does not use an email-only early-access gate. The original-art
preview receives the product handles returned by the Storefront API. Available
handles become links to `/products/<handle>`; the product page then uses the
existing Hydrogen cart and Shopify checkout flow. Draft or unpublished works
remain non-interactive previews so shoppers are not sent to a 404 or an
unfulfillable checkout.

Empty collections from the former home-goods catalog are filtered from
navigation. Customer-facing copy leads with original prints while remaining
broad enough for later product types.

## Supplier And Activation Gate

Prodigi is the selected provider, and its Shopify sales channel was connected
on 2026-07-24. Enhanced Matte Art paper (EMA), 200gsm, Giclée, unframed 8 × 10
inches is the intended product. The documented activation gate requires all of
these to be confirmed:

1. The print-provider product is connected to the exact Shopify variant SKU.
2. Prodigi's crop preview shows the complete composition with no unintended
   border or edge loss.
3. The selected shipping method and real landed cost are documented.
4. Landed cost is no more than the owner-approved ceiling; the original ceiling
   was $12 per single-print order.
5. The account uses an order pause during the controlled launch so the first
   orders can be reviewed before production.
6. The Shopify product description matches the configured paper and fulfilment
   facts.
7. The product is published only to the intended sales channels.
8. A physical sample passes crop, colour, sharpness, trim, packaging, delivery,
   and tracking review.

The historical $29/$12 calculation was written before the current
EUR-base/USD-contextual pricing was verified. Recalculate margin from a fresh
Prodigi quote in the sale currency before changing the gate. This is a release
gate, not a profit promise.

Prodigi setup references:

- https://www.prodigi.com/shopify-print-on-demand-app/support/configure-your-products/
- https://support.prodigi.com/hc/en-us/articles/13157931074076-Can-I-pause-orders
- https://www.prodigi.com/products/prints-and-posters/art-prints/enhanced-matte-art/

## Prodigi Mapping Status — 2026-07-24

All fifteen SKUs are mapped in the Prodigi sales channel
(vre00g-8b.myshopify.com) to **ART-FAP-EMA-8X10** — EMA, Enhanced Matte Art
Paper, 200gsm, 8x10in, unframed, giclée. ART-FAP-EMA-8X10 and GLOBAL-FAP-8X10
are spec- and price-identical; ART-FAP was chosen for the explicit EMA family
code and its listed US/NL/UK facilities. Every production upload is the exact
2400 × 3000 px 300-DPI JPEG; Prodigi rates each "Excellent" (matches its
recommended dimensions exactly). Crop verified per product in the design
editor: scale 100%, offsets 0, border 0cm, full bleed, no cut-off, no
distortion. Per-product shipping preference is set to **Standard**. The
account-level order pause is **"Pause indefinitely, until manually released"**
(set and re-verified 2026-07-24). No order, sample, or payment was made.

**Billing blocker:** Prodigi shows "You will need to set up billing details to
automatically fulfil orders" on every configurator. Auto-fulfilment cannot run
until the owner adds billing in Prodigi → Settings → Billing.

**Legacy fixed-cost gate result: FAIL at Standard shipping.** Live Prodigi quotes for
ART-FAP-EMA-8X10 (account bills in EUR; ECB rate 1.1392 USD/EUR, 2026-07-23):

| Destination | Method   | Item  | Shipping | Tax   | Landed (EUR) | Landed (USD) | ≤ $12? |
| ----------- | -------- | ----- | -------- | ----- | ------------ | ------------ | ------ |
| US          | Budget   | €7.91 | €6.02    | €0.00 | €13.93       | $15.87       | No     |
| US          | Standard | €7.91 | €10.41   | €0.00 | €18.32       | $20.87       | No     |
| CY          | Budget   | €5.00 | €3.75    | €1.75 | €10.50       | $11.96       | Yes    |
| CY          | Standard | €5.00 | €10.25   | €3.05 | €18.30       | $20.84       | No     |

Quotes are identical for every one of the 15 products (same Prodigi SKU).
The Standard quote failed the original $12 landed-cost ceiling. That ceiling
does not account for the delivery charge collected from the customer. A
2026-07-28 Storefront API cart check produced the following provisional
single-print economics:

| Destination | Item charged | Delivery charged | Customer total | Prodigi landed cost | Gross contribution | Contribution rate |
| ----------- | ------------ | ---------------- | -------------- | ------------------- | ------------------ | ----------------- |
| Cyprus      | EUR 29.00    | EUR 3.99         | EUR 32.99      | EUR 18.30           | EUR 14.69          | 44.5%             |
| US          | USD 34.00    | USD 19.00        | USD 53.00      | USD 20.87           | USD 32.13          | 60.6%             |

The contribution figures are before Shopify payment fees, refunds, chargebacks,
and any later tax, shipping, or FX changes. They use the 2026-07-24 Prodigi
quote and must be refreshed before the final launch decision. On this basis,
Standard shipping has a positive provisional margin even though the legacy
fixed-cost ceiling failed. Owner acceptance replaces the old ceiling only when
recorded explicitly.

All 15 products are active and visible through the configured production
Storefront API. Shopify can create a one-item cart, returns the delivery rates
above, and reports Visa, Mastercard, American Express, Shop Pay, Apple Pay, and
Google Pay support. Shopify rejects automated requests that follow the generated
checkout URL with `403 Request Forbidden`, so final checkout and payment must be
verified in a real browser. Activation did not add Prodigi billing or verify
physical quality.

| Product             | Shopify SKU   | Prodigi product / size   | Production file                    | Crop                 | Mapping                        | Shopify status     |
| ------------------- | ------------- | ------------------------ | ---------------------------------- | -------------------- | ------------------------------ | ------------------ |
| Quiet Form I        | CM-QF-01-8X10 | ART-FAP-EMA-8X10, 8x10in | quiet-form-01-8x10-300dpi.jpg      | Full bleed, verified | Fulfilled by Prodigi, Standard | Active; gates open |
| Quiet Form II       | CM-QF-02-8X10 | ART-FAP-EMA-8X10, 8x10in | quiet-form-02-8x10-300dpi.jpg      | Full bleed, verified | Fulfilled by Prodigi, Standard | Active; gates open |
| Quiet Form III      | CM-QF-03-8X10 | ART-FAP-EMA-8X10, 8x10in | quiet-form-03-8x10-300dpi.jpg      | Full bleed, verified | Fulfilled by Prodigi, Standard | Active; gates open |
| Patina Blue I       | CM-PB-01-8X10 | ART-FAP-EMA-8X10, 8x10in | patina-blue-01-8x10-300dpi.jpg     | Full bleed, verified | Fulfilled by Prodigi, Standard | Active; gates open |
| Patina Blue II      | CM-PB-02-8X10 | ART-FAP-EMA-8X10, 8x10in | patina-blue-02-8x10-300dpi.jpg     | Full bleed, verified | Fulfilled by Prodigi, Standard | Active; gates open |
| Patina Blue III     | CM-PB-03-8X10 | ART-FAP-EMA-8X10, 8x10in | patina-blue-03-8x10-300dpi.jpg     | Full bleed, verified | Fulfilled by Prodigi, Standard | Active; gates open |
| Neo Deco I          | CM-ND-01-8X10 | ART-FAP-EMA-8X10, 8x10in | neo-deco-01-8x10-300dpi.jpg        | Full bleed, verified | Fulfilled by Prodigi, Standard | Active; gates open |
| Neo Deco II         | CM-ND-02-8X10 | ART-FAP-EMA-8X10, 8x10in | neo-deco-02-8x10-300dpi.jpg        | Full bleed, verified | Fulfilled by Prodigi, Standard | Active; gates open |
| Neo Deco III        | CM-ND-03-8X10 | ART-FAP-EMA-8X10, 8x10in | neo-deco-03-8x10-300dpi.jpg        | Full bleed, verified | Fulfilled by Prodigi, Standard | Active; gates open |
| Midnight Garden I   | CM-MG-01-8X10 | ART-FAP-EMA-8X10, 8x10in | midnight-garden-01-8x10-300dpi.jpg | Full bleed, verified | Fulfilled by Prodigi, Standard | Active; gates open |
| Midnight Garden II  | CM-MG-02-8X10 | ART-FAP-EMA-8X10, 8x10in | midnight-garden-02-8x10-300dpi.jpg | Full bleed, verified | Fulfilled by Prodigi, Standard | Active; gates open |
| Midnight Garden III | CM-MG-03-8X10 | ART-FAP-EMA-8X10, 8x10in | midnight-garden-03-8x10-300dpi.jpg | Full bleed, verified | Fulfilled by Prodigi, Standard | Active; gates open |
| Sunlit Mosaic I     | CM-SM-01-8X10 | ART-FAP-EMA-8X10, 8x10in | sunlit-mosaic-01-8x10-300dpi.jpg   | Full bleed, verified | Fulfilled by Prodigi, Standard | Active; gates open |
| Sunlit Mosaic II    | CM-SM-02-8X10 | ART-FAP-EMA-8X10, 8x10in | sunlit-mosaic-02-8x10-300dpi.jpg   | Full bleed, verified | Fulfilled by Prodigi, Standard | Active; gates open |
| Sunlit Mosaic III   | CM-SM-03-8X10 | ART-FAP-EMA-8X10, 8x10in | sunlit-mosaic-03-8x10-300dpi.jpg   | Full bleed, verified | Fulfilled by Prodigi, Standard | Active; gates open |

Print quality "Excellent" refers to Prodigi's resolution rating of the file,
not a physical print inspection; no samples were ordered by explicit decision.

### Controlled sample acceptance

Use Quiet Form I (`CM-QF-01-8X10`), Patina Blue II
(`CM-PB-02-8X10`), and Neo Deco III (`CM-ND-03-8X10`). Keep the order paused
until the three variants, files, 8 × 10 EMA mapping, shipping method, and charge
have been checked.

All three must arrive with the complete uncropped composition, trim error no
more than 2 mm, clean colour and dark detail, no visible pixelation, banding,
ink defects, scuffs, creases, or corner damage, and dry undamaged white-label
packaging. Tracking must match the selected service. Retain the paused-order
screenshot, release time, invoice, tracking dates, product and packaging
photos, measurements, and per-design pass/fail. Approve recurring single-print
economics from a single-unit quote; do not use consolidated sample shipping to
approve the normal margin.

## Existing Catalog Reset

The live Storefront API check on 2026-07-23 initially returned 47 available
products. The Admin API subsequently found 49 ACTIVE legacy products, including
generic, unrelated, heavy, electrical, and designer-authenticity-risk items.

On 2026-07-23, all 49 were moved to **DRAFT** with zero failures. The script
wrote an ignored local restoration file at
`scripts/unpublished-products-backup.json` before changing statuses, and the
post-change Admin query confirmed `productsCount(status:active) = 0`.

The first nine original-art replacements were created as **DRAFT** on
2026-07-23; the six Midnight Garden and Sunlit Mosaic products followed on
2026-07-24. By 2026-07-28, all fifteen were **ACTIVE**, available for sale, and
visible through the configured production Storefront API. Each has one READY
image, one untracked 8 × 10 shipping variant, a unique `CM-...-8X10` SKU, and a
base price of EUR 29. The US storefront presents USD 34 through contextual
Shopify Markets pricing.

`app/lib/catalogFilters.ts` retains an explicit allowlist containing only the
fifteen original-art handles as a second storefront safety layer. Draft is
preferred to deletion because it preserves product media and data.

## Launch Sequence

1. Completed: deploy the original-art previews and truthful early-access state.
2. Completed: restore Shopify Admin write access.
3. Completed: move all 49 legacy products to Draft with a restoration backup.
4. Completed: create and verify all fifteen replacement products as Draft.
5. Completed: connect Prodigi to Shopify.
6. Completed 2026-07-24: mapped all 15 SKUs to ART-FAP-EMA-8X10, verified
   crop/price/shipping and the indefinite order pause.
7. Completed outside the documented gate: all 15 originals are Active and
   storefront-visible.
8. Blocked: automatic fulfillment cannot operate until the owner adds Prodigi
   billing. The Standard cost gate failed and no physical samples have passed.
9. Owner decision required: keep the prints Active or return them to Draft;
   approve shipping method, target markets, pricing, and the recurring
   single-print landed-cost ceiling.
10. Owner payment approval required: order Quiet Form I, Patina Blue II, and
    Neo Deco III as a controlled paused sample batch and retain inspection
    evidence before scaling.
11. Add a multi-buy offer only after three-item routing and economics are
    verified without using consolidated shipping to approve single-print
    economics.
