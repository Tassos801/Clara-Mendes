# Art for Everyday Living

Updated: 2026-08-31

## Collection Shape

The Clara Mendes original-art range now has a Draft product architecture for
every Prodigi family selected for expansion. Each product page uses the five
art capsules as the primary variant option, keeping the storefront compact
while still offering Quiet Form, Patina Blue, Neo Deco, Midnight Garden, and
Sunlit Mosaic.

The phone-case product adds a second device option for four verified iPhone 15
models. The 2026 calendar combines all five capsules into one edition.

| Product                                 | Shopify variants | Provisional retail | Prodigi mapping target              | Mapping evidence               |
| --------------------------------------- | ---------------: | -----------------: | ----------------------------------- | ------------------------------ |
| Large Fine Art Print — 16 × 20 in       |                5 |                $49 | GLOBAL-FAP-16X20                    | Candidate; verify in dashboard |
| Natural Classic Frame (frame only)      |                3 |      €32.50–€64.29 | GLOBAL-CFP-\<SIZE\>-BACKLOADER      | Candidate; verify in dashboard |
| Fine Art Greeting Card                  |                5 |                 $8 | GLOBAL-GRE-MOH-7X5-BLA              | Public catalogue               |
| Fine Art Postcard                       |                5 |                 $6 | GLOBAL-POST-MOH-7X5                 | Public catalogue               |
| Art-Cover Spiral Notebook               |                5 |                $24 | US-NB-LINED-6X8                     | Public catalogue               |
| Art-Cover Gratitude Journal             |                5 |                $32 | GJ-A5-SB-S-C-P                      | Public catalogue               |
| Clara Mendes Art Calendar 2026          |                1 |                $29 | CALENDAR-A4-L-DATED                 | Public catalogue               |
| Stretched Canvas Art — 16 × 20 in       |                5 |                $89 | GLOBAL-CAN-16X20                    | Public catalogue               |
| Art Canvas Tote                         |                5 |                $45 | H-BAG-CTB                           | Public catalogue               |
| Art Linen Cushion — 24 × 24 in          |                5 |                $69 | GLOBAL-CUSH-24X24-LIN               | Public catalogue               |
| Art Premium Fleece Blanket — 30 × 40 in |                5 |                $79 | GLOBAL-BLANKET-PREMIUM-FLEECE-30X40 | Public catalogue               |
| Art Snap Phone Case                     |               20 |                $34 | Device-specific GLOBAL-TECH SKUs    | Public catalogue               |

Total: 12 Draft products, with 69 variants in the current manifest. (The
2026-07-24 sync predates the frame-only correction and created 71; the live
classic-frame record still holds the retired five-variant shape.)

On 2026-07-24, the guarded sync created all 12 products in Shopify as
`DRAFT`. The live readback passed for 12/12 products, all 71 variants, expected
prices and inventory flags, and READY product images. None were published.

The 2026-07-28 preflight repeated the live 12/12 Draft audit and validated 94
production/review files plus 56 Shopify preview images. This proves local file
integrity and Shopify staging only. The 71 variants are not yet confirmed as
mapped inside the connected Prodigi account.

The 2026-08-10 readback still found all 12 families Draft and unpublished. The
blanket candidate's five Shopify variants were EUR 49 while this manifest
requires EUR 79, so its storefront release flag was returned to `false`.

On 2026-08-21, the Classic Framed Art Print became the first released family.
All five art variants are mapped for automatic Prodigi fulfilment to
`GLOBAL-CFP-16X20` with Natural frames, EMA 200gsm paper, no mat, Perspex
glazing, Excellent image quality, and Standard shipping. The owner approved
the EUR 99 retail price and waived a physical sample for this release. Shopify
status is Active and publication is limited to the `Clara Mendes` and
`Clara Mendes Headless` catalogs. The storefront release flag admits the frame
and the `Art for Everyday Living` collection; all other families stay hidden.

On 2026-08-24, the owner corrected the commercial intent: the separate offer
must sell framing only, not a print bundled with a frame, and must use the same
three sizes as the prints (8 × 10, 16 × 20, and 20 × 24 in). The complete
framed-print product was immediately returned to Draft, unpublished from both
storefront catalogs, and gated off in Hydrogen. Prodigi's `GLOBAL-CFP` family
always includes a fine-art print, so that mapping is incompatible with the
corrected frame-only offer and must not be reused. A frame-only product remains
blocked until its fulfillment source and three retail prices are approved.

Later that evening, the frame-only replacement was built in code: this
manifest's `classic-frame` record became the three-size Natural Classic Frame,
the guarded sync and audit learned the `frameOnly` shape, and the storefront
experience was staged behind the still-false release flag. That commit
recorded the mapping as a "GLOBAL-CFP exact-size family with blank removable
insert" with `verified-dashboard` status — a claim with no supporting
evidence. No dashboard verification was logged, no sync `--apply` ran, and
the live Shopify record still carries its `Prodigi Mapping Pending` and
`Cost Gate Pending` tags.

On 2026-08-31, that claim was audited and corrected. Prodigi's public
catalogue confirms the plain `GLOBAL-CFP-<size>` SKUs are always framed
fine-art prints; the "classic frame blanks" download is mockup imagery, not a
physical insert. Prodigi does, however, sell the same classic frame without a
print: the Backloader frames range (`GLOBAL-CFP-<SIZE>-BACKLOADER`, "picture
frame only", Natural finish available, made in the UK, EU, and US, wholesale
from £18). That family is now recorded as the candidate mapping. Release stays
blocked until the dashboard confirms exact 8 × 10, 16 × 20, and 20 × 24 in
backloader SKUs with EUR costs and Shopify-channel availability, and the owner
approves the fulfillment source and the three retail prices. The manifest
prices (€32.50 / €50.00 / €64.29) are provisional cost-plus placeholders, not
owner-approved retail. The Shopify record has not been re-synced to the
frame-only shape; it remains the Draft, unpublished five-variant framed print.

On 2026-09-01, the Fine Art Greeting Card and Fine Art Postcard became the
first released extension families. All gates passed that day against the live
dashboard: both families re-verified 5/5 "Fulfilled by Prodigi automatically"
(`GLOBAL-GRE-MOH-7X5-BLA`, `GLOBAL-POST-MOH-7X5`, every asset Excellent),
billing card on file with per-order EUR invoicing, and the 24-hour order-edit
window confirmed. Delivered costs were quoted in-dashboard (card €1.90 item
incl tax; Budget shipping €5.12 DE / €6.37 CY incl tax; postcard ~€0.25 less)
and the channel shipping method for both families was switched from Standard
to Budget — letter items ship in an envelope/OPP bag, and Standard's €8.60
Cyprus rate would sink the price point. The owner approved €8.00 / €6.00
retail and waived the physical sample after reviewing the Excellent dashboard
results (same precedent as the framed release). Because the store's general
shipping rates are built for tubes (€16 international), a dedicated
"Letter post - cards & postcards" Shopify shipping profile now carries both
products: one zone covering the 15 market countries, flat €2.90, 5–8 business
days. Unit margin at Budget on a solo order: card ≈ €3.9 (DE) / €2.6 (CY);
postcard ≈ €2.2 (DE) / €0.9 (CY). Both products are Active, published to the Clara Mendes and
Clara Mendes Headless catalogs plus Facebook & Instagram (mirroring the live
prints), their three Pending gate tags are removed, and the storefront flags
are true. The first real card order is the first physical QC
(`docs/first-order-runbook.md`).

On 2026-09-01, the calendar family was re-pointed at the 2027 edition. Prodigi's
public product page states the dated calendar SKUs now include 2027 date grids
(`CALENDAR-A4-L-DATED` is season-rolled by Prodigi; our 14 uploaded sides are
artwork-only and year-agnostic, so the existing dashboard attachment remains
valid). The manifest handle/title/SKU moved to
`clara-mendes-art-calendar-2027` / "Clara Mendes Art Calendar 2027" /
`CM-CAL-A4-2027`, the Edition option value became 2027, and the storefront
preview was regenerated with the 2027 title. **Ordering constraint:** the live
Shopify record must be renamed in place (same product id — title, handle,
Edition value, SKU) BEFORE any `sync-art-product-extensions.mjs --apply` run;
the sync upserts by handle, so syncing first would create a duplicate product
and orphan the mapped one. The in-place rename is prepared as a by-id script
(productUpdate + productOptionUpdate + productVariantsBulkUpdate, preserving
the variant id and therefore the Prodigi channel mapping); it could not be run
this session because the Admin API client-credentials exchange failed —
resolve credentials or rename via Admin UI, then re-verify the channel mapping
still shows 1/1 with all 14 sides. The family stays Draft and its release flag
stays false.

## Artwork Policy

The production files preserve the original Clara Mendes artwork. Product
adaptations use deterministic resizing, cropping, mirroring, framing, and
layout only. No artwork is repainted or replaced during format adaptation.

The original source files are approximately 1120 × 1400 pixels. Larger
wall-art files are exported to the dimensions requested by Prodigi, but this
does not prove physical sharpness. Physical sampling remains the default for
the large print and canvas; the owner explicitly waived it for the released
frame after reviewing the dashboard's Excellent quality result.

Generated files are stored under the ignored
`output/prodigi-product-files/` directory. The generated manifest records each
file's dimensions, DPI metadata, and SHA-256 digest. Storefront preview images
are tracked under `public/images/art-product-extensions/`.

The five Classic Framed Art Print previews are composed from Prodigi's own
Natural [Classic frame blank](https://www.prodigi.com/download/blanks/prodigi-classic-frame-blanks.zip)
and the unchanged live Shopify artwork. The generator enforces the product's
16:20 opening, Prodigi's published 20 mm frame face, and the configured no-mat
finish. It does not redraw the art or invent a different frame profile.

## Reproduction

```powershell
python .\scripts\prepare-art-product-extensions.py
node .\scripts\generate-classic-frame-mockups.mjs
node .\scripts\sync-classic-frame-mockups.mjs
python .\scripts\validate-art-product-files.py
node .\scripts\sync-art-product-extensions.mjs
```

The sync command is a dry run by default. After the preview images are
deployed and publicly reachable:

```powershell
node .\scripts\sync-art-product-extensions.mjs --apply
node .\scripts\audit-art-product-extensions.mjs
```

Both scripts require the existing Shopify Admin credential file. The sync
script creates or updates products as `DRAFT`; it does not publish them.

The frame-media sync is a separate, released-product-safe path. It stages the
five local files directly to Shopify, waits for READY status, orders them first,
and associates one exact image with each Artwork variant. Removing superseded
Shopify media requires the separate `--delete-old` mode after explicit approval.

## Storefront Staging

The Hydrogen storefront hides every extension family via the allowlist in
`app/lib/catalogFilters.ts`. The phone case additionally has its full
storefront experience pre-built behind `EXTENSION_RELEASE_FLAGS`; its flip
procedure is `docs/phone-case-release.md`.

The frame-only replacement's storefront experience is built and staged dark
behind the same false release flag. It exposes one `Size` option with 8 × 10,
16 × 20, and 20 × 24 in values, no `Artwork` option, and every customer-facing
surface states that the print is not included. Do not flip the release flag or
restore the retired framed-print cross-sells: the Shopify record is still the
old framed print and the backloader mapping is unverified and unapproved.

Until superseded Admin media have been removed, the storefront also rejects
frame imagery that is not labelled as the Prodigi Natural classic frame with
no mat. Product cards prefer the mapped variant image and the framed PDP
gallery admits only the five supplier-accurate previews.

## Release Gates

Every unreleased family remains blocked from publication until:

1. The exact Shopify variant is mapped to the correct Prodigi SKU.
2. Prodigi crop, bleed, safe area, print side, and device template are checked.
3. Delivered cost is quoted for the priority US and Cyprus destinations.
4. Retail price and shipping method meet an approved margin.
5. Prodigi billing is configured and the indefinite order pause is
   re-verified.
6. At least one physical sample per material family passes colour, sharpness,
   trimming, construction, packaging, and tracking review.

The existing art prints (now sold in three sizes) stay separate and unchanged.
Their current Prodigi mappings are not modified by this extension.
