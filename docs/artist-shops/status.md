# Artist-shop pilot status

**Updated:** 2026-10-09  
**Branch:** `codex/artist-shops-pilot`  
**State:** In progress; no production release  
**Current writer:** Claude Code (owner's primary PC), from 2026-10-09 ~16:00.
At each checkpoint the branch is pushed and this file is current. The next
writer may take over after checking the branch matches GitHub. The
Codex/Sol session hit its usage limit after the docs commit; none of its
in-progress build work was saved.

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
  - **Floating World** (working title, `kind: museum`, unreleased): The Great
    Wave at 8×10 only, €26.99, `ART-FAP-EMA-8X10`. Prepared print file is
    3000×2400 at 300 dpi; the original is untagged (no ICC profile).
  - Runbook: "Museum prints and artist shops" in `docs/add-products-runbook.md`.
  - Tests: `scripts/artistShops.node-test.mjs` (12). The full suite is
    404/404, and typecheck and lint are clean.
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

## Next steps

1. **Owner:** choose the ~10 pilot works. `npm run museum -- search
   Thirty-six Views of Mount Fuji --title` (135 Met objects) and
   `npm run museum -- search One Hundred Famous Views of Edo --title` are the
   starting pool; fetch each chosen candidate, then `qualify`.
2. **Owner:** confirm the collection name (working title "Floating World"),
   sizes (8×10 only unless a work qualifies larger or an exception is
   accepted) and the €26.99 price.
3. **Owner:** review and approve Hokusai/Hiroshige bios and curator's notes,
   then record the rights and master reviews.
4. Room backgrounds: four blank interiors per print under
   `scripts/assets/print-room-mockups/floating-world/` (5:4 placements), then
   `npm run product -- rooms floating-world`.
5. Only with owner approval: `stage --apply` (Shopify Drafts), Prodigi mapping
   (check landscape 3000×2400 files and colour on untagged originals), `media`,
   `release`, then a PR to main after review.

## Not done

- No museum collection has been selected or cleared for sale; all artists
  are unapproved and all reviews are pending.
- Nothing has been created or changed in Shopify or Prodigi.
- No room backgrounds or room mockups exist for Floating World.
- Physical print quality, delivered cost and landscape-file handling in
  Prodigi are unverified.
- No production deploy, supplier order, payment or public marketing action.
