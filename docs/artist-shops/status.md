# Artist-shop pilot status

**Updated:** 2026-10-11  
**Branch:** `codex/artist-shops-pilot`  
**State:** Rooms done and print files in Prodigi; waiting on Shopify Admin credentials for Drafts; no production release  
**Current writer:** Claude Code (2026-10-11, owner's Mac). Codex (Sol) made the
40 room backgrounds under that writer's coordination.

## Where we are (2026-10-11)

**Owner decisions (2026-10-11), now in data:**
1. Collection: **Floating World**, 8×10 only, €26.99. Unchanged.
2. Minowa (met-36542, 213 ppi) is **swapped** for *Sudden Shower over
   Shin-Ōhashi Bridge and Atake* (met-55433, 2650×3860, 427 ppi). It was
   picked from four 8×10-ready Edo views; 55433 is the crispest of the Met's
   three impressions (the others are 37094 and 37386). Minowa stays
   registered but unused, like 45434.
3. Hokusai and Hiroshige are **approved** as written (bios and curator's notes).
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
- **Blocked: Shopify Drafts.** The owner authorised Drafts, Prodigi mapping
  and room media on 2026-10-11 (not `release`). `stage --apply` needs
  `.env.shopify-admin.local` (`SHOPIFY_CLIENT_ID`/`SHOPIFY_CLIENT_SECRET` or
  `SHOPIFY_ADMIN_ACCESS_TOKEN`), which is not on the owner's Mac. Once it is
  in place: `stage floating-world --apply`, `handoff`, map each row in
  Prodigi (choose the uploaded file; settings per the handoff), `mapped …`,
  `media floating-world --apply`, then commit.
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
4. Run `npm test` (406 pass), `npm run typecheck` and `npm run lint` before
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
  be bypassed.

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
5. Only with owner approval: `stage --apply` (Shopify Drafts), Prodigi mapping
   (check landscape 3000×2400 files and colour on untagged originals), `media`,
   `release`, then a PR to main after review.

## Not done

- The ten works are not yet cleared for sale: the master reviews are
  pending (artists approved and rights cleared on 2026-10-11).
- Nothing has been created or changed in Shopify. In Prodigi, only the ten
  print files were added to the image library.
- Physical print quality, delivered cost and landscape-file handling in
  Prodigi are unverified.
- No production deploy, supplier order, payment or public marketing action.
