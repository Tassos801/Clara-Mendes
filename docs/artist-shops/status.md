# Artist-shop pilot status

**Updated:** 2026-10-14

**Branch:** `codex/artist-shops-pilot`  
**State:** Ten Shopify Drafts with all thirty print variants staged; 8×10 mapped in Prodigi, larger-size mapping pending; five more product types per work built and dry-run verified (50 Drafts not yet created); artist shop redesigned and product crops approved; master reviews pending; no production release

**Current writer:** none. Codex (Sol) completed the resumed twenty-variant
Draft expansion from GitHub checkpoint `31a9d12` and returned writer control
to the parent agent. The next writer must name themselves before editing.
Claude Code then built the five product types for the ten works on the
afternoon of 2026-10-13 (item 4 below: catalog, files, dry run; no Shopify
write).
Claude Code was the writer on 2026-10-13 from 09:30
on the owner's Windows PC and stopped at the owner's request that evening
(HEAD `4070390` plus this handoff). Codex (Sol) staged the ten Drafts and
their room media earlier the same morning, then hit its usage limit; Claude
committed its ids (`1c7d9e0`), redesigned the artist page, mapped all ten in
Prodigi, proposed product crops (approved) and added the larger sizes.

## Line and Colour, the second collection (2026-10-15, Claude Code)

**Writer:** Claude Code on `claude/modern-collection` (owner's Mac), stacked
on #134 (AIC/Cleveland importers, mug). Codex (Sol) generated the room
backgrounds and reviewed the changes read-only. Nothing in Shopify or
Prodigi was touched.

**Built:** Kandinsky and Mondrian registered (unapproved); eleven works
fetched; collection `line-and-colour` (SKU code `LC`) with ten prints
prepared; framed (5), canvas (6), phone case (5) and mug (10) files prepared;
crops approved; room backgrounds and placements. Two pipeline changes:
per-print `sizes` and per-work crop approval (runbook, museum section).

| Work | Prints | Framed | Canvas | Case | Mug |
| --- | --- | --- | --- | --- | --- |
| Kandinsky, Improvisation No. 30 (Cannons) (AIC 8991) | 8×10, 16×20 (212 ppi), 20×24 (170) | ✓ | 150 ppi | 388 ppi | ✓ |
| Kandinsky, Landscape with Two Poplars (AIC 8980) | 8×10 | – | 148 ppi | 307 ppi | ✓ |
| Kandinsky, Houses at Murnau (AIC 129849) | 8×10 | – | 141 ppi | – | ✓ |
| Kandinsky, Painting with Troika (AIC 8983) | 8×10 | – | – | – | ✓ |
| Kandinsky, Painting with Green Center (AIC 8987) | 8×10 | – | – | – | ✓ |
| Mondrian, Composition with Red, Yellow, and Blue (CMA 1967.215) | all three | ✓ | 449 ppi | 1166 ppi | ✓ |
| Mondrian, Lozenge Composition (AIC 109819) | all three (20×24 at 170) | ✓ | – | – | ✓ |
| Mondrian, Composition (No. 1) Gray-Red (AIC 65821) | 8×10 | – | – | – | ✓ |
| Mondrian, Chrysanthemum (CMA 1958.38) | all three (20×24 at 251) | ✓ | 235 ppi | 609 ppi | ✓ |
| Mondrian, Field with Young Trees (CMA 1971.220) | all three (16×20 at 266, 20×24 at 213) | ✓ | 230 ppi | 477 ppi | ✓ |

36 listings: Kandinsky 16, Mondrian 20. Prices reuse Floating World's.

**Decided by the owner in chat (2026-10-15):** the name *Line and
Colour*; the trims, recorded as Tassos (Troika: the grey photo backdrop
outside Kandinsky's painted frame; Composition 1927: the wall and its shadow
outside the white strip frame, which stays, after which its crop fractions
were recomputed to the same pixels); approval of the case and canvas crops
of all six cropped works; and downloading Prodigi's iPhone 16 Pro template
(sha256 matches) so the five phone cases could be prepared.

**Still open (owner):**
1. *Study for a Composition* (AIC 142570, fetched, not in the collection):
   AIC's photograph has 9–11% grey backdrop top and bottom, beyond the 5%
   trim limit. Leave out, or accept the backdrop on the print.
2. The Lozenge prints as a diamond on AIC's pale grey square; it has no
   canvas or case (a crop inside the diamond is about 225 ppi for a case,
   70 for a canvas).
3. Accept the larger-size ppi: Cannons and Lozenge 16×20 at 212–213 and
   20×24 at 170 (3% below Floating World's 176); Chrysanthemum and Field
   are above the precedent.
4. Artist approval (`approve-artist`), rights and master reviews for the
   ten works, and a mug price (Prodigi quote). Composition 1927's canvas
   keeps the red and blue but not the thin yellow strip (approved as shown).

**Machine notes:** this Mac's `.env.shopify-admin.local` has empty
`SHOPIFY_CLIENT_ID`/`SHOPIFY_CLIENT_SECRET`, so `stage` (even a dry run)
needs the Windows PC or those credentials. The Prodigi iPhone 16 Pro case
template is now in the main checkout's
`output/prodigi-assets/tough-phone-case/`.

## Storefront fixes for the dormant families (2026-10-14, Claude Code)

Code only; no Shopify or Prodigi write. Checked locally with a temporary,
uncommitted stub (screenshots in the owner's
`screens/museum-families-qa/round2/`).
- **Museum phone case PDP** uses the Art Tough Phone Case picker
  (`app/components/PhoneModelPicker.tsx`, shared by both routes): one
  grouped "Select your phone" list, no model preselected, the buy button
  reads "Choose your phone" (it opens the list) until a model is chosen;
  `?Device=<model>` still preselects.
- **"Pair with" on museum PDPs** (prints and families) lists the same
  artwork's other released products, then the artist's (same type first),
  and never store best sellers; it hides when nothing is released
  (`museumPairings` in `app/lib/artistShops.ts`).
- **Artist shop filter** "Art prints" is now "Prints"; `?type=prints`,
  `Prints`, `Art prints` and `art-prints` all still select it.
- **Single-size family PDPs** (framed, canvas, card, postcard) show
  "Size · 16 × 20 in" / "5 × 7 in" / "7 × 5 in" under the price.
- **Curator's notes** no longer say every print keeps the whole work: prints
  and framed prints keep the full composition on a white border; cards,
  postcards, canvas and phone cases use a chosen detail. The owner had
  approved the notes as written on 2026-10-11 (Tassos), so both artists'
  approvals were **revoked** (`approved: false`) with the edit. **Owner:**
  re-read the two notes, then `npm run museum -- approve-artist
  katsushika-hokusai --by "<name>"` and the same for `utagawa-hiroshige`.
  Until then no artist page can go public and no family can be released.

## Stopped here (2026-10-13): what the next agent does

**Resumed checkpoint (2026-10-13):** the owner asked to continue Claude's
latest GitHub work with Sol. `expand floating-world --apply` staged exactly
twenty new variants; all ten products remain Draft with three variants each,
at €26.99 / €35.99 / €44.99. Fresh readback verifies tracked inventory totals
0, DENY, shipping required, exact size/finish/SKU/price, preservation of the
ten existing 8×10 variants and their verified mapping records, and all fifty
gallery images unchanged. The pipeline compared 61 unrelated Clara Mendes
products unchanged. All ten Storefront product IDs return null and all ten
public product URLs return 404. Thirty production-file hashes and their
dimensions/300 dpi were checked against the current asset report; master
reviews remain pending. Missing `read_inventory` and `read_publications`
scopes still limit per-location stock and other-channel publication reads.

Evidence: [larger-size Draft readback](evidence/expansion-readback-2026-10-13.json),
local `expand-2026-10-13T11-09-50.json` and the regenerated thirty-row
`prodigi-handoff.csv` / `.md` under `<launchDir>/floating-world/`.
Baseline checks: 416/416 tests, typecheck and lint passed. No source-code
change was required. Larger-size mapping is now the next external step;
the ten completed 8×10 mappings must be preserved.

Do these in order. Writes to the live store (Shopify `--apply`, Prodigi
dashboard) need the owner's go-ahead in chat; the owner gave it on
2026-10-13 for Drafts and mapping, not for `release`.

1. **Stage the 20 new variants: done in the resumed Sol checkpoint.**
   The dry run showed 20 × "stage unavailable", 10 × "preserve"; `--apply`
   completed after the owner's continuation request. Claude Code's earlier
   safety check had blocked that operation. Verified 30 variants: 8×10 €26.99, 16×20 €35.99
   (`ART-FAP-EMA-16X20`), 20×24 €44.99 (`GLOBAL-FAP-20X24`); every product
   still DRAFT, new variants tracked at 0 with DENY. `expand` refuses an
   unreleased product that is not DRAFT.
2. **Prodigi, 20 more mappings: done (Claude Code, 2026-10-13 afternoon).**
   Sol uploaded the 20 larger files to the Image library before its usage
   limit; Claude mapped them in the owner's Chrome. Each 16×20 is
   `ART-FAP-EMA-16X20` at 100%, 0/0; each 20×24 is `GLOBAL-FAP-20X24` at
   Prodigi's auto-fit **98.43%** (the 6000×7200 file fitted exactly to the
   metric 50×60 cm area, 7087×5906 px; whole composition, as for the studio
   20×24 prints). Prodigi flipped the canvas to the work's orientation by
   itself at both sizes. All Excellent, no border, auto-fulfil; shipping
   stays Standard. A fresh load of all ten channel products read back 30/30
   variants, each on its own exact library file, with the ten 8×10 mappings
   unchanged: [readback](evidence/prodigi-larger-readback-2026-10-13.json).
   Recorded with `mapped --size 16x20` and `--size 20x24`. Dashboard
   traps this time: the MCP tab is hidden, so Chrome throttles in-page timers
   and drops typed searches; set picker searches with the native value setter
   plus an `input` event (twice), wait from the tool side, and target the
   newest `[role=dialog]`, because closed editor dialogs stay in the DOM.
3. **Owner prices approved in the resumed chat (2026-10-13):** framed
   16×20 *with* print €89.10 (`GLOBAL-CFP-16X20`), canvas €80.10
   (`GLOBAL-CAN-16X20`), greeting card €7.20 (`GLOBAL-GRE-MOH-7X5-BLA`),
   postcard €5.40 (`GLOBAL-POST-MOH-7X5`) and tough phone case €35.99
   (`GLOBAL-TECH-<device>-TCB-CS-M`). They are recorded per family in
   `data/art-product-catalog.json` (`collections[].families`).
4a. **Prodigi: 40 family products mapped + fresh-load verified (Claude Code,
   2026-10-13 evening).** Owner confirmed the framed spec in chat ("natural
   frame no mount perspex"). The 30 canvas/card/postcard files were uploaded
   to the Image library (Claude in Chrome file upload, under 10 MB per call;
   framed reuses the existing 16×20 print files). Channel products
   6329045–6329093 (framed, canvas, card, postcard; ids in the catalog via
   `mapped --family`): framed `GLOBAL-CFP-16X20` classic frame, Natural, EMA
   200gsm, no mount, Perspex, 100%, Excellent, Standard; canvas
   `GLOBAL-CAN-16X20` 38 mm bar, Mirror wrap, Prodigi cover fit 201.87%
   (its 6045×4845 area is 0.1% off 4:5), rated Acceptable like the live
   canvases, Standard; card `GLOBAL-GRE-MOH-7X5-BLA` single card + kraft
   envelope, 100.01%, front panel second from left, Excellent, Budget;
   postcard `GLOBAL-POST-MOH-7X5`, 100%, Excellent, Budget. All "Fulfilled
   by Prodigi automatically", 1 of 1 active.
   [Readback](evidence/prodigi-families-readback-2026-10-13.json).
   **Phone cases (2026-10-14, owner said "do the fix"):** the ten museum
   case listings (6329094–6329103) arrived in the Prodigi channel with its
   fulfil toggle ON; they go through the `orders/paid` webhook instead, so the
   toggle was switched OFF on all ten (fresh reload: 0 of 40 variants active
   each), as for Your Sky, to avoid double fulfilment.
4b. **Shopify shipping profiles (2026-10-14):** the 50 new Drafts landed in
   General. Moved in the admin (the API token has no shipping scope):
   cards + postcards → "Letter post - cards & postcards" (EU + CY, €2.90;
   10 → 30 products), canvas → "Canvas 16x20" (5 → 15), framed → "Framed
   Your Sky" (4 → 14; the only framed profile, whose outside-EU countries
   were chosen for the bigger 20×24 frame, so they hold for 16×20), cases →
   "Phone cases" (+400 variants). Each dialog showed "Removing 0" before
   Done. The ten print Drafts stay in General with the live prints.
   **Owner note:** the studio "Classic Framed Art Print — 16 × 20 in" sits in
   General (worldwide rates), unlike the framed rule; left unchanged.
4. **Five product types: built, files generated, 50 Drafts created
   (Claude Code, 2026-10-13).** Owner said "go, create the drafts";
   `stage floating-world --families --apply` created 50 Drafts / 440
   variants (10 each framed, canvas, card, postcard; 10 phone cases × 40
   devices). A fresh readback found no issues: all DRAFT, total inventory 0,
   71 unrelated products unchanged, sampled public URLs 404. Ids are in
   `data/art-product-catalog.json`; evidence
   [stage-families](evidence/stage-families-2026-10-13.json). Next is
   `handoff --families` (written: 40 channel rows), then Prodigi uploads and
   mappings, then moving the products out of Shopify's General shipping
   profile before release. The earlier entry follows: One hidden product per
   artwork per type (Society6-style), never variants of the live studio
   products. Same verbs as prints with `--families` / `--family <f>`
   (`scripts/lib/art-product-steps.mjs`; runbook "Museum prints and artist
   shops").
   - **Catalog:** `data/art-product-catalog.json` +
     `app/lib/artProductCatalog.ts` list 50 products: handle
     `<print>-framed-print|-canvas|-greeting-card|-postcard|-phone-case`,
     titles "<print title> Framed Art Print / Canvas Print / Greeting Card /
     Postcard / Tough Phone Case", SKUs `CM-FW-NN-CFP16X20 | CAN16X20 | CARD
     | POST | CASE-<device code>`, `released: false`, variants tracked at 0
     with DENY, mapping state, asset paths/sha256/pixels/ppi and a
     `sourceSignature` of every pixel-affecting input. Validation: one
     product per artwork per type, unique handles and SKUs (also against
     print SKUs), explicit release flag; a release needs artist approval,
     cleared rights and master reviews, approved crops (cropped families),
     current assets, Shopify ids and a verified mapping of the current file.
     `validateArtistLinks` now allows an artwork once per product type.
   - **Files (written under `<launchDir>/floating-world/<family>/`, previews
     in `<family>/web/`, plan `families-plan.json`, report
     `families-assets.json`):** `npm run product -- prepare floating-world
     --families` cuts the approved crop (`cropPlan()`) from the museum
     original once and resamples it, in the live layouts: card 6117×2161
     (art on the 1529×2161 front panel, rear panel in its mean colour), postcard
     4323×1559 (art half 2162×1559, live divider and stamp box), canvas
     3000×2400 / 2400×3000 at 150 dpi, case 2000×2500 at 300 dpi from
     `caseFileBox`. The framed print reuses the bordered 16×20 print file by
     path + sha256 (checked against `asset-validation.json`). Native ppi:
     framed 210.2–217.5, canvas 140.0–161.5, card 328.6–488.5, postcard
     311.1–497.6, case 307.3–430.1. Each panel was compared with its crop
     (mean difference 0.54–1.15/255; a shifted crop fails the check). Re-runs
     reuse current files byte for byte.
   - **Stage dry run** (`npm run product -- stage floating-world --families`,
     `stage-families-dry-run-2026-10-13T12-23-58.json`): 50 × create Draft;
     variants 10/10/10/10/400; €89.10 / €80.10 / €7.20 / €5.40 / €35.99;
     71 unrelated Clara Mendes products (61 + the ten print Drafts) to
     compare. `--apply` (implemented, not run) looks each handle up first,
     creates only missing Drafts via `productSet` with the preview image,
     writes ids to the catalog after each, refuses any non-Draft or SKU
     mismatch, re-reads everything (DRAFT, tags, copy, SKU/price/option,
     tracked + DENY + shipping, total inventory 0, READY preview), checks the
     unrelated products are unchanged and saves
     `stage-families-<stamp>.json`.
   - **Storefront (dormant):** family handles stay 404 and out of sitemaps
     until released; the artist shop lists released ones under Product type
     Prints, Framed prints, Canvas, Cards, Postcards and Phone cases; PDPs
     get family detail copy (no "Unframed", "200gsm" except on the framed
     print, or "Frame not included"), the artist credit with a per-family
     "how it was made" line, and shipping reach (cards/postcards EU, canvas
     and framed selected, cases worldwide). Museum case SKUs reach Prodigi
     through `app/lib/sky/fulfilment.ts` only once released and mapped.
   - **Next, in order:** (a) owner go-ahead, then `npm run product -- stage
     floating-world --families --apply`; (b) in Shopify Admin, move the new
     products into the right shipping profiles (cards and postcards: Letter
     post; canvas: the canvas profile; framed: a framed profile; cases: the
     phone-case profile) — new products land in General; (c) `handoff
     floating-world --families` and map 40 Prodigi channel products
     (framed/canvas/card/postcard; the framed rows use the 16×20 print files),
     then `mapped floating-world --family <f> <print>=<id> …`; (d) cases:
     `mapped floating-world --family phone-case <print> …` copies each file
     to `public/print-files/floating-world/` for the release PR; (e) master
     reviews; (f) `release … --family <f>` per family, merge, deploy,
     `verify floating-world --families` + screenshots.

   Pipeline gaps closed: the closed `PrintSizeKey`/`printSku` set and the
   unique collection title are untouched (families live in their own
   catalog); "one museum collection per artwork" became one product per
   artwork per type; family copy never says "Unframed", "200gsm paper"
   (except framed) or "Frame not included"; the studio-only generators and
   stagers are not reused (their file contracts are); artist shops list all
   families; PDP copy and options exist for the new types.
5. **Owner:** master reviews for all ten (a physical proof is advisable).
   Only then, with explicit approval, `release`; then merge to main, deploy
   and run `verify` with owner-Chrome screenshots.

To see the artist page locally while the products are Drafts (the
Storefront API never returns Drafts), use a temporary, uncommitted stub:
commit real work first, mark the prints `released: true` in the local
catalog, and feed the route card products built from the committed web and
room images (Hydrogen `Image` needs absolute URLs). Remove it by exact
replacement afterwards.

## Where we are (2026-10-11)

**Product crops for more families (2026-10-13), approved by the owner the same day:**
the owner asked for the ten works on phone cases, cards and postcards, larger
prints and canvas, and framed prints, with AI-chosen crops and no generated
pixels. Claude chose a framing per work and shape by eye and recorded them in
`data/museum-crops.json` (`app/lib/museumCrops.ts`, 5 tests); `npm run museum
-- crops` writes the review sheets and per-product overviews to
`<launchDir>/museum/crops/`. Results: phone case (the area the widest device
shows, 0.626) 307–430 ppi; card front 329–488 ppi; postcard 311–498 ppi;
canvas 16×20 (4:5 in the work's orientation) 140–162 ppi, below the store's
150 dpi canvas files for Nissaka (148), Kinryūsan (141) and Sudden Shower
(140). Larger prints and framed prints are 4:5 like 8×10, so they keep the
whole composition: 16×20 210–218 ppi, 20×24 176–182 ppi. **Owner decisions
(2026-10-13, in chat):** the crops are approved (`approval` in
`data/museum-crops.json`); the lower ppi is accepted for canvas (all ten,
including the three under 150), 16×20, 20×24 and framed; framed-with-print
(`GLOBAL-CFP-16X20`, withdrawn for frame-only on 2026-08-24) comes back for
museum works, price to be set. Floating World now lists 8×10, 16×20 and 20×24
(`4070390`); `prepare` wrote the 20 new print files and left the 8×10 files
byte-identical. `expand` now also grows an unreleased Draft. Next steps are in
"Stopped here" above.

**Prodigi mapping, verified (2026-10-13):** channel products 6327576–6327585
(catalog order, Great Wave to Sudden Shower), mapped in the owner's Chrome
and recorded with `mapped floating-world --size 8x10`. Each row: EMA 8×10
(`ART-FAP-EMA-8X10`), its own print file from the library, scale 100%,
position 0/0, no Prodigi border, quality Excellent, shipping Standard
(the channel defaulted new products to Auto-select), "Fulfilled by Prodigi
automatically", 1 of 1 variants active. A fresh dashboard load read all ten
back, including each variant's exact image-library id. Before mapping, all
ten library files were pixel-diffed against the current print files (mean
difference 2.4–3.6/255, no pixel over 40; a 1.5% scale control gave 17.3 and
16%), so the trimmed versions are the ones in the library. Prodigi lays a
3000×2400 file out on a landscape 8×10 at 100% by itself, so landscape files
need no rotation. Dashboard traps: a background or occluded Chrome tab
freezes search debounce and canvas rendering (keep the tab visible); the
pickers drop the first typed search; changing shipping while the editor is
open re-creates the variant, so the editor's save then 404s (save the image
first, then set shipping); keep the pointer off the canvas while an image
loads (one image landed at 100.23% and was redone).

**Artist shop page, Society6-style (2026-10-13):** the owner asked for
`/artists/<slug>` to look like a Society6 artist shop
(society6.com/collections/joystclaire). It now has a breadcrumb, the name
over a rule, then "About the artist" (a circular detail of the
representative print stands in for a portrait, plus bio, curator's note and
a Met collection link) beside a three-design room slideshow with "Shop this
design", then a Refine sidebar (product type, series, orientation,
collection, with counts) and "Sort by" over a 3-column grid. Cards carry
"By <artist>". On phones Refine is a sheet. Choices live in the URL; old
`?type=Prints` links still work. Logic: `artistShopView`,
`artistElsewhere`, `seriesLabel` in `app/lib/artistShops.ts`, with 4 new
tests (411/411). Checked locally with a temporary, uncommitted stub that
fed the ten Draft products from their committed images; screenshots are in
the owner's `screens/artist-shop-society6/`. The page stays dormant (404)
until a print is released.

**Windows continuation (2026-10-13):**
- Admin credentials were resolved through the documented machine config;
  no secret values were copied into the branch. Exact-handle read-only
  preflight found no pilot products anywhere in the store and confirmed EUR.
- Re-fetched met-55433: the original and museum metadata hashes match the
  existing registry. Re-prepared all ten from verified originals using the
  current four museum-tab trims and replacement. All 20 web/card and sheet
  assets are byte-identical to the preceding Mac checkpoint; the 40 room
  manifests stay current. Production files now match the current selection.
- `stage floating-world --apply` created exactly ten Drafts, one 8×10
  variant each at €26.99, and wrote their IDs into the catalog. The pipeline
  compared 61 other Clara Mendes products and found them unchanged.
- `media floating-world --apply` uploaded 40 room images. Fresh readback
  verifies 50 READY images in total: each flat image is featured and first,
  followed by its four exact room scenes. All ten remain Draft, unreleased,
  with pending tags, tracked inventory total 0, `DENY` and shipping required.
- Storefront API readback returns null for all ten product IDs. A separate
  parent-agent live check on 2026-10-13 confirmed that all ten
  `https://shopclaramendes.com/products/<pilot-handle>` URLs return 404.
  Publication
  assignments on other channels could not be read: the installed Admin app
  lacks `read_publications`. It also lacks `read_inventory`, so individual
  location quantities are unverified; aggregate inventory total 0 is verified.
  No publication mutation was run.
- Durable nonsecret IDs, media, asset hashes and readback:
  [13 October evidence](evidence/draft-readback-2026-10-13.json).
  Local launch evidence: `stage-2026-10-13T06-10-25.json`,
  `media-2026-10-13T06-13-19.json`, `asset-validation.json`, and
  `prodigi-handoff.csv` / `prodigi-handoff.md` under
  `<launchDir>/floating-world/`.
- Baseline before mutation: 407/407 tests, typecheck and lint passed.
  No implementation changes were needed. Prodigi mapping is being checked
  in the signed-in dashboard; no mapping has yet been recorded as verified.

**Owner decisions (2026-10-11), now in data:**
1. Collection: **Floating World**, 8×10 only, €26.99. Unchanged.
2. Minowa (met-36542, 213 ppi) is **swapped** for *Sudden Shower over
   Shin-Ōhashi Bridge and Atake* (met-55433, 2650×3860, 427 ppi). It was
   picked from four 8×10-ready Edo views; 55433 is the crispest of the Met's
   three impressions (the others are 37094 and 37386). Minowa stays
   registered but unused, like 45434.
3. Hokusai and Hiroshige are **approved** as written (bios and curator's notes).
   Revoked on 2026-10-14 when the notes' last sentence was corrected; the
   owner re-approves (see the top).
4. Rights are **cleared** for all ten (owner, after the automated screen).
5. Margins: **trim the museum mount tabs only**. The paper, its borders and
   the publisher/censor seals stay. New `npm run museum -- trim` records
   edge insets per artwork. Measured on full-resolution crops, they stop at
   the paper edge: top 98 px (55458 Hodogaya), 62 px (55993 Nissaka), 81 px
   (37093 Fireworks) and 40 px (56689 Kinryūsan). On Hodogaya and Fireworks
   the image runs to the paper edge, so the cut shaves up to ~15 px of sky
   where the edge slopes. Re-prepared: the tabs are gone, and the other six
   print files are byte-identical.

**Still open:**
- **Master reviews (owner):** pending for all ten. The prepared 8×10 files
  are 420–435 ppi native; the owner may want a physical proof first.
- **Room backgrounds: done (2026-10-11).** Codex generated all 40 blank
  interiors (built-in image generation; 1122×1402 PNG, cropped to 4:5 before
  resizing) and ran `rooms`, which passed. Claude Code reviewed every
  composite. It then lowered 23 placements (`top` only) so each print hangs
  about one print-height above the furniture instead of up to 2.3×; every
  moved box was checked to be clear wall. `rooms` passes and `status` shows
  `roomsReady` for all ten.
- **Prodigi image library: done (2026-10-11).** All ten print files were
  uploaded through the owner's Chrome and processed at full size (3000×2400
  landscape, 2400×3000 portrait). The Shopify channel
  `vre00g-8b.myshopify.com` is active in Prodigi.
- **Shopify Drafts and room media done (2026-10-13).** The owner authorised Drafts, Prodigi mapping
  and room media on 2026-10-11 (not `release`). `stage --apply` needs
  `.env.shopify-admin.local` (`SHOPIFY_CLIENT_ID`/`SHOPIFY_CLIENT_SECRET` or
  `SHOPIFY_ADMIN_ACCESS_TOKEN`), which was unavailable on the owner's Mac.
  The Windows machine resolved those credentials and completed `stage`,
  `handoff` and `media`. Map each handoff row in Prodigi using the exact
  current print file and settings; only then record `mapped …` after a fresh
  dashboard load proves it.
- `release`, publishing and any PR to main need the master reviews plus the
  owner's explicit go-ahead.

## Resume here (any PC)

1. `git fetch origin && git switch codex/artist-shops-pilot && git pull
   --ff-only`. Confirm HEAD matches `origin/codex/artist-shops-pilot`, then
   name yourself as the current writer above.
2. `npm ci`. Copy the gitignored `.env` from the machine's main checkout for
   the dev server (variable names are in README; never commit it).
3. The originals live only in the primary PC's launch folder
   (`<launchDir>/museum/originals/`). On any other PC, re-download them before
   `prepare`, for each of the ten: `npm run museum -- fetch <object id>
   --artist <artist id>`, with `--short-title "The Great Wave off Kanagawa"`
   for 39799 and `--short-title "Nissaka, Sayo no Nakayama"` for 55993.
   `prepare` needs `PYTHON=python3` on a Mac without a `python` binary.
   Check the sha256 still matches. A refetch keeps the reviews unless the
   Met changed the record or image.
4. Run `npm test` (416 pass on 2026-10-13), `npm run typecheck` and `npm run lint` before
   changing anything. Run `npm run museum -- status` and `npm run product --
   status floating-world` to see the state.
5. Don't run a blanket `git checkout` on `data/*.json` to drop
   line-ending noise from `prepare`: it reverts real uncommitted catalog
   edits. Check `git diff --ignore-cr-at-eol` first.

History: the Codex/Sol session hit its usage limit after the docs commit; none
of its in-progress build work was saved. Claude Code was the writer from
2026-10-09 ~16:00 to the end of that day, and again on 2026-10-11 on the
owner's Mac (whose originals had to be re-fetched: all ten sha256 matched and
the Met records were unchanged).

## Completed

- Agreed brief uploaded into the repository.
- Isolated branch/worktree created from current main `f4ac0f2`.
- Root agent instructions, README and wiki link to the cross-PC handoff.
- Baseline on `76f829e` (Node 24.12.0): `npm test` 379/379 pass,
  `npm run typecheck` exit 0, `npm run lint` exit 0; CI Validate + Oxygen
  preview passed on the branch push.
- Baseline findings:
  - Current main uses mixed legacy release gates, so an artist-page-only
    visibility change would be incomplete.
  - Print-catalog prints are gated by `released: true` in
    `data/print-catalog.json` plus Shopify Active/publication
    (`computeSellableHandles`). Museum prints should use that same gate.
  - The print pipeline assumes 4:5 portrait sources and crops to fit
    (`scripts/prepare-print-assets.py` rejects other ratios). It also tags every
    print `Clara Mendes Original` and `4:5 Ratio` and calls it a "portrait print"
    (`scripts/lib/product-pipeline.mjs`). Museum reproductions need full-composition
    bordered layouts and different copy and tags.
  - Met and AIC open-access APIs are reachable from this PC (checked with
    Hokusai's Great Wave, Met 45434 / AIC 24645).

- **Milestone 1: registry and Met sourcing (local only, no Shopify).**
  - `data/art-registry.json` plus `app/lib/artRegistry.ts`: artists and
    artworks with stable ids, owner approval for artists, separate
    rights/master reviews with who and when, a rights screen (object-level
    public-domain flag, life + 70 by year, attribution match, no qualified
    attributions) and a validator.
  - `npm run museum -- status | search | fetch | qualify`
    (`scripts/museum.mjs`, `scripts/lib/museum-met.mjs`). Raw Met records
    are committed under `data/museum-evidence/` with their sha256; originals
    are cached under `<launchDir>/museum/originals/` and re-fetchable.
    `review` and `approve-artist` record owner decisions only.
  - `scripts/lib/museum-layout.mjs`: full-composition layouts on white paper
    in the artwork's orientation. Verdicts: ≥300 ppi qualified, 150–299 needs
    an owner exception, <150 unsupported.
  - Artists registered (all unapproved): Katsushika Hokusai, Utagawa
    Hiroshige, Clara Mendes Studio.
  - First artwork end to end: `met-45434` The Great Wave. The original is
    3859×2594. The rights screen passes, and the owner rights and master
    reviews are pending. It qualifies for 8×10 only (427 ppi); 16×20 is
    213 ppi and 20×24 is 179 ppi, so both need an exception.
  - Tests: `scripts/museumArt.node-test.mjs` (13).
- API facts (2026-10-09): Met `/v1/search` was retired 2026-10-01; use
  `/v1.1/search` (offset/limit, max 500 per page, first 10,000 results only).
  The Met website returns 429 to scripts, but its API does not. AIC's API
  JSON works, but its IIIF image server serves a Cloudflare bot challenge
  (403) to scripts, so AIC is not used for images and the challenge must not
  be bypassed. *Update 2026-10-14:* AIC's API docs ask clients to send an
  `AIC-User-Agent` header (project and contact); with it the IIIF server
  serves images (no challenge is bypassed), capped at 3000 px on the long
  side. `npm run museum` now sources from AIC and Cleveland too; see the
  [runbook](../add-products-runbook.md#museum-prints-and-artist-shops).

- **Milestone 2: artist shops and the museum print pipeline (code only).**
  - Decision: artist and artwork identity lives in repo data
    (`data/art-registry.json`), not Shopify metaobjects. Why: the print
    release gate is already repo data plus a deploy, Phase 0/1 forbids Admin
    writes, and provenance evidence needs version control. A metaobject mirror
    can come later for families released from Admin.
  - `app/lib/artistShops.ts`: membership comes from data (museum print →
    artwork → artist; a studio collection's `artistId`). An artist is public
    only when owner-approved with a released product, and listings still pass
    `filterDemoProducts` plus Shopify Active/publication. `validateArtistLinks`
    blocks a released museum print without cleared rights and master reviews,
    a wrong orientation, or a second listing of the same artwork.
  - Routes: `/artists` and `/artists/<slug>` (collection-tag query, then the
    artist's exact handles; 404 when nothing is live). They add a "by …" line
    and "The artwork" credit on the product page, an Artists block in search,
    sitemap entries and an Artists nav/footer link. All of it stays dormant
    until an artist is public, so main would render exactly as today.
  - Print catalog: `kind` (studio|museum), studio `artistId`, print
    `artworkId` and `orientation`; landscape room boxes are 5:4.
  - Pipeline: museum Drafts get the museum copy, a credit and museum link, a
    no-endorsement line, the tags `Museum Reproduction` + artist name, and
    never `Clara Mendes Original` or `4:5 Ratio`. `prepare` places the whole
    artwork on white paper in its orientation and writes the card image plus
    `<print>.sheet.webp`, which room mockups composite. `release` refuses
    museum prints without both reviews. Museum collections are excluded from
    the "N original works" counts and capsule copy.
  - **Floating World** (working title, `kind: museum`, unreleased): 8×10
    only, €26.99, `ART-FAP-EMA-8X10`; now holds the owner's ten works (below).
    Landscape print files are 3000×2400 and portrait 2400×3000, at 300 dpi.
    The Met originals are untagged (no ICC profile), so check colour at
    Prodigi mapping.
  - Runbook: "Museum prints and artist shops" in `docs/add-products-runbook.md`.
  - Tests: `scripts/artistShops.node-test.mjs` (12). The full suite is
    405/405 at `058c996`, and typecheck and lint are clean.
  - Local check on 2026-10-09 against live Storefront data, using temporary
    uncommitted data edits that were then restored from git. Studio and Hokusai
    were approved, and one live Light & Silence print was mapped to the Great
    Wave record. Results:
    - `/artists`, both artist shops (desktop and 390 px), the product-page
      byline and credit, and search for "hokusai" all rendered.
    - `/artists/hiroshige` returned 404.
    - The Great Wave, released in the data but absent from Shopify, appeared
      nowhere.
    - Screenshots were taken with headless Chrome over CDP; the hidden pane is
      265 px wide.

- **The ten pilot works (owner's picks, 2026-10-09)** are read from the shortlist
  database `selection/current` (version 10). All are fetched, registered,
  pass the rights screen (owner reviews pending), are in Floating World
  (unreleased) and are prepared at 8×10:
  - Hokusai, Thirty-six Views of Mount Fuji: The Great Wave (Met 39799),
    Hodogaya on the Tōkaidō (55458), Sekiya Village on the Sumida River
    (55291), Tago Bay near Ejiri (57000), Ushibori in Hitachi Province
    (56239), Yoshida on the Tōkaidō (56360).
  - Hiroshige: Nissaka, Sayo no Nakayama (55993, Fifty-three Stations), and
    from One Hundred Famous Views of Edo, Fireworks at Ryōgoku Bridge (37093),
    Kinryūsan Temple at Asakusa (56689) and Minowa, Kanasugi at Mikawashima
    (36542), which on 2026-10-11 was swapped for Sudden Shower over
    Shin-Ōhashi Bridge and Atake (55433).
  - Seven landscape, three portrait. Nine are 425–435 ppi at 8×10.
    Minowa was 213 ppi (original 1274×1928), hence the swap.
  - The draft previously used Great Wave impression met-45434; the owner
    picked met-39799 (the full sheet with paper edges, warmer), so the print
    now points at 39799. 45434 stays registered and unused. The shortlist
    showed both cards because the Met titles 39799 "…, or The Great Wave";
    `proposeShortTitle` now strips that, so impressions group together.
  - Museum labels and pencil numbers sat on mount tabs above the sheets of
    55458, 55993, 37093 and 56689; trimmed on 2026-10-11 (see the top).

## Next steps

1. ~~**Owner:** choose the ~10 pilot works~~ (done, see above). Shortlist page:
   https://claude.ai/artifact/UCVVkru81UTnd1575k9M24. Picks save to its
   database document `selection/current` (ids are Met object ids), which an
   agent reads with ArtifactData. The pool comes from `npm run museum --
   search <series> --title --sizes` over Thirty-six Views of Mount Fuji, One
   Hundred Famous Views of Edo and Fifty-three Stations of the Tōkaidō: 211
   objects, illustrated books dropped, 105 distinct single-sheet designs (52
   Hokusai, 53 Hiroshige; best impression per design). **95 are 8×10-ready at
   300 ppi; none reach 300 ppi at 16×20.** Then `npm run museum -- fetch <id>
   --artist <artist id>` for each pick, and add the prints to Floating World.
2. ~~**Owner:** name, sizes, price and Minowa~~ (done 2026-10-11).
3. ~~**Owner:** bios, curator's notes and rights~~ (done 2026-10-11).
   **Master reviews are still pending.**
4. ~~Room backgrounds~~ (done with Codex, 2026-10-11; notes kept for reference): four blank interiors per print (40 in total), named as
   in each print's `rooms[].backgroundFile`, under
   `scripts/assets/print-room-mockups/floating-world/`. Placements are 5:4
   for the seven landscape prints and 4:5 for the three portrait ones. Then
   run `npm run product -- rooms floating-world`.
5. ~~Draft staging, Prodigi mapping (8×10) and room media~~ (done
   2026-10-13). The 16×20/20×24 variants, their mappings and the five new
   product types are in "Stopped here" at the top. Colour on the untagged
   originals is still unchecked in a physical proof. Keep the existing draft
   PR for handoff and review. `release` and publication require master
   reviews and the owner's separate explicit approval.

## Not done

- The ten works are not yet cleared for sale: the master reviews are
  pending (artists approved and rights cleared on 2026-10-11).
- Shopify has ten hidden Drafts with verified room galleries and all thirty
  print variants; only the 8×10 variants are mapped in Prodigi.
- The five new product types (framed, canvas, card, postcard, case) have
  catalog entries, production files and a verified stage dry run, but no
  Shopify Drafts, Prodigi mappings or deployed case files yet.
- Physical print quality and delivered cost are unverified; Prodigi's
  landscape handling is verified at 8×10 only.
- No production deploy, supplier order, payment or public marketing action.
