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

## [2026-08-11] catalog | Strengthened size-release safeguards

Restored the default 16 x 20 activation path's truthful two-size description
update while keeping 20 x 24 activation on the three-size copy. A 20 x 24
transition now requires the earlier 16 x 20 variant to remain Active, and the
production catalog audit requires exactly three approved Active variants and
the exact seven READY images per live print. Focused regression tests cover the
prerequisite, both description paths, and the seven-image invariant.

## [2026-08-11] storefront | Added concise stories to original-art shop cards

Added one distinct 10-18 word editorial story for each of the 15 live original
prints. The text is stored with the authoritative artwork metadata and appears
on the all-products and capsule shopping grids; homepage, related-product,
cart, search, and recently viewed cards keep their compact treatment. Focused
tests enforce complete coverage, uniqueness, punctuation, and the mobile copy
length limit. No Shopify catalog state was changed.

## [2026-08-11] storefront | Added the warm liquid-glass interface layer

Introduced shared paper- and mineral-tinted glass tokens across navigation,
buttons, product purchase controls, gallery controls, collection filters, cart
and mobile drawers, account/search surfaces, product cards, and reviews. Home,
collection, and story routes extend the same visual language without changing
catalog or Shopify data behavior. Coarse-pointer devices avoid expensive fixed
blur, while reduced-transparency and no-backdrop-filter fallbacks preserve
contrast. Corrected the mobile sticky add-to-cart cascade so the existing bar
now appears as an inset glass control on small screens.

## [2026-08-11] catalog | Published clean sofa imagery for every live size

Expanded the warm-neutral sofa pipeline from one labelled 16 x 20 image to
three clean scenes per artwork: 8 x 10, 16 x 20, and 20 x 24. The 45
deterministic composites preserve the exact artwork, keep only the reference
image's simple height bracket, use relative widths of 1:2:2.5, and apply the
production 5:6 crop to 20 x 24. The guarded Shopify migration uploads and
verifies new media, source identity, gallery order, and exact variant
associations before removing the old text overlay. It orders the three sofa
images after the flat featured artwork and associates each one only with its
matching Size variant. The production audit verifies that mapping. The PDP then
leads with the selected variant image while collection cards retain the flat
artwork. PR #35 deployed the 45 assets and storefront behavior; PR #37 adapted
the guarded source check to Shopify's UUID filename suffix. The live migration
then verified all 15 Active products with ten READY images and three exact
variant associations before removing the 15 legacy text-overlay media records.
The independent original-art audit passed 15/15, and the live Sunlit Mosaic I
PDP was checked at all three sizes.

## [2026-08-11] storefront | Fixed the landing hero on short mobile screens

Changed only the home hero below 768 x 680 pixels to use a compact three-row
grid. The glass navigation, headline and CTAs, enter-shop control, and capsule
note now remain separated on short devices such as 320 x 480 and 320 x 568,
while the established 390 x 844 composition is unchanged. Added focused
regression coverage; no catalog or Shopify data changed.

## [2026-08-11] storefront | Guard-safe "From" pricing and three-size copy

Product cards across the storefront (grid cards, homepage art preview, search
results, cart cross-sell, recently viewed) now show "From €29.99" when a print
sells at more than one released price, instead of a flat minimum that hid the
16 × 20 / 20 × 24 sizes. The shared `app/lib/productCardPricing.ts` derives
the floor from `availableForSale` variants, falling back to raw
`priceRange.minVariantPrice` only when the sample holds no purchasable
variant (fully sold out, or no variant data — this fallback is why the
search fragment fetches `priceRange`). Because staged-but-unreleased size
variants sit in `priceRange` min/max at full price, a staged size can never
set the floor or create a "From" range while any released variant exists;
the same released-only rule now drives the JSON-LD offers in `app/lib/seo.ts`
(product AggregateOffer bounds and collection ItemList prices). Recently-viewed
snapshots switched from the selected variant's price to the released floor
(storage key bumped v2→v3, mirroring the PR #26 invalidation; the stored
range flag ages out after 14 days so a later size pause cannot keep a stale
"From" prefix alive). Sitewide copy
that still described the catalog as 8 × 10-only was updated (our-story meta +
format fact, homepage capsule note, Quiet Form editorial), the first-order
runbook now covers all three SKUs and prices, and the dead flat-price
`ProductItem` component was removed. PDP, cart line, order history, and
analytics prices remain exact-variant. No catalog or Shopify data changed.

## [2026-08-11] storefront | Redesigned the living edit as curated in-situ scenes

The homepage editorial no longer substitutes Shopify product images into its
slots. The homepage-editorial collection override and best-selling fallback
meant the section showed three raw same-capsule print files (latterly the
three Sunlit Mosaics) cropped to 5:6/5:4 and colliding where the lead figure
(span 7) shared column 7 with the supporting grid. It now always renders the
three styled art-in-room photographs shot for the section (Quiet Form sofa,
Patina Blue stoneware, Sunlit Mosaic table), each linking to its capsule
landing page; the lead spans six columns so nothing overlaps, the closing
landscape photo keeps its native 5:4, media get a hairline border, and the
mobile stack shows one scene per row with the landscape image full-width.
The editorialCollection query, its loader plumbing, and the products prop
were removed; the homepage query is one collection lookup lighter.

## [2026-08-14] storefront | Aligned delivery promises with documented Prodigi estimates

The EU-first shipping rewrite (2b7a7c2) promised windows the fulfilment docs
contradict: a Cyprus 3–5 tier with no source (Prodigi Standard is EU 5–10),
"across Europe/elsewhere" coverage checkout refuses (ship-to is EU-27 + US),
dispatch in 1–3 business days ignoring the 24-hour auto-release hold, and
estimates with no after-dispatch basis while the footer-linked shipping
policy still said US-only 7–15. Shipping windows now live as constants in
app/lib/storefrontBasics.ts and render on the PDP chip and Shipping row as
dispatch 2–4 business days plus EU 5–10 after dispatch. Live Shopify
Markets (Storefront API availableCountries, 2026-08-14) enable 15 EU
countries only — no US, no GB — so US delivery claims were dropped
everywhere and the shipping-policy draft was rewritten to match (EU-only
destinations, 15-business-day investigation threshold); it must be
re-pasted into Shopify Admin. Runbook step 5 cross-references the same
windows, and the new fulfillment wiki page maps every surface that states
a promise, including the live-Markets check. The PDP also dropped the
taxes/Shopify trust copy (buy-box note, Shopify assurance bullet, Checkout
details row) at the owner's request, and the market/currency selector from
PR #43 was removed from the site header and the homepage cinematic header
(component, root-loader availableCountries query, and CSS deleted; the
/locale action and markets.server verification logic stay for any future
re-introduction).

## 2026-08-18 - Karina of Time journal

The blog index gained its designed identity: "Karina of Time" (Greek
καρίνα = the keel; wordplay is intentional). A Shopify blog with
handle `karina-of-time` was created in Admin (comments disabled, meta
description set). `/blogs/karina-of-time` renders a masthead with the
Greek lexicon line, a slowly revolving 3D ring of covers (progressive
enhancement: flat scroll-snap row on <=820px, reduced motion, and no-JS;
pauses on hover/focus), an issue ledger (articles numbered newest-highest),
and a mailto "request the next issue" foot (no marketing-consent backend
exists in the storefront env - a proper email-capture integration remains
a roadmap item). Empty state seats ten capsule plates in the ring linking
to `/collections/all?capsule=<slug>`; the index stays noindex until
articles exist. Article pages got the matching editorial treatment plus
buildSeoMeta/Article/Breadcrumb JSON-LD. Header nav gained "Journal",
footer nav "Karina of Time", llms.txt a journal entry. Other blog handles
fall back to the plain skeleton rendering.

Same day, the index gained a breathing aura background: large grainy
radial-gradient blobs (CSS keyframe transforms only) fixed behind the
whole page, crossfading between chapter-derived tints (ink indigo at the
masthead, linen parchment behind ring/ledger, clay at the foot) via an
IntersectionObserver that flips `data-palette` as `[data-chapter]`
sections straddle the viewport midline. Tints are luminosity-tuned
relatives of the paintedShader palettes (raw ink hexes read as mud over
paper). The hero got min-height 62svh so ink owns the opening at rest.
Reduced motion keeps the static tint without breathing. Verification
note: Lenis reverts programmatic window.scrollTo jumps — verify scroll
behavior with real wheel events, not scrollTo.

Later the same day, two owner-directed changes: (1) the masthead became a
full-bleed drifting dusk cloudscape - two procedurally generated cloud
layers (seamless feTurbulence SVG data-URI tiles, translate-only
animation at different speeds) over a near-black-to-amber gradient in
the umber/clay register, paper-white type, film grain, soft landing
onto the page; no stock imagery, reduced-motion gets the static sky.
(2) The mailto "request the next issue" foot was removed - the owner's
rule is that issues publish on the page, there is no email edition -
replaced by a link into /collections/all, and the empty-ledger copy now
ends "It publishes right here."
