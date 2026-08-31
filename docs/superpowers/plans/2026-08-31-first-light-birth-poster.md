# First Light Birth Poster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A second personalised product — a birth poster with a star-chart medallion — staged dark behind `PERSONALISED_RELEASE_FLAGS`, sharing the Your Sky fulfilment pipeline.

**Architecture:** A parallel `app/lib/natal/` module (params/products/scene/pdf) plus four dispatch seams in shared code: per-handle configurator registry on the PDP, kind-aware cart-line signing, kind-aware webhook fulfilment, and its own print route. Sky behavior and tests stay untouched.

**Tech Stack:** the existing sky engine (astro/projection/fit/fontCoverage/places/sign are imported as-is), pdf-lib, node --test.

Spec: `docs/superpowers/specs/2026-08-31-first-light-birth-poster-design.md`.
Coupling points to unpick (from the architecture survey): PDP keys the configurator on `productType === 'Personalised Art'` (`products.$handle.tsx:450`); `fulfilment.ts:51` treats every `_v` line as a sky line; `params.ts` canonicalization is sky-shaped; the print route is sky-hardwired.

---

### Task 1: `natal/params.ts` + `natal/products.ts` (TDD)

**Files:**
- Create: `app/lib/natal/params.ts`, `app/lib/natal/products.ts`
- Test: `scripts/natalParams.node-test.mjs`

- [ ] Write failing tests: validation (name required ≤40, date window 1900–2100, time optional → `'12:00'`, details ≤60, font-coverage rejection of emoji/CJK in name and details, lat/lon rounding to 4dp, tz validity); canonical string stability (fixed key order `v|name|date|time|lat|lon|tz|place|details|theme`); `toCartAttributes`/`fromCartAttributes` round-trip; attribute set carries `_kind: 'natal'` and `_v: '1'`; `isNatalCartLine` true only with `_kind === 'natal'`; sky's `isSkyCartLine` must remain false for natal lines (import and assert — regression guard); `NATAL_VARIANTS` maps `CM-NATAL-{8X10,20X24}-{UNF,NAT,BLK}` to the same Prodigi SKUs/attributes as `SKY_VARIANTS` (assert equality of the prodigi halves).
- [ ] Implement. `NatalParams = {v: 1; name; date; time; lat; lon; tz; place; details; theme: SkyThemeId}` (empty string when details omitted). Reuse `sanitizeText`, `unprintableCharacters` from `../sky/params.ts`; `NATAL_DEFAULT_TIME = '12:00'`. `app/lib/natal/products.ts`: `NATAL_PRODUCT_HANDLE = 'first-light-birth-poster'`, `NATAL_PRODUCT_TYPE = 'Personalised Art'`, `NATAL_SIZES = SKY_SIZES` (re-export), `NATAL_VARIANTS`, `natalVariantForSku`. **Sky guard:** `isSkyCartLine` currently keys on `_v`; change it to also require the absence of `_kind` (one-line change in `app/lib/sky/params.ts` covered by the new regression test AND the existing sky tests staying green).
- [ ] `npm test` green (sky suites untouched apart from the `_kind` absence guard). Commit `feat: natal params, variants and kind dispatch base`.

### Task 2: scene + preview + PDF

**Files:**
- Create: `app/lib/natal/scene.ts`, `app/lib/natal/svg.tsx`, `app/lib/natal/pdf.server.ts`
- Test: `scripts/natalScene.node-test.mjs`

- [ ] `computeNatal({params, size, catalog})` → `NatalScene`: medallion (reuse `skyPositions`/`projectAltAz` with a disc radius ≈ 30% of sheet width, centred in the upper half), name line fitted via `sky/fit.ts` (`fitTitle` with natal margins), stats lines: date spelled out (`Intl.DateTimeFormat('en-GB', {dateStyle: 'long'})` — deterministic), time (omit when defaulted AND details empty? No — always print the time the chart uses; if the customer left it blank print only the date), place, details. Tests: fitted worst-case name (40 W chars) stays inside margins under both the canvas metric fake and the PDF font metrics (mirror `scripts/skyFit.node-test.mjs`'s approach); scene is deterministic for fixed params.
- [ ] `NatalSvg` preview mirroring `sky/svg.tsx` mechanics (same measurer, same theme plates via `platePath(theme, 'preview')`).
- [ ] `renderNatalPdf` mirroring `sky/pdf.server.ts` scaffold (full font embed, plate cover-crop, tracked text).
- [ ] Commit `feat: natal scene, preview and print rendering`.

### Task 3: configurator + PDP registry

**Files:**
- Create: `app/components/NatalConfigurator.tsx`
- Modify: `app/routes/products.$handle.tsx` (~L450-461, L676-681, L833, L1130), `app/lib/catalogFilters.ts` (~L107-116)

- [ ] Registry: replace the `isSkyMap` product-type switch with `personalisedProductFor(handle)` → `{kind: 'sky' | 'natal', Configurator}` keyed on `SKY_PRODUCT_HANDLE`/`NATAL_PRODUCT_HANDLE`; product type stays the staging gate (`previewUnlocked` logic unchanged). Sky PDP behavior must be pixel-identical.
- [ ] `NatalConfigurator`: fields name / place (reuse the places typeahead the sky form uses) / date / time (optional) / details (optional) / theme; live `NatalSvg` preview; emits `attributes` exactly like `SkyConfigurator` does.
- [ ] Flags: add `'first-light-birth-poster': false` to `PERSONALISED_RELEASE_FLAGS`; extend `scripts/catalogFilters.node-test.mjs` personalised block to cover two staged handles.
- [ ] Commit `feat: first light configurator behind the personalised flag`.

### Task 4: cart signing + webhook fulfilment + print route

**Files:**
- Modify: `app/lib/sky/cartLines.server.ts` (or lift to `app/lib/personalised/cartLines.server.ts` re-exported from the old path), `app/lib/sky/fulfilment.ts`
- Create: `app/routes/api.natal-print.$token[.pdf].tsx`
- Test: `scripts/natalFulfilment.node-test.mjs`

- [ ] Signer: per-line dispatch — `_kind === 'natal'` → natal decode/canonical/sign; `_v` without `_kind` → sky path unchanged; neither → pass through. Same secret, same failure message.
- [ ] Fulfilment: in `buildProdigiOrderFromShopify`, split personalised lines by kind; natal lines decode with natal codec, map via `natalVariantForSku`, asset URL `/api/natal-print/<token>.pdf?size=…` (token via `encodeCanonicalToken` — generalise `encodeSkyToken`'s body over a canonicalizer, keep the sky wrapper). Test: a mixed order (sky + natal + plain print line) yields one Prodigi payload with both personalised items and correct SKUs/URLs; a natal line with a bad signature is a `problem`.
- [ ] Print route: clone the sky print route's shape with natal decode + `computeNatal` + `renderNatalPdf`.
- [ ] Commit `feat: natal lines sign, fulfil and print`.

### Task 5: release collateral + verification

**Files:**
- Modify: `docs/your-sky-release.md` (add a First Light section: product table — Title "First Light — a personalised birth poster", handle/type/tags per spec, six variants/SKUs/prices mirroring the sky's, Prodigi-app toggle OFF, `sky-check-prodigi.mjs` extended via `--product natal`), `scripts/sky-check-prodigi.mjs`, `README.md` catalog state, `docs/llm-wiki/log.md` + `modules/catalog-and-products.md` + `modules/fulfillment.md`
- [ ] Full validation: `npm run lint && npm run typecheck && npm test && npm run build`.
- [ ] Browser pass with `SKY_PREVIEW_UNLOCK` dev flow if a staging product exists; otherwise verify the configurator via the dev-time route-level rendering with a fabricated product payload is NOT possible — instead assert the PDP gate keeps the handle 404/redirected while flagged off, and verify preview SVG + PDF output via a local render script (`scripts/natal-render-local.mjs`, mirroring `sky-render-local.mjs` — create it in this task). Screenshot the rendered poster PDF.
- [ ] Commit + PR.

## Self-review

Spec coverage: params/fields ✓ (T1), medallion + typography ✓ (T2), per-handle registry ✓ (T3), flag staging ✓ (T3), kind dispatch in signer/webhook/print ✓ (T4), runbook ✓ (T5), local render proof ✓ (T5). Sky untouched except the `_kind` absence guard and the token generalisation, both regression-tested. Names used consistently: `NatalParams`, `computeNatal`, `renderNatalPdf`, `natalVariantForSku`, `NATAL_PRODUCT_HANDLE`.
