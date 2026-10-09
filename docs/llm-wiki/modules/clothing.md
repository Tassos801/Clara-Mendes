# Clothing

Snapshot: 2026-10-08

## Status

`/clothing` is a permanent destination for all Clara Mendes clothing. It was
built on branch `codex/clothing-destination-2026-10-08` and was uncommitted
when this page was written. Nothing in it is live until the branch is merged
and deployed. No Shopify change was made. The catalogue facts below come from
the saved read-only snapshot `docs/audits/clothing-catalog-2026-10-08.json`.

Operator steps: [Clothing destination guide](../../clothing-destination.md).
Before/after map and prepared Shopify changes:
[Catalogue audit](../../audits/clothing-catalog-2026-10-08.md).

## How It Works

- Classification is merchant-owned. A product is clothing if its product type
  is an exact garment type, or it has the tag `clara-mendes-clothing`. Titles
  and vendors never decide. Source: `app/lib/clothing.ts`.
- Garment **categories** (Leggings, Bras, Shorts, Tops, Dresses, Skirts,
  Trousers, Knitwear, Outerwear, One-pieces) come from the product type.
  **Capsules** are Shopify collections that are `quiet-current` or have the
  collection metafield `custom.collection_kind` = `capsule` (single line text).
  A collection named after a category, or on the legacy handle list, is never a
  capsule. The two are shown separately.
- `app/lib/clothing.server.ts` loads every page of matching products from the
  Storefront API, then filters with `filterDemoProducts` before computing
  categories or capsules. Unpublished products never arrive.
- Eligibility is `isStoreThemeProduct` / `isListedProduct` in
  `app/lib/catalogFilters.ts`. A handle already released in
  `PRODUCT_RELEASE_FLAGS` keeps its release path (the four Quiet Current
  handles). A future garment needs clothing membership **and** the product
  metafields `custom.storefront_approved` and `custom.fulfillment_verified`,
  both Boolean `true` and readable by the Storefront API. Missing or false
  means hidden (it fails closed). Status Active and channel publication come
  from the Storefront API itself.
- `fulfilmentWindows` in `app/lib/storefrontBasics.ts` returns the verified
  Printful windows for the four Quiet Current handles only. Any other garment
  gets `null`: the product page says shipping is calculated at checkout, and
  the product's structured data has no `shippingDetails`. A new garment needs a
  code change and its own verified estimate.
- Page: `app/routes/clothing.tsx`. Sorting and paging (12 per page, "Show
  more") are in `app/lib/clothingPresentation.ts`. Category links and the sort
  menu show only when the catalogue has more than 8 pieces
  (`CLOTHING_TOOLS_MIN_PRODUCTS` = 9) or a category is already selected. The
  capsule filter shows only with 2 or more capsules, or a selected capsule.
  Page order: a compact hero (image from 700 px up), the product grid, one
  collection section with a "Choose a colourway" thumbnail chooser, and
  "Before you order" (sizing, made to order, shipping, returns). Editorial copy
  per capsule is in `app/lib/clothingEditorial.ts`; a capsule without an entry
  gets a generic block. Copy rules and evidence:
  [Copy evidence](../../clothing-destination.md#copy-evidence).
- `app/routes/collections.clothing.tsx` redirects `/collections/clothing` to
  `/clothing` (301, query string kept). The homepage section is
  `app/components/ClothingFeature.tsx`; header, mobile menu and footer links are
  in `app/components/ClaraShell.tsx`. `/clothing` is in the custom sitemap
  (`app/lib/sitemap.ts`), and the product and collection sitemaps check real
  eligibility with `no-store` caching.
- Shop All no longer lists garment types as separate tabs. It shows one
  "Clothing" tab to `/clothing` while a garment exists
  (`app/routes/collections.all.tsx`).

## Catalogue State (snapshot, 2026-10-08)

- 61 Admin products (48 Active, 13 Draft); 47 returned by the Storefront API;
  4 are clothing and all 4 are eligible.
- The 4 garments are the Quiet Current products (types Yoga Leggings, Sports
  Bra, Biker Shorts, Studio Top). All are Active, in collection
  `quiet-current`, with Shopify category "Uncategorized" and both approval
  metafields `false`. They show through the released path, not the metafields.
- Page output for the snapshot: Leggings 1, Bras 1, Shorts 1, Tops 1; capsule
  Quiet Current 4.
- 17 collections: 15 have no products (13 legacy handles and two duplicate
  "Art for Everyday Living" collections); `clara-mendes-art-living` (7 members)
  and `quiet-current` (4) have products. `custom.collection_kind` is empty on
  all 17.
- The code hides the 15 empty collections from navigation, menus, the
  homepage carousel, predictive search and the sitemap, and the 13 legacy
  handles redirect to `/collections/all`. Whether Shopify still publishes them
  is not in the snapshot.

## Prepared, Not Applied

Product categories for the four garments (leggings `aa-1-1-1-2`, bra
`aa-1-1-6`, shorts `aa-1-1-1-3`, tank `aa-1-1-2-3`), the collection metafield
definition `custom.collection_kind`, and removing the 15 empty collections from
the sales channels (not deleting them) are prepared in the audit and not done.
`scripts/sync-google-commerce-catalog.mjs` handles only the 15 original art
prints, not apparel.

Sources: `app/lib/clothing.ts`, `app/lib/clothing.server.ts`,
`app/lib/clothingPresentation.ts`, `app/lib/clothingEditorial.ts`,
`app/lib/catalogFilters.ts`, `app/lib/storefrontBasics.ts`,
`app/routes/clothing.tsx`, `scripts/clothing.node-test.mjs`,
`scripts/fulfilmentWindows.node-test.mjs`,
`docs/audits/clothing-catalog-2026-10-08.json`.

Related: [Catalog and products](catalog-and-products.md),
[Fulfillment](fulfillment.md), [Routes and pages](routes-and-pages.md),
[Quiet Current launch record](../../quiet-current-release.md).
