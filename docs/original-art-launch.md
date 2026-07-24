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

## Existing Catalog Reset

The live Storefront API check on 2026-07-23 initially returned 47 available
products. The Admin API subsequently found 49 ACTIVE legacy products, including
generic, unrelated, heavy, electrical, and designer-authenticity-risk items.

On 2026-07-23, all 49 were moved to **DRAFT** with zero failures. The script
wrote an ignored local restoration file at
`scripts/unpublished-products-backup.json` before changing statuses, and the
post-change Admin query confirmed `productsCount(status:active) = 0`.

The nine original-art replacements were then created as **DRAFT** and read back
from Shopify. All nine have one READY image, one untracked 8 × 10 shipping
variant, a unique `CM-...-8X10` SKU, a $29 price, and no Online Store
publication.

`app/lib/catalogFilters.ts` retains an explicit allowlist containing only the
nine original-art handles as a second storefront safety layer. Draft is
preferred to deletion because it preserves product media and data.

## Launch Sequence

1. Completed: deploy the original-art previews and truthful early-access state.
2. Completed: restore Shopify Admin write access.
3. Completed: move all 49 legacy products to Draft with a restoration backup.
4. Completed: create and verify the nine replacement products as Draft.
5. Completed: connect Prodigi to Shopify.
6. Next: map each exact SKU to Enhanced Matte Art and verify crop, price,
   shipping, and the account-level order pause.
7. Activate only mapped products.
8. Launch the individual prints first; add a “pick any 3 for $79” automatic
   discount only after the three-item landed cost and fulfilment routing are
   verified.
