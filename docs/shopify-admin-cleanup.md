# Shopify Admin Cleanup Checklist

Snapshot date: 2026-04-28
Store: `vre00g-8b.myshopify.com`

The storefront code now hides off-theme catalog items, but Shopify Admin still
contains products and collections that should not remain published for Clara
Mendes. Clean these at the source so they cannot leak into search, feeds, SEO,
or future storefront routes.

## Product Actions

Preferred action: unpublish these products from the Headless storefront channel.
If they are no longer needed anywhere, set them to draft or delete them.

| Product                   | Handle                      | Admin URL                                                         |
| ------------------------- | --------------------------- | ----------------------------------------------------------------- |
| Daily Hydration Bottle    | `daily-hydration-bottle`    | https://admin.shopify.com/store/vre00g-8b/products/15778584625486 |
| Glow Reset Ice Roller     | `glow-reset-ice-roller`     | https://admin.shopify.com/store/vre00g-8b/products/15778584527182 |
| Glow Tools Duo            | `glow-tools-duo`            | https://admin.shopify.com/store/vre00g-8b/products/15778584559950 |
| GoddessYou Signature Case | `goddessyou-signature-case` | https://admin.shopify.com/store/vre00g-8b/products/15778584330574 |
| Reset Journal             | `reset-journal`             | https://admin.shopify.com/store/vre00g-8b/products/15778584658254 |
| Soft Sleep Satin Set      | `soft-sleep-satin-set`      | https://admin.shopify.com/store/vre00g-8b/products/15778584592718 |
| The Daily Carry Pouch     | `the-daily-carry-pouch`     | https://admin.shopify.com/store/vre00g-8b/products/15778584363342 |

These GoddessYou-origin products fit the home-goods edit, but they are now
hidden from the custom storefront until each variant has a CJ SKU or CJ variant
ID for automatic fulfillment:

| Product                | Handle                   | Reason                   |
| ---------------------- | ------------------------ | ------------------------ |
| Drawer Reset Bundle    | `drawer-reset-bundle`    | Storage/home reset fit   |
| Soft Reset Candle      | `soft-reset-candle`      | Scent/home ritual fit    |
| The Home Ritual Warmer | `the-home-ritual-warmer` | Lighting/home ritual fit |

## Collection Actions

Preferred action: remove these collections from Headless publication or delete
empty/off-theme collections if they are not needed in Admin.

| Collection                     | Handle                         | Admin URL                                                          | Notes                              |
| ------------------------------ | ------------------------------ | ------------------------------------------------------------------ | ---------------------------------- |
| Daily Carry                    | `daily-carry`                  | https://admin.shopify.com/store/vre00g-8b/collections/687703163214 | Contains tech/personal accessories |
| Evening Gowns & Formal Dresses | `evening-gowns-formal-dresses` | https://admin.shopify.com/store/vre00g-8b/collections/687657353550 | Off-brand formalwear               |
| Home page                      | `frontpage`                    | https://admin.shopify.com/store/vre00g-8b/collections/687656042830 | Default starter collection         |
| Glow Tools                     | `glow-tools`                   | https://admin.shopify.com/store/vre00g-8b/collections/687703294286 | Beauty/personal-care items         |
| Health & Wellness              | `health-wellness`              | https://admin.shopify.com/store/vre00g-8b/collections/687657484622 | Off-brand health category          |
| Wellness Reset                 | `wellness-reset`               | https://admin.shopify.com/store/vre00g-8b/collections/687703327054 | Journal/bottle category            |

Keep or build around:

| Collection   | Handle         | Admin URL                                                          | Notes                                           |
| ------------ | -------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| Gift Sets    | `gift-sets`    | https://admin.shopify.com/store/vre00g-8b/collections/687703392590 | Empty or needs merchandising                    |
| Home Rituals | `home-rituals` | https://admin.shopify.com/store/vre00g-8b/collections/687703228750 | Contains the three home-fit GoddessYou products |

## Verification After Admin Cleanup

Run these after the Admin changes:

```powershell
npm run typecheck
npm run lint
npm run build
npx shopify hydrogen check routes
```

Then verify the live catalog snapshot:

- `/collections/all` should show only Clara Mendes home goods plus approved
  home-ritual products.
- `/sitemap/products/1.xml` should not include the off-theme product handles.
- `/sitemap/collections/1.xml` should only include intended public collections.
