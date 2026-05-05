# CJ Product Import Workflow

Operational workflow for listing selected CJ Dropshipping products into Shopify for Clara Mendes while preserving CJ order fulfillment linkage.

## Guiding Rule

Create the Shopify product through CJ's List flow first. That is what links the CJ product and variants to the Shopify product/variant IDs for fulfillment. After that link exists, edits in Shopify should refine copy, merchandising, images, collections, and publish state without deleting or recreating the linked variants.

Do not manually create the same product in Shopify first. Do not delete and rebuild CJ-listed variants after import. If a product needs a clean restart, remove it from Shopify and CJ's listed-products area, then list it again from CJ.

## 1. Confirm The Import Batch

1. Start from the approved CJ shortlist and select only the products marked for the current batch.
2. In CJ, confirm each selected product still has the needed variants, inventory, ship-to country, processing time, and shipping estimate.
3. Exclude fragile, oversized, electronic, or visually inconsistent products until samples and shipping details are approved.
4. Record the final selected CJ product URL, intended Shopify handle, collection, tags, launch price, and variant notes before listing.

## 2. Prepare Shopify Merchandising

Create or verify Shopify collections before listing from CJ:

- `Textiles`
- `Table`
- `Storage`
- `Accents`
- `Ceramics`
- `Bath`

Use tags consistently so products can be filtered and reviewed:

- Source tag: `source:cj`
- Status tag before publishing: `status:draft-review`
- Category tags: `category:textiles`, `category:table`, `category:storage`, `category:accents`, `category:ceramics`, `category:bath`
- Batch tag: `batch:cj-YYYY-MM-DD`
- Optional launch tag after approval: `launch:ready`

Keep Clara Mendes as the vendor or brand-facing vendor unless the Shopify theme or fulfillment app requires a different internal value.

## 3. List From CJ Into Shopify

For each selected product:

1. Open the product in CJ Dropshipping.
2. Click `List`.
3. Select the connected Clara Mendes Shopify store.
4. Choose only approved variants. Remove loud colors, duplicate sizes, or variants that do not fit the Clara Mendes edit.
5. Set title, product type, vendor, collection, and tags where CJ allows it.
6. Set product status to draft or unpublished if available.
7. Set prices and compare-at prices from the approved pricing sheet or generated product data.
8. Keep CJ-generated SKUs, variant mapping, and fulfillment linkage intact.
9. Submit the listing and confirm it appears in CJ's listed-products area.
10. Open the resulting Shopify product and confirm the variants match the CJ-listed variants.

If CJ creates imperfect copy or images, accept the draft import first. Clean it up in Shopify after confirming the CJ listing exists.

## Admin Automation Domain

Use the store's permanent Shopify Admin domain for CLI operations, not necessarily the storefront domain used by Hydrogen. For Clara Mendes, Shopify CLI auth resolves to:

```bash
vre00g-8b.myshopify.com
```

Authenticate with the required store scopes before running live product automation:

```bash
npm exec --yes @shopify/cli@latest -- store auth --store vre00g-8b.myshopify.com --scopes read_products,write_products,read_inventory,read_publications,write_publications
```

Run `npm run products:cj:publish:dry` before any live run. The publisher creates new products using the batch status and preserves existing product status when updating already-live products.

For targeted maintenance, scope the live update to specific product handles:

```bash
npm run products:cj:publish:live -- --handles=product-handle-1,product-handle-2
```

The publisher only sends product image files when a product is new or when an existing product has zero Shopify media, which reduces the chance of disturbing already-reviewed product galleries.

## 4. Clean Product Images

After the CJ listing appears in Shopify:

1. Remove supplier logos, watermarks, shipping badges, promotional text, and collage images.
2. Delete images that show inaccurate colors, cluttered props, poor crops, or off-brand styling.
3. Keep a clear primary image that shows the actual product without heavy filters.
4. Reorder images so the first 3-5 frames show the product, scale, texture, and main variant differences.
5. Rename alt text in Clara Mendes language, focusing on material, product type, color, and room context.
6. For variants, confirm each visible option has the correct image assignment.

Do not replace images with unrelated lifestyle photography that hides the real product.

## 5. Draft Review In Shopify

Before activation, review each draft product:

1. Confirm product title, handle, description, product type, vendor, collection, and tags.
2. Confirm every variant has the intended option name, price, compare-at price, SKU, inventory behavior, and image.
3. Confirm CJ-linked SKUs and variants were not changed in a way that breaks order matching.
4. Confirm shipping profile, market availability, tax settings, and product status.
5. Check mobile and desktop product pages for image order, variant selector behavior, price display, and copy fit.
6. Place a test order if the product is high-risk, expensive, fragile, or has complex variants.
7. In CJ, confirm the Shopify product still appears as listed and linked.

Hold the product if any variant has unclear shipping cost, weak imagery, unknown material, questionable dimensions, or unverified packaging.

## 6. Activate The Product

When the draft passes review:

1. Remove `status:draft-review`.
2. Add `launch:ready` or the active campaign tag.
3. Set the Shopify product status to active.
4. Confirm it appears in the intended collection and storefront navigation.
5. Check the live product page once after publishing.
6. Save the CJ URL, Shopify admin URL, product handle, and launch date in the product tracking source.

After the first real order, verify the order appears in CJ for fulfillment. If it does not, pause the product and inspect variant SKU/mapping before accepting more orders.

## Recovery Notes

- If a Shopify draft was created manually, do not rely on it for CJ fulfillment. Re-list the product through CJ.
- If a linked product needs copy or image changes, edit the existing Shopify product.
- If variants need major restructuring, prefer re-listing from CJ over rebuilding variants by hand.
- If a CSV update is used for copy, handles, tags, collections, or images, import against the existing CJ-listed Shopify product and avoid overwriting CJ-linked variant identifiers.

## Recovery For Manual Shopify Listings

If CJ blocks product-page automation or human verification prevents listing through CJ, manually-created Shopify products can be recovered by connecting the existing store products inside CJ after verification is cleared.

1. Regenerate the live connection worksheet:

   ```bash
   npm run products:cj:connections
   ```

2. Open `data/cj-products/cj-shopify-connection-worksheet.csv`.
3. In CJ, go to `Products > Store Products > Unconnected`.
4. Use `Connect` or `Add Automatic Connection` for each Shopify product.
5. Match variants using the Shopify product ID, Shopify variant SKU, option values, CJ source SKU, and CJ product URL from the worksheet.
6. In Shopify, confirm the product inventory/fulfillment manager is Shopify or CJdropshipping, not another fulfillment app.
7. Sync or place one test order and verify it appears in CJ before relying on automatic fulfillment.

Do not delete and recreate the live Shopify products unless CJ cannot connect them. Deleting would change product and variant IDs, which can break storefront links, reports, and any orders already placed.
