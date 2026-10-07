# Catalog And Products

## Pastel Forms Launch (2026-10-02)

Four pastel plant-pot products are Active at EUR 29.99, with untracked
made-to-order inventory, true approvals and publication to both Clara Mendes
Headless channels. Each exact Prodigi mapping was saved and reloaded as
automatic `PLANT-POT`, Excellent image quality, Standard shipping and the
matching production JPEG. The four release flags and Plant Pots type expose
the PDPs; `/pastel-forms` uses channel-visible localized prices and matching
links, failing closed for missing or unreleased products.

The pot-only EU-27 profile charges EUR 6.99. All 108 four-design/country
Storefront cart checks passed. Supplier quotes were EUR 19.60-19.61 per pot
including UK untracked shipping, but excluding possible recipient import
charges. The owner explicitly approved these costs and a first-paid-order
physical quality review instead of a sample. Neither a physical sample nor
a completed paid-order fulfillment is verified. See
[Pastel Forms Plant Pots](../../pastel-plant-pots.md).

## 2026-09-30 - Art Tough Phone Case Draft

The owner requested all 24 released artworks on an everyday accessory for
popular phones. Shopify product `16107883462990`, handle
`art-tough-phone-case`, is DRAFT with 24 Artwork values, 40 Phone Model values
and 960 variants at provisional EUR 39.99. Its 24 source artwork media are
READY, `publishedAt` is null, and both custom approval metafields are false.
No publication mutation was made; the installed app lacks `read_publications`
for an independent all-channel audit. The production PDP returned 404.

Forty official Prodigi templates were checked, but only two exact matte provider
SKUs have public confirmation. Every variant still needs account mapping,
production crop/file review, finished-case imagery and delivered-cost evidence.
The current PDP's 100-variant/10-image query and existing snap-case handling
need work before this product can release. The old snap-case Draft and source
prints remain separate.

Source: [Art Tough Phone Case runbook](../../art-tough-phone-case.md),
`data/art-tough-phone-case.json`, `scripts/stage-art-tough-phone-case.mjs`.

## Current Picture

The 49 legacy products were moved to Draft on 2026-07-23. The replacement is an
owned fifteen-product wall-art collection. All fifteen Shopify records are
Active, available for sale, visible through the configured production
Storefront API, and mapped to Prodigi. Activation did not resolve the failed
Standard-shipping cost gate, missing Prodigi billing, or missing physical
samples.

The storefront no longer uses an email-only early-access CTA. All 15 previews
now resolve to the Active products and the existing product, cart, and checkout
path. A Draft or unpublished handle would remain a non-interactive preview.

## Original Art Replacement

| Capsule         | Product handles                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Quiet Form      | `quiet-form-i-art-print`, `quiet-form-ii-art-print`, `quiet-form-iii-art-print`                |
| Patina Blue     | `patina-blue-i-art-print`, `patina-blue-ii-art-print`, `patina-blue-iii-art-print`             |
| Neo Deco        | `neo-deco-i-art-print`, `neo-deco-ii-art-print`, `neo-deco-iii-art-print`                      |
| Midnight Garden | `midnight-garden-i-art-print`, `midnight-garden-ii-art-print`, `midnight-garden-iii-art-print` |
| Sunlit Mosaic   | `sunlit-mosaic-i-art-print`, `sunlit-mosaic-ii-art-print`, `sunlit-mosaic-iii-art-print`       |

Each live product has an 8 × 10 inch variant at EUR 29.99, a 16 × 20 variant at
EUR 39.99, and a 20 × 24 variant at EUR 49.99. The 20 × 24 size was activated
2026-08-10 after all 15 `GLOBAL-FAP-20X24` Prodigi mappings were individually
confirmed. Source metadata is in
`data/original-art-catalog.json`; the mutating
`scripts/sync-original-art-catalog.mjs` remains a Draft staging command and must
not be run as a way to preserve the current Active state.

Each live print has the flat artwork plus three generated room
views for each of the three live sizes: one clean warm-neutral sofa scene and
two sage-wall scenes, for ten READY images per product. Sofa images use the
same artwork at relative widths of 1:2:2.5 for 8 × 10, 16 × 20, and 20 × 24.
All scenes are composited by `scripts/generate-room-mockups.mjs` and
`scripts/generate-sofa-mockups.mjs` from owned backdrops into
`public/images/product-art-mockups/` (scene geometry in
`scripts/lib/room-mockup-scenes.mjs`, layout-tested by
`scripts/roomMockups.node-test.mjs` and `scripts/sofaMockups.node-test.mjs`).
`scripts/sync-room-mockups.mjs`
(`catalog:art:mockups:sync`) appends them to the ACTIVE products via
`productCreateMedia` only — it is the safe apply path for live products,
idempotent by alt text; future media syncs plan all six sage-wall mockups.
`scripts/sync-sofa-mockups.mjs` has a read-only live preflight, verifies source
identity and READY state, requires the exact three-size variant set, and rejects
crossed or extra variant associations. It uploads and verifies new sofa media,
associates exactly one matching sofa image to each Size variant, and verifies
the replacement state before removing a legacy overlay. Product cards keep the
flat featured image, while the PDP leads with the selected variant's sofa scene
and filters the rest of the gallery to that size. The production catalog audit
also validates each exact size-to-sofa media association.

The 2026-08-11 production migration verified all 15 Active products with ten
READY media each and one exact sofa association for every live Size variant.
All 15 legacy text-overlay sofa media records were removed only after each
replacement state passed readback. The 45 clean sofa assets and the selected
variant gallery behavior are live on Oxygen.
The 20 × 24 production and mockup assets use the same centred 5:6 full-bleed
crop and a context width ratio of `0.48`, exactly 2.5 times the 8 × 10 width.

`data/art-product-extensions.json` and
`scripts/prepare-art-product-extensions.py` define twelve additional product
families and generate local Prodigi production candidates plus committed review
previews. `scripts/sync-art-product-extensions.mjs` is dry-run by default and
creates or updates the Shopify records as **DRAFT** only after an explicit
`--apply`. SKU, shipping, margin, and physical-sample gates still apply.
All twelve records, totalling 71 variants, were created and passed live Shopify
readback on 2026-07-24; none were published.

The Classic Framed Art Print — 16 × 20 in release was reversed on 2026-08-24
after the owner clarified that the separate offer must sell the frame only,
not a print bundled with a frame. The product is Draft, unpublished from both
the `Clara Mendes` and `Clara Mendes Headless` catalogs, and its release flag is
false. Prodigi `GLOBAL-CFP-16X20` necessarily includes a fine-art print and is
therefore not a valid fulfillment mapping for the corrected offer. On
2026-09-01 the Fine Art Greeting Card and Fine Art Postcard became the first
extension families to go live (flags true, products Active, Budget letter
post, a dedicated €2.90 "Letter post" shipping profile). On 2026-09-23 the
Stretched Canvas Art family became Active and available in all five artwork
variants after Prodigi mapping, cost, and Storefront cart checks; the owner
waived physical samples. Its release flag is true. The other nine extension
flags remain false and their products are Draft. The Art for Everyday Living
manual collection now contains the canvas, greeting card, and postcard. The calendar family
was re-pointed at the 2027 edition the same day (manifest `edition` +
`previousHandles`; the live record still awaits the in-place rename script).

The replacement is a frame-only product with one `Size` option: 8 × 10 in,
16 × 20 in, and 20 × 24 in, no `Artwork` option, and copy stating that the
print is not included. Its manifest record (Natural Classic Frame), sync/audit
support, and storefront experience were built on 2026-08-24 and staged behind
the false release flag — but the build overstated its fulfilment mapping as a
dashboard-verified "GLOBAL-CFP family with blank removable insert". A
2026-08-31 audit corrected this: no such Prodigi product exists, no dashboard
verification was recorded, and the live Shopify record is still the retired
five-variant framed print with its `Prodigi Mapping Pending` tag. The real
frame-only candidate is Prodigi's Backloader frames range
(`GLOBAL-CFP-<SIZE>-BACKLOADER` — the classic frame sold without a print).
The 2026-09-01 dashboard readback verified `GLOBAL-CFP-16X20-BACKLOADER`
(€18.00 wholesale, Natural among eight order-level colours, present in the
Shopify channel SKU picker, blank face-plate image required at order time) but
found **no 8 × 10 and no 20 × 24 backloader** — the family's nearest sizes are
6 × 8/11 × 14 and 18 × 24/20 × 28. Release remains blocked on an owner
decision about the size range (change it, substitute nearest sizes, or source
those frames elsewhere) plus retail price approval; the manifest's
€32.50/€50.00/€64.29 are provisional placeholders.

On 2026-08-24, its five product previews were rebuilt from Prodigi's official
Natural classic-frame blank and the exact live artwork. The deterministic
generator preserves the art pixels, uses the true 16:20 opening, scales the
frame face to the published 20 mm width, and leaves no mat between art and
frame. `scripts/classicFrameMockups.node-test.mjs` guards those dimensions and
pixel identity. `scripts/sync-classic-frame-mockups.mjs` is the guarded live
media path: it stages local files, waits for READY, orders the accurate set
first, and assigns one exact image to each Artwork variant without changing the
product record or fulfillment mapping.

The retired complete-framed-print merchandising is gated off and is not part
of the live homepage, catalog, cross-sells, sitemap, or PDP surface. The 15
unframed products and their 8 × 10, 16 × 20, and 20 × 24 in variants remain
unchanged.

Sources: [Original Art Launch](../../original-art-launch.md),
[Art for Everyday Living](../../art-product-extensions.md).

## Catalog Filtering

`app/lib/catalogFilters.ts` uses an explicit fifteen-handle launch allowlist.
Old or supplier-imported products cannot appear in catalog, search,
recommendations, or direct product routes merely because they are active in
Shopify. Admin status is still the authoritative cross-channel control. The
intended state is now 15 Active originals, 2 Active extensions (greeting
card, postcard), 10 Draft extensions, and 49 Draft legacy products. The
filters also know retired extension handles (`isRetiredExtensionHandle`)
and derive the shop's type-filter tabs from the released families
(`releasedExtensionProductTypes`).

It defines:

- Five original-art capsule previews.
- Legacy/off-theme collection handles, including empty home-goods navigation
  left by the previous catalog.
- Off-theme product handles.
- Unfulfillable product handles.
- The fifteen approved original-art product handles plus released extensions.
- Home-goods terms.
- Off-theme vendor and product terms.
- `isStoreThemeProduct`.
- `filterDemoProducts`.
- `filterDemoCollections`.

This filtering is used by home, collection, product, and search routes.

## Storefront Product Behavior

Product cards use `ClaraProductCard` and product-card fragments to display
storefront product data consistently. On collection and capsule shopping pages,
the 15 originals also show one concise editorial story per artwork. Those
stories live beside the artwork metadata in `data/original-art-catalog.json`
and are resolved by `getProductStory`; cards outside shopping pages keep the
compact title-and-price treatment. Product pages add:

- Variant option selection.
- Size-specific living-room imagery led by the selected variant.
- Add-to-cart analytics.
- Shopify ProductView analytics.
- Ad platform product view event.
- JSON-LD product schema.
- Recently viewed persistence.
- Shop Pay button when available.
- An explicit three-size promise for unframed prints.

Sources: `app/components/ClaraProductCard.tsx`,
`app/lib/productCardFragment.ts`, `app/lib/productCopy.ts`,
`app/routes/collections.all.tsx`, `app/routes/collections.$handle.tsx`,
`app/routes/products.$handle.tsx`.

## Your Sky Guided Configurator

The 2026-09-01 approved single-page refinement is implemented and locally
verified. Your Sky now exposes Linen, Midnight Garden, and Quiet Form; shows the
selected unframed, natural-frame, or black-frame presentation around the live
artwork; and presents the product story and price before configuration on
mobile. The place field is an accessible combobox with complete keyboard,
empty, failure, retry, and clear states. A validated versioned draft survives
same-tab navigation, and an explicit reset clears it.

The purchase flow follows Personalise, Size and finish, then Review and buy.
The review repeats style, title, place, date/time, size, finish, and price.
Add-to-cart remains unavailable until the current validated inputs match the
latest successful render, so a stale or failed preview cannot be purchased.
The signed cart normalizes the customer-visible Style label from the trusted
theme identifier; its canonical signed fields and order pipeline are unchanged.

Primary sources: `app/components/SkyConfigurator.tsx`,
`app/lib/sky/configuratorState.ts`, `app/lib/sky/params.ts`,
`app/lib/sky/products.ts`, `app/routes/products.$handle.tsx`, and
`app/styles/app.css`. Behavioral contracts live in
`scripts/skyConfigurator.node-test.mjs`, `scripts/skyParams.node-test.mjs`,
`scripts/skyProducts.node-test.mjs`, and
`docs/superpowers/specs/2026-09-01-your-sky-refinement-design.md`.

The refinement is deployed in production at `/products/your-sky-star-map` from
merge commit `300c87d` (PR #64). The six Shopify SKUs, prices, Prodigi mappings,
PDF geometry, checkout integration, and First Light release state remain
explicitly unchanged.

## Admin Cleanup Relationship

The code filters off-theme products defensively, but the Admin cleanup document
says unwanted products and collections should be cleaned at the Shopify source
so they cannot leak into search, feeds, SEO, or future storefront routes.

Source: [Shopify Admin cleanup](../operations/shopify-admin-cleanup.md).

## 2026-09-18 - Sci-fi & Cinema Drafts

Four additional print compositions are staged as Drafts: Orbital Silence,
Neon After Rain, Desert Signal, and The Fold. Each has one unframed 8 × 10
variant at EUR 29.99, one READY flat-artwork image, tracked inventory of zero,
and DENY inventory policy. Fresh Admin readback and CDN requests verified all
four; the 29 pre-existing Clara Mendes product records were unchanged.

Definitions and generation briefs are kept separately in
`data/scifi-cinema-catalog.json`; review WebP assets are under
`public/images/product-art/scifi-cinema/`. An independent release gate in
`app/lib/scifiArt.ts` gates the four handles in catalogue listing and
product sitemaps until enabled. The shop gains a Sci-fi & Cinema filter only
after a verified member releases; the five legacy capsules and the
fifteen-original Draft-reset sync remain unchanged. The local
2400 × 3000 / 300-DPI JPEG candidates are resized from 1122 × 1402 source PNGs,
so native detail remains approximately 140.2 PPI at 8 × 10 inches. New-SKU
Prodigi mappings, crop review and channel publication were open at staging. Product-page
size copy now reads the actual Shopify size options instead of promising the
legacy three-size range for every art print.

**Superseded 2026-09-18 (product pipeline):** `data/scifi-cinema-catalog.json`,
`app/lib/scifiArt.ts` and `SCIFI_ART_RELEASE_FLAGS` no longer exist. The four
prints are the first collection in `data/print-catalog.json`; see "Print
Catalog And Product Pipeline" below.

**Released 2026-09-18:** all four are mapped to Prodigi `ART-FAP-EMA-8X10`
(Standard, full bleed, automatic fulfilment), Active with untracked inventory,
published to the Clara Mendes and Clara Mendes Headless channels, and enabled
in `SCIFI_ART_RELEASE_FLAGS`; the Sci-fi & Cinema shop filter is live.
Physical print quality is unverified until the first order.

Source: [Sci-fi & Cinema prints](../../scifi-cinema-prints.md).

## Print Catalog And Product Pipeline

New print collections are data, not code. `data/print-catalog.json` holds each
collection (title, shop-filter note, SKU code, copy, sales channels, size
variants with price and Prodigi SKU) and each print (copy, `released`, Shopify
ids, verified Prodigi channel product per size). `app/lib/printCatalog.ts`
derives handles, titles, SKUs and image paths, and feeds
`computeSellableHandles`, `isUnreleasedExtensionHandle` (sitemap gate) and
`listShopCapsules` (shop filter, members = released prints only). Collections
without a landing page link to `/collections/all?capsule=<slug>`.
`validatePrintCatalog` refuses a `released` print that lacks Shopify ids or a
verified mapping for any size; the test suite runs it on the shipped file.

`scripts/product.mjs` (`npm run product -- <step> <collection>`) runs the
launch: `status`, `prepare`, `stage`, `expand`, `handoff`, `mapped`, `rooms`, `media`,
`release`, `verify`. `rooms` generates selected room scenes and keeps a hash
manifest; `media` verifies it against current artwork and backgrounds before
uploading to a Draft or Active product, without changing its status.
Writes to Shopify need `--apply`; every step is idempotent and leaves evidence
in the launch folder. Pure logic is in `scripts/lib/product-pipeline.mjs`.
The dual gate is unchanged: `released: true` deployed AND the Shopify product
Active and published.

The fifteen launch originals, the extension families and the personalised
products are not in this file and keep their own registries and runbooks.

Source: [Adding prints runbook](../../add-products-runbook.md),
`scripts/printCatalog.node-test.mjs`, `scripts/productPipeline.node-test.mjs`.

**Prepared 2026-09-22:** Light & Silence adds five original AI-generated,
photo-inspired monochrome nature prints in the existing three sizes. The
catalog released all five in all three sizes on 2026-09-23 after Prodigi
mapping (15 variants, Excellent, automatic) and a Storefront API check. The
owner accepted the source softness and 20×24 crop
after reviewing the previews; physical print quality is still unverified.
Five artwork sources, five WebP previews, and 20 room mockups were prepared.
See [Light & Silence launch](../../light-and-silence-launch.md).

## 2026-09-22 - Staged sizes and tailored room galleries

Each released print now records `releasedSizes`, the subset of the
collection's `variants` a shopper can buy; the catalog validator requires
Shopify variant ids and verified Prodigi mappings only for those sizes, and
the shop-filter size copy is the intersection across released prints. Two
pipeline steps were added: `expand` creates missing size variants on live
products without touching existing ones, and `media` reconciles an exact
five-image gallery (flat artwork first, then four tailored room scenes from
`print.rooms`, generated by `scripts/generate-print-room-mockups.mjs`).
`release` refuses to run until every catalog size is mapped in Prodigi and the
gallery reads back complete. Sci-fi & Cinema is the first collection with
16×20 (€39.99) and 20×24 (€49.99) staged this way.

## 2026-10-03 - CJ book nook pilot

Twilight Library is the first curated supplier kit. `data/curated-products.json`
and `app/lib/curatedProducts.ts` add verified curated handles to the existing
allowlist and derive category navigation. Shopify Active/publication remains
the second gate. Release needs product, variant and delivery-profile ids, a
verified supplier connection, shipping copy and checked destinations. Unknown
supplier imports are still hidden. Kit copy and processing differ from prints;
`ProductShippingText` keeps existing printed-product and plant-pot terms.

See [CJ book nook launch](../../book-nooks-launch.md) for the exact SKU,
Shopify ids, €69 CY/DE delivery profile, IOSS configuration, margin assumptions
and first-order payment checks. A supplier payment and physical sample remain
unverified; automatic CJ payment was not enabled.

## 2026-10-03 - Book nook themes, page and branded images

Curated entries now carry presentation fields: `name`, `theme`, `tagline`,
`specs`, `processing`, `images` (with generation recipes) and `cutout`.
`app/lib/bookNooks.ts` holds the five themes, shelf ordering, spec rows, build
level and the delivery promise shared by every released nook. Book nooks have
a `/book-nooks` page and a homepage shelf; the product page shows the short
name, theme, a kit spec grid and other nooks as related products.

`withCuratedImages` swaps Shopify's supplier photos for the branded set on
cards, the product gallery, search, cart lines and recommendations; Shopify
media itself is unchanged. See [Book nook catalogue](../../book-nooks-catalog.md)
for the image pipeline and the add-a-kit steps.

## 2026-10-04 - Ten book nooks

Ten released nooks across four themes (Libraries & Studies 1, Streets &
Shops 3, Magic & Myth 3, Gardens & Seasons 3); registry order is the shelf
number. Pieces, build time and age are optional specs; size and lighting are
required, and `bookNookFactLine` falls back to the size. Studio image recipes
accept a `crop` rectangle in place of an outline, and grid tiles may be
`{source, crop}` from another supplier photo. CJ listing pitfalls (all
channels on list, Cyprus lane, one listing per CJ product) are recorded in
the [CJ book nook launch](../../book-nooks-launch.md#listing-a-kit-through-cj).

## 2026-10-04 - Twilight Library image refinement

The local gallery begins with four generated settings containing the original
photographed Twilight Library kit: linen studio, reading shelf, sage corner
and evening desk. Only backgrounds are generated. The existing image pipeline
supports a studio `background` and pixel placement, uniformly resizes the
supplier object without colour changes or reconstructed details, and verifies
every fully opaque product pixel after lossless WebP encoding. The supplier
angle, front, detail and parts views remain in the gallery. Original files,
source hashes and generation prompts are retained. These are styled composites,
not sample photographs. See [Book nook catalogue](../../book-nooks-catalog.md)
for regeneration and provenance. Shopify media and deployment are separate.

## 2026-10-04 - Twilight Library social campaign

Four organic photo posts using the refined Twilight Library scenes were
scheduled through Meta Business Suite to Facebook Clara Mendes and Instagram
@shopclaramendes on 11, 17, 22 and 27 October, each at 19:30 Europe/Nicosia.
The Scheduled queue readback confirmed eight Public photo rows with the correct
dates, platform-specific captions and attached media. Each caption identifies
the DIY kit and discloses that the original kit photograph is in a generated
setting. Unrelated scheduled content was preserved and no boost was bought.
See [Book nook social campaign](../../social/book-nooks-launch-2026-10.md)
for exact captions, media exports and verification evidence.


## 2026-10-06 - Storefront copies of the scene composites

The four Twilight Library scene composites are lossless WebP (about 0.85 to
1 MB each) so every supplier product pixel is provably unchanged, and
`/public` files have no resizer: a 160 px shop card downloaded the full file.
`curatedDisplaySrc` now serves a lossy `<name>.display.webp` (quality 84,
same 1000 × 1250, 122 to 157 KB) for any image whose recipe has a generated
`background`; the lossless file stays the record. `npm run curated:images`
writes both and `--check` requires both. `scripts/bookNooks.node-test.mjs`
guards size and presence.

## 2026-10-05 - Twilight Library image application

The four brand scenes are uploaded to Shopify with generated-setting alt
text. The linen scene is assigned to the existing Twilight Library variant;
all six supplier media remain. The storefront gallery has eight images,
starting with the four scenes. Price, SKU and fulfilment fields are unchanged.
See [Book nook catalogue](../../book-nooks-catalog.md) for the current scope.

## Catalog Price Refresh (2026-10-06)

Shopify Admin readback verified all 57 products and 1,276 variants at their
previous selling price multiplied by 0.90, rounded to two decimals using
integer-cent arithmetic. This includes Draft products without publishing them.
All comparison prices are null and the store has no separate price lists.
Statuses, handles, descriptions, SKUs and variant options were preserved.
Historical launch prices elsewhere on this page are snapshots, not the current selling prices.

Product cards, variants, search, cart and structured data read Shopify prices.
The shared Your Sky headline price is EUR 35.99. Recently viewed storage uses
v4 to discard earlier price snapshots. No customer-facing promotion copy or
sale styling was added.

Sources: `app/lib/featurePages.ts`, `app/lib/recentlyViewed.ts`.

## 2026-10-07 - Quiet Current activewear (Printful)

Four Printful all-over-print products, each in Clay / Oat and Moss / Mist,
XS–XL (40 variants): `quiet-current-high-waist-leggings`,
`quiet-current-studio-bra`, `quiet-current-high-waist-biker-shorts` and
`quiet-current-studio-tank`. The owner authorized launch on 7 October 2026,
and all four release flags are true in the launch change
(`app/lib/catalogFilters.ts`); deployment and publication are in progress.
A true flag adds the product's type (Yoga Leggings, Sports Bra, Biker Shorts,
Studio Top) to the shop's type tabs
whether or not the product is visible, so the flags flip in the same step as
publishing the products and the `quiet-current` collection.

The collection route's handle-only guard admits `quiet-current` when any
member product is released; its post-query guard still hides an empty
Shopify collection. This also lets the real collection URL remain in the
Shopify sitemap after release.

All 40 variants are synced in Printful to the v2 review templates and verified
per size and colourway, and the Printful billing method is set. The EUR
profile is complete, and all four descriptions carry the US fabric
disclosure. Publish after the flag deployment and verify the live purchase
path. Store-wide automated checkout delivery dates remain unchanged; the
launch authorization did not separately approve changing that setting. See
[Quiet Current release gate](../../quiet-current-release.md).
