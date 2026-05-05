# Clara Mendes Product Sourcing Automation

Use this workflow to find, score, add, audit, and maintain a small Clara Mendes product catalog. The store should stay capped at 10 products until fulfillment, margins, and customer service are proven.

## Current Recommendation

Keep the first active batch at 6 products:

| Product | Source cost | Retail | Gross margin before shipping/fees | Weight |
| --- | ---: | ---: | ---: | ---: |
| Sera Woven Table Runner | $2.72-$4.80 | $24-$32 | 85.0%-88.7% | 190-240 g |
| Sol Linen Cushion Cover | $3.05 | $22 | 86.1% | 171 g |
| Alba Cotton-Linen Cushion | $1.92-$7.68 | $19-$34 | 77.4%-89.9% | 70-600 g |
| Vale Walnut Storage Tray | $3.35-$11.44 | $24-$49 | 76.7%-86.0% | 240-870 g |
| Clara Waffle Cotton Throw | $5.80-$15.75 | $39-$79 | 80.1%-85.1% | 420-1,420 g |
| Luma Tassel Cotton Throw | $8.51-$19.70 | $29-$69 | 70.7%-73.1% | 320-820 g |

These products are already active and published in Shopify. The live audit report is generated at:

```bash
npm run products:cj:audit
```

## Product Filters

Reject products that fail any hard filter:

- Gross margin before shipping, payment fees, returns, and ads must be at least 70%.
- Preferred packed weight is under 900 g; only accept heavier products when retail price comfortably supports shipping.
- No electronics, plug-in lighting, batteries, fragile ceramics, oversized baskets, liquids, supplements, cosmetics, or child/baby safety products in the first launch phase.
- Product must have clean variant names, stable SKUs, and at least 3 usable product images.
- Product must fit Clara Mendes: quiet home objects, soft textiles, small storage, table accents, or lightweight lifestyle accessories.

## Scoring

Score every candidate out of 100 before adding it to `data/cj-products/launch-batch.json`.

| Criteria | Points |
| --- | ---: |
| Gross margin after source cost | 25 |
| Low shipping weight/size | 20 |
| Clara Mendes brand fit | 20 |
| Low return/damage risk | 15 |
| Supplier image quality | 10 |
| Variant simplicity | 5 |
| Bundle/cross-sell potential | 5 |

Only add products scoring 75 or higher. Products scoring 65-74 can be sample-first candidates. Anything below 65 should be rejected.

Generate the score report:

```bash
npm run products:cj:score
```

The command writes:

- `data/cj-products/product-score-report.json`
- `data/cj-products/product-score-report.csv`

## Best Automation Path

1. Discover products in CJ Dropshipping, Syncee, or Trendsi using the hard filters above.
2. Record the source URL, source SKU, cost, weight, approved variants, retail price, tags, and image URLs.
3. Add the product to `data/cj-products/launch-batch.json`.
4. Regenerate the Shopify CSV:

   ```bash
   npm run products:cj:csv
   ```

5. Run a dry run:

   ```bash
   npm run products:cj:publish:dry
   ```

6. If the product should be managed by CJ fulfillment, list it from CJ first, then use Shopify edits for copy, pricing, tags, images, and publication.
7. Audit live Shopify products:

   ```bash
   npm run products:cj:audit
   ```

8. If a live product needs a focused media/copy/pricing repair, scope the live update by handle:

   ```bash
   npm run products:cj:publish:live -- --handles=product-handle-1,product-handle-2
   ```

9. Regenerate the CJ connection worksheet:

   ```bash
   npm run products:cj:connections
   ```

## Next Product Slots

Do not rush to fill all 10 slots. Add only 2-4 more products after the current 6 have CJ fulfillment connections and samples pass quality checks.

Best next home-goods candidates:

- Solid or lightly textured pillow cover set, preferably under 650 g.
- Cotton bath towel only after sample confirms softness, thickness, wash quality, and color accuracy.
- Small fabric storage pouch or table linen bundle under 400 g.
- Lightweight decorative tray or catchall under 700 g.

Hold these for later:

- Ceramic vases and planters: good brand fit, but fragile and heavier.
- Large woven baskets: good brand fit, but bulky and more expensive to return.
- Wired lighting: certification, plug type, voltage, and return risk are too high for the first launch.

## Shopify Store Domains

Use `vre00g-8b.myshopify.com` for Shopify CLI Admin operations. Use the storefront domain from `.env` for Hydrogen storefront configuration.
