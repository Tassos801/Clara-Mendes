# Art Tough Phone Case Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. The authorized product creation is handled in this session; use an independent supplier evidence check and final safety review.

**Goal:** Create and verify one Shopify DRAFT offering every combination of the 24 released artworks and a verified public-template selection of popular phone models.

**Architecture:** Keep the new case manifest and stage script independent from the old snap-case family. Read source print media from Shopify, create one guarded product with paginated readback, and export a per-variant fulfillment handoff. No production visibility change is part of draft creation.

**Tech Stack:** Node.js ESM, existing Shopify GraphQL Admin client, JSON/CSV, official Prodigi template metadata.

---

### Task 1: Establish candidate model evidence and exact artwork identities

- [ ] Read live Active Art Prints and compare the 24 source handles with the two catalog JSON files. Require unique source SKU prefixes and READY featured artwork media.
- [ ] Extract the official tough-case page's template options. Download candidate templates only from official HTTPS Prodigi URLs and read native dimensions; retain URL, dimensions, response status, and digest.
- [ ] Save `data/art-tough-phone-case.json`, specifying EUR 39.99, matte finish, 24 sources, selected phone models, exact template URLs, and nullable provider SKUs. Never derive an unverified provider SKU from a string pattern.

### Task 2: Implement a guarded Draft stage and handoff command

- [ ] Create `scripts/stage-art-tough-phone-case.mjs`. Use `resolveAdminClient`, load a selectable local environment directory without printing values, and default to dry run. Before any mutation require the exact new handle, EUR currency, supported variant count, 24 correct Active source prints, valid SKU uniqueness, and no ACTIVE target product.
- [ ] Build Artwork and Phone Model options and the complete variant cross product. Reuse existing media IDs without setting alt or other shared-media metadata. Set DRAFT, EUR 39.99, requiresShipping=true, tracked=true, DENY, and false custom approval metafields; do not publish.
- [ ] Stage through asynchronous `productSet`, preserve IDs on repeat runs, poll the returned operation to completion, and paginate all variant readback. Export `output/launches/art-tough-phone-case/prodigi-handoff.csv` and machine-readable verification. Reject wrong option tuples, prices, media references, quantities, status, or publication state.
- [ ] Verify guards and pagination with focused Node tests. Run dry run before `--apply`; inspect the planned design/model/variant counts and new-product target.

Commands:

```powershell
node --test scripts/artToughPhoneCase.node-test.mjs
node scripts/stage-art-tough-phone-case.mjs --env-dir 'C:\Users\admin\Desktop\4. Work & Projects\shopify\clara-mendes'
node scripts/stage-art-tough-phone-case.mjs --env-dir 'C:\Users\admin\Desktop\4. Work & Projects\shopify\clara-mendes' --apply
```

### Task 3: Verify the actual product and preserve the release handoff

- [ ] Independently query the created product and paginate all variants. Confirm 24 artwork values, the chosen phone models, every tuple exactly once, all prices 39.99, all tracked zero quantities, 24 matching READY media, DRAFT status, false approvals, and zero published channels.
- [ ] Confirm the production PDP remains hidden. Record the Shopify Admin product link and open it for review.
- [ ] Add `docs/art-tough-phone-case.md`, update the catalog wiki/index/log with the verified Draft state and the remaining provider/release gates. Include the high-variant storefront requirement for future publication.
- [ ] Run the required repository lint, typecheck, tests, and build for the added script/docs; obtain an independent safety review. Commit the scoped changes and report the actual product state.
