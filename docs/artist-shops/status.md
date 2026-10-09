# Artist-shop pilot status

**Updated:** 2026-10-09  
**Branch:** `codex/artist-shops-pilot`  
**State:** In progress; no production release  
**Current writer:** Claude Code (owner's primary PC), from 2026-10-09 ~16:00.
The Codex/Sol session hit its usage limit after the docs commit; none of its
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

## Current work

- Artist/artwork registry with stable IDs, plus museum sourcing (Met first)
  that records provenance, rights evidence and checksums. Local only.
- Size qualification for bordered full-composition layouts at 300 ppi.
- Artist browsing (`/artists`, `/artists/<slug>`) derived from the same
  print-catalog records and release gate.

## Next checkpoint

Record exact implementation, tests, open issues and the next task here before
ending this session.

## Not done

- No museum collection has been selected or cleared for sale.
- No artist metaobjects or new products have been created in Shopify.
- Artist browsing, production files, galleries, supplier mapping and pilot
  launch remain to be implemented/verified.
- No production deploy, supplier order, payment or public marketing action.
