# Clara Mendes Original Art Launch

Updated: 2026-07-23

## Launch Decision

Clara Mendes will lead with a small owned collection rather than another large
catalog of generic supplier products. The first collection contains nine
original 4:5 wall-art works across three coordinated capsules:

| Capsule     | Products               | Palette                                          |
| ----------- | ---------------------- | ------------------------------------------------ |
| Quiet Form  | Quiet Form I, II, III  | Ivory, oat, sand, terracotta, charcoal           |
| Patina Blue | Patina Blue I, II, III | Chalk, indigo, cobalt, slate, sienna             |
| Neo Deco    | Neo Deco I, II, III    | Antique cream, black, oxblood, green, muted gold |

The initial sellable format is deliberately limited to one unframed 8 × 10 inch
print at $29. Larger sizes must not be added until a higher-resolution production
workflow and physical samples have passed review.

## Asset State And Provenance

- The nine source artworks were generated with the built-in OpenAI image
  generator on 2026-07-23 from original, text-free briefs.
- Every source is a 1120 × 1400 RGB PNG with a 4:5 aspect ratio.
- The artwork contains no product mockup, room scene, frame, logo, signature,
  readable text, or watermark.
- Web previews are optimized WebP files under
  `public/images/product-art/<capsule>/`.
- Local 2400 × 3000, 300-DPI JPEG sample files are prepared under
  `output/product-art/print-8x10-300dpi/`. They are sample candidates created
  with a lossless-quality resize; they are not evidence of print quality.
- AI generation cannot guarantee that no visual resemblance exists anywhere in
  the wider art market. Run a visual-similarity and trademark review before
  paid scale.

The catalog metadata and stable product handles live in
`data/original-art-catalog.json`. Rebuild the web and sample assets with:

```powershell
python .\scripts\prepare-original-art-assets.py
```

## Shopify Product Staging

`scripts/sync-original-art-catalog.mjs` idempotently upserts the nine products
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

Use Printify or Printful for the first sample comparison. Do not activate or
publish a product until all of these are confirmed:

1. The print-provider product is connected to the exact Shopify variant SKU.
2. An 8 × 10 sample has acceptable colour, paper, edge detail, and packaging.
3. US tracked delivery time and the real landed cost are documented.
4. Landed cost is no more than $12 at the $29 retail price.
5. A test order reaches the correct provider automatically.
6. The Shopify product description matches the sampled paper and fulfilment
   facts.
7. The product is published only to the intended sales channels.

At $29 retail, a $12 landed cost and a 2.9% + $0.30 payment-fee assumption leave
about $15.86, or 54.7%, before advertising, returns, support, and tax. This is a
gate, not a profit promise.

Printify and Printful both support free entry without inventory commitments:

- https://printify.com/pricing/
- https://www.printful.com/pricing

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
5. Next: connect one free POD provider and order physical samples.
6. Activate only sampled, mapped products.
7. Launch the individual prints first; add a “pick any 3 for $79” automatic
   discount only after the three-item landed cost and fulfilment routing are
   verified.
