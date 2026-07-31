# Phone Case Release Runbook

Scope: releasing **Art Snap Phone Case** (`art-snap-phone-case`) to the live
storefront. The storefront work is merged and dormant; this document is the
complete flip procedure. Nothing here touches the other 11 Draft extension
families.

## Current state

- **Shopify:** product exists as `DRAFT` with 20 variants (5 Artwork × 4
  Device), created by the guarded sync on 2026-07-24 and re-audited
  2026-07-28. SKUs `CM-<capsule>-CASE-<device>`.
- **Storefront:** hidden by `EXTENSION_RELEASE_FLAGS['art-snap-phone-case']:
  false` in `app/lib/catalogFilters.ts`. Visibility requires the flag AND
  Shopify publication — neither an accidental publish nor an accidental flip
  can release alone.
- **Dormant behind the flag:** catalog allowlisting (search, collections,
  recommendations, sitemap), the "Everyday" nav link →
  `/collections/clara-mendes-art-living`, PDP case/fit copy, and a
  cross-sell card on capsule print pages that deep-links the matching
  artwork variant.

## Gates — owner sign-off before any flip

1. All 20 variants confirmed mapped to their device SKUs **inside the
   connected Prodigi dashboard** (`GLOBAL-TECH-IP15-CS-G`,
   `-IP15PR-CS-G`, `-IP15PL-CS-M`, `-IP15PM-CS-M`). The 2026-07-28
   preflight verified Shopify staging only, not in-account mapping.
2. Prodigi crop, bleed, safe area, print side, and device template checked
   per device.
3. Delivered cost quoted for US and Cyprus; margin on the $34.00 retail
   approved.
4. One physical sample passed colour, sharpness, construction, packaging,
   and tracking review (the case is its own material family — print QC does
   not cover it).
5. Clara approves the phone-case crop of each of the five artworks (review
   files from `catalog:extensions:prepare`).
6. Prodigi billing and the 24-hour auto-release window re-verified.

## Release steps

1. **Admin:** set Art Snap Phone Case to Active and publish it to the
   Headless (Hydrogen) channel; confirm membership in "Art for Everyday
   Living".
2. **Storefront:** in `app/lib/catalogFilters.ts`, set
   `'art-snap-phone-case': true` in `EXTENSION_RELEASE_FLAGS`. Open a PR;
   CI enforces lint, typecheck, test, and build.
3. Merge to `main` → production deploy.

Order matters only across step boundaries: publishing first (step 1) is
safe because the storefront still hides the product until step 3 deploys.

## Post-release QA (production)

- `/products/art-snap-phone-case` renders both option groups (Artwork ×5,
  Device ×4), $34.00, and the image swaps when Artwork changes.
- Deep link `/products/art-snap-phone-case?Artwork=Patina+Blue&Device=iPhone+15`
  preselects both options.
- A capsule print PDP shows the cross-sell card with that capsule's case
  image and working link.
- "Everyday" appears in header and mobile nav;
  `/collections/clara-mendes-art-living` lists the case; site search finds
  "phone case".
- Add to cart and open checkout: correct variant title and SKU, then stop —
  the first real case order is the first physical QC
  (`docs/first-order-runbook.md` applies).
- Admin hygiene, once true: remove the `Prodigi Mapping Pending`,
  `Cost Gate Pending`, and `Sample Gate Pending` tags. Nothing on the
  storefront reads them; they exist for Admin clarity only.

## Rollback

Either lever alone hides the product storefront-wide immediately: revert
the flag PR, or set the product back to Draft in Admin. Existing carts that
reference it will fail at checkout once unpublished — expected and safe.
