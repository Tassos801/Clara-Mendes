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

Only two exact matte provider SKUs are publicly confirmed:
`GLOBAL-TECH-IP15PL-TCB-CS-M` (iPhone 15 Plus) and
`GLOBAL-TECH-IP15PM-TCB-CS-M` (iPhone 15 Pro Max). The other 38 remain null.
Never construct a provider SKU from a naming pattern. The product makes no
MagSafe, waterproof or tested drop-protection claim.

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

## Remaining release work

1. Read exact matte product details through the authenticated Prodigi account
   for every selected device; confirm availability and supported destination
   routes. No usable Prodigi API credential or authenticated browser session was
   available to this task.
2. Prepare the 960 artwork/device print files and review their template bleed,
   safe areas, camera cutouts and final crops. Remove template guides before
   export. Source artwork is 1120 × 1400; changing DPI metadata or upscaling does
   not prove physical detail. Produce accurate finished-case previews.
3. Read back each Shopify variant's exact provider SKU, artwork file, matte
   finish, quality and automatic-fulfillment setting in Prodigi. The two public
   SKU matches do not satisfy this step.
4. Quote product, tax and delivery costs to the intended EU markets. Confirm
   margin at the provisional retail price, billing and the fulfillment release
   window; configure and verify appropriate shipping without applying the print
   or letter-post rate by assumption.
5. Obtain applicable physical quality evidence or an explicit owner waiver.
6. Implement and verify the storefront selection and gallery behavior for 960
   variants and 24 artworks before publication. The current generic PDP fetches
   `variants(first: 100)` and `images(first: 10)`; its existing snap-case fragment
   is `caseVariants: variants(first: 24)`. Current catalog allowlists do not
   release the new handle. Test every artwork/device cart path and representative
   EU shipping totals after those changes.
7. Only after the provider and consumer-path gates pass, approve and publish
   through the normal release workflow, then verify the live product again.

Sources for the storefront limits: `app/routes/products.$handle.tsx` and
`app/lib/catalogFilters.ts`. Approval metafields record the Draft's false state;
the current deployed storefront still uses its existing release registries.
