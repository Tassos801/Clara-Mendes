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

Final pass the same day: the owner liked the cloudscape and asked for it
across the whole page. The sky is now one absolute background layer
spanning the full journal (near-black masthead, umber middle, amber
horizon at the shop foot), with a third sculpted-billow cloud layer and
the high haze drifting in reverse for parallax. The breathing aura and
its IntersectionObserver palette machinery were removed - the vertical
gradient carries the chapter arc spatially. The page runs light type via
the shared kot tokens; the sky fades to paper just above the site
footer. All states screenshot-verified in a real browser.

Improvement round from an owner interview: sky gained a dark storm-base
layer under sharpened lit billows (more weather, less smoke); the
masthead entrance is staged in pure CSS (eyebrow/title/lexicon/keel/cue
drift in once, reduced-motion skips); the hero shortened to ~54svh so
the ring peeks above the fold; a typewriter "Descend" cue anchors to
#kot-issues (anchor jumps survive Lenis, unlike window.scrollTo); and
the homepage gained a journal teaser card (pocket dusk sky, drifting
billow tile) above the footer in _index.tsx. Owner kept ring
interaction auto-drift-only and the sky journal-only otherwise.

Issue 01 shipped: blog article "Why This Journal Is Called Karina of
Time" (handle why-karina-of-time) created and published Visible in
Admin under the karina-of-time blog - founding-issue content (the name,
what the journal is, the five capsules with links, what comes next),
excerpt, 145-char meta description, and a generated typographic
dusk-cover featured image (scripts/make-issue-cover.mjs, sharp SVG
render; edit labels per issue). The admin author picker only offers
staff accounts, so the article route now shows a date-only byline and
always credits the Organization in Article JSON-LD (no staff names in
public bylines). Verified via direct Storefront API query plus the dev
server: the ring seats "Issue 01" first (plates keep linking to
capsules), the ledger lists it, and the index robots meta flips to
index,follow now that content exists. Admin gotchas: typing thousands
of characters into the article HTML code editor freezes the tab - set
content via the CodeMirror 6 view API (cm-content element .cmView.view
.dispatch) instead; the author/blog pickers are s-internal custom
elements that form_input cannot set.

Mobile ring: the owner asked for the same journal view on phones, so
the min-width gate came off the CoverRing upgrade - every
motion-friendly viewport now gets the 3D ring (cards clamp(150px, 44vw,
190px) under 820px, stage 380px under 720px; the far side clips past
the band edges by design). Reduced-motion and no-JS keep the flat
scroll row. Verified at a true 390px viewport via playwright-core
driving the cached ms-playwright Chromium (the claude-in-chrome window
resize cannot shrink a maximized Chrome, and the hidden Browser pane
cannot screenshot): isRing true on mobile, false under reduced motion.

Mobile polish after owner feedback ("out of proportion, stops when your
hand passes over it, design stops at the edges"): (1) the journal is
now full-bleed - html:has(.kot-root) main gets margin/padding 0 so the
sky reaches the viewport edges (verified skyLeft 0 / skyRight 390);
(2) hover-pause listeners bind only on (hover:hover) and (pointer:fine)

- on touch, pointerenter from a passing finger used to freeze the ring
  because pointerleave never fires; drift now continues after touch
  (-5.8deg/1.6s before and after, desktop hover still pauses); (3) phone
  cards shrink to clamp(132px, 37vw, 165px) with a 330px stage under
  720px, leaving air around the front cover. Verified with a playwright
  suite (verify-polish pattern: sample rotateY over time, synthetic
  pointerenter, bounding-rect edge check).

CSP regression fix, found by an adversarial verification pass: the
custom scriptSrc passed to createContentSecurityPolicy had been reduced
to googletagmanager only, and Hydrogen has no default scriptSrc to merge
custom values into (unlike connectSrc/styleSrc/defaultSrc) - so
production served script-src with neither self nor cdn.shopify.com.
That CSP-blocked the consent privacy banner on every page (EU visitors
could never grant consent; analytics silent) and intermittently blocked
Oxygen-served lazy chunks. CSP_GOOGLE_SCRIPT_SRC became CSP_SCRIPT_SRC
with self + cdn.shopify.com + googletagmanager; csp.node-test.mjs now
asserts all three. Verified against the dev server with an
oxygen-buyer-country DE header: served header carries the three sources
plus nonce, zero CSP violations on /, /collections/all, and the
journal, the banner script loads 200 from cdn.shopify.com, and the
cookie-consent banner renders with Accept/Decline controls
(screenshot). Live before-evidence: production script-src header
contained only googletagmanager plus nonce.

## 2026-08-21 - Classic frame release

Released `classic-framed-art-print-16x20` as the first Art for Everyday Living
extension. In Prodigi, all five art variants were verified as automatically
fulfilled by `GLOBAL-CFP-16X20` with Natural frames, EMA 200gsm paper, no mat,
Perspex glazing, Excellent image quality, and Standard shipping. The owner
approved EUR 99 and waived the physical sample for this family. Shopify is
Active and published only to `Clara Mendes` and `Clara Mendes Headless`; the
storefront flag is now true, exposing the frame and Everyday collection while
the other eleven extension families remain gated.

Sources: [Catalog and products](modules/catalog-and-products.md),
[Art for Everyday Living](../art-product-extensions.md).

## 2026-08-24 - Accurate classic frame previews

Replaced the five Classic Framed Art Print previews that depicted a thick
brown frame and white mat. The new deterministic mockups use Prodigi's official
Natural classic-frame blank around the unchanged 1120 x 1400 Shopify artwork,
with the real 16:20 opening, published 20 mm frame-face proportion, and no mat.
Source digests, preview dimensions, and exact artwork pixels are now tested.

Sources: [Catalog and products](modules/catalog-and-products.md),
[Art for Everyday Living](../art-product-extensions.md).

## 2026-08-24 - Framed art storefront discovery

Added a direct Framed Art path to the primary, mobile, home, footer, and shop
navigation, plus an image-led homepage feature using the supplier-accurate
Natural/no-mat preview. The five sequence-one print PDPs now offer only their
exact matching framed variant; the other ten prints show no substitute. The
framed PDP states that artwork and frame arrive together, links back to the
exact unframed print, and distinguishes its single 16 × 20 size from the
unframed 8 × 10, 16 × 20, and 20 × 24 choices. Product cards and the framed
gallery now filter out the superseded brown-frame/white-mat media.

Sources: [Catalog and products](modules/catalog-and-products.md),
[Art for Everyday Living](../art-product-extensions.md).

## 2026-08-24 - Frame-only correction

Reversed the complete framed-print release after the owner clarified that the
separate product must sell framing only in the same three sizes as the prints:
8 × 10, 16 × 20, and 20 × 24 in. Shopify product
`classic-framed-art-print-16x20` was returned to Draft and unpublished from the
`Clara Mendes` and `Clara Mendes Headless` catalogs; its Hydrogen release flag
is false and framed-print homepage/catalog claims were removed. Prodigi's
`GLOBAL-CFP` family includes a fine-art print, so it cannot fulfill the corrected
frame-only offer. The replacement remains gated pending a frame-only
fulfillment source and approved price for each size.

Sources: [Catalog and products](modules/catalog-and-products.md),
[Art for Everyday Living](../art-product-extensions.md).

## 2026-08-31 - Wall Sets: buy the complete gallery wall

Made the curated three-print walls purchasable in one action. The five
capsule landing pages and two new mix gallery pages (The Terracotta
Thread, Ink & Cream) mount a WallSetPurchase module: one size for the
whole wall, summed price, three cart lines in a single submit, and a free
generated hanging-guide PDF (`/api/hanging-guide/<slug>-<size>.pdf`).
Print PDPs link into the wall(s) they hang in; the `wall-art-sets-of-3`
page relates to both mixes; both mix pages joined the custom sitemap. No
new Shopify products, no flags, no price changes — the module withholds
itself unless every member print passes the catalog allowlist with a
released Unframed variant. pdf-lib gotcha recorded in the guide route:
fontkit ligature substitution mis-advances fl/fi pairs, so ligatures are
disabled at embed time.

Sources: [Routes and pages](modules/routes-and-pages.md),
[Catalog and products](modules/catalog-and-products.md).

## 2026-08-31 - First Light: the second personalised product

Built the First Light birth poster on the Your Sky engine, staged dark
behind `PERSONALISED_RELEASE_FLAGS['first-light-birth-poster']`. A
parallel `app/lib/natal/` module (params/products/scene/svg/pdf) renders a
star-chart medallion of the birth sky over the child's name, birth
details and an optional free-text line; a blank time draws the chart for
local noon and prints no time. Shared plumbing now dispatches by a
`_kind` cart-attribute discriminator: sky lines are `_v` without `_kind`
(the sky codec refuses natal lines outright), the cart signer and the
orders/paid fulfilment builder route each kind to its own codec, variant
table and print route (`/api/natal-print/<token>.pdf`), and mixed
sky+natal orders build one Prodigi order. Prodigi SKUs and prices mirror
the sky's exactly. The PDP mounts configurators per handle, nav entries
are now per released handle, and `docs/your-sky-release.md` §8 carries
the go-live steps — First Light follows only after Your Sky's first live
order. Local QA: `scripts/natal-render-local.mjs`.

Sources: [Catalog and products](modules/catalog-and-products.md),
[Fulfillment](modules/fulfillment.md),
[Routes and pages](modules/routes-and-pages.md).

## 2026-08-31 - Frame-only mapping claim corrected

Audited the undocumented 2026-08-24 "Build frame-only product in three
sizes" commit, which rebuilt the classic-frame manifest record as the
three-size Natural Classic Frame and staged its storefront behind the
false release flag, but claimed a Prodigi mapping of "GLOBAL-CFP
exact-size family with blank removable insert" at `verified-dashboard`
status. The claim fails on every check: no wiki entry or dashboard
evidence exists, Prodigi's public catalogue shows plain
`GLOBAL-CFP-<size>` SKUs always include a fine-art print (the "classic
frame blanks" download is mockup imagery, not a physical insert), and the
live Shopify record is still the retired five-variant framed print
(Draft, `Prodigi Mapping Pending` / `Cost Gate Pending` tags,
admin-verified today). The genuine frame-only source is Prodigi's
Backloader frames range - `GLOBAL-CFP-<SIZE>-BACKLOADER`, the same
classic frame sold without a print, Natural available, UK/EU/US. The
manifest now records that family as a `candidate` mapping with the
unverified per-size costs removed; docs, wiki and README were reconciled.
Release stays blocked on dashboard confirmation of the three exact
backloader sizes and EUR costs plus owner approval of the source and
retail prices (current 32.50/50.00/64.29 EUR are cost-plus placeholders,
not owner-approved). No flags were flipped.

Sources: [Catalog and products](modules/catalog-and-products.md),
[Art for Everyday Living](../art-product-extensions.md).

## 2026-09-01 - Backloader dashboard readback

Ran the frame-only mapping readback with a fresh Prodigi dashboard login.
The Backloader family (frame only, no print) lists 23 variants; inch sizes
run 6x8 through 30x40 but include neither 8x10 nor 20x24.
`GLOBAL-CFP-16X20-BACKLOADER` is verified end to end: EUR 18.00 wholesale,
72h lead, UK/EU/US labs, eight order-level frame colours including
Natural, and it is selectable in the Shopify channel SKU picker next to
the print-inclusive `GLOBAL-CFP-16X20` (From EUR 40.00 - the source of
the bogus "40.00" cost recorded on 2026-08-24). The order flow demands an
uploaded logo or blank face-plate image at 300dpi, which the committed
blank JPG assets match - the "blank removable insert" concept was real,
only its SKUs and sizes were wrong. Manifest and docs now record the
16x20-only verification and per-size unavailability. Release stays
blocked on an owner decision for the 8x10 and 20x24 sizes (change range,
substitute 6x8/11x14 and 18x24/20x28, or another supplier) plus retail
price approval. No mappings were changed and no flags were flipped; a
test basket item was added and removed during verification.

Sources: [Catalog and products](modules/catalog-and-products.md),
[Art for Everyday Living](../art-product-extensions.md).

## 2026-09-01 - Your Sky guided-refinement design approved

Recorded the owner-approved Your Sky refinement before implementation. The
selected single-page design uses the existing three sky themes, six Shopify
variants, preview engine, signed cart attributes, PDF route, and Prodigi
pipeline. It adds a mobile-first product hierarchy, style and finish preview,
accessible place search with recovery states, validated same-tab draft
persistence, preview-readiness purchase gating, and a final order summary.
Prices, SKUs, fulfillment mappings, checkout, and First Light's release state
remain outside scope.

Sources: [Catalog and products](modules/catalog-and-products.md),
`docs/superpowers/specs/2026-09-01-your-sky-refinement-design.md`.

## 2026-09-02 - Your Sky guided refinement implemented and locally verified

Implemented the approved Your Sky configurator refinement and verified the
complete customer path locally at 390 x 844 and 1440 x 1000. The 132-test Node
suite passes, along with React Router type generation, TypeScript, ESLint with
zero errors, the Hydrogen production build, and the standard-route check.
Browser coverage confirmed all three styles, all three finish presentations,
both sizes and prices, keyboard place selection, empty/error/retry search,
same-tab draft restore and reset, exact preview readiness, responsive hierarchy,
and fixed-header-safe completion links.

A personalised 20 x 24 in Natural frame line added to cart at EUR 129.99. The
cart showed the customer-visible Title, Style, Place, and Date summary together
with Size and Finish, and Shopify Checkout loaded the correct one-item total;
verification stopped before payment and the test cart line was removed. The six
Shopify SKUs, product prices, signed canonical payload, PDF geometry, Prodigi
mappings, fulfillment toggles, checkout integration, and First Light release
state were not changed. Production deployment still requires the controlled PR,
CI, merge, and live URL verification.

Sources: [Catalog and products](modules/catalog-and-products.md),
`app/components/SkyConfigurator.tsx`, `app/routes/products.$handle.tsx`,
`scripts/skyConfigurator.node-test.mjs`.

## 2026-09-02 - Your Sky guided refinement released

Squash-merged PR #64 as `300c87d`. The exact main workflow `33600009023`
passed validation and deployed to Oxygen. Fresh production checks at
`https://shopclaramendes.com/products/your-sky-star-map` used desktop Chrome
152 at 390 x 844 and 1440 x 1000 and confirmed the mobile product-first
hierarchy, desktop three-column composition, keyboard place selection, draft
restore/reset, style switching, size/finish retention, Ready to print review,
signed add-to-cart, and standard Shopify checkout handoff.

Checkout displayed Title, Style, Place, Date, `20 x 24 in / Natural frame`, and
the EUR 129.99 total. Verification stopped before payment; the test cart line
and saved draft were removed. The release made no Shopify Admin, Prodigi,
pricing, SKU, mapping, fulfillment-toggle, PDF-geometry, checkout, or First
Light release-state changes.

Sources: [Catalog and products](modules/catalog-and-products.md),
[PR #64](https://github.com/Tassos801/Clara-Mendes/pull/64),
[main workflow 33600009023](https://github.com/Tassos801/Clara-Mendes/actions/runs/33600009023).
## 2026-09-02 - Brand film: Introducing Clara Mendes

Added a silent 45-second launch film built with Remotion in `video/`
from the storefront's own mockups and EB Garamond, modelled on the
register of Anthropic's Fable 5.1 announcement (captions stand in for the
presenter, prints for the props). The 6.6 MB web encode and the poster are
hosted on Shopify Files; `app/lib/brandFilm.ts` holds the CDN URLs and
`app/components/BrandFilm.tsx` embeds the film on `/our-story` between the
hero and "The collection" (muted, looping, poster only under
prefers-reduced-motion). Verified: eighteen stills reviewed and the room
crops re-tuned so every print stays whole; `check-render` passed on both
encodes (45.000 s, 1920 x 1080, 24 fps, no audio); CDN HEAD 200 for the
MP4 (6,612,751 bytes, video/mp4) and the poster (image/jpeg); dev server
on desktop and mobile shows the section with the CDN sources, playback
advancing while the tab is visible, and the reduced-motion branch
removing autoplay. Gotchas: the Admin client-credentials exchange now
returns "OAuth error invalid_request" so `scripts/upload-brand-film.mjs`
could not run (owner: refresh SHOPIFY_CLIENT_ID/SECRET); the admin's
"Upload from URL" rejects MP4s; an injected-file upload from the browser
extension wedges for video, so the MP4 was uploaded by hand through
Admin > Content > Files. Chrome pauses muted video in hidden tabs, which
is not a site bug. YouTube upload deferred by the owner.

Sources: [Brand Film](modules/brand-film.md), `docs/brand-film.md`,
`docs/superpowers/specs/2026-09-02-brand-film-design.md`.
