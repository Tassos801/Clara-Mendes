# CJ Product Batch Data

This folder contains the first 10-product Clara Mendes CJ Dropshipping launch batch.

The repeatable sourcing workflow and scorecard live in
`guides/clara-product-sourcing-automation.md`.

## Files

- `launch-batch.json` is the source of truth for approved products, variants, copy, tags, pricing, CJ URLs, and draft status.
- `shopify-import-clara-cj-launch-2026-04-26.csv` is a draft Shopify CSV worksheet generated from the JSON data.
- `cj-shopify-connection-worksheet.csv` maps live Shopify product and variant IDs back to the CJ source products for recovery connection work.
- `cj-shopify-connection-worksheet.json` is the same live-store mapping in structured form.
- `cj-connection-checklist.md` is the grouped CJ connection checklist for matching each Shopify product and variant in CJ.

## Store Domains

- `storeDomain` records the storefront-facing Shopify domain used by Hydrogen.
- `adminStoreDomain` records the permanent `.myshopify.com` domain required by Shopify CLI Admin operations.

For Clara Mendes, Shopify CLI auth resolves to `vre00g-8b.myshopify.com`, so Admin scripts should use that domain even when the storefront env points at `firemerch-7685.myshopify.com`.

Authenticate before live Admin operations:

```bash
npm exec --yes @shopify/cli@latest -- store auth --store vre00g-8b.myshopify.com --scopes read_products,write_products,read_inventory,read_publications,write_publications
```

Regenerate the CSV after edits:

```bash
npm run products:cj:csv
```

Audit the live Shopify products against the approved batch:

```bash
npm run products:cj:audit
```

Apply a narrowly scoped live update by handle:

```bash
npm run products:cj:publish:live -- --handles=product-handle-1,product-handle-2
```

Score the approved batch or future candidate batch:

```bash
npm run products:cj:score
```

Regenerate the live Shopify/CJ connection worksheet:

```bash
npm run products:cj:connections
```

## Current Live Status

As of the latest audit, all 10 products are active and published to both the Clara Mendes channel and Online Store publication. The only remaining product-media warning is `clara-waffle-cotton-throw`, which has 2 Shopify images instead of the preferred 3+.

## Fulfillment Warning

For live products, list products through CJ Dropshipping first so CJ can map the Shopify product and variant IDs for fulfillment.

The CSV is meant for merchandising setup, copy review, pricing review, and draft import testing. If products are created only through the CSV, the variants use manual fulfillment and will not automatically preserve CJ fulfillment linkage.

If products were already created manually in Shopify, use the connection worksheet to connect the existing Shopify products in CJ:

1. In CJ, open `Products > Store Products > Unconnected`.
2. Use `Connect` or `Add Automatic Connection`.
3. Match each Shopify product/variant by the worksheet's Shopify product ID, variant SKU, option values, CJ source SKU, and CJ product URL.
4. After connecting, place or sync a test order and confirm the order appears in CJ before accepting volume.

Until this is complete, orders for these products remain manual-fulfillment orders in Shopify.
