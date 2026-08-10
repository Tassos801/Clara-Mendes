# LLM Wiki Log

## [2026-07-02] ingest | Initial Shopify codebase wiki

Created a Karpathy-style LLM wiki for the Clara Mendes Shopify Hydrogen
storefront. The initial ingest synthesized README, package metadata, Hydrogen
runtime files, route files, cart/analytics/catalog/fulfillment modules, CJ
product data, and launch/admin/fulfillment docs. Added `AGENTS.md` at repo root
to route future Codex threads to `docs/llm-wiki/index.md`.

## [2026-07-02] correction | CJ no longer current

Updated the wiki after the user clarified that Clara Mendes no longer uses CJ.
CJ-specific code, scripts, data, and docs are now described as legacy material,
and open questions now point to documenting the current non-CJ supplier and
fulfillment workflow.

## [2026-07-03] cleanup | Removed abandoned CJ integration

2026-07-03 — Removed abandoned CJ Dropshipping integration (code, scripts, data,
docs) from the repo and purged all CJ/fulfillment-webhook references from the
wiki. Deleted wiki pages: modules/fulfillment-automation.md,
modules/product-sourcing-automation.md.

## [2026-07-23] catalog | Prepared original-art replacement launch

Verified that the live Storefront API still exposed 47 available products and
that the saved Admin token had expired. Added nine original 4:5 artworks across
Quiet Form, Patina Blue, and Neo Deco; optimized storefront previews; prepared
8 × 10 sample-print candidates; added an idempotent Draft product staging
script; replaced the permissive supplier filter with a nine-product launch
allowlist; and documented the provider, sample, landed-cost, and activation
gates.

## [2026-07-24] catalog | Prepared Draft product-extension assets

Added deterministic production candidates and 56 review previews for twelve
art-product families across the five capsules. Created and audited all twelve
Shopify records as Draft, totalling 71 variants; kept the production generator
separate from the guarded Shopify sync; updated the storefront's fifteen-work
copy and print specifications; and retained SKU, shipping, margin, billing, and
physical-sample gates.

## [2026-07-24] storefront | Removed legacy navigation and email gate

Filtered empty collections from the former home-goods catalog, replaced
home-goods-only copy with print-led and product-neutral language, and removed
the customer-facing early-access mail links. Original-art previews now become
product links automatically when their handles are available through the
Storefront API; Draft works remain honest non-interactive previews until the
documented cost and billing gates are resolved.

## [2026-07-25] storefront | Added product-aware homepage editorial

Replaced the homepage's unrelated stock imagery with a coordinated art-in-room
suite built around Quiet Form, Patina Blue, and Sunlit Mosaic. Extracted the
section into a reusable component and content model, and added a
`homepage-editorial` Shopify collection integration so published product media,
titles, alt text, ordering, and links can replace the branded fallbacks without
changing storefront code.

## [2026-07-28] catalog | Reconciled Active prints with open Prodigi gates

Verified exactly 15 Active original prints available through the production
Storefront API and exactly 12 Draft extension families with 71 variants. Updated
the combined catalog audit to accept the intended split and removed the false
extension-product warnings. Recorded that activation occurred while Prodigi
billing, the Standard-shipping cost decision, and physical samples remain open,
and added acceptance criteria for a controlled three-design sample batch.

## [2026-07-28] storefront | Launch verification pass: consent banner, geo markets, checkout walk

Walked the full production purchase journey in a real browser on desktop and a
375 px mobile viewport (product → cart → Shopify checkout, stopping before
payment): US delivery prices at USD 34 + 19 "International", Cyprus re-prices
to EUR 29 + 3.99 "Standard" with a dated estimate. Enabled the Shopify privacy
banner (`withPrivacyBanner: true`) because the store requires consent and no
banner existed, so no analytics event could ever fire; consent now unlocks
`_shopify_y`/monorail and the ad-platform dataLayer. Storefront market now
follows `oxygen-buyer-country` (EU ship-to list + US, US fallback) so EU
shoppers browse in EUR — the currency checkout already charges them. Footer
links each policy directly, the purchase-path audit script carries the standard
no-console header pair, and `docs/first-order-runbook.md` documents how to
verify the first Prodigi order end to end.

## [2026-08-07] storefront | CSP img-src: blob: allowed, image policy made testable

Review-photo upload previews render via `URL.createObjectURL`, but the CSP
`img-src` allowlist omitted `blob:`, so browsers silently blocked the preview
thumbnails (PR #21). Added `blob:`, moved the image allowlist to
`app/lib/csp.ts`, and added `scripts/csp.node-test.mjs`, which validates entry
syntax and scans `app/` for scheme usage (`URL.createObjectURL` -> `blob:`,
`url(data:` -> `data:`), failing `npm test` when a used scheme is missing.
Documented two latent constraints in `modules/hydrogen-runtime.md`:
admin-authored HTML may only reference Shopify-hosted images, and installing
the Meta/TikTok base pixels requires CSP host additions first. README's
image-policy note now matches the served header.

## [2026-08-07] catalog | Room-mockup pipeline for the 15 art prints

Every print had exactly one flat artwork image; the card hover-crossfade and
PDP supporting gallery were coded for more but starved. Added a deterministic
compositor (`scripts/generate-room-mockups.mjs` + scene geometry in
`scripts/lib/room-mockup-scenes.mjs`, sharp devDependency) that renders two
mockups per print from the owned our-story-light backdrop: a sage-wall
close-up and a context shot where the print appears at its true 8 x 10 in
scale beside the reading lamp (~8.5 px/cm against the ~31 cm shade). 30
images committed under `public/images/product-art-mockups/`. Apply path for
the ACTIVE catalog is `catalog:art:mockups:sync` (productCreateMedia append
only, idempotent by alt text) because the full art sync remains a Draft
staging command; that staging sync now also declares all three files.
`catalog:art:audit` accepts 1 or 3 READY images. Storefront now requests four
images per product. Not yet applied to Shopify - requires deploy first (public
URLs) plus sign-off.

## [2026-08-10] storefront | Hid the unreleased Everyday collection

Returned the fleece-blanket extension flag to `false` after Shopify readback
showed the product still Draft and its five EUR 49 variant prices conflicting
with the EUR 79 catalog manifest. With no released extension, the header and
mobile navigation omit "Everyday", the direct collection URL redirects to the
live print catalog, and extension products remain excluded from customer-facing
routes and the sitemap. Added a defensive post-query guard so a future flag
cannot admit an explicit empty collection. Shopify catalog records were not
mutated.

## [2026-08-10] catalog | Prepared guarded original-art size expansion

Added a guarded transition from the legacy 8 x 10 EUR 29.00 price to the
approved EUR 29.99 price and staged 16 x 20 EUR 39.99 variants. The larger
variants remain tracked, zero-stock, DENY, and unavailable until all 15
Prodigi `ART-FAP-EMA-16X20` mappings are explicitly confirmed. The deterministic
room pipeline now has two additional 16 x 20 scenes; existing 8 x 10 filenames
and alt text stay unchanged, while the large context uses true-scale
`widthRatio: 0.384`. The PDP filters room mockups by selected size and changes
its sofa scale diagram dynamically. This entry records local preparation only;
no Shopify or Prodigi state was changed.

## [2026-08-10] storefront | Invalidated stale Recently Viewed prices

Changed the client-only Recently Viewed storage key from
`cm:recently-viewed` to `cm:recently-viewed:v2`. Historical product snapshots,
including the former EUR 29.00 original-art price, are ignored; newly viewed
products repopulate the rail from the current PDP variant price. No Shopify
catalog or customer records are mutated.

## [2026-08-10] catalog | Prepared guarded 20 x 24 original-art size

Extended the original-art workflow with a EUR 49.99 20 x 24 option mapped to
Prodigi `GLOBAL-FAP-20X24`. Production files use a documented centred 5:6
full-bleed crop and the recommended 6000 x 7200 pixels. Added two size-specific
wall scenes per artwork, selected-size gallery filtering, a true-scale diagram,
and guarded stage, activate, and pause commands. Activation remains blocked
until all 15 Prodigi mappings are explicitly confirmed.

## [2026-08-10] catalog | Activated 20 x 24 across all 15 original-art prints

Executed the guarded release after PR #27 deployed to Oxygen. Staged 15
`CM-...-20X24` variants (tracked zero stock, DENY, EUR 49.99), verified all 30
production mockup URLs live, then individually mapped and verified every SKU in
Prodigi (`GLOBAL-FAP-20X24`, 6000 x 7200 upload, Excellent quality, exact-fit
full bleed, automatic fulfilment, Standard shipping). Appended the 30 committed
20 x 24 wall mockups (seven READY images per product) and activated; read-back
verified 15/15 ACTIVE alongside the unchanged 16 x 20 and 8 x 10 sizes, with
the three-size description copy applied. Live PDP checks on Quiet Form I and
Sunlit Mosaic I confirmed the EUR 49.99 price, enabled add to cart,
selected-size gallery filtering, and the 50.8 x 61 cm true-scale diagram. The
12 extension families remain Draft; no order was placed.
