# Clara Mendes Original Art Launch

Updated: 2026-07-24

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
print at $29. Larger sizes must not be added until a higher-resolution production
workflow and physical samples have passed review.

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
inches is the intended product. Do not activate or publish a product until all
of these are confirmed:

1. The print-provider product is connected to the exact Shopify variant SKU.
2. Prodigi's crop preview shows the complete composition with no unintended
   border or edge loss.
3. The selected shipping method and real landed cost are documented.
4. Landed cost is no more than $12 at the $29 retail price.
5. The account uses an order pause during the controlled launch so the first
   orders can be reviewed before production.
6. The Shopify product description matches the configured paper and fulfilment
   facts.
7. The product is published only to the intended sales channels.

At $29 retail, a $12 landed cost and a 2.9% + $0.30 payment-fee assumption leave
about $15.86, or 54.7%, before advertising, returns, support, and tax. This is a
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

**Cost gate result: FAIL at Standard shipping.** Live Prodigi quotes for
ART-FAP-EMA-8X10 (account bills in EUR; ECB rate 1.1392 USD/EUR, 2026-07-23):

| Destination | Method   | Item  | Shipping | Tax   | Landed (EUR) | Landed (USD) | ≤ $12? |
| ----------- | -------- | ----- | -------- | ----- | ------------ | ------------ | ------ |
| US          | Budget   | €7.91 | €6.02    | €0.00 | €13.93       | $15.87       | No     |
| US          | Standard | €7.91 | €10.41   | €0.00 | €18.32       | $20.87       | No     |
| CY          | Budget   | €5.00 | €3.75    | €1.75 | €10.50       | $11.96       | Yes    |
| CY          | Standard | €5.00 | €10.25   | €3.05 | €18.30       | $20.84       | No     |

Quotes are identical for every one of the 15 products (same Prodigi SKU).
Because landed cost exceeds $12 at the $29 retail price for the USD-market
destination (US) under the selected Standard method, **all 15 products remain
DRAFT and unpublished**. Options for the owner: accept Budget shipping and a
higher gate, raise retail, print larger/multi-buy formats, or accept the
margin. Catalog audit (`npm run catalog:art:audit`) passed 15/15 on 2026-07-24
after mapping.

| Product             | Shopify SKU   | Prodigi product / size   | Production file                    | Crop                 | Mapping                        | Shopify status    |
| ------------------- | ------------- | ------------------------ | ---------------------------------- | -------------------- | ------------------------------ | ----------------- |
| Quiet Form I        | CM-QF-01-8X10 | ART-FAP-EMA-8X10, 8x10in | quiet-form-01-8x10-300dpi.jpg      | Full bleed, verified | Fulfilled by Prodigi, Standard | Draft (cost gate) |
| Quiet Form II       | CM-QF-02-8X10 | ART-FAP-EMA-8X10, 8x10in | quiet-form-02-8x10-300dpi.jpg      | Full bleed, verified | Fulfilled by Prodigi, Standard | Draft (cost gate) |
| Quiet Form III      | CM-QF-03-8X10 | ART-FAP-EMA-8X10, 8x10in | quiet-form-03-8x10-300dpi.jpg      | Full bleed, verified | Fulfilled by Prodigi, Standard | Draft (cost gate) |
| Patina Blue I       | CM-PB-01-8X10 | ART-FAP-EMA-8X10, 8x10in | patina-blue-01-8x10-300dpi.jpg     | Full bleed, verified | Fulfilled by Prodigi, Standard | Draft (cost gate) |
| Patina Blue II      | CM-PB-02-8X10 | ART-FAP-EMA-8X10, 8x10in | patina-blue-02-8x10-300dpi.jpg     | Full bleed, verified | Fulfilled by Prodigi, Standard | Draft (cost gate) |
| Patina Blue III     | CM-PB-03-8X10 | ART-FAP-EMA-8X10, 8x10in | patina-blue-03-8x10-300dpi.jpg     | Full bleed, verified | Fulfilled by Prodigi, Standard | Draft (cost gate) |
| Neo Deco I          | CM-ND-01-8X10 | ART-FAP-EMA-8X10, 8x10in | neo-deco-01-8x10-300dpi.jpg        | Full bleed, verified | Fulfilled by Prodigi, Standard | Draft (cost gate) |
| Neo Deco II         | CM-ND-02-8X10 | ART-FAP-EMA-8X10, 8x10in | neo-deco-02-8x10-300dpi.jpg        | Full bleed, verified | Fulfilled by Prodigi, Standard | Draft (cost gate) |
| Neo Deco III        | CM-ND-03-8X10 | ART-FAP-EMA-8X10, 8x10in | neo-deco-03-8x10-300dpi.jpg        | Full bleed, verified | Fulfilled by Prodigi, Standard | Draft (cost gate) |
| Midnight Garden I   | CM-MG-01-8X10 | ART-FAP-EMA-8X10, 8x10in | midnight-garden-01-8x10-300dpi.jpg | Full bleed, verified | Fulfilled by Prodigi, Standard | Draft (cost gate) |
| Midnight Garden II  | CM-MG-02-8X10 | ART-FAP-EMA-8X10, 8x10in | midnight-garden-02-8x10-300dpi.jpg | Full bleed, verified | Fulfilled by Prodigi, Standard | Draft (cost gate) |
| Midnight Garden III | CM-MG-03-8X10 | ART-FAP-EMA-8X10, 8x10in | midnight-garden-03-8x10-300dpi.jpg | Full bleed, verified | Fulfilled by Prodigi, Standard | Draft (cost gate) |
| Sunlit Mosaic I     | CM-SM-01-8X10 | ART-FAP-EMA-8X10, 8x10in | sunlit-mosaic-01-8x10-300dpi.jpg   | Full bleed, verified | Fulfilled by Prodigi, Standard | Draft (cost gate) |
| Sunlit Mosaic II    | CM-SM-02-8X10 | ART-FAP-EMA-8X10, 8x10in | sunlit-mosaic-02-8x10-300dpi.jpg   | Full bleed, verified | Fulfilled by Prodigi, Standard | Draft (cost gate) |
| Sunlit Mosaic III   | CM-SM-03-8X10 | ART-FAP-EMA-8X10, 8x10in | sunlit-mosaic-03-8x10-300dpi.jpg   | Full bleed, verified | Fulfilled by Prodigi, Standard | Draft (cost gate) |

Print quality "Excellent" refers to Prodigi's resolution rating of the file,
not a physical print inspection; no samples were ordered by explicit decision.

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
2026-07-24. All fifteen were read back from Shopify with one READY image, one
untracked 8 × 10 shipping variant, a unique `CM-...-8X10` SKU, a $29 price, and
no Online Store publication.

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
7. Blocked: activation withheld — landed cost exceeds the $12 gate at Standard
   shipping (see Prodigi Mapping Status); Prodigi billing details also missing.
8. Launch the individual prints first; add a “pick any 3 for $79” automatic
   discount only after the three-item landed cost and fulfilment routing are
   verified.
