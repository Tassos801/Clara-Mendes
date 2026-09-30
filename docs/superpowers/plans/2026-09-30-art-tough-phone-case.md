# Art Tough Phone Case Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. The authorized product creation is handled in this session; use an independent supplier evidence check and final safety review.

**Goal:** Create and verify one Shopify DRAFT offering every combination of the 24 released artworks and a verified public-template selection of popular phone models.

**Architecture:** Keep the new case manifest and stage script independent from the old snap-case family. Read source print media from Shopify, create one guarded product with paginated readback, and export a per-variant fulfillment handoff. No production visibility change is part of draft creation.

**Tech Stack:** Node.js ESM, existing Shopify GraphQL Admin client, JSON/CSV, official Prodigi template metadata.

---

### Task 1: Establish candidate model evidence and exact artwork identities

- [x] Read live Active Art Prints and compare the 24 source handles with the two catalog JSON files. Require unique source SKU prefixes and READY featured artwork media.
- [x] Extract the official tough-case page's template options. Download candidate templates only from official HTTPS Prodigi URLs and read native dimensions; retain URL, dimensions, response status, and digest.
- [x] Save `data/art-tough-phone-case.json`, specifying EUR 39.99, matte finish, 24 sources, selected phone models, exact template URLs, and nullable provider SKUs. Never derive an unverified provider SKU from a string pattern.

### Task 2: Implement a guarded Draft stage and handoff command

- [x] Create `scripts/stage-art-tough-phone-case.mjs`. Use `resolveAdminClient`, load a selectable local environment directory without printing values, and default to dry run. Before any mutation require the exact new handle, EUR currency, supported variant count, 24 correct Active source prints, valid SKU uniqueness, and no ACTIVE target product.
- [x] Build Artwork and Phone Model options and the complete variant cross product. Reuse existing media IDs without setting alt or other shared-media metadata. Set DRAFT, EUR 39.99, requiresShipping=true, tracked=true, DENY, and false custom approval metafields; do not publish.
- [x] Stage through asynchronous `productSet`, preserve IDs on repeat runs, poll the returned operation to completion, and paginate all variant readback. Export `output/launches/art-tough-phone-case/prodigi-handoff.csv` and machine-readable verification. Reject wrong option tuples, prices, media references, quantities, status, or known publication state. Record publication auditing as unavailable if read_publications is missing.
- [x] Verify guards and pagination with focused Node tests. Run dry run before `--apply`; inspect the planned design/model/variant counts and new-product target.

Commands:

```powershell
node --test scripts/artToughPhoneCase.node-test.mjs
node scripts/stage-art-tough-phone-case.mjs --env-dir 'C:\Users\admin\Desktop\4. Work & Projects\shopify\clara-mendes'
node scripts/stage-art-tough-phone-case.mjs --env-dir 'C:\Users\admin\Desktop\4. Work & Projects\shopify\clara-mendes' --verify-only
```

### Task 3: Verify the actual product and preserve the release handoff

- [x] Independently query the created product and paginate all variants. Confirm 24 artwork values, the chosen phone models, every tuple exactly once, all prices 39.99, all tracked zero quantities, 24 matching READY media, DRAFT status, false approvals, and publication state where the available scope permits. Core and all-variant readbacks passed; `publishedAt` is null. `read_publications` is missing, so the independent all-channel publication audit is explicitly unavailable.
- [x] Confirm the production PDP remains hidden. Record the Shopify Admin product link and open it for review.
- [x] Add `docs/art-tough-phone-case.md`, update the catalog wiki/index/log with the verified Draft state and the remaining provider/release gates. Include the high-variant storefront requirement for future publication.
- [x] Run the required repository lint, typecheck, tests, and build for the added script/docs; obtain an independent safety review. Commit the scoped changes and report the actual product state. All 300 tests, lint, typegen, TypeScript and Hydrogen build passed; separate spec/safety and final code reviews passed.

Execution note: the initial authorized Draft was created through a guarded, asynchronous Admin `productSet` before the reusable staging command was finished. Operation `gid://shopify/ProductSetOperation/259330244942` completed successfully. Independent readback verified the product and all 960 variants. The completed command passed live dry-run and `--verify-only` modes against the existing Draft without another mutation. Source completeness required first 25 source variants because the fifteen original print records now each contain twelve variants. The supplier handoff preserves 912 unknown provider SKU fields and 960 production-file fields as empty. Draft staging is complete; the runbook's provider and consumer release gates remain open.
