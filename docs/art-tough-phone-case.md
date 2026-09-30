# Art Tough Phone Case

The owner authorized an everyday artwork accessory and expanded it to all 24
released art prints and popular phone models on 2026-09-30. The new product is
staged in Shopify as **DRAFT**. It is not ready for consumer purchase.

## Verified Shopify record

- Product: [Art Tough Phone Case](https://vre00g-8b.myshopify.com/admin/products/16107883462990).
- ID: `gid://shopify/Product/16107883462990`; handle: `art-tough-phone-case`.
- Options: Artwork (24 values) and Phone Model (40 values), 960 combinations.
- Matte finish; provisional EUR 39.99 retail price.
- Full live pagination verified all 960 exact artwork/device tuples and unique
  SKUs, matching single artwork media, prices of 39.99, physical shipping,
  tracked zero inventory and DENY policy. The independent audit used ten pages;
  the reusable command's second readback used four pages and also passed.
- All 24 original artwork media records read back READY. They are artwork
  previews, not approved phone-case mockups or production files.
- Shopify status DRAFT, `publishedAt: null`, and both
  `custom.storefront_approved` and `custom.fulfillment_verified` false.
- No publication mutation was issued. The available app lacks
  `read_publications`, so an independent all-channel publication audit is
  unavailable. Do not report a verified zero-channel count from that limitation.
- The production URL `/products/art-tough-phone-case` returned HTTP 404 on
  2026-09-30.

The separate `art-snap-phone-case` draft is not changed. This staging operation
does not alter the 24 source prints or the production storefront.

## Artwork and device scope

The source manifest is [data/art-tough-phone-case.json](../data/art-tough-phone-case.json).
It records the exact source product, media ID, artwork SKU prefix, template URL,
native template dimensions and digest, and nullable provider SKU per device.

The artwork set contains the fifteen Quiet Form, Patina Blue, Neo Deco,
Midnight Garden and Sunlit Mosaic prints; four Sci-fi & Cinema prints; and the
five released Light & Silence prints. Unreleased artwork is excluded.

| Device family | Selected models |
| --- | --- |
| iPhone 13 | 13, 13 Mini, 13 Pro, 13 Pro Max |
| iPhone 14 | 14, 14 Plus, 14 Pro, 14 Pro Max |
| iPhone 15 | 15, 15 Plus, 15 Pro, 15 Pro Max |
| iPhone 16 | 16, 16 Plus, 16 Pro, 16 Pro Max, 16e |
| iPhone 17 | 17, 17 Pro, 17 Pro Max |
| iPhone 18 | 18 Pro, 18 Pro Max |
| Google Pixel | 8, 8 Pro, 9, 9 Pro, 9 Pro XL |
| Samsung Galaxy S23 | S23, S23 Plus, S23 Ultra, S23 FE |
| Samsung Galaxy S24 | S24, S24 Plus, S24 Ultra |
| Samsung Galaxy S25 | S25, S25 Plus, S25 Ultra |
| Samsung Galaxy S26 | S26, S26 Plus, S26 Ultra |

All 40 official PNG templates were downloaded from Prodigi and checked for
response status, native dimensions and SHA-256. The public catalog confirms
candidate model coverage. It does not establish account availability, shipping
routes, or Shopify automatic fulfillment.

All 40 exact matte, non-MagSafe SKUs (`GLOBAL-TECH-<device>-TCB-CS-M`) were
read from Prodigi's catalogue and then from the live product API
(`GET /v4.0/products/{sku}`) on 2026-09-30. Each SKU requires four attributes
with one allowed value each (`brand`, `finish: matte`, `size`, `style: Tough`);
the manifest stores them per phone as `providerAttributes`, with the API's print
area pixels. Device abbreviations are irregular (`IP14PR`, `IP13P`, `GP9PXL`,
`size: "pixel 9 xl"`, `"galaxy s23 fan edition"`): never construct them.
Re-check with `node scripts/tough-case-check-prodigi.mjs --env-dir <dir>`
(reads `.env.sky.local`; read-only product and quote calls). The product makes
no MagSafe, waterproof or tested drop-protection claim.

Primary supplier sources: [Tough phone case](https://www.prodigi.com/products/technology/phone-cases/tough-phone-case/)
and [Product details API](https://www.prodigi.com/print-api/docs/reference/#product-details).

## Staging and evidence

Run from the isolated worktree, selecting the existing environment directory
without copying or printing credentials:

```powershell
node scripts/stage-art-tough-phone-case.mjs --env-dir 'C:\Users\admin\Desktop\4. Work & Projects\shopify\clara-mendes'
node scripts/stage-art-tough-phone-case.mjs --env-dir 'C:\Users\admin\Desktop\4. Work & Projects\shopify\clara-mendes' --verify-only
```

The default is dry run. `--apply` can create or reconcile only this Draft;
it must reject an Active target, preserve existing variant IDs by the complete
Artwork/Phone Model tuple, and leave source media metadata unchanged. Verify
every page of the resulting variants: exact tuple coverage and SKU, EUR price,
matching artwork media, physical shipping, tracked zero inventory, DENY policy,
Draft status and false approvals. Publication auditing runs separately so a
missing scope cannot suppress the core product checks.

The initial creation used asynchronous Shopify `productSet`, operation
`gid://shopify/ProductSetOperation/259330244942`, which completed with no user
errors. A separate product query confirmed the resulting record. The reusable
command is used for dry run and verification after creation, avoiding another
mutation solely to produce evidence.

Local evidence is under `output/launches/art-tough-phone-case/` (ignored by Git):
source-design readback, template evidence, the initial submission, product plan,
full readback, verification report, review page and `prodigi-handoff.csv`.
The official templates are under `output/prodigi-assets/tough-phone-case/`.
Keep these local files with the worktree. The handoff must retain unknown
provider SKU and production-file fields as empty, never imply verified mapping.

Validation on 2026-09-30: live dry-run and verify-only passed; 24 focused tests
and all 300 repository tests passed. ESLint, React Router type generation,
TypeScript and the Hydrogen build passed. Direct Node entrypoints were used
because Windows npm command wrappers failed on the workspace path's ampersand.
Independent spec/safety and final code reviews passed. Markdown links were
checked. These checks establish the Draft and tooling state, not release readiness.

## Fulfilment

Case lines are **not** mapped in Prodigi's Shopify app. The `orders/paid`
webhook (`app/lib/sky/fulfilment.ts`, the Your Sky path) sends every case line
to the Prodigi API: variant SKU `<artwork prefix>-TC-<phone code>` →
`app/lib/toughCase.ts` → Prodigi SKU, attributes and the artwork's print file,
`sizing: fillPrintArea`. Prints in the same order stay with the Prodigi app.

- Print files: one 4:5 JPEG per artwork, 2000 × 2500, served from
  `public/print-files/tough-case/`. Prodigi centre-crops it to each device; the
  largest print area is 1380 × 2310 (Galaxy S23 Ultra). Generated from the
  4800 × 6000 16×20 masters (themselves upscaled from 1122 × 1402 originals) by
  `scripts/generate-tough-case-assets.mjs --source-dir …`.
- Previews: the same crop on the iPhone 16 Pro template, attached as the first
  24 product images and as every variant's image by
  `scripts/sync-tough-case-previews.mjs --env-dir … --apply`. The 24 flat print
  images Codex attached are shared with the live print products; they stay
  attached behind the previews and must not be deleted from this product.

## Costs (Prodigi live quotes, 2026-09-30)

Case €13.42 in every market. Standard shipping: most of the EU €7.53 from
Italy (3–8 days); Ireland €10.04; Cyprus €12.55 and Bulgaria €15.12 ship from
the UK. Prodigi's totals add VAT for IT-origin parcels (≈ €25 DE/GR, €28 IE);
UK-origin totals do not (€25.97 CY, €28.54 BG).

## Remaining release work

State on 2026-09-30: ACTIVE and published to the two storefront channels
(Clara Mendes, Clara Mendes Headless) for QA, still unbuyable (every variant
tracked at 0, DENY) and hidden by the storefront until the flag flips. Owner
decisions: customers pay €4.95 EU / €3.99 Cyprus; CY and BG stay open and the
owner adds an IOSS number to Prodigi's company details later.

1. Done 2026-09-30: shipping profile "Phone cases" (all 960 variants) with
   Standard €3.99 to Cyprus and Standard €4.95 to the other 26 EU countries,
   transit "None" (the storefront states dispatch and delivery windows). The
   Admin "Manage products" dialog lists only the first 50 variants of a
   product, so variants were added 40 at a time (Search by SKU,
   `<artwork prefix>-TC`) until it read "Adding 960". Re-check a variant's
   Profile column there if cases are ever re-staged.
2. Merge this PR (flag still false). Until then the live products sitemap lists
   `/products/art-tough-phone-case`, which redirects to /collections/all.
3. Release: set every variant's inventory untracked, remove the pending gate
   tags, flip `PRODUCT_RELEASE_FLAGS['art-tough-phone-case']` in
   `app/lib/catalogFilters.ts`, add the product to the Everyday collection, and
   verify add to cart, checkout shipping and one live order end to end (the
   first order is the first physical QC).
