# Sci-fi Listing Expansion and Social Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the four released Sci-fi & Cinema prints consumer-ready with five-image galleries, three fulfilled sizes, verified purchase paths, and four scheduled Facebook/Instagram launch posts.

**Architecture:** Extend the repository's `data/print-catalog.json`-driven product pipeline instead of adding a one-off script. Model per-print released sizes explicitly, stage missing variants safely, generate exact-art room composites from art-directed blank interiors, and sync Shopify media idempotently. Schedule social only after live Shopify, Prodigi, storefront, and cart verification passes.

**Tech Stack:** Node.js 22, TypeScript catalog helpers, Node test runner, Shopify Admin and Storefront GraphQL APIs, Sharp, Pillow, Hydrogen/React Router, Prodigi Shopify app, Meta Business Suite.

---

## File map

- Modify `data/print-catalog.json`: three size definitions, per-print released size state, and four room-scene records.
- Modify `app/lib/printCatalog.ts`: catalog types, validation, and released-size presentation.
- Modify `scripts/lib/product-pipeline.mjs`: safe expansion, product-copy, and media-plan helpers.
- Modify `scripts/product.mjs`: add `expand` and `media` steps, preserve before-state evidence, and strengthen verification.
- Modify `scripts/productPipeline.node-test.mjs` and `scripts/printCatalog.node-test.mjs`: TDD coverage for expansion and released-size gates.
- Create `scripts/lib/print-room-scenes.mjs`: pure room path, alt, ordering, and media reconciliation helpers.
- Create `scripts/printRoomScenes.node-test.mjs`: room-plan and mismatch tests.
- Create `scripts/generate-print-room-mockups.mjs`: deterministic Sharp compositor.
- Create `scripts/assets/print-room-mockups/scifi-cinema/*.png`: 16 art-directed blank interiors.
- Create `public/images/product-art-mockups/scifi-cinema/*.jpg`: 16 exact-art product mockups.
- Modify `docs/add-products-runbook.md`: document released-size expansion and room media.
- Modify `docs/llm-wiki/modules/catalog-and-products.md`, `docs/llm-wiki/index.md`, and `docs/llm-wiki/log.md`: durable pipeline knowledge.
- Create `docs/social/scifi-cinema-launch-2026-09.md`: final captions, assets, timestamps, destinations, and scheduled-state evidence.

### Task 1: Capture the live baseline

**Files:**
- Evidence: `output/launches/scifi-cinema/*`

- [ ] **Step 1: Run the current repository status command**

Run: `node scripts/product.mjs status scifi-cinema`

Expected: four prints show `staged=true`, `mapped=true`, `released=true`, and only the 8×10 variant.

- [ ] **Step 2: Run the current live verifier before mutation**

Run: `node scripts/product.mjs verify scifi-cinema --origin https://shopclaramendes.com`

Expected: the existing 8×10 Storefront API, PDP, sitemap, shop-filter, and cart checks pass; save the timestamped report as the rollback baseline.

- [ ] **Step 3: Read Admin state for the scoped products**

Record product IDs, description HTML, options, variant IDs/SKUs/prices/tracking, publication state, media IDs/alts/order/status, and updated timestamps for the four handles only.

Expected: a JSON evidence file containing exactly the four scoped products and no secrets.

- [ ] **Step 4: Commit only if baseline tooling required a correction**

Run: `git status --short`

Expected: no source changes for a successful read-only baseline.

### Task 2: Model staged versus released sizes

**Files:**
- Modify: `app/lib/printCatalog.ts`
- Modify: `data/print-catalog.json`
- Modify: `scripts/printCatalog.node-test.mjs`

- [ ] **Step 1: Write failing catalog tests**

Add tests proving that a released product may contain staged sizes, but each key in `releasedSizes` must exist in `collection.variants` and must have Shopify and verified Prodigi IDs. Also prove that filter copy exposes only sizes released across every released print.

```ts
test('releasedSizes gates consumer-facing sizes and fulfilment requirements', () => {
  const catalog = structuredClone(validCatalog);
  const print = catalog.collections[0].prints[0];
  print.released = true;
  print.releasedSizes = ['8x10'];
  catalog.collections[0].variants.push({
    size: '16x20', finish: 'Unframed', priceEUR: '39.99',
    providerSku: 'ART-FAP-EMA-16X20',
  });
  assert.deepEqual(validatePrintCatalog(catalog), []);
  print.releasedSizes.push('16x20');
  assert.match(validatePrintCatalog(catalog).join('\n'), /16x20/);
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --test scripts/printCatalog.node-test.mjs`

Expected: FAIL because `releasedSizes` is not validated or used.

- [ ] **Step 3: Implement the catalog model**

Add `releasedSizes: PrintSizeKey[]` to `PrintCatalogPrint`. Validate uniqueness, known size keys, at least one released size for a released print, and required IDs/mappings only for released sizes. Make `releasedPrintCollections()` compute ordered size labels from the intersection of `releasedSizes` across released prints.

- [ ] **Step 4: Add the two planned variants without releasing them**

Add these collection variants:

```json
{"size":"16x20","finish":"Unframed","priceEUR":"39.99","providerSku":"ART-FAP-EMA-16X20"},
{"size":"20x24","finish":"Unframed","priceEUR":"49.99","providerSku":"GLOBAL-FAP-20X24"}
```

Set every current print to `"releasedSizes": ["8x10"]`.

- [ ] **Step 5: Run focused and full catalog tests**

Run: `node --test scripts/printCatalog.node-test.mjs scripts/productPipeline.node-test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the size-state model**

```bash
git add app/lib/printCatalog.ts data/print-catalog.json scripts/printCatalog.node-test.mjs
git commit -m "feat: model staged print sizes"
```

### Task 3: Add safe existing-product expansion

**Files:**
- Modify: `scripts/lib/product-pipeline.mjs`
- Modify: `scripts/product.mjs`
- Modify: `scripts/productPipeline.node-test.mjs`

- [ ] **Step 1: Write failing pure-helper tests**

Test a live product with 8×10 present and the two larger sizes missing. The plan must return two `create` actions, preserve the existing variant ID, and reject unexpected SKUs or conflicting option values.

```js
assert.deepEqual(
  variantExpansionPlan(collection, print, liveProduct).map((row) => row.action),
  ['present', 'create', 'create'],
);
assert.throws(
  () => variantExpansionPlan(collection, print, productWithUnknownSku),
  /unexpected SKU/,
);
```

- [ ] **Step 2: Run the test and confirm failure**

Run: `node --test scripts/productPipeline.node-test.mjs`

Expected: FAIL because `variantExpansionPlan` does not exist.

- [ ] **Step 3: Implement `variantExpansionPlan`**

Return ordered rows containing `variant`, `sku`, `existing`, and `action`. Refuse to proceed when product identity, existing SKU, finish, size, price, or option structure conflicts with the catalog.

- [ ] **Step 4: Add the `expand` command**

Add `expand` to `steps`. The dry run prints create/no-op actions. `expand --apply` uses `productVariantsBulkCreate` with tracked inventory, zero availability, `DENY`, correct price, shipping, tax, Size, and Finish; it writes returned IDs to `print.shopify.variantIds`, captures before/after scoped JSON, and proves unrelated vendor products are unchanged.

- [ ] **Step 5: Strengthen release behavior**

`release` must refuse any size not recorded as verified in Prodigi, untrack only the selected fully mapped variants, update product copy/SEO after activation, and write all released size keys to `releasedSizes` only after Storefront API readback proves availability and price.

- [ ] **Step 6: Run focused tests**

Run: `node --test scripts/productPipeline.node-test.mjs scripts/printCatalog.node-test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit the expansion command**

```bash
git add scripts/lib/product-pipeline.mjs scripts/product.mjs scripts/productPipeline.node-test.mjs
git commit -m "feat: expand released prints safely"
```

### Task 4: Define and generate tailored room media

**Files:**
- Create: `scripts/lib/print-room-scenes.mjs`
- Create: `scripts/printRoomScenes.node-test.mjs`
- Create: `scripts/generate-print-room-mockups.mjs`
- Modify: `data/print-catalog.json`
- Create: `scripts/assets/print-room-mockups/scifi-cinema/*.png`
- Create: `public/images/product-art-mockups/scifi-cinema/*.jpg`

- [ ] **Step 1: Write failing room-plan tests**

Test that every scoped print has exactly four unique keys in the order `living-room`, `bedroom`, `study`, `wide-interior`, each with a non-empty alt, background file, and positive 4:5 placement.

```js
assert.deepEqual(roomMediaPlan(collection, print).map((row) => row.key), [
  'living-room', 'bedroom', 'study', 'wide-interior',
]);
assert.equal(new Set(roomMediaPlan(collection, print).map((row) => row.alt)).size, 4);
```

- [ ] **Step 2: Run the room test and confirm failure**

Run: `node --test scripts/printRoomScenes.node-test.mjs`

Expected: FAIL because the room module and metadata do not exist.

- [ ] **Step 3: Add catalog scene metadata and pure helpers**

Each scene record contains `key`, `alt`, `backgroundFile`, and `placement` with integer `left`, `top`, `width`, and `height`. Validate a 4:5 placement and generate stable local/output filenames from the print and scene slugs.

- [ ] **Step 4: Generate 16 blank interiors**

Create four distinct vertical interiors for each artwork palette. Every interior must have one unobstructed, front-facing 4:5 wall aperture; no art, text, logo, watermark, person, brand, or recognizable film property. Save the approved outputs under `scripts/assets/print-room-mockups/scifi-cinema/`.

- [ ] **Step 5: Implement deterministic compositing**

Use Sharp to resize the exact flat artwork into the placement, add a restrained paper/frame shadow, composite onto the blank interior, emit 1080×1350 sRGB JPEG at quality 92, and write a manifest with input/output SHA-256 hashes and dimensions.

- [ ] **Step 6: Generate and visually inspect all mockups**

Run: `node scripts/generate-print-room-mockups.mjs scifi-cinema`

Expected: 16 JPEGs plus a manifest; every scene preserves the exact artwork, has plausible perspective, no extra text, and enough visual distinction from the other three scenes for that print.

- [ ] **Step 7: Run tests and commit assets**

Run: `node --test scripts/printRoomScenes.node-test.mjs`

Expected: PASS.

```bash
git add data/print-catalog.json scripts/lib/print-room-scenes.mjs scripts/printRoomScenes.node-test.mjs scripts/generate-print-room-mockups.mjs scripts/assets/print-room-mockups/scifi-cinema public/images/product-art-mockups/scifi-cinema
git commit -m "feat: add tailored sci-fi room mockups"
```

### Task 5: Sync exactly five Shopify media items and refined copy

**Files:**
- Modify: `scripts/lib/product-pipeline.mjs`
- Modify: `scripts/product.mjs`
- Modify: `scripts/productPipeline.node-test.mjs`

- [ ] **Step 1: Write failing media reconciliation tests**

Prove the plan is `complete` only for flat artwork first followed by the four expected READY images. Prove duplicates, failed processing, wrong sources, wrong ordering, and unexpected media return `mismatch`, never implicit deletion.

- [ ] **Step 2: Run the test and confirm failure**

Run: `node --test scripts/productPipeline.node-test.mjs`

Expected: FAIL because exact five-media reconciliation is absent.

- [ ] **Step 3: Add MIME-aware staged upload and media mutations**

Generalize staged upload to accept WebP and JPEG. Add scoped `productCreateMedia`, READY polling, `productReorderMedia` job polling, and scoped room-media deletion. Capture the original flat media ID and abort if it is not still first.

- [ ] **Step 4: Add `media` dry run and apply modes**

`media scifi-cinema` prints the intended five-image order and product-copy changes. `media scifi-cinema --apply` uploads only missing room images, waits for READY, orders them 1–4 after the flat image, updates description/SEO, verifies exact count/order/source/alt, and records before/after JSON.

- [ ] **Step 5: Run focused tests**

Run: `node --test scripts/productPipeline.node-test.mjs scripts/printRoomScenes.node-test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the media synchronizer**

```bash
git add scripts/lib/product-pipeline.mjs scripts/product.mjs scripts/productPipeline.node-test.mjs
git commit -m "feat: sync complete print galleries"
```

### Task 6: Prepare and stage the larger print variants

**Files:**
- Modify: `data/print-catalog.json` through the product command
- Evidence: `output/launches/scifi-cinema/*`

- [ ] **Step 1: Copy the four approved sources into the pipeline launch source folder**

Expected: source SHA-256 hashes match the existing catalog records.

- [ ] **Step 2: Prepare all three print sizes**

Run: `node scripts/product.mjs prepare scifi-cinema`

Expected: 12 RGB JPEGs with the exact target pixel dimensions and 300-DPI metadata; evidence reports native PPI and individual 20×24 crop fractions without claiming added source detail.

- [ ] **Step 3: Review every 20×24 crop**

Inspect Orbital Silence's horizon and planets, Neon After Rain's foreground/reflections, Desert Signal's beam and dune ridge, and The Fold's stairs/arch. Reject any crop that removes a subject or weakens the composition.

- [ ] **Step 4: Dry-run and apply variant expansion**

Run: `node scripts/product.mjs expand scifi-cinema`

Expected: eight missing variants, no conflicting existing variant, no write.

Run: `node scripts/product.mjs expand scifi-cinema --apply`

Expected: eight new tracked-at-zero variants, correct IDs written back, existing 8×10 variants unchanged and still available.

- [ ] **Step 5: Generate the Prodigi handoff**

Run: `node scripts/product.mjs handoff scifi-cinema`

Expected: 12 rows with exact Shopify variant IDs, provider SKUs, local print files, and SHA-256 hashes.

### Task 7: Map and release all sizes

**Files:**
- Modify: `data/print-catalog.json` through `mapped` and `release`
- Evidence: `output/launches/scifi-cinema/*`

- [ ] **Step 1: Configure the eight new variants in Prodigi**

For each print and size, select the exact provider SKU, upload the matching hashed file, use 100% full bleed, confirm the inspected crop, choose Standard shipping, enable automatic fulfilment, and reload the channel product to verify the saved state.

- [ ] **Step 2: Record verified channel product IDs**

Run `node scripts/product.mjs mapped scifi-cinema --size 16x20 <four slug=id pairs>` and repeat with `--size 20x24`.

Expected: catalog records include a numeric channel product ID, `verified: true`, and verification date for every new mapping.

- [ ] **Step 3: Apply the five-image gallery and copy**

Run: `node scripts/product.mjs media scifi-cinema --apply`

Expected: each product has the original flat art first and four READY tailored room images; description and SEO name three sizes and the unframed finish.

- [ ] **Step 4: Dry-run and apply release**

Run: `node scripts/product.mjs release scifi-cinema`

Expected: release preflight accepts all mappings and lists only the eight tracked staged variants for activation.

Run: `node scripts/product.mjs release scifi-cinema --apply`

Expected: all 12 variants are untracked with `DENY`, available through the Clara Mendes and Clara Mendes Headless publications, and all four `releasedSizes` arrays become `['8x10','16x20','20x24']` only after Storefront API readback.

- [ ] **Step 5: Commit verified IDs and documentation**

```bash
git add data/print-catalog.json docs/add-products-runbook.md docs/llm-wiki
git commit -m "docs: record verified sci-fi expansion"
```

### Task 8: Test, deploy, and verify the consumer purchase path

**Files:**
- Modify if required: storefront tests and documentation only for defects found in this scope

- [ ] **Step 1: Run repository quality gates**

Run the direct local Node entrypoints for formatting check, ESLint, React Router type generation, TypeScript, all Node tests, and production build.

Expected: every command exits zero; no silent or timed-out gate counts as success.

- [ ] **Step 2: Push the branch and open a pull request**

Expected: the PR contains only scoped product-pipeline, catalog, asset, test, and documentation changes; attach the PR to the task.

- [ ] **Step 3: Wait for CI and merge**

Expected: all required GitHub checks pass and the PR merges to `main` without force-push.

- [ ] **Step 4: Verify the production deployment**

Run: `node scripts/product.mjs verify scifi-cinema --origin https://shopclaramendes.com`

Expected: all four PDPs and the collection filter return 200, sitemap membership is correct, and all 12 Storefront variants are available at the expected EUR prices.

- [ ] **Step 5: Verify responsive UI and carts**

In a real browser, inspect each mobile gallery for five images, select every size, and add each size to a throwaway cart. Confirm title, image, size, unframed finish, and price; clear carts and do not enter checkout payment.

### Task 9: Prepare and schedule the social launch

**Files:**
- Create: `docs/social/scifi-cinema-launch-2026-09.md`

- [ ] **Step 1: Inspect the current Meta queue and identity**

Confirm the selected Facebook page and Instagram account are both Clara Mendes / `shopclaramendes`. Record existing scheduled posts and choose four collision-free timestamps approximately 48 hours apart between 19:00 and 21:00 Europe/Bucharest.

- [ ] **Step 2: Write platform-specific captions**

Create one paired campaign entry per artwork. Instagram captions lead with the artwork's mood, say it is available in three sizes, use “link in bio,” and include three to five rights-safe art/interior hashtags. Facebook captions stay concise, include the shop URL, and use no more than two hashtags.

- [ ] **Step 3: Select final media**

Use each design's strongest tailored living-room or wide-interior image. Confirm 4:5 feed-safe framing, no text, and exact artwork fidelity.

- [ ] **Step 4: Schedule all eight destinations**

Schedule each campaign post to both the verified Facebook page and Instagram account. Do not treat “Processing” or “Scheduling your post” as completion.

- [ ] **Step 5: Read the queue back**

Expected: four future timestamps, each with the intended image and copy, and both destinations explicitly in Scheduled state. Record the readback in `docs/social/scifi-cinema-launch-2026-09.md` without account secrets.

- [ ] **Step 6: Commit the social record**

```bash
git add docs/social/scifi-cinema-launch-2026-09.md
git commit -m "docs: record sci-fi social launch schedule"
```

### Task 10: Completion audit

**Files:**
- Evidence: generated launch reports, live Shopify/Storefront readback, production browser checks, Meta scheduled queue

- [ ] **Step 1: Re-run all automated verification**

Expected: clean repository gates, production build, `product status`, and `product verify` all pass from the merged `main` state.

- [ ] **Step 2: Audit every explicit requirement**

For each of the four products, prove five ordered READY images, three correctly priced and sellable variants, exact Prodigi automatic mappings, accurate copy/SEO, live PDP/mobile gallery, and successful cart creation. Prove four paired posts are Scheduled to the correct Facebook and Instagram identities.

- [ ] **Step 3: Report exact final state**

List the merged commit/PR, live URLs, verified variants and prices, media counts, Prodigi mapping evidence, scheduled post timestamps, and any residual first-order physical-quality caveat. Do not describe the work as complete until every item above has authoritative current-state evidence.

---

## Plan self-review

- The plan covers every approved listing, size, media, copy, fulfilment, storefront, cart, reusable-pipeline, and social-scheduling requirement.
- Catalog types, command names, size keys, provider SKUs, prices, and media ordering remain consistent throughout.
- No unrelated product or sales-channel mutation is permitted; destructive media changes abort on unexpected state and retain before-state evidence.
