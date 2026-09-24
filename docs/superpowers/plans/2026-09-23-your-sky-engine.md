# Your Sky Engine (PR 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or execute inline task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Your Sky print gets the richer sky (star tone, glows, Milky Way, clipped lines, ringed planets, a real-looking Moon, double ring), and the engine gains four layouts and three details (constellation names, grid, time) carried end to end as signed `v=2` personalisation — with no designer UI yet (that is PR 2).

**Architecture:** One pure scene (`computeSky`) gains named layers; both renderers (`svg.tsx` preview, `pdf.server.ts` vector print) draw every layer from it, so preview = print. Page geometry moves to `layouts.ts`; drawing constants to `style.ts`; the Milky Way is computed along the galactic plane (`galaxy.ts`); label collision lives in `labels.ts`. Params get a `v=2` canonical form (`layout`, `details`) while `v=1` strings stay byte-identical so old signatures and print tokens still verify.

**Tech Stack:** TypeScript (Node 24 type-stripping for tests), React SVG, pdf-lib + fontkit, astronomy-engine, node:test, esbuild + sharp (review sheet only).

**Spec:** `docs/superpowers/specs/2026-09-23-your-sky-enhancements-design.md`. Two deliberate deviations, recorded in Task 0: (1) the Milky Way is computed from the galactic plane instead of d3-celestial `mw.json` (the outline is a sphere-wrapping ring with holes; clipping it at the horizon identically in both renderers is fragile, and the computed band needs no data file); (2) new theme tokens are named `moonFace`/`moonShade`/`moonEdge` because `moonLit`/`moonDark` are still used by the unreleased First Light poster, which must not change.

**Worktree:** `C:/Users/admin/Desktop/Mine/shopify/clara-wt-ls`, branch `fable/your-sky-enhancements` (from `origin/main` 465d2ba; spec commit 88e729d). `node_modules` installed. Run every command from the worktree root.

**PR 2 (designer) and PR 3 (page)** get their own detailed plans after PR 1 merges, because they build on this engine's final API. Outline at the end.

---

## File structure

| File | Status | Responsibility |
| --- | --- | --- |
| `scripts/build-sky-names.mjs` | create | Build `app/data/sky/constellation-names.json` from d3-celestial |
| `app/data/sky/constellation-names.json` | create (generated, committed) | `[id, latinName, ra, dec, rank]` per constellation |
| `app/lib/sky/catalog.ts` | modify | `names` added to `SkyCatalog`; loader imports it |
| `scripts/lib/sky-catalog.mjs` | modify | Sync loader returns `names` |
| `app/lib/sky/params.ts` | modify | `v: 1 \| 2`, `layout`, `details`, v2 canonical + cart attributes |
| `app/lib/sky/layouts.ts` | create | Page geometry per layout (disc, text, ring style, cardinals) |
| `app/lib/sky/projection.ts` | modify | `layoutFor` delegates to Classic |
| `app/lib/sky/style.ts` | create | Drawing constants + `starStyle`, `milkyWayOpacity` |
| `app/lib/sky/galaxy.ts` | create | Galactic-plane samples (J2000) |
| `app/lib/sky/labels.ts` | create | Greedy non-overlapping label placement |
| `app/lib/sky/astro.ts` | modify | Also returns `galaxy` and `labels` horizontal positions |
| `app/lib/sky/themes.ts` | modify | New tokens per theme |
| `app/lib/sky/scene.ts` | rewrite | All layers + layouts + details |
| `app/lib/sky/svg.tsx` | rewrite | Preview renderer for every layer |
| `app/lib/sky/pdf.server.ts` | rewrite | Print renderer for every layer |
| `scripts/skyNames.node-test.mjs`, `skyLayouts…`, `skyRich…` | create | Tests |
| `scripts/skyParams.node-test.mjs`, `skyPdf…`, `skySign…` | modify | v2 + layouts coverage |
| `scripts/render-sky-review.mjs` | create | Owner review sheet (PNG) + sample PDFs |
| `scripts/time-sky-pdf.mjs` | create | Local PDF render timing |
| `scripts/sky-print-link.mjs` | create | Signed live print URL for verification |
| `public/images/your-sky/*.webp` | regenerate | Page images follow the new look |
| `docs/…` | modify | Spec amendment, wiki log, release runbook note |

---

### Task 0: Baseline and spec amendment

**Files:**
- Modify: `docs/superpowers/specs/2026-09-23-your-sky-enhancements-design.md`

- [ ] **Step 1: Confirm a green baseline**

Run: `npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: `ℹ fail 0` (211 tests at the time of writing).

- [ ] **Step 2: Append the amendment to the spec**

Append at the end of the spec file:

```markdown

## 10. Amendment (planning, 2026-09-23)

- **Milky Way source:** computed, not catalogued. `app/lib/sky/galaxy.ts`
  samples the galactic plane every 2° of galactic longitude (J2000 via the
  IAU galactic pole), each sample a soft disc whose angular radius and
  intensity rise toward the galactic centre. Reason: d3-celestial `mw.json`
  is a sphere-wrapping ring with holes; clipping it at the horizon
  identically in the SVG and the PDF is fragile. No data file needed.
- **Theme tokens:** the new Moon tokens are `moonFace`, `moonShade`,
  `moonShadeOpacity`, `moonEdge` (First Light still reads `moonLit` /
  `moonDark`, which stay unchanged). Other new tokens: `milkyWay`,
  `milkyWayOpacity`, `glow`, `grid`, `gridOpacity`, `label`,
  `labelOpacity`.
- **Details** are one signed list `details` (`names`, `grid`, `time`)
  rather than three booleans: canonical `details=grid,names` or
  `details=none`.
- **Page images** are regenerated in PR 1 (the generator uses the real
  renderer), so `/your-sky` never shows the old look beside the new
  preview; PR 3 adds layout variety.
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-09-23-your-sky-enhancements-design.md
git commit -m "Spec amendment: computed Milky Way, Moon token names, details list"
```

---

### Task 1: Constellation names data

**Files:**
- Create: `scripts/build-sky-names.mjs`
- Create (generated): `app/data/sky/constellation-names.json`
- Test: `scripts/skyNames.node-test.mjs`

- [ ] **Step 1: Write the failing test**

Create `scripts/skyNames.node-test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const json = JSON.parse(
  readFileSync('app/data/sky/constellation-names.json', 'utf8'),
);

test('constellation names: IAU Latin names with J2000 label points', () => {
  assert.match(json.source, /d3-celestial/);
  assert.ok(json.count >= 88 && json.count <= 89, `count ${json.count}`);
  assert.equal(json.data.length, json.count);
  const orion = json.data.find((row) => row[1] === 'Orion');
  assert.deepEqual(orion.slice(2, 4), [84, 13]);
  assert.ok(json.data.some((row) => row[1] === 'Ursa Major'));
  for (const [id, name, ra, dec, rank] of json.data) {
    assert.match(id, /^[A-Z][A-Za-z0-9]{1,4}$/, id);
    assert.match(name, /^[A-Za-z ]+$/, name);
    assert.ok(ra >= 0 && ra < 360, `${name} ra ${ra}`);
    assert.ok(dec >= -90 && dec <= 90, `${name} dec ${dec}`);
    assert.ok([1, 2, 3].includes(rank), `${name} rank ${rank}`);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test scripts/skyNames.node-test.mjs`
Expected: FAIL — `ENOENT … constellation-names.json`.

- [ ] **Step 3: Write the build script**

Create `scripts/build-sky-names.mjs`:

```js
#!/usr/bin/env node
/* eslint-disable no-console */
// Builds app/data/sky/constellation-names.json from d3-celestial
// constellations.json (BSD-3-Clause, © Olaf Frohn): IAU Latin name and a
// label point per constellation. The source is cached in data/sky-sources/
// (gitignored); the derived JSON is committed.
//
//   node scripts/build-sky-names.mjs
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const SOURCE =
  'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.json';
const SRC_DIR = resolve('data/sky-sources');
const OUT = resolve('app/data/sky/constellation-names.json');
mkdirSync(SRC_DIR, {recursive: true});

const cached = resolve(SRC_DIR, 'constellations.json');
if (!existsSync(cached)) {
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`${SOURCE} → ${res.status}`);
  writeFileSync(cached, Buffer.from(await res.arrayBuffer()));
}

const geo = JSON.parse(readFileSync(cached, 'utf8'));
const r2 = (n) => Math.round(n * 100) / 100;
const seen = new Set();
const data = [];
for (const feature of geo.features) {
  const name = feature.properties.la || feature.properties.name;
  if (!name || seen.has(name)) continue;
  seen.add(name);
  const [ra, dec] = feature.geometry.coordinates;
  data.push([
    feature.id,
    name,
    r2((ra + 360) % 360),
    r2(dec),
    Number(feature.properties.rank) || 3,
  ]);
}
data.sort((a, b) => a[0].localeCompare(b[0]));
writeFileSync(
  OUT,
  JSON.stringify({
    source: 'd3-celestial constellations.json (BSD-3-Clause, (c) Olaf Frohn)',
    count: data.length,
    data,
  }),
);
console.log(`constellation names ${data.length}`);
/* eslint-enable no-console */
```

- [ ] **Step 4: Build and run the test**

Run: `node scripts/build-sky-names.mjs && node --test scripts/skyNames.node-test.mjs`
Expected: prints `constellation names 88` (or 89) and the test PASSES. If the id regex fails on a real id, print the offending id and widen the regex to that shape — do not drop rows.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-sky-names.mjs app/data/sky/constellation-names.json scripts/skyNames.node-test.mjs
git commit -m "Sky data: constellation names and label points (d3-celestial, BSD-3)"
```

---

### Task 2: Catalogue loaders carry names

**Files:**
- Modify: `app/lib/sky/catalog.ts`
- Modify: `scripts/lib/sky-catalog.mjs`

- [ ] **Step 1: Replace `app/lib/sky/catalog.ts`**

```ts
/** Star, constellation-line and label data in the compact built form. */
export type SkyNameRow = readonly [
  id: string,
  name: string,
  ra: number,
  dec: number,
  rank: number,
];

export type SkyCatalog = {
  /** Flat [ra°, dec°, mag, ...] sorted bright → faint. */
  stars: ArrayLike<number>;
  /** Flat [ra1, dec1, ra2, dec2, ...] great-circle segments. */
  lines: ArrayLike<number>;
  /** Constellation label points; absent → the names detail draws nothing. */
  names?: ReadonlyArray<SkyNameRow>;
};

/**
 * Lazy loader used by the browser preview and the print route. Vite turns
 * these JSON files into JS modules, so no import attribute here — the
 * browser would otherwise demand a JSON MIME type. Node tests use
 * scripts/lib/sky-catalog.mjs instead.
 */
export async function loadSkyCatalog(): Promise<SkyCatalog> {
  const [stars, lines, names] = await Promise.all([
    import('../../data/sky/stars.json'),
    import('../../data/sky/constellations.json'),
    import('../../data/sky/constellation-names.json').catch(() => null),
  ]);
  return {
    stars: stars.default.data,
    lines: lines.default.data,
    names: names
      ? (names.default.data as unknown as ReadonlyArray<SkyNameRow>)
      : undefined,
  };
}
```

- [ ] **Step 2: Replace `scripts/lib/sky-catalog.mjs`**

```js
// Synchronous catalogue loader for Node tests and scripts. The app itself
// uses the lazy `loadSkyCatalog()` in app/lib/sky/catalog.ts.
import {readFileSync} from 'node:fs';

const read = (file) =>
  JSON.parse(
    readFileSync(new URL(`../../app/data/sky/${file}`, import.meta.url), 'utf8'),
  ).data;

export function loadSkyCatalogSync() {
  return {
    stars: read('stars.json'),
    lines: read('constellations.json'),
    names: read('constellation-names.json'),
  };
}
```

- [ ] **Step 3: Typecheck and test**

Run: `npm run typecheck && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: typecheck clean, `ℹ fail 0`.

- [ ] **Step 4: Commit**

```bash
git add app/lib/sky/catalog.ts scripts/lib/sky-catalog.mjs
git commit -m "Sky catalogue: load constellation names beside stars and lines"
```

---

### Task 3: Params v2 — layout and details, signed end to end

**Files:**
- Modify: `app/lib/sky/params.ts`
- Modify: `scripts/skyParams.node-test.mjs`
- Modify: `scripts/skySign.node-test.mjs`

- [ ] **Step 1: Write the failing tests**

In `scripts/skyParams.node-test.mjs`:

(a) In `validateSkyParams accepts a full set and rounds coordinates`, change
`assert.equal(result.params.v, 1);` to:

```js
  assert.equal(result.params.v, 2);
  assert.equal(result.params.layout, 'classic');
  assert.deepEqual(result.params.details, []);
```

(b) In `canonical string is stable, order-independent and parseable`, replace
the exact-string assertion block

```js
  assert.equal(
    canonicalSkyParams(a),
    'v=1&date=2019-06-14&time=22:00&lat=48.8566&lon=2.3522&tz=Europe%2FParis&place=Paris%2C%20France&title=The%20night%20we%20met&theme=linen',
  );
```

with

```js
  assert.equal(
    canonicalSkyParams(a),
    'v=2&date=2019-06-14&time=22:00&lat=48.8566&lon=2.3522&tz=Europe%2FParis&place=Paris%2C%20France&title=The%20night%20we%20met&theme=linen&layout=classic&details=none',
  );
```

(c) In `cart attributes round-trip and hide internals`, replace

```js
  assert.equal(
    attrs.filter((a) => !a.key.startsWith('_')).length,
    4,
    'only Title, Style, Place, Date are visible',
  );
```

with

```js
  assert.equal(
    attrs.filter((a) => !a.key.startsWith('_')).length,
    5,
    'only Title, Style, Layout, Place, Date are visible',
  );
```

(d) Append these tests at the end of the file:

```js
test('v1 stays byte-identical so old signatures and tokens verify', () => {
  const v1 = validateSkyParams({...input, v: 1, layout: 'compass', details: 'names'});
  assert.equal(v1.ok, true);
  assert.equal(v1.params.v, 1);
  assert.equal(v1.params.layout, 'classic', 'v1 ignores layout');
  assert.deepEqual(v1.params.details, [], 'v1 ignores details');
  assert.equal(
    canonicalSkyParams(v1.params),
    'v=1&date=2019-06-14&time=22:00&lat=48.8566&lon=2.3522&tz=Europe%2FParis&place=Paris%2C%20France&title=The%20night%20we%20met&theme=linen',
  );
  const parsed = parseCanonicalSkyParams(canonicalSkyParams(v1.params));
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.params, v1.params);
});

test('v2 layout and details validate, sort and round-trip', () => {
  const result = validateSkyParams({...input, layout: 'compass', details: 'time,names,names'});
  assert.equal(result.ok, true);
  assert.equal(result.params.layout, 'compass');
  assert.deepEqual(result.params.details, ['names', 'time']);
  const canonical = canonicalSkyParams(result.params);
  assert.match(canonical, /&layout=compass&details=names,time$/);
  assert.deepEqual(parseCanonicalSkyParams(canonical).params, result.params);
  assert.deepEqual(
    validateSkyParams({...input, details: ['grid', 'names', 'time']}).params.details,
    ['names', 'grid', 'time'],
  );
  assert.equal(validateSkyParams({...input, layout: 'spiral'}).ok, false);
  assert.equal(validateSkyParams({...input, details: 'names,glitter'}).ok, false);
  assert.equal(validateSkyParams({...input, v: 3}).ok, false);
});

test('v2 cart attributes show Layout and Details and decode back', () => {
  const params = validateSkyParams({...input, layout: 'full', details: 'names,grid'}).params;
  const attrs = toCartAttributes(params, 'sig123');
  const get = (key) => attrs.find((a) => a.key === key)?.value;
  assert.equal(get('Layout'), 'Full sky');
  assert.equal(get('Details'), 'Constellation names · Grid');
  assert.equal(get('_v'), '2');
  assert.equal(get('_layout'), 'full');
  assert.equal(get('_details'), 'names,grid');
  const decoded = fromCartAttributes(attrs);
  assert.equal(decoded.ok, true);
  assert.deepEqual(decoded.params, params);
  assert.equal(decoded.sig, 'sig123');
  const plain = toCartAttributes(validateSkyParams(input).params);
  assert.equal(plain.find((a) => a.key === 'Details'), undefined, 'no details → no Details line');
  assert.equal(plain.find((a) => a.key === '_details').value, 'none');
});

test('v1 cart lines still decode and ignore v2 keys', () => {
  const v1 = validateSkyParams({...input, v: 1}).params;
  const attrs = [...toCartAttributes(v1, 'sig'), {key: '_layout', value: 'compass'}];
  assert.equal(attrs.find((a) => a.key === 'Layout'), undefined, 'v1 shows no Layout');
  const decoded = fromCartAttributes(attrs);
  assert.equal(decoded.ok, true);
  assert.equal(decoded.params.v, 1);
  assert.equal(decoded.params.layout, 'classic');
});
```

In `scripts/skySign.node-test.mjs` (it already imports `validateSkyParams`, `encodeSkyToken` and `decodeSkyToken`), append:

```js
test('print tokens carry v2 layout and details, and v1 tokens still decode', async () => {
  const base = {
    date: '2019-06-14',
    time: '22:00',
    lat: 48.8566,
    lon: 2.3522,
    tz: 'Europe/Paris',
    place: 'Paris, France',
    title: 'The night we met',
    theme: 'linen',
  };
  const secret = 'test-secret-for-v2';
  for (const input of [
    {...base, layout: 'compass', details: 'names,grid,time'},
    {...base, v: 1},
  ]) {
    const params = validateSkyParams(input).params;
    const token = await encodeSkyToken(params, secret);
    const decoded = await decodeSkyToken(token, secret);
    assert.equal(decoded.ok, true, JSON.stringify(input));
    assert.deepEqual(decoded.params, params);
  }
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test scripts/skyParams.node-test.mjs scripts/skySign.node-test.mjs`
Expected: FAIL — `params.v` is 1, `layout` undefined, no `Layout` attribute.

- [ ] **Step 3: Implement v2 in `app/lib/sky/params.ts`**

3a. After the `SKY_THEME_LABELS` block, add:

```ts
export type SkyLayoutId = 'classic' | 'compass' | 'full' | 'minimal';
export const SKY_LAYOUT_IDS: SkyLayoutId[] = ['classic', 'compass', 'full', 'minimal'];
export const SKY_LAYOUT_LABELS: Record<SkyLayoutId, string> = {
  classic: 'Classic',
  compass: 'Compass',
  full: 'Full sky',
  minimal: 'Minimal',
};

/** Optional print details, in their canonical (signed) order. */
export type SkyDetail = 'names' | 'grid' | 'time';
export const SKY_DETAIL_IDS: SkyDetail[] = ['names', 'grid', 'time'];
export const SKY_DETAIL_LABELS: Record<SkyDetail, string> = {
  names: 'Constellation names',
  grid: 'Grid',
  time: 'Time',
};

/**
 * Details from a list or a comma string, deduplicated and sorted into
 * canonical order. `''`, `'none'` and missing mean no details; an unknown
 * entry makes the whole value invalid (null).
 */
export function parseSkyDetails(value: unknown): SkyDetail[] | null {
  if (value == null || value === '' || value === 'none') return [];
  const items = Array.isArray(value) ? value.map(String) : String(value).split(',');
  const chosen = new Set<string>();
  for (const raw of items) {
    const item = raw.trim();
    if (!item) continue;
    if (!(SKY_DETAIL_IDS as string[]).includes(item)) return null;
    chosen.add(item);
  }
  return SKY_DETAIL_IDS.filter((id) => chosen.has(id));
}
```

3b. Replace the `SkyParams` and `SkyParamsInput` types with:

```ts
export type SkyParams = {
  /** 1 = legacy (no layout/details in the signed form); 2 = current. */
  v: 1 | 2;
  /** YYYY-MM-DD, local calendar date at the place. */
  date: string;
  /** HH:MM, local wall-clock time at the place. */
  time: string;
  /** Degrees, 4 dp. */
  lat: number;
  /** Degrees, 4 dp. */
  lon: number;
  /** IANA zone id, e.g. Europe/Paris. */
  tz: string;
  /** Display label, e.g. "Paris, France". */
  place: string;
  /** Customer title line, may be empty. */
  title: string;
  theme: SkyThemeId;
  /** Always 'classic' for v1. */
  layout: SkyLayoutId;
  /** Canonical order; always empty for v1. */
  details: SkyDetail[];
};

export type SkyParamsInput = Partial<
  Record<keyof Omit<SkyParams, 'v'>, unknown>
> & {v?: unknown};
```

3c. In `validateSkyParams`, insert at the very top of the function body (before `const date = …`):

```ts
  const versionText =
    input.v == null || input.v === '' ? '2' : String(input.v);
  if (versionText !== '1' && versionText !== '2') {
    return {ok: false, error: 'Unsupported personalisation version.'};
  }
  const v: 1 | 2 = versionText === '1' ? 1 : 2;
```

and replace the final `return {ok: true, params: {…}}` with:

```ts
  let layout: SkyLayoutId = 'classic';
  let details: SkyDetail[] = [];
  if (v === 2) {
    const layoutInput = String(input.layout ?? 'classic') as SkyLayoutId;
    if (!SKY_LAYOUT_IDS.includes(layoutInput)) {
      return {ok: false, error: 'Unknown layout.'};
    }
    layout = layoutInput;
    const parsedDetails = parseSkyDetails(input.details);
    if (!parsedDetails) return {ok: false, error: 'Unknown print detail.'};
    details = parsedDetails;
  }

  return {
    ok: true,
    params: {
      v,
      date,
      time,
      lat: round4(lat),
      lon: round4(lon),
      tz,
      place,
      title,
      theme,
      layout,
      details,
    },
  };
```

3d. Replace `canonicalSkyParams` and `parseCanonicalSkyParams` with:

```ts
/**
 * Fixed key order; this exact string is what gets signed. v1 keeps its
 * original nine keys byte for byte, so signatures and print tokens made
 * before v2 still verify.
 */
export function canonicalSkyParams(p: SkyParams) {
  const base = [
    `v=${p.v}`,
    `date=${p.date}`,
    `time=${p.time}`,
    `lat=${p.lat}`,
    `lon=${p.lon}`,
    `tz=${encodeURIComponent(p.tz)}`,
    `place=${encodeURIComponent(p.place)}`,
    `title=${encodeURIComponent(p.title)}`,
    `theme=${p.theme}`,
  ];
  if (p.v === 1) return base.join('&');
  return [
    ...base,
    `layout=${p.layout}`,
    `details=${p.details.length ? p.details.join(',') : 'none'}`,
  ].join('&');
}

export function parseCanonicalSkyParams(canonical: string): SkyValidation {
  const entries = new URLSearchParams(canonical);
  return validateSkyParams({
    v: entries.get('v'),
    date: entries.get('date'),
    time: entries.get('time'),
    lat: entries.get('lat'),
    lon: entries.get('lon'),
    tz: entries.get('tz'),
    place: entries.get('place'),
    title: entries.get('title') ?? '',
    theme: entries.get('theme'),
    layout: entries.get('layout'),
    details: entries.get('details'),
  });
}
```

3e. Replace `toCartAttributes` with:

```ts
export function toCartAttributes(p: SkyParams, sig?: string): CartAttribute[] {
  const attrs: CartAttribute[] = [
    ...(p.title ? [{key: 'Title', value: p.title}] : []),
    {key: 'Style', value: SKY_THEME_LABELS[p.theme]},
    ...(p.v === 2 ? [{key: 'Layout', value: SKY_LAYOUT_LABELS[p.layout]}] : []),
    ...(p.v === 2 && p.details.length
      ? [
          {
            key: 'Details',
            value: p.details.map((d) => SKY_DETAIL_LABELS[d]).join(' · '),
          },
        ]
      : []),
    {key: 'Place', value: p.place},
    {key: 'Date', value: formatSkyDate(p)},
    {key: '_v', value: String(p.v)},
    {key: '_date', value: p.date},
    {key: '_time', value: p.time},
    {key: '_lat', value: String(p.lat)},
    {key: '_lon', value: String(p.lon)},
    {key: '_tz', value: p.tz},
    {key: '_theme', value: p.theme},
    ...(p.v === 2
      ? [
          {key: '_layout', value: p.layout},
          {key: '_details', value: p.details.length ? p.details.join(',') : 'none'},
        ]
      : []),
  ];
  if (sig) attrs.push({key: '_sig', value: sig});
  return attrs;
}
```

3f. In `fromCartAttributes`, replace

```ts
  if (map.get('_v') !== '1' || map.has('_kind')) {
    return {ok: false, error: 'Not a sky line.'};
  }
  const result = validateSkyParams({
```

with

```ts
  const version = map.get('_v');
  if ((version !== '1' && version !== '2') || map.has('_kind')) {
    return {ok: false, error: 'Not a sky line.'};
  }
  const result = validateSkyParams({
    v: version,
    layout: map.get('_layout'),
    details: map.get('_details'),
```

(the remaining keys of that object literal stay as they are).

- [ ] **Step 4: Run the tests**

Run: `node --test scripts/skyParams.node-test.mjs scripts/skySign.node-test.mjs && npm run typecheck`
Expected: PASS and typecheck clean. If typecheck reports a `SkyParams` object literal elsewhere that lacks `layout`/`details` (search: `rg "theme: '" app scripts --glob '!*.json'`), build it through `validateSkyParams` instead of a literal.

- [ ] **Step 5: Run the whole suite**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)|^not ok"`
Expected: `ℹ fail 0`. The cart-lines, fulfilment, gift and share tests build their lines with `toCartAttributes`/`canonicalSkyParams`, so they follow v2 automatically.

- [ ] **Step 6: Commit**

```bash
git add app/lib/sky/params.ts scripts/skyParams.node-test.mjs scripts/skySign.node-test.mjs
git commit -m "Sky params v2: signed layout and details; v1 canonical unchanged"
```

---

### Task 4: Layout geometry

**Files:**
- Create: `app/lib/sky/layouts.ts`
- Modify: `app/lib/sky/projection.ts:35-52`
- Test: `scripts/skyLayouts.node-test.mjs`

- [ ] **Step 1: Write the failing test**

Create `scripts/skyLayouts.node-test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {SKY_LAYOUT_IDS} from '../app/lib/sky/params.ts';
import {skyPageLayout} from '../app/lib/sky/layouts.ts';
import {layoutFor} from '../app/lib/sky/projection.ts';

const SIZES = [
  [576, 720],
  [1440, 1728],
];

test('classic matches the original proportions exactly', () => {
  const a = layoutFor(576, 720);
  const b = skyPageLayout('classic', 576, 720);
  const close = (x, y) => Math.abs(x - y) < 1e-9;
  assert.ok(close(a.disc.cx, 288) && close(a.disc.cy, 288) && close(a.disc.r, 230.4), JSON.stringify(a.disc));
  assert.deepEqual(a.disc, b.disc);
  assert.equal(b.titleY, 720 * 0.79);
  assert.equal(b.subtitleY, 720 * 0.835);
  assert.equal(b.titleSize, 30);
  assert.equal(b.ring, 'plain');
});

test('every layout keeps the map, cardinals and text on the sheet', () => {
  for (const id of SKY_LAYOUT_IDS) {
    for (const [w, h] of SIZES) {
      const l = skyPageLayout(id, w, h);
      const {cx, cy, r} = l.disc;
      assert.equal(l.scale, w / 576);
      const outer = r + l.cardinalOffset + l.cardinalSize;
      assert.ok(cy - outer > 0, `${id} ${w}: top ${cy - outer}`);
      assert.ok(cx - outer > 0 && cx + outer < w, `${id} ${w}: sides`);
      const bottom = cy + r + l.cardinalOffset + 5 * l.scale;
      assert.ok(bottom < l.titleY - l.titleSize * 0.8, `${id} ${w}: S cardinal ${bottom} vs title ${l.titleY}`);
      assert.ok(l.titleY < l.subtitleY && l.subtitleY < l.creditY && l.creditY < h, `${id} ${w}: text order`);
    }
  }
});

test('layouts differ in the promised direction', () => {
  const r = (id) => skyPageLayout(id, 576, 720).disc.r;
  assert.ok(r('full') > r('classic') * 1.1, 'full is ~15% larger');
  assert.ok(r('compass') < r('classic'), 'compass is smaller');
  assert.ok(r('minimal') < r('compass'), 'minimal is smallest');
  assert.equal(skyPageLayout('compass', 576, 720).ring, 'compass');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test scripts/skyLayouts.node-test.mjs`
Expected: FAIL — cannot find `layouts.ts`.

- [ ] **Step 3: Create `app/lib/sky/layouts.ts`**

```ts
/**
 * Page geometry for each print layout. Every value is in points for the
 * given sheet and already multiplied by `scale` (sheet width / 576), so
 * both print sizes share the same proportions.
 */
import {maxTextWidth} from './fit.ts';
import type {SkyLayoutId} from './params.ts';
import type {SkyLayout} from './projection.ts';

export type SkyRingStyle = 'plain' | 'compass';

export type SkyPageLayout = SkyLayout & {
  id: SkyLayoutId;
  ring: SkyRingStyle;
  /** Font size of the N/E/S/W letters. */
  cardinalSize: number;
  /** How far the cardinal letters sit outside the disc. */
  cardinalOffset: number;
};

type Proportions = {
  radius: (width: number, height: number) => number;
  cy: number;
  titleY: number;
  subtitleY: number;
  creditY: number;
  titleSize: number;
  subtitleSize: number;
  creditSize: number;
  ring: SkyRingStyle;
  cardinalSize: number;
  cardinalOffset: number;
};

const PROPORTIONS: Record<SkyLayoutId, Proportions> = {
  classic: {
    radius: (w, h) => Math.min(w * 0.4, h * 0.32),
    cy: 0.4,
    titleY: 0.79,
    subtitleY: 0.835,
    creditY: 0.95,
    titleSize: 30,
    subtitleSize: 9.5,
    creditSize: 7,
    ring: 'plain',
    cardinalSize: 7,
    cardinalOffset: 11,
  },
  compass: {
    radius: (w, h) => Math.min(w * 0.36, h * 0.288),
    cy: 0.4,
    titleY: 0.79,
    subtitleY: 0.835,
    creditY: 0.95,
    titleSize: 30,
    subtitleSize: 9.5,
    creditSize: 7,
    ring: 'compass',
    cardinalSize: 10,
    cardinalOffset: 30,
  },
  full: {
    radius: (w, h) => Math.min(w * 0.46, h * 0.368),
    cy: 0.415,
    titleY: 0.855,
    subtitleY: 0.895,
    creditY: 0.962,
    titleSize: 26,
    subtitleSize: 9,
    creditSize: 6.5,
    ring: 'plain',
    cardinalSize: 7,
    cardinalOffset: 11,
  },
  minimal: {
    radius: (w, h) => Math.min(w * 0.3, h * 0.24),
    cy: 0.39,
    titleY: 0.72,
    subtitleY: 0.76,
    creditY: 0.95,
    titleSize: 24,
    subtitleSize: 8.5,
    creditSize: 6.5,
    ring: 'plain',
    cardinalSize: 6.5,
    cardinalOffset: 10,
  },
};

export function skyPageLayout(
  id: SkyLayoutId,
  width: number,
  height: number,
): SkyPageLayout {
  const p = PROPORTIONS[id];
  const scale = width / 576;
  return {
    id,
    width,
    height,
    scale,
    maxTextWidth: maxTextWidth(width),
    disc: {cx: width / 2, cy: height * p.cy, r: p.radius(width, height)},
    titleY: height * p.titleY,
    subtitleY: height * p.subtitleY,
    creditY: height * p.creditY,
    titleSize: p.titleSize * scale,
    subtitleSize: p.subtitleSize * scale,
    creditSize: p.creditSize * scale,
    ring: p.ring,
    cardinalSize: p.cardinalSize * scale,
    cardinalOffset: p.cardinalOffset * scale,
  };
}
```

- [ ] **Step 4: Make `layoutFor` delegate to Classic**

In `app/lib/sky/projection.ts`, replace the import line `import {maxTextWidth} from './fit.ts';` with `import {skyPageLayout} from './layouts.ts';` and replace the body of `layoutFor` (lines 35–52) with:

```ts
/** Shared proportions for both print sizes (the Classic layout). */
export function layoutFor(width: number, height: number): SkyLayout {
  return skyPageLayout('classic', width, height);
}
```

- [ ] **Step 5: Run the tests**

Run: `node --test scripts/skyLayouts.node-test.mjs scripts/skyScene.node-test.mjs && npm run typecheck`
Expected: PASS, typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add app/lib/sky/layouts.ts app/lib/sky/projection.ts scripts/skyLayouts.node-test.mjs
git commit -m "Sky layouts: Classic, Compass, Full sky and Minimal page geometry"
```

---

### Task 5: Drawing constants, star tone and the galactic plane

**Files:**
- Create: `app/lib/sky/style.ts`
- Create: `app/lib/sky/galaxy.ts`
- Test: `scripts/skyRich.node-test.mjs` (created here, extended in Tasks 7–8)

- [ ] **Step 1: Write the failing test**

Create `scripts/skyRich.node-test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {GLOW_RINGS, milkyWayOpacity, starStyle} from '../app/lib/sky/style.ts';
import {GALAXY_SAMPLES, galacticToEquatorial} from '../app/lib/sky/galaxy.ts';

test('star tone: bright stars full ink, the faintest ~35 % and smaller', () => {
  assert.equal(starStyle(0.5, 1).opacity, 1);
  assert.equal(starStyle(2.9, 1).opacity, 1);
  assert.ok(starStyle(6.4, 1).opacity < 0.4);
  const mags = [-1, 0.5, 1.5, 2.5, 3.5, 4.5, 5.2, 6.4];
  for (let i = 1; i < mags.length; i++) {
    assert.ok(starStyle(mags[i], 1).r <= starStyle(mags[i - 1], 1).r, `r at ${mags[i]}`);
    assert.ok(starStyle(mags[i], 1).opacity <= starStyle(mags[i - 1], 1).opacity, `opacity at ${mags[i]}`);
  }
  assert.equal(starStyle(1, 2.5).r, starStyle(1, 1).r * 2.5);
});

test('glow rings fade outward', () => {
  for (let i = 1; i < GLOW_RINGS.length; i++) {
    assert.ok(GLOW_RINGS[i].radius > GLOW_RINGS[i - 1].radius);
    assert.ok(GLOW_RINGS[i].opacity < GLOW_RINGS[i - 1].opacity);
  }
});

test('galactic centre lands in Sagittarius (J2000)', () => {
  const {ra, dec} = galacticToEquatorial(0, 0);
  assert.ok(Math.abs(ra - 266.405) < 0.01, `ra ${ra}`);
  assert.ok(Math.abs(dec - -28.936) < 0.01, `dec ${dec}`);
  const pole = galacticToEquatorial(0, 90);
  assert.ok(Math.abs(pole.ra - 192.8595) < 0.01 && Math.abs(pole.dec - 27.1283) < 0.01);
});

test('galaxy samples: every 2°, brightest and widest at the centre', () => {
  assert.equal(GALAXY_SAMPLES.length, 180);
  const centre = GALAXY_SAMPLES[0];
  const anticentre = GALAXY_SAMPLES[90];
  assert.ok(centre.intensity > anticentre.intensity);
  assert.ok(centre.width > anticentre.width);
  assert.ok(GALAXY_SAMPLES.every((s) => s.intensity > 0 && s.intensity <= 1));
});

test('milky way opacity is quantised to limit PDF graphics states', () => {
  assert.equal(milkyWayOpacity(0.035, 0.73333, 0.45), 0.012);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test scripts/skyRich.node-test.mjs`
Expected: FAIL — cannot find `style.ts`.

- [ ] **Step 3: Create `app/lib/sky/style.ts`**

```ts
/**
 * Drawing constants shared by the SVG preview and the PDF print so both
 * draw identical marks. Lengths are in points at scale 1 (an 8×10 sheet);
 * multiply by the scene's `scale`.
 */

/** Constellation stick-figure stroke. */
export const LINE_WIDTH = 0.3;

/** The brightest stars above the horizon that get a soft glow. */
export const GLOW_COUNT = 25;
/** Glow = three faint concentric discs, radius as a multiple of the star's. */
export const GLOW_RINGS = [
  {radius: 2.2, opacity: 0.1},
  {radius: 3.4, opacity: 0.055},
  {radius: 5, opacity: 0.03},
] as const;

/** Each Milky Way sample is drawn twice: a wide faint pass and a core. */
export const MILKY_WAY_PASSES = [
  {radius: 1, opacity: 0.45},
  {radius: 0.5, opacity: 1},
] as const;

export const MOON_RADIUS = 9.5;
export const MOON_GLOW = [
  {radius: 1.6, opacity: 0.12},
  {radius: 2.3, opacity: 0.05},
] as const;
export const MOON_EDGE_WIDTH = 0.35;
export const MOON_EDGE_OPACITY = 0.55;

/** Planets: a ring of the scene radius around a dot of PLANET_DOT × radius. */
export const PLANET_STROKE = 0.45;
export const PLANET_DOT = 0.45;

/** Horizon: an outer ring and a hairline `gap` inside it. */
export const RING = {outer: 0.6, inner: 0.25, gap: 2.4} as const;

export const GRID_WIDTH = 0.25;

export const LABEL_SIZE = 5;
export const LABEL_TRACKING = 1.1;

/** Compass ring: ticks every 2°, long every 10°, numerals every 30°. */
export const TICK = {
  gap: 2.5,
  minor: 3,
  major: 6.5,
  width: 0.35,
  numeralSize: 5.5,
  numeralOffset: 15,
} as const;

/**
 * Size and ink for a star of the given magnitude: the brightest stars full
 * ink, stepping down to ~35 % and a smaller dot for the faintest, so the
 * field reads as depth rather than speckle.
 */
export function starStyle(mag: number, scale: number) {
  const base =
    mag <= 0 ? 2.5
    : mag <= 1 ? 2.05
    : mag <= 2 ? 1.65
    : mag <= 3 ? 1.25
    : mag <= 4 ? 0.9
    : mag <= 5 ? 0.62
    : mag <= 5.5 ? 0.46
    : 0.38;
  const opacity =
    mag <= 3 ? 1
    : mag <= 4 ? 0.9
    : mag <= 5 ? 0.72
    : mag <= 5.5 ? 0.5
    : 0.36;
  return {r: base * scale, opacity};
}

/** Per-disc Milky Way opacity, rounded to 3 dp (fewer PDF graphics states). */
export function milkyWayOpacity(
  themeOpacity: number,
  intensity: number,
  passOpacity: number,
) {
  return Math.round(themeOpacity * intensity * passOpacity * 1000) / 1000;
}
```

- [ ] **Step 4: Create `app/lib/sky/galaxy.ts`**

```ts
/**
 * The Milky Way as soft overlapping discs along the galactic plane,
 * brighter and wider toward the galactic centre in Sagittarius. Computed
 * rather than catalogued: nothing to clip at the horizon, and it stays
 * soft in both the SVG preview and the vector PDF.
 */
const DEG = Math.PI / 180;
// North galactic pole and the galactic longitude of the north celestial
// pole, J2000 (IAU 1958 system transformed to J2000).
const NGP_RA = 192.85948 * DEG;
const NGP_DEC = 27.12825 * DEG;
const L_NCP = 122.93192 * DEG;

export type GalaxySample = {
  ra: number;
  dec: number;
  /** Angular radius of the soft disc, degrees. */
  width: number;
  /** 0..1 brightness. */
  intensity: number;
};

/** J2000 equatorial coordinates (degrees) of galactic l, b (degrees). */
export function galacticToEquatorial(lDeg: number, bDeg: number) {
  const l = lDeg * DEG;
  const b = bDeg * DEG;
  const sinDec =
    Math.sin(NGP_DEC) * Math.sin(b) +
    Math.cos(NGP_DEC) * Math.cos(b) * Math.cos(L_NCP - l);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
  const y = Math.cos(b) * Math.sin(L_NCP - l);
  const x =
    Math.cos(NGP_DEC) * Math.sin(b) -
    Math.sin(NGP_DEC) * Math.cos(b) * Math.cos(L_NCP - l);
  const ra = (NGP_RA + Math.atan2(y, x)) / DEG;
  return {ra: ((ra % 360) + 360) % 360, dec: dec / DEG};
}

/** Galactic longitude folded to −180..180 (0 = the centre). */
const fold = (l: number) => ((((l + 180) % 360) + 360) % 360) - 180;

export const GALAXY_SAMPLES: GalaxySample[] = Array.from(
  {length: 180},
  (_, i) => {
    const l = i * 2;
    const core = Math.exp(-((fold(l) / 55) ** 2));
    return {
      ...galacticToEquatorial(l, 0),
      width: 6 + 6 * core,
      intensity: 0.45 + 0.55 * core,
    };
  },
);
```

- [ ] **Step 5: Run the tests**

Run: `node --test scripts/skyRich.node-test.mjs`
Expected: PASS. (If the galactic-centre assertion is off by >0.01°, re-check the three pole constants against the comment before changing the tolerance.)

- [ ] **Step 6: Commit**

```bash
git add app/lib/sky/style.ts app/lib/sky/galaxy.ts scripts/skyRich.node-test.mjs
git commit -m "Sky style constants, magnitude tone and computed galactic plane"
```

---

### Task 6: Theme tokens

**Files:**
- Modify: `app/lib/sky/themes.ts`
- Test: `scripts/skyRich.node-test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `scripts/skyRich.node-test.mjs` (add `import {SKY_THEMES} from '../app/lib/sky/themes.ts';` to the imports):

```js
test('every theme defines the richer-sky tokens', () => {
  const colours = ['milkyWay', 'glow', 'moonFace', 'moonShade', 'moonEdge', 'grid', 'label'];
  const opacities = ['milkyWayOpacity', 'moonShadeOpacity', 'gridOpacity', 'labelOpacity'];
  for (const theme of Object.values(SKY_THEMES)) {
    for (const key of colours) assert.match(theme[key], /^#[0-9a-f]{6}$/, `${theme.id}.${key}`);
    for (const key of opacities) assert.ok(theme[key] > 0 && theme[key] <= 1, `${theme.id}.${key}`);
    assert.ok(theme.moonLit && theme.moonDark, `${theme.id} keeps First Light's tokens`);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test scripts/skyRich.node-test.mjs`
Expected: FAIL on `linen.milkyWay`.

- [ ] **Step 3: Add the tokens**

In `app/lib/sky/themes.ts`, add to the `SkyTheme` type after `planet: string;`:

```ts
  /** Richer sky (Your Sky only; First Light still uses moonLit/moonDark). */
  milkyWay: string;
  milkyWayOpacity: number;
  glow: string;
  moonFace: string;
  moonShade: string;
  moonShadeOpacity: number;
  moonEdge: string;
  grid: string;
  gridOpacity: number;
  label: string;
  labelOpacity: number;
```

and add to each theme object after its `planet:` line:

`linen`:
```ts
    milkyWay: '#8a7d6b',
    milkyWayOpacity: 0.035,
    glow: '#3c3831',
    moonFace: '#f8f3ea',
    moonShade: '#26231f',
    moonShadeOpacity: 0.2,
    moonEdge: '#26231f',
    grid: '#746f65',
    gridOpacity: 0.35,
    label: '#5c564c',
    labelOpacity: 0.8,
```

`midnight-garden`:
```ts
    milkyWay: '#e8dcc0',
    milkyWayOpacity: 0.05,
    glow: '#f1e3b8',
    moonFace: '#f4ecd8',
    moonShade: '#f1e3b8',
    moonShadeOpacity: 0.12,
    moonEdge: '#f1e3b8',
    grid: '#b7ad93',
    gridOpacity: 0.3,
    label: '#cbbf9f',
    labelOpacity: 0.85,
```

`quiet-form`:
```ts
    milkyWay: '#7a6a5a',
    milkyWayOpacity: 0.03,
    glow: '#2b2622',
    moonFace: '#fbf8f2',
    moonShade: '#2b2622',
    moonShadeOpacity: 0.2,
    moonEdge: '#2b2622',
    grid: '#7b7166',
    gridOpacity: 0.35,
    label: '#5a4f44',
    labelOpacity: 0.8,
```

- [ ] **Step 4: Run tests and typecheck**

Run: `node --test scripts/skyRich.node-test.mjs && npm run typecheck`
Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add app/lib/sky/themes.ts scripts/skyRich.node-test.mjs
git commit -m "Sky themes: Milky Way, glow, Moon, grid and label tokens"
```

---

### Task 7: Label placement

**Files:**
- Create: `app/lib/sky/labels.ts`
- Test: `scripts/skyRich.node-test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `scripts/skyRich.node-test.mjs` (import `placeLabels` from `../app/lib/sky/labels.ts`):

```js
test('labels skip collisions, the avoided Moon box and the disc edge', () => {
  const disc = {cx: 100, cy: 100, r: 90};
  const placed = placeLabels(
    [
      {x: 100, y: 100, text: 'ORION', rank: 1},
      {x: 102, y: 101, text: 'LEPUS', rank: 2}, // overlaps Orion
      {x: 100, y: 60, text: 'TAURUS', rank: 1},
      {x: 100, y: 140, text: 'CANIS MAJOR', rank: 1}, // inside the Moon box
      {x: 185, y: 100, text: 'ERIDANUS', rank: 1}, // spills over the edge
    ],
    {disc, size: 5, tracking: 1, avoid: [{x0: 80, x1: 120, y0: 130, y1: 150}]},
  );
  assert.deepEqual(placed.map((l) => l.text).sort(), ['ORION', 'TAURUS']);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test scripts/skyRich.node-test.mjs`
Expected: FAIL — cannot find `labels.ts`.

- [ ] **Step 3: Create `app/lib/sky/labels.ts`**

```ts
/**
 * Greedy constellation-label placement: brightest-rank constellations
 * first, each label kept only if its box stays inside the disc and clears
 * every label (and avoided box, e.g. the Moon) placed before it. Widths are
 * estimated (tracked capitals ≈ 0.66 em each) — good enough for spacing;
 * the renderers centre the real glyphs on (x, y).
 */
import type {Disc} from './projection.ts';

export type SceneLabel = {x: number; y: number; text: string};
export type LabelBox = {x0: number; y0: number; x1: number; y1: number};
export type LabelCandidate = SceneLabel & {rank: number};

const overlaps = (a: LabelBox, b: LabelBox) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

export function placeLabels(
  candidates: LabelCandidate[],
  {
    disc,
    size,
    tracking,
    avoid,
  }: {disc: Disc; size: number; tracking: number; avoid: LabelBox[]},
): SceneLabel[] {
  const taken = [...avoid];
  const placed: SceneLabel[] = [];
  const ordered = [...candidates].sort(
    (a, b) => a.rank - b.rank || a.text.localeCompare(b.text),
  );
  for (const c of ordered) {
    const width = c.text.length * size * 0.66 + tracking * (c.text.length - 1);
    const box: LabelBox = {
      x0: c.x - width / 2,
      x1: c.x + width / 2,
      y0: c.y - size * 0.9,
      y1: c.y + size * 0.3,
    };
    const corners = [
      [box.x0, box.y0],
      [box.x1, box.y0],
      [box.x0, box.y1],
      [box.x1, box.y1],
    ];
    const inside = corners.every(
      ([x, y]) => Math.hypot(x - disc.cx, y - disc.cy) <= disc.r * 0.97,
    );
    if (!inside || taken.some((t) => overlaps(t, box))) continue;
    taken.push(box);
    placed.push({x: c.x, y: c.y, text: c.text});
  }
  return placed;
}
```

- [ ] **Step 4: Run the test**

Run: `node --test scripts/skyRich.node-test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/lib/sky/labels.ts scripts/skyRich.node-test.mjs
git commit -m "Sky labels: greedy non-overlapping constellation name placement"
```

---

### Task 8: Scene — every layer, layouts and details

**Files:**
- Modify: `app/lib/sky/astro.ts`
- Rewrite: `app/lib/sky/scene.ts`
- Test: `scripts/skyRich.node-test.mjs`

- [ ] **Step 1: Write the failing tests**

Append to `scripts/skyRich.node-test.mjs` (add imports: `computeSky, horizonCrossing` from `../app/lib/sky/scene.ts`, `validateSkyParams` from `../app/lib/sky/params.ts`, `loadSkyCatalogSync` from `./lib/sky-catalog.mjs`, `GLOW_COUNT, MOON_RADIUS` from `../app/lib/sky/style.ts`):

```js
const catalog = loadSkyCatalogSync();
const sky = (extra = {}) =>
  validateSkyParams({
    date: '2019-06-14',
    time: '22:00',
    lat: 48.8566,
    lon: 2.3522,
    tz: 'Europe/Paris',
    place: 'Paris, France',
    title: 'The night we met',
    theme: 'linen',
    ...extra,
  }).params;
const inDisc = (scene, x, y, slack = 1e-6) =>
  Math.hypot(x - scene.disc.cx, y - scene.disc.cy) <= scene.disc.r + slack;

test('horizon crossing lies on the horizon between its endpoints', () => {
  const p = horizonCrossing({alt: 10, az: 40}, {alt: -10, az: 50});
  assert.ok(Math.abs(p.alt) < 1e-9);
  assert.ok(p.az > 40 && p.az < 50, `az ${p.az}`);
});

test('richer sky: tone, glows, clipped lines, Milky Way, Moon', () => {
  const scene = computeSky({params: sky(), size: '8x10', catalog});
  assert.ok(scene.stars.some((s) => s.opacity < 0.4), 'faint stars toned down');
  assert.ok(scene.glows.length > 0 && scene.glows.length <= GLOW_COUNT);
  assert.ok(scene.glows.every((g) => inDisc(scene, g.x, g.y)));
  assert.ok(scene.lines.every((l) => inDisc(scene, l.x1, l.y1) && inDisc(scene, l.x2, l.y2)));
  const onRing = (x, y) => Math.abs(Math.hypot(x - scene.disc.cx, y - scene.disc.cy) - scene.disc.r) < 1e-6;
  assert.ok(scene.lines.some((l) => onRing(l.x1, l.y1) || onRing(l.x2, l.y2)), 'some lines clipped at the ring');
  assert.ok(scene.milkyWay.length > 20, `${scene.milkyWay.length} galaxy discs`);
  assert.ok(scene.milkyWay.every((m) => m.r > 0 && m.intensity > 0));
  if (scene.moon) assert.equal(scene.moon.r, MOON_RADIUS * scene.scale);
  // Spec budget: the SVG stays under ~6,000 drawn elements.
  const nodes =
    scene.stars.length + scene.lines.length + scene.milkyWay.length * 2 + scene.glows.length * 3;
  assert.ok(nodes < 6000, `${nodes} SVG elements`);
  assert.equal(scene.grid, null);
  assert.deepEqual(scene.labels, []);
  assert.equal(scene.compass, null);
  assert.equal(scene.subtitle, 'PARIS, FRANCE · 14 JUNE 2019 · 48.8566° N, 2.3522° E');
});

test('details: grid circles and spokes, names, time in the subtitle', () => {
  const scene = computeSky({params: sky({details: 'names,grid,time'}), size: '8x10', catalog});
  const {r} = scene.disc;
  assert.deepEqual(
    scene.grid.circles.map((c) => Math.round(c * 1000) / 1000),
    [r * Math.tan(Math.PI / 12), r * Math.tan(Math.PI / 6)].map((c) => Math.round(c * 1000) / 1000),
  );
  assert.equal(scene.grid.spokes.length, 12);
  assert.ok(scene.labels.length >= 6, `${scene.labels.length} labels`);
  assert.ok(scene.labels.every((l) => inDisc(scene, l.x, l.y)));
  assert.equal(new Set(scene.labels.map((l) => l.text)).size, scene.labels.length);
  assert.equal(scene.subtitle, 'PARIS, FRANCE · 14 JUNE 2019 · 22:00 · 48.8566° N, 2.3522° E');
});

test('layouts: compass ring and per-layout disc sizes', () => {
  const compass = computeSky({params: sky({layout: 'compass'}), size: '20x24', catalog});
  assert.equal(compass.compass.ticks.length, 180);
  assert.deepEqual(
    compass.compass.numerals.map((n) => n.text),
    ['30', '60', '120', '150', '210', '240', '300', '330'],
  );
  const r = (layout) => computeSky({params: sky({layout}), size: '8x10', catalog}).disc.r;
  assert.ok(r('full') > r('classic') && r('classic') > r('compass') && r('compass') > r('minimal'));
  const minimal = computeSky({params: sky({layout: 'minimal'}), size: '8x10', catalog});
  assert.ok(minimal.stars.every((s) => inDisc(minimal, s.x, s.y)));
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test scripts/skyRich.node-test.mjs`
Expected: FAIL — `horizonCrossing` is not exported / `glows` undefined.

- [ ] **Step 3: Extend `app/lib/sky/astro.ts`**

Add the import `import {GALAXY_SAMPLES, type GalaxySample} from './galaxy.ts';` after the existing imports. Add these types after `MoonPosition`:

```ts
export type GalaxyPosition = HorizontalPoint & GalaxySample;
export type LabelPosition = HorizontalPoint & {name: string; rank: number};
```

Extend `SkyPositions` with:

```ts
  galaxy: GalaxyPosition[];
  labels: LabelPosition[];
```

and replace the final `return {stars, segments, moon, sun: body('Sun'), planets};` with:

```ts
  const galaxy = GALAXY_SAMPLES.map((g) => ({...g, ...toHorizontal(g.ra, g.dec)}));
  const labels = (catalog.names ?? []).map(([, name, ra, dec, rank]) => ({
    name,
    rank,
    ...toHorizontal(ra, dec),
  }));

  return {stars, segments, moon, sun: body('Sun'), planets, galaxy, labels};
```

- [ ] **Step 4: Rewrite `app/lib/sky/scene.ts`**

```ts
/**
 * computeSky(): parameters → a pure, unit-agnostic scene in points
 * (1/72 in) for the chosen sheet. Both renderers draw exactly this.
 */
import {skyPositions, type HorizontalPoint} from './astro.ts';
import type {SkyCatalog} from './catalog.ts';
import {placeLabels, type LabelBox, type SceneLabel} from './labels.ts';
import {skyPageLayout, type SkyPageLayout} from './layouts.ts';
import {formatCoordinates, type SkyParams} from './params.ts';
import {SKY_SIZES, type SkySizeKey} from './products.ts';
import {projectAltAz, type Disc} from './projection.ts';
import {
  GLOW_COUNT,
  LABEL_SIZE,
  LABEL_TRACKING,
  MOON_RADIUS,
  starStyle,
  TICK,
} from './style.ts';
import {localToUtc} from './time.ts';

export type SceneStar = {
  x: number;
  y: number;
  r: number;
  mag: number;
  /** 1 = full ink. */
  opacity: number;
};
export type SceneLine = {x1: number; y1: number; x2: number; y2: number};
export type SceneBody = {x: number; y: number; r: number; name: string};
export type SceneMoon = {
  x: number;
  y: number;
  r: number;
  phaseFraction: number;
  litRight: boolean;
};
/** A bright star's glow centre and the star's own radius. */
export type SceneGlow = {x: number; y: number; r: number};
/** One soft Milky Way disc. */
export type SceneGalaxy = {x: number; y: number; r: number; intensity: number};
export type SceneGrid = {circles: number[]; spokes: SceneLine[]};
export type SceneCompass = {
  ticks: SceneLine[];
  numerals: Array<{x: number; y: number; text: string}>;
};

export type SkyScene = SkyPageLayout & {
  stars: SceneStar[];
  glows: SceneGlow[];
  lines: SceneLine[];
  milkyWay: SceneGalaxy[];
  grid: SceneGrid | null;
  labels: SceneLabel[];
  compass: SceneCompass | null;
  moon: SceneMoon | null;
  planets: SceneBody[];
  title: string;
  subtitle: string;
  /** The subtitle split at its first separator, for two-line fitting. */
  subtitleParts: {place: string; rest: string};
  credit: string;
  cardinal: Array<{label: string; x: number; y: number}>;
};

const DEG = Math.PI / 180;

const MONTHS = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
];

export const SKY_CREDIT = 'CLARA MENDES · YOUR SKY';

export function skySubtitleParts(p: SkyParams) {
  const [y, m, d] = p.date.split('-').map(Number);
  const time = p.details.includes('time') ? ` · ${p.time}` : '';
  return {
    place: p.place.toUpperCase(),
    rest: `${d} ${MONTHS[m - 1]} ${y}${time} · ${formatCoordinates(p.lat, p.lon)}`,
  };
}

export function skySubtitle(p: SkyParams) {
  const parts = skySubtitleParts(p);
  return `${parts.place} · ${parts.rest}`;
}

function toVector({alt, az}: HorizontalPoint): [number, number, number] {
  const a = alt * DEG;
  const z = az * DEG;
  return [Math.cos(a) * Math.cos(z), Math.cos(a) * Math.sin(z), Math.sin(a)];
}

/**
 * Where the (short, great-circle) segment a→b crosses the horizon. Used to
 * clip constellation lines at the ring instead of dropping them.
 */
export function horizonCrossing(
  a: HorizontalPoint,
  b: HorizontalPoint,
): HorizontalPoint {
  const va = toVector(a);
  const vb = toVector(b);
  const t = va[2] / (va[2] - vb[2]);
  const x = va[0] + t * (vb[0] - va[0]);
  const y = va[1] + t * (vb[1] - va[1]);
  return {alt: 0, az: (((Math.atan2(y, x) / DEG) % 360) + 360) % 360};
}

/** Radius on the page of a small circle of angular radius `deg` at `alt`. */
function projectedRadius(altDeg: number, deg: number, disc: Disc) {
  const k = Math.tan(((90 - altDeg) * DEG) / 2);
  return (disc.r * deg * DEG * (1 + k * k)) / 2;
}

/** Point at `radius` from the disc centre toward azimuth `azDeg` (E left). */
function polar(disc: Disc, radius: number, azDeg: number) {
  const az = azDeg * DEG;
  return {
    x: disc.cx - radius * Math.sin(az),
    y: disc.cy - radius * Math.cos(az),
  };
}

function buildGrid(disc: Disc): SceneGrid {
  // Altitude 60° and 30° circles (zenith distance 30° and 60°).
  const circles = [60, 30].map((alt) => disc.r * Math.tan(((90 - alt) * DEG) / 2));
  const spokes = Array.from({length: 12}, (_, i) => {
    const end = polar(disc, disc.r, i * 30);
    return {x1: disc.cx, y1: disc.cy, x2: end.x, y2: end.y};
  });
  return {circles, spokes};
}

function buildCompass(disc: Disc, scale: number): SceneCompass {
  const inner = disc.r + TICK.gap * scale;
  const ticks: SceneLine[] = [];
  for (let deg = 0; deg < 360; deg += 2) {
    const length = (deg % 10 === 0 ? TICK.major : TICK.minor) * scale;
    const a = polar(disc, inner, deg);
    const b = polar(disc, inner + length, deg);
    ticks.push({x1: a.x, y1: a.y, x2: b.x, y2: b.y});
  }
  const numerals: SceneCompass['numerals'] = [];
  for (let deg = 30; deg < 360; deg += 30) {
    if (deg % 90 === 0) continue; // N, E, S, W carry the letters
    const p = polar(disc, disc.r + TICK.numeralOffset * scale, deg);
    numerals.push({
      x: p.x,
      y: p.y + TICK.numeralSize * 0.35 * scale,
      text: String(deg),
    });
  }
  return {ticks, numerals};
}

export function computeSky({
  params,
  size,
  catalog,
}: {
  params: SkyParams;
  size: SkySizeKey;
  catalog: SkyCatalog;
}): SkyScene {
  const [width, height] = SKY_SIZES[size].points;
  const layout = skyPageLayout(params.layout, width, height);
  const {disc, scale} = layout;
  const when = localToUtc(params.date, params.time, params.tz);
  const sky = skyPositions({
    date: when,
    lat: params.lat,
    lon: params.lon,
    catalog,
  });

  const stars: SceneStar[] = [];
  for (const s of sky.stars) {
    if (s.alt <= 0) continue;
    const {x, y} = projectAltAz(s.alt, s.az, disc);
    const style = starStyle(s.mag, scale);
    stars.push({x, y, r: style.r, opacity: style.opacity, mag: s.mag});
  }
  // The catalogue is sorted bright → faint, so these are the brightest
  // stars above the horizon.
  const glows: SceneGlow[] = stars
    .slice(0, GLOW_COUNT)
    .map(({x, y, r}) => ({x, y, r}));

  const lines: SceneLine[] = [];
  for (const [a, b] of sky.segments) {
    if (a.alt <= 0 && b.alt <= 0) continue;
    const from = a.alt > 0 ? a : horizonCrossing(a, b);
    const to = b.alt > 0 ? b : horizonCrossing(a, b);
    const p = projectAltAz(from.alt, from.az, disc);
    const q = projectAltAz(to.alt, to.az, disc);
    lines.push({x1: p.x, y1: p.y, x2: q.x, y2: q.y});
  }

  // Discs just below the horizon still soften the band's edge; the
  // renderers clip everything to the ring.
  const milkyWay: SceneGalaxy[] = [];
  for (const g of sky.galaxy) {
    if (g.alt < -20) continue;
    const {x, y} = projectAltAz(g.alt, g.az, disc);
    milkyWay.push({
      x,
      y,
      r: projectedRadius(g.alt, g.width, disc),
      intensity: g.intensity,
    });
  }

  const moon: SceneMoon | null =
    sky.moon.alt > 0
      ? {
          ...projectAltAz(sky.moon.alt, sky.moon.az, disc),
          r: MOON_RADIUS * scale,
          phaseFraction: sky.moon.phaseFraction,
          // Northern hemisphere: a waxing Moon is lit on its right (west).
          litRight: params.lat >= 0 ? sky.moon.waxing : !sky.moon.waxing,
        }
      : null;

  const planets: SceneBody[] = sky.planets
    .filter((p) => p.alt > 0)
    .map((p) => ({
      ...projectAltAz(p.alt, p.az, disc),
      r: 2.2 * scale,
      name: p.name,
    }));

  const avoid: LabelBox[] = moon
    ? [
        {
          x0: moon.x - moon.r * 2,
          x1: moon.x + moon.r * 2,
          y0: moon.y - moon.r * 2,
          y1: moon.y + moon.r * 2,
        },
      ]
    : [];
  const labels = params.details.includes('names')
    ? placeLabels(
        sky.labels
          .filter((l) => l.alt > 4)
          .map((l) => ({
            ...projectAltAz(l.alt, l.az, disc),
            text: l.name.toUpperCase(),
            rank: l.rank,
          })),
        {
          disc,
          size: LABEL_SIZE * scale,
          tracking: LABEL_TRACKING * scale,
          avoid,
        },
      )
    : [];

  const o = layout.cardinalOffset;
  const cardinal = [
    {label: 'N', x: disc.cx, y: disc.cy - disc.r - (o - 2 * scale)},
    {label: 'S', x: disc.cx, y: disc.cy + disc.r + o + 5 * scale},
    {
      label: 'E',
      x: disc.cx - disc.r - o - scale,
      y: disc.cy + layout.cardinalSize * 0.43,
    },
    {
      label: 'W',
      x: disc.cx + disc.r + o + scale,
      y: disc.cy + layout.cardinalSize * 0.43,
    },
  ];

  return {
    ...layout,
    stars,
    glows,
    lines,
    milkyWay,
    grid: params.details.includes('grid') ? buildGrid(disc) : null,
    labels,
    compass: layout.ring === 'compass' ? buildCompass(disc, scale) : null,
    moon,
    planets,
    cardinal,
    title: params.title,
    subtitle: skySubtitle(params),
    subtitleParts: skySubtitleParts(params),
    credit: SKY_CREDIT,
  };
}
```

- [ ] **Step 5: Run the scene tests**

Run: `node --test scripts/skyRich.node-test.mjs scripts/skyScene.node-test.mjs scripts/skyLayouts.node-test.mjs`
Expected: PASS. (The Classic cardinal positions equal the old ones exactly: N −9, S +16, E/W ±12 at scale 1.)

- [ ] **Step 6: Commit**

```bash
git add app/lib/sky/astro.ts app/lib/sky/scene.ts scripts/skyRich.node-test.mjs
git commit -m "Sky scene: tone, glows, clipped lines, Milky Way, Moon, grid, names, compass"
```

---

### Task 9: SVG renderer

**Files:**
- Rewrite: `app/lib/sky/svg.tsx`

No node test can import TSX; this renderer is verified by typecheck, the review sheet (Task 11) and the page images (Task 12). Keep its layer order identical to the PDF renderer in Task 10.

- [ ] **Step 1: Rewrite `app/lib/sky/svg.tsx`**

```tsx
import {useEffect, useId, useMemo, useState} from 'react';
import {fitSubtitle, fitTitle, trackedWidth, type MeasureText} from './fit';
import {moonLitPath} from './moon';
import type {SkyScene} from './scene';
import {
  GLOW_RINGS,
  GRID_WIDTH,
  LABEL_SIZE,
  LABEL_TRACKING,
  LINE_WIDTH,
  MILKY_WAY_PASSES,
  milkyWayOpacity,
  MOON_EDGE_OPACITY,
  MOON_EDGE_WIDTH,
  MOON_GLOW,
  PLANET_DOT,
  PLANET_STROKE,
  RING,
  TICK,
} from './style';
import type {SkyTheme} from './themes';

const FONT = "'EB Garamond', Georgia, 'Times New Roman', serif";

/**
 * Canvas text measurer in the page font, refreshed once EB Garamond has
 * loaded so measurements match what is drawn. Null during SSR.
 */
function useTextMeasure() {
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const fonts = typeof document !== 'undefined' ? document.fonts : null;
    if (!fonts) {
      setFontsReady(true);
      return;
    }
    Promise.all([
      fonts.load("italic 30px 'EB Garamond'"),
      fonts.load("30px 'EB Garamond'"),
    ])
      .catch(() => {})
      .finally(() => {
        if (alive) setFontsReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return null;
    void fontsReady;
    return (style: 'italic' | 'normal'): MeasureText =>
      (text, size) => {
        context.font = `${style === 'italic' ? 'italic ' : ''}${size}px ${FONT}`;
        return context.measureText(text).width;
      };
  }, [fontsReady]);
}

/**
 * Live preview. Draws the same scene, in the same layer order, as the PDF
 * renderer prints (app/lib/sky/pdf.server.ts).
 */
export function SkySvg({
  scene,
  theme,
  plateUrl,
  className,
}: {
  scene: SkyScene;
  theme: SkyTheme;
  plateUrl: string | null;
  className?: string;
}) {
  const {width: W, height: H, disc, scale} = scene;
  const clipId = `sky-disc-${useId().replace(/[^\w-]/g, '')}`;
  const measure = useTextMeasure();
  const title = measure
    ? fitTitle(scene.title, scene.titleSize, scene.maxTextWidth, measure('italic'))
    : {lines: scene.title ? [scene.title] : [], size: scene.titleSize};
  const titleOffset = (index: number) =>
    title.lines.length === 1 ? 0 : (index - 0.5) * title.size * 1.2;
  const titleLines = title.lines.map((text, index) => ({
    text,
    slot: index === 0 ? 'first' : 'second',
    y: scene.titleY + titleOffset(index),
  }));
  const subtitleTracking = (size: number) =>
    1.6 * scale * (size / scene.subtitleSize);
  const subtitle = measure
    ? fitSubtitle(
        scene.subtitleParts,
        scene.subtitleSize,
        scene.maxTextWidth,
        (t, s) => trackedWidth(t, s, subtitleTracking(s), measure('normal')),
      )
    : {lines: [scene.subtitle], size: scene.subtitleSize};
  const moon = scene.moon;
  const moonPath = moon
    ? moonLitPath(moon.x, moon.y, moon.r, moon.phaseFraction, moon.litRight)
    : '';

  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Star map preview: ${scene.subtitle}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={disc.cx} cy={disc.cy} r={disc.r} />
        </clipPath>
      </defs>
      <rect width={W} height={H} fill={theme.background} />
      {plateUrl ? (
        <image
          href={plateUrl}
          width={W}
          height={H}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : null}
      {theme.disc ? (
        <circle
          cx={disc.cx}
          cy={disc.cy}
          r={disc.r}
          fill={theme.disc}
          opacity={theme.discOpacity}
        />
      ) : null}
      {/* Static, wholesale-recomputed lists: index keys are correct here, and
          the catalogue contains a few coincident stars, so coordinates are
          not unique. */}
      <g clipPath={`url(#${clipId})`}>
        <g fill={theme.milkyWay}>
          {MILKY_WAY_PASSES.map((pass, p) =>
            scene.milkyWay.map((m, i) => (
              <circle
                // eslint-disable-next-line react/no-array-index-key
                key={`${p}-${i}`}
                cx={m.x}
                cy={m.y}
                r={m.r * pass.radius}
                opacity={milkyWayOpacity(theme.milkyWayOpacity, m.intensity, pass.opacity)}
              />
            )),
          )}
        </g>
        {scene.grid ? (
          <g
            fill="none"
            stroke={theme.grid}
            strokeOpacity={theme.gridOpacity}
            strokeWidth={GRID_WIDTH * scale}
          >
            {scene.grid.circles.map((r) => (
              <circle key={r} cx={disc.cx} cy={disc.cy} r={r} />
            ))}
            {scene.grid.spokes.map((l, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
            ))}
          </g>
        ) : null}
        <g
          stroke={theme.line}
          strokeOpacity={theme.lineOpacity}
          strokeWidth={LINE_WIDTH * scale}
          strokeLinecap="round"
        >
          {scene.lines.map((l, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
          ))}
        </g>
        <g fill={theme.glow}>
          {GLOW_RINGS.map((ring, r) =>
            scene.glows.map((g, i) => (
              <circle
                // eslint-disable-next-line react/no-array-index-key
                key={`${r}-${i}`}
                cx={g.x}
                cy={g.y}
                r={g.r * ring.radius}
                opacity={ring.opacity}
              />
            )),
          )}
        </g>
        <g fill={theme.star}>
          {scene.stars.map((s, i) => (
            <circle
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.r}
              opacity={s.opacity < 1 ? s.opacity : undefined}
            />
          ))}
        </g>
        {scene.planets.map((p) => (
          <g key={p.name}>
            <circle
              cx={p.x}
              cy={p.y}
              r={p.r}
              fill="none"
              stroke={theme.planet}
              strokeWidth={PLANET_STROKE * scale}
            />
            <circle cx={p.x} cy={p.y} r={p.r * PLANET_DOT} fill={theme.planet} />
          </g>
        ))}
        {moon ? (
          <g>
            {MOON_GLOW.map((g) => (
              <circle
                key={g.radius}
                cx={moon.x}
                cy={moon.y}
                r={moon.r * g.radius}
                fill={theme.glow}
                opacity={g.opacity}
              />
            ))}
            <circle cx={moon.x} cy={moon.y} r={moon.r} fill={theme.background} />
            <circle
              cx={moon.x}
              cy={moon.y}
              r={moon.r}
              fill={theme.moonShade}
              opacity={theme.moonShadeOpacity}
            />
            {moonPath ? <path d={moonPath} fill={theme.moonFace} /> : null}
            <circle
              cx={moon.x}
              cy={moon.y}
              r={moon.r}
              fill="none"
              stroke={theme.moonEdge}
              strokeOpacity={MOON_EDGE_OPACITY}
              strokeWidth={MOON_EDGE_WIDTH * scale}
            />
          </g>
        ) : null}
        {scene.labels.length ? (
          <g
            fill={theme.label}
            opacity={theme.labelOpacity}
            fontFamily={FONT}
            fontSize={LABEL_SIZE * scale}
            letterSpacing={LABEL_TRACKING * scale}
            textAnchor="middle"
          >
            {scene.labels.map((l) => (
              <text key={l.text} x={l.x} y={l.y}>
                {l.text}
              </text>
            ))}
          </g>
        ) : null}
      </g>
      <circle
        cx={disc.cx}
        cy={disc.cy}
        r={disc.r}
        fill="none"
        stroke={theme.ring}
        strokeOpacity={theme.ringOpacity}
        strokeWidth={RING.outer * scale}
      />
      <circle
        cx={disc.cx}
        cy={disc.cy}
        r={disc.r - RING.gap * scale}
        fill="none"
        stroke={theme.ring}
        strokeOpacity={theme.ringOpacity * 0.7}
        strokeWidth={RING.inner * scale}
      />
      {scene.compass ? (
        <g>
          <g
            stroke={theme.ring}
            strokeOpacity={theme.ringOpacity}
            strokeWidth={TICK.width * scale}
          >
            {scene.compass.ticks.map((t, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
            ))}
          </g>
          <g
            fill={theme.cardinal}
            fontFamily={FONT}
            fontSize={TICK.numeralSize * scale}
            textAnchor="middle"
          >
            {scene.compass.numerals.map((n) => (
              <text key={n.text} x={n.x} y={n.y}>
                {n.text}
              </text>
            ))}
          </g>
        </g>
      ) : null}
      <g
        fill={theme.cardinal}
        fontFamily={FONT}
        fontSize={scene.cardinalSize}
        textAnchor="middle"
      >
        {scene.cardinal.map((c) => (
          <text key={c.label} x={c.x} y={c.y}>
            {c.label}
          </text>
        ))}
      </g>
      {titleLines.map((line) => (
        <text
          key={line.slot}
          x={W / 2}
          y={line.y}
          fill={theme.title}
          fontFamily={FONT}
          fontStyle="italic"
          fontSize={title.size}
          textAnchor="middle"
        >
          {line.text}
        </text>
      ))}
      {subtitle.lines.map((line, index) => (
        <text
          key={line}
          x={W / 2}
          y={scene.subtitleY + index * subtitle.size * 1.6}
          fill={theme.subtitle}
          fontFamily={FONT}
          fontSize={subtitle.size}
          letterSpacing={subtitleTracking(subtitle.size)}
          textAnchor="middle"
        >
          {line}
        </text>
      ))}
      <text
        x={W / 2}
        y={scene.creditY}
        fill={theme.credit}
        fontFamily={FONT}
        fontSize={scene.creditSize}
        letterSpacing={1.8 * scale}
        textAnchor="middle"
      >
        {scene.credit}
      </text>
    </svg>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck && npx eslint app/lib/sky/svg.tsx`
Expected: clean. If eslint flags an index key on a line without the disable comment, add `// eslint-disable-next-line react/no-array-index-key` directly above that `key` prop exactly as shown for the others.

- [ ] **Step 3: Commit**

```bash
git add app/lib/sky/svg.tsx
git commit -m "Sky SVG: draw the richer sky, details and compass in print order"
```

---

### Task 10: PDF renderer

**Files:**
- Rewrite: `app/lib/sky/pdf.server.ts`
- Modify: `scripts/skyPdf.node-test.mjs`

- [ ] **Step 1: Write the failing tests**

Append to `scripts/skyPdf.node-test.mjs` (add `import {inflateSync} from 'node:zlib';` and `import {SKY_LAYOUT_IDS} from '../app/lib/sky/params.ts';` to the imports; `validateSkyParams` is already imported):

```js
function contentStreams(pdf) {
  const text = Buffer.from(pdf).toString('latin1');
  const out = [];
  const re = /stream\r?\n/g;
  let match;
  while ((match = re.exec(text))) {
    const start = match.index + match[0].length;
    const end = text.indexOf('endstream', start);
    if (end < 0) break;
    try {
      out.push(inflateSync(Buffer.from(text.slice(start, end), 'latin1')).toString('latin1'));
    } catch {
      // not a Flate stream (fonts, images)
    }
    re.lastIndex = end;
  }
  return out.join('\n');
}

test('every layout × theme renders deterministically, clipped to the disc', async () => {
  for (const layout of SKY_LAYOUT_IDS) {
    for (const theme of Object.values(SKY_THEMES)) {
      const p = validateSkyParams({...params, layout, theme: theme.id, details: 'names,grid,time'}).params;
      const scene = computeSky({params: p, size: '8x10', catalog});
      const a = await renderSkyPdf({scene, theme, fonts, plate: null, createdAt});
      const b = await renderSkyPdf({scene, theme, fonts, plate: null, createdAt});
      assert.equal(Buffer.compare(Buffer.from(a), Buffer.from(b)), 0, `${layout}/${theme.id} deterministic`);
      assert.ok(a.byteLength < 3 * 1024 * 1024, `${layout}/${theme.id} ${a.byteLength} bytes`);
      // pdf-lib writes each operator on its own line: "W\nn".
      assert.match(contentStreams(a), /\bW\s+n\b/, `${layout}/${theme.id} clips to the disc`);
    }
  }
});

test('details add marks; a 20×24 compass with everything stays small', async () => {
  const plain = computeSky({params: validateSkyParams(params).params, size: '20x24', catalog});
  const rich = computeSky({
    params: validateSkyParams({...params, layout: 'compass', details: 'names,grid,time'}).params,
    size: '20x24',
    catalog,
  });
  const a = await renderSkyPdf({scene: plain, theme: SKY_THEMES.linen, fonts, plate: plates['20x24'], createdAt});
  const b = await renderSkyPdf({scene: rich, theme: SKY_THEMES.linen, fonts, plate: plates['20x24'], createdAt});
  assert.ok(contentStreams(b).length > contentStreams(a).length, 'names, grid and compass add content');
  assert.ok(b.byteLength < 3 * 1024 * 1024, `${b.byteLength} bytes`);
});
```

Also add a per-layout title-fit test to `scripts/skyFit.node-test.mjs`, reusing that file's existing `contentStreams` helper and imports (append at the end):

```js
test('a 40-character title stays inside the margins in every layout', async () => {
  const fonts = {
    regular: new Uint8Array(readFileSync('public/fonts/EBGaramond-Regular.ttf')),
    italic: new Uint8Array(readFileSync('public/fonts/EBGaramond-Italic.ttf')),
  };
  const catalog = loadSkyCatalogSync();
  for (const layout of ['classic', 'compass', 'full', 'minimal']) {
    for (const [size, W, H] of [['8x10', 576, 720], ['20x24', 1440, 1728]]) {
      const params = validateSkyParams({
        date: '2019-06-14', time: '22:00', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris',
        place: 'Saint-Rémy-de-Provence-les-Alpilles, France',
        title: 'W'.repeat(40), theme: 'linen', layout, details: 'time',
      }).params;
      const scene = computeSky({params, size, catalog});
      const pdf = await renderSkyPdf({scene, theme: SKY_THEMES.linen, fonts, plate: null, createdAt: new Date('2019-06-14T00:00:00Z')});
      const ops = contentStreams(pdf);
      const discBottom = H - (scene.disc.cy + scene.disc.r + scene.cardinalOffset + 10 * scene.scale);
      const runs = [...ops.matchAll(/1 0 0 1 ([-\d.]+) ([-\d.]+) Tm/g)]
        .map((m) => ({x: Number(m[1]), y: Number(m[2])}))
        .filter((r) => r.y < discBottom); // text block under the map only
      assert.ok(runs.length > 10, `${layout} ${size}: ${runs.length} text runs`);
      const margin = (W - scene.maxTextWidth) / 2;
      assert.ok(runs.every((r) => r.x >= margin - 0.5), `${layout} ${size}: run left of margin ${Math.min(...runs.map((r) => r.x))} < ${margin}`);
    }
  }
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test scripts/skyPdf.node-test.mjs scripts/skyFit.node-test.mjs`
Expected: FAIL — no `W n` clip in the content stream (old renderer).

- [ ] **Step 3: Rewrite `app/lib/sky/pdf.server.ts`**

```ts
/**
 * Print file: a vector PDF at the exact sheet size (Prodigi processes PDFs
 * at received size). Background plate as an embedded JPEG, everything else
 * as vector marks and fully embedded EB Garamond. Small enough to render
 * inside an Oxygen worker on every fetch. Layer order and every constant
 * match the SVG preview (app/lib/sky/svg.tsx).
 */
import fontkit from '@pdf-lib/fontkit';
import {
  appendBezierCurve,
  clip,
  closePath,
  endPath,
  moveTo,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from 'pdf-lib';
import {fitSubtitle, fitTitle, trackedWidth} from './fit.ts';
import {moonLitPath} from './moon.ts';
import type {SkyScene} from './scene.ts';
import {
  GLOW_RINGS,
  GRID_WIDTH,
  LABEL_SIZE,
  LABEL_TRACKING,
  LINE_WIDTH,
  MILKY_WAY_PASSES,
  milkyWayOpacity,
  MOON_EDGE_OPACITY,
  MOON_EDGE_WIDTH,
  MOON_GLOW,
  PLANET_DOT,
  PLANET_STROKE,
  RING,
  TICK,
} from './style.ts';
import type {SkyTheme} from './themes.ts';

export type SkyFonts = {regular: Uint8Array; italic: Uint8Array};

const KAPPA = 0.5522847498; // cubic Bézier circle constant

function hex(color: string): RGB {
  const n = parseInt(color.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Text centred on x with manual tracking (pdf-lib has no letter-spacing). */
function drawTracked(
  page: PDFPage,
  text: string,
  {
    x,
    y,
    size,
    font,
    color,
    tracking,
    opacity,
  }: {
    x: number;
    y: number;
    size: number;
    font: PDFFont;
    color: RGB;
    tracking: number;
    opacity?: number;
  },
) {
  const chars = [...text];
  const width =
    chars.reduce((w, c) => w + font.widthOfTextAtSize(c, size), 0) +
    tracking * (chars.length - 1);
  let cursor = x - width / 2;
  for (const c of chars) {
    page.drawText(c, {x: cursor, y, size, font, color, opacity});
    cursor += font.widthOfTextAtSize(c, size) + tracking;
  }
}

/** Drop characters the font cannot shape rather than failing the order. */
export function supported(font: PDFFont, text: string) {
  const chars = [...text];
  const kept = chars.filter((c) => {
    try {
      font.widthOfTextAtSize(c, 10);
      return true;
    } catch {
      return false;
    }
  });
  return kept.join('');
}

/** Everything drawn until the matching `pop` is clipped to the circle. */
function pushCircleClip(page: PDFPage, cx: number, cy: number, r: number) {
  const k = r * KAPPA;
  page.pushOperators(
    pushGraphicsState(),
    moveTo(cx + r, cy),
    appendBezierCurve(cx + r, cy + k, cx + k, cy + r, cx, cy + r),
    appendBezierCurve(cx - k, cy + r, cx - r, cy + k, cx - r, cy),
    appendBezierCurve(cx - r, cy - k, cx - k, cy - r, cx, cy - r),
    appendBezierCurve(cx + k, cy - r, cx + r, cy - k, cx + r, cy),
    closePath(),
    clip(),
    endPath(),
  );
}

export async function renderSkyPdf({
  scene,
  theme,
  fonts,
  plate,
  createdAt,
}: {
  scene: SkyScene;
  theme: SkyTheme;
  fonts: SkyFonts;
  plate: Uint8Array | null;
  createdAt: Date;
}) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle('Your Sky — Clara Mendes');
  doc.setProducer('Clara Mendes');
  doc.setCreator('Your Sky');
  doc.setCreationDate(createdAt);
  doc.setModificationDate(createdAt);

  // Full embedding on purpose: fontkit's subsetter drops glyphs from these
  // TrueType files (renders as gaps in pdf.js), and two full faces only add
  // ~0.8 MB.
  const regular = await doc.embedFont(fonts.regular, {subset: false});
  const italic = await doc.embedFont(fonts.italic, {subset: false});
  const {width: W, height: H, disc, scale} = scene;
  const page = doc.addPage([W, H]);
  const Y = (y: number) => H - y; // scene y grows downward

  page.drawRectangle({x: 0, y: 0, width: W, height: H, color: hex(theme.background)});

  if (plate) {
    const image = await doc.embedJpg(plate);
    // Cover the page (centre-crop), like CSS object-fit: cover.
    const ratio = Math.max(W / image.width, H / image.height);
    const w = image.width * ratio;
    const h = image.height * ratio;
    page.drawImage(image, {x: (W - w) / 2, y: (H - h) / 2, width: w, height: h});
  }

  if (theme.disc) {
    page.drawCircle({
      x: disc.cx,
      y: Y(disc.cy),
      size: disc.r,
      color: hex(theme.disc),
      opacity: theme.discOpacity,
    });
  }

  pushCircleClip(page, disc.cx, Y(disc.cy), disc.r);

  for (const pass of MILKY_WAY_PASSES) {
    for (const m of scene.milkyWay) {
      page.drawCircle({
        x: m.x,
        y: Y(m.y),
        size: m.r * pass.radius,
        color: hex(theme.milkyWay),
        opacity: milkyWayOpacity(theme.milkyWayOpacity, m.intensity, pass.opacity),
      });
    }
  }

  if (scene.grid) {
    for (const r of scene.grid.circles) {
      page.drawCircle({
        x: disc.cx,
        y: Y(disc.cy),
        size: r,
        opacity: 0,
        borderColor: hex(theme.grid),
        borderOpacity: theme.gridOpacity,
        borderWidth: GRID_WIDTH * scale,
      });
    }
    for (const l of scene.grid.spokes) {
      page.drawLine({
        start: {x: l.x1, y: Y(l.y1)},
        end: {x: l.x2, y: Y(l.y2)},
        thickness: GRID_WIDTH * scale,
        color: hex(theme.grid),
        opacity: theme.gridOpacity,
      });
    }
  }

  for (const line of scene.lines) {
    page.drawLine({
      start: {x: line.x1, y: Y(line.y1)},
      end: {x: line.x2, y: Y(line.y2)},
      thickness: LINE_WIDTH * scale,
      color: hex(theme.line),
      opacity: theme.lineOpacity,
    });
  }

  for (const ring of GLOW_RINGS) {
    for (const g of scene.glows) {
      page.drawCircle({
        x: g.x,
        y: Y(g.y),
        size: g.r * ring.radius,
        color: hex(theme.glow),
        opacity: ring.opacity,
      });
    }
  }

  for (const star of scene.stars) {
    page.drawCircle({
      x: star.x,
      y: Y(star.y),
      size: star.r,
      color: hex(theme.star),
      opacity: star.opacity < 1 ? star.opacity : undefined,
    });
  }

  for (const planet of scene.planets) {
    page.drawCircle({
      x: planet.x,
      y: Y(planet.y),
      size: planet.r,
      opacity: 0,
      borderColor: hex(theme.planet),
      borderOpacity: 1,
      borderWidth: PLANET_STROKE * scale,
    });
    page.drawCircle({
      x: planet.x,
      y: Y(planet.y),
      size: planet.r * PLANET_DOT,
      color: hex(theme.planet),
    });
  }

  if (scene.moon) {
    const m = scene.moon;
    for (const g of MOON_GLOW) {
      page.drawCircle({
        x: m.x,
        y: Y(m.y),
        size: m.r * g.radius,
        color: hex(theme.glow),
        opacity: g.opacity,
      });
    }
    page.drawCircle({x: m.x, y: Y(m.y), size: m.r, color: hex(theme.background)});
    page.drawCircle({
      x: m.x,
      y: Y(m.y),
      size: m.r,
      color: hex(theme.moonShade),
      opacity: theme.moonShadeOpacity,
    });
    // drawSvgPath uses a top-left origin at (x, y) with y growing downward,
    // so the scene path can be reused verbatim anchored at the page top.
    const path = moonLitPath(m.x, m.y, m.r, m.phaseFraction, m.litRight);
    if (path) page.drawSvgPath(path, {x: 0, y: H, color: hex(theme.moonFace)});
    page.drawCircle({
      x: m.x,
      y: Y(m.y),
      size: m.r,
      opacity: 0,
      borderColor: hex(theme.moonEdge),
      borderOpacity: MOON_EDGE_OPACITY,
      borderWidth: MOON_EDGE_WIDTH * scale,
    });
  }

  for (const label of scene.labels) {
    drawTracked(page, supported(regular, label.text), {
      x: label.x,
      y: Y(label.y),
      size: LABEL_SIZE * scale,
      font: regular,
      color: hex(theme.label),
      tracking: LABEL_TRACKING * scale,
      opacity: theme.labelOpacity,
    });
  }

  page.pushOperators(popGraphicsState());

  page.drawCircle({
    x: disc.cx,
    y: Y(disc.cy),
    size: disc.r,
    borderColor: hex(theme.ring),
    borderWidth: RING.outer * scale,
    opacity: 0,
    borderOpacity: theme.ringOpacity,
  });
  page.drawCircle({
    x: disc.cx,
    y: Y(disc.cy),
    size: disc.r - RING.gap * scale,
    borderColor: hex(theme.ring),
    borderWidth: RING.inner * scale,
    opacity: 0,
    borderOpacity: theme.ringOpacity * 0.7,
  });

  if (scene.compass) {
    for (const t of scene.compass.ticks) {
      page.drawLine({
        start: {x: t.x1, y: Y(t.y1)},
        end: {x: t.x2, y: Y(t.y2)},
        thickness: TICK.width * scale,
        color: hex(theme.ring),
        opacity: theme.ringOpacity,
      });
    }
    const numeralSize = TICK.numeralSize * scale;
    for (const n of scene.compass.numerals) {
      page.drawText(n.text, {
        x: n.x - regular.widthOfTextAtSize(n.text, numeralSize) / 2,
        y: Y(n.y),
        size: numeralSize,
        font: regular,
        color: hex(theme.cardinal),
      });
    }
  }

  for (const c of scene.cardinal) {
    page.drawText(c.label, {
      x: c.x - regular.widthOfTextAtSize(c.label, scene.cardinalSize) / 2,
      y: Y(c.y),
      size: scene.cardinalSize,
      font: regular,
      color: hex(theme.cardinal),
    });
  }

  // Long titles and place names shrink to fit the sheet margins; the SVG
  // preview applies the same rule with browser metrics.
  const measureItalic = (t: string, s: number) =>
    italic.widthOfTextAtSize(t, s);
  const measureRegular = (t: string, s: number) =>
    regular.widthOfTextAtSize(t, s);
  const title = fitTitle(
    supported(italic, scene.title),
    scene.titleSize,
    scene.maxTextWidth,
    measureItalic,
  );
  // One line sits on the design baseline; two lines straddle it so the
  // block grows upward into the gap below the sky, not into the subtitle.
  const titleOffset = (index: number) =>
    title.lines.length === 1 ? 0 : (index - 0.5) * title.size * 1.2;
  title.lines.forEach((line, index) => {
    page.drawText(line, {
      x: (W - italic.widthOfTextAtSize(line, title.size)) / 2,
      y: Y(scene.titleY + titleOffset(index)),
      size: title.size,
      font: italic,
      color: hex(theme.title),
    });
  });
  const subtitleTracking = (size: number) =>
    1.6 * scale * (size / scene.subtitleSize);
  const fitted = fitSubtitle(
    {
      place: supported(regular, scene.subtitleParts.place),
      rest: supported(regular, scene.subtitleParts.rest),
    },
    scene.subtitleSize,
    scene.maxTextWidth,
    (t, s) => trackedWidth(t, s, subtitleTracking(s), measureRegular),
  );
  fitted.lines.forEach((line, index) => {
    drawTracked(page, line, {
      x: W / 2,
      y: Y(scene.subtitleY + index * fitted.size * 1.6),
      size: fitted.size,
      font: regular,
      color: hex(theme.subtitle),
      tracking: subtitleTracking(fitted.size),
    });
  });
  drawTracked(page, scene.credit, {
    x: W / 2,
    y: Y(scene.creditY),
    size: scene.creditSize,
    font: regular,
    color: hex(theme.credit),
    tracking: 1.8 * scale,
  });

  return doc.save({useObjectStreams: false, addDefaultPage: false});
}
```

- [ ] **Step 4: Run the PDF and fit tests**

Run: `node --test scripts/skyPdf.node-test.mjs scripts/skyFit.node-test.mjs`
Expected: PASS. If the original fit test (`a 40-character title stays inside the sheet margins in the PDF`) now fails because compass numerals or labels count as text runs, it will not — that test uses Classic without details; if it does fail, print the offending run and fix the renderer, not the test.

- [ ] **Step 5: Full suite, typecheck, lint, build**

Run: `npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)" && npm run typecheck && npm run lint && npm run build 2>&1 | tail -3`
Expected: `ℹ fail 0`, typecheck/lint clean, build succeeds. Revert codegen noise before committing: `git checkout -- '*.generated.d.ts'`.

- [ ] **Step 6: Commit**

```bash
git add app/lib/sky/pdf.server.ts scripts/skyPdf.node-test.mjs scripts/skyFit.node-test.mjs
git commit -m "Sky PDF: print every new layer, clipped to the disc, in preview order"
```

---

### Task 11: Owner review sheet and render timing

**Files:**
- Create: `scripts/render-sky-review.mjs`
- Create: `scripts/time-sky-pdf.mjs`

- [ ] **Step 1: Check the output folder is ignored**

Run: `git check-ignore -v output/your-sky/review/x.png`
Expected: a matching `.gitignore` rule is printed. If nothing prints, add `output/` to `.gitignore` in this task's commit.

- [ ] **Step 2: Create `scripts/render-sky-review.mjs`**

```js
#!/usr/bin/env node
/* eslint-disable no-console */
// Owner review sheet: every layout × style from the real SVG renderer
// (plus a Classic column with every detail on), and two sample print PDFs.
// Writes to output/your-sky/review/ (gitignored).
//
//   node scripts/render-sky-review.mjs
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import esbuild from 'esbuild';
import sharp from 'sharp';
import {computeSky} from '../app/lib/sky/scene.ts';
import {validateSkyParams} from '../app/lib/sky/params.ts';
import {renderSkyPdf} from '../app/lib/sky/pdf.server.ts';
import {SKY_THEMES} from '../app/lib/sky/themes.ts';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repoRoot, 'output', 'your-sky', 'review');
mkdirSync(outDir, {recursive: true});

const bundle = await esbuild.build({
  bundle: true,
  entryPoints: [path.join(repoRoot, 'scripts', 'lib', 'your-sky-render.mjs')],
  format: 'esm',
  jsx: 'automatic',
  packages: 'external',
  platform: 'node',
  target: 'node22',
  write: false,
});
const rendererPath = path.join(outDir, 'render.mjs');
writeFileSync(rendererPath, bundle.outputFiles[0].text);
const {renderSkySvg} = await import(pathToFileURL(rendererPath).href);

const catalog = loadSkyCatalogSync();
const plateUrl = (theme) =>
  `data:image/jpeg;base64,${readFileSync(path.join(repoRoot, 'public', 'sky', 'plates', `${theme}-preview.jpg`)).toString('base64')}`;
const base = {
  date: '2019-06-14',
  time: '22:00',
  lat: 48.8566,
  lon: 2.3522,
  tz: 'Europe/Paris',
  place: 'Paris, France',
  title: 'The night we met',
};
const COLUMNS = [
  {layout: 'classic', details: ''},
  {layout: 'compass', details: ''},
  {layout: 'full', details: ''},
  {layout: 'minimal', details: ''},
  {layout: 'classic', details: 'names,grid,time'},
];
const THEMES = ['linen', 'midnight-garden', 'quiet-form'];
const CELL_W = 480;
const CELL_H = 600;

const tiles = [];
for (const [row, theme] of THEMES.entries()) {
  for (const [col, column] of COLUMNS.entries()) {
    const {svg} = renderSkySvg({
      catalog,
      params: {...base, theme, ...column},
      plateDataUrl: plateUrl(theme),
      size: '8x10',
      theme,
    });
    const png = await sharp(Buffer.from(svg), {density: 144})
      .resize(CELL_W, CELL_H)
      .png()
      .toBuffer();
    writeFileSync(path.join(outDir, `${theme}-${column.layout}${column.details ? '-details' : ''}.png`), png);
    tiles.push({input: png, left: col * CELL_W, top: row * CELL_H});
  }
}
await sharp({
  create: {
    width: CELL_W * COLUMNS.length,
    height: CELL_H * THEMES.length,
    channels: 3,
    background: '#ffffff',
  },
})
  .composite(tiles)
  .png()
  .toFile(path.join(outDir, 'sheet.png'));

const fonts = {
  regular: new Uint8Array(readFileSync(path.join(repoRoot, 'public/fonts/EBGaramond-Regular.ttf'))),
  italic: new Uint8Array(readFileSync(path.join(repoRoot, 'public/fonts/EBGaramond-Italic.ttf'))),
};
for (const sample of [
  {size: '20x24', theme: 'linen', layout: 'compass', details: 'names,grid,time'},
  {size: '8x10', theme: 'midnight-garden', layout: 'full', details: 'names'},
]) {
  const params = validateSkyParams({...base, ...sample}).params;
  const scene = computeSky({params, size: sample.size, catalog});
  const plate = new Uint8Array(
    readFileSync(path.join(repoRoot, 'public', 'sky', 'plates', `${sample.theme}-${sample.size}.jpg`)),
  );
  const pdf = await renderSkyPdf({
    scene,
    theme: SKY_THEMES[sample.theme],
    fonts,
    plate,
    createdAt: new Date('2019-06-14T00:00:00Z'),
  });
  writeFileSync(path.join(outDir, `${sample.theme}-${sample.layout}-${sample.size}.pdf`), pdf);
}
console.log(`Review sheet and sample PDFs in ${outDir}`);
/* eslint-enable no-console */
```

- [ ] **Step 3: Create `scripts/time-sky-pdf.mjs`**

```js
#!/usr/bin/env node
/* eslint-disable no-console */
// Local render timing for the heaviest print: 20×24, Compass, every detail.
// Budget from the spec: < 2 s per render (Oxygen runs the same V8 code).
//
//   node scripts/time-sky-pdf.mjs
import {readFileSync} from 'node:fs';
import {computeSky} from '../app/lib/sky/scene.ts';
import {validateSkyParams} from '../app/lib/sky/params.ts';
import {renderSkyPdf} from '../app/lib/sky/pdf.server.ts';
import {SKY_THEMES} from '../app/lib/sky/themes.ts';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

const catalog = loadSkyCatalogSync();
const fonts = {
  regular: new Uint8Array(readFileSync('public/fonts/EBGaramond-Regular.ttf')),
  italic: new Uint8Array(readFileSync('public/fonts/EBGaramond-Italic.ttf')),
};
const plate = new Uint8Array(readFileSync('public/sky/plates/linen-20x24.jpg'));
const params = validateSkyParams({
  date: '2019-06-14',
  time: '22:00',
  lat: 48.8566,
  lon: 2.3522,
  tz: 'Europe/Paris',
  place: 'Paris, France',
  title: 'The night we met',
  theme: 'linen',
  layout: 'compass',
  details: 'names,grid,time',
}).params;
const times = [];
let bytes = 0;
for (let i = 0; i < 6; i++) {
  const start = performance.now();
  const scene = computeSky({params, size: '20x24', catalog});
  const pdf = await renderSkyPdf({scene, theme: SKY_THEMES.linen, fonts, plate, createdAt: new Date(0)});
  times.push(performance.now() - start);
  bytes = pdf.byteLength;
}
const warm = times.slice(1).sort((a, b) => a - b);
console.log(
  `20x24 compass+details: ${(bytes / 1024).toFixed(0)} KB; cold ${times[0].toFixed(0)} ms; warm median ${warm[2].toFixed(0)} ms`,
);
if (warm[2] > 2000) process.exitCode = 1;
/* eslint-enable no-console */
```

- [ ] **Step 4: Run both**

Run: `node scripts/render-sky-review.mjs && node scripts/time-sky-pdf.mjs`
Expected: `Review sheet and sample PDFs in …/output/your-sky/review`, and a timing line with warm median < 2000 ms (exit code 0).

- [ ] **Step 5: Look at the sheet and fix what looks wrong**

Open `output/your-sky/review/sheet.png` with the Read tool (it renders images) and each column PNG as needed. Check, and tune only constants in `style.ts` / theme tokens in `themes.ts` (then re-run Step 4 and the tests):
- Milky Way is visible but quiet (a soft band, never a smear). Too strong → lower that theme's `milkyWayOpacity`; invisible → raise it.
- Faint stars read as depth, not noise; bright stars have a soft glow, no hard halo.
- Moon reads as a moon (lit face + faint shadow), no black disc on Linen/Quiet Form.
- Planets read as small rings.
- Compass ticks/numerals are crisp and don't collide with N/E/S/W; Full sky text band isn't cramped; Minimal title is balanced.
- Labels (details column) are legible, not crowding.
Also open both sample PDFs in the owner's Chrome (`file:///…/output/your-sky/review/…pdf`) and zoom to check vector sharpness.

- [ ] **Step 6: Owner approval gate**

Send `sheet.png` to the owner (SendUserFile, display render) with one line per layout and ask for approval or changes. **Do not merge PR 1 before the owner approves the look.** Apply requested changes as constant tweaks, re-render, re-send.

- [ ] **Step 7: Commit**

```bash
git add scripts/render-sky-review.mjs scripts/time-sky-pdf.mjs app/lib/sky/style.ts app/lib/sky/themes.ts
git commit -m "Sky review sheet and render timing; tuned look after review"
```

---

### Task 12: Regenerate page images and preview checks

**Files:**
- Regenerate: `public/images/your-sky/*.webp`

- [ ] **Step 1: Regenerate**

Run: `npm run sky:feature:images`
Expected: the hero, occasion and style images are rewritten (git shows them modified); nothing else changes.

- [ ] **Step 2: View them**

Read `public/images/your-sky/hero-print.webp`, `occasion-met.webp` and `style-midnight-garden.webp` with the Read tool. They must show the new look (Milky Way band, Moon face, double ring).

- [ ] **Step 3: Dev server check of the live preview**

Start the dev server (launch entry for this worktree; create one in the parent `.claude/launch.json` if missing, following the `hydrogen-sweep2` entry pattern: `npm --prefix <abs worktree> run dev -- --path <abs worktree>`, port 3006; copy the worktree `.env` from `clara-wt-catalog/.env` so `SKY_SIGNING_SECRET` exists). Open `/your-sky`, pick a place and date, and confirm: the preview shows the richer sky, no console errors, Add to cart works, and the cart drawer line shows `Layout: Classic`. Screenshot for the PR.

- [ ] **Step 4: Commit**

```bash
git add public/images/your-sky
git commit -m "Your Sky page images follow the richer sky"
```

---

### Task 13: Docs, PR, verification, release

**Files:**
- Modify: `docs/your-sky-release.md`
- Modify: `docs/llm-wiki/log.md`
- Create: `scripts/sky-print-link.mjs`

- [ ] **Step 1: Runbook note**

Append to `docs/your-sky-release.md`:

```markdown

## Personalisation v2 (2026-09-23)

New lines are `_v=2` and carry `_layout` (`classic|compass|full|minimal`)
and `_details` (`names,grid,time` subset or `none`), shown to the customer
as `Layout` and `Details`. Both are inside the signed canonical string, so
the webhook, the Prodigi order and the print token carry them unchanged.
`_v=1` lines and print tokens still verify and render as Classic with no
details. Print render budget: < 2 s for 20×24 Compass with every detail
(`node scripts/time-sky-pdf.mjs`).
```

- [ ] **Step 2: Wiki log**

Append a dated entry to `docs/llm-wiki/log.md`:

```markdown

## 2026-09-23 - Your Sky engine: richer sky, layouts, details

Every Your Sky print now draws a computed Milky Way (galactic-plane discs),
magnitude-toned stars with soft glows on the brightest 25, constellation
lines clipped at the horizon, ringed planets, a Moon with a lit face and
faint shadow, and a double horizon ring. The engine adds four layouts
(`app/lib/sky/layouts.ts`: Classic, Compass, Full sky, Minimal) and three
details (constellation names from d3-celestial label points, altitude/azimuth
grid, time in the details line) carried as signed `v=2` personalisation;
`v=1` canonical strings are byte-identical so old signatures and tokens
verify. Drawing constants live in `app/lib/sky/style.ts`; both renderers
draw the same layers in the same order. First Light is unchanged.

Source: [spec](../superpowers/specs/2026-09-23-your-sky-enhancements-design.md),
[plan](../superpowers/plans/2026-09-23-your-sky-engine.md).
```

- [ ] **Step 3: Live print-link helper**

Create `scripts/sky-print-link.mjs`:

```js
#!/usr/bin/env node
/* eslint-disable no-console */
// Prints signed print URLs (v1 and v2 samples) for checking a deployed
// print route. Needs SKY_SIGNING_SECRET for the target deployment:
//
//   node --env-file=<path to env file> scripts/sky-print-link.mjs https://shopclaramendes.com
import {validateSkyParams} from '../app/lib/sky/params.ts';
import {encodeSkyToken} from '../app/lib/sky/sign.server.ts';

const origin = process.argv[2] ?? 'http://localhost:3006';
const secret = process.env.SKY_SIGNING_SECRET;
if (!secret) throw new Error('SKY_SIGNING_SECRET is not set');
const base = {
  date: '2019-06-14',
  time: '22:00',
  lat: 48.8566,
  lon: 2.3522,
  tz: 'Europe/Paris',
  place: 'Paris, France',
  title: 'The night we met',
  theme: 'linen',
};
for (const [label, input, size] of [
  ['v1 classic', {...base, v: 1}, '8x10'],
  ['v2 compass all details', {...base, layout: 'compass', details: 'names,grid,time'}, '20x24'],
]) {
  const token = await encodeSkyToken(validateSkyParams(input).params, secret);
  console.log(`${label}: ${origin}/api/sky-print/${token}.pdf?size=${size}`);
}
/* eslint-enable no-console */
```

Run locally against the dev server: `node --env-file=.env scripts/sky-print-link.mjs http://localhost:3006`, then `curl -s -o NUL -w "%{http_code} %{size_download} %{time_total}\n" "<url>"` for each.
Expected: `200`, a few hundred KB, time well under 2 s. Never print the secret.

- [ ] **Step 4: Final gates**

Run: `npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)" && npm run typecheck && npm run lint && npm run build 2>&1 | tail -2 && git checkout -- '*.generated.d.ts'`
Expected: all green.

- [ ] **Step 5: Commit and open the PR against `main`**

```bash
git add docs/your-sky-release.md docs/llm-wiki/log.md scripts/sky-print-link.mjs
git commit -m "Docs: Your Sky personalisation v2 and engine log"
git push -u origin fable/your-sky-enhancements
```

Write the PR body to a scratch file (fill the two measured numbers from Steps 4 and Task 11 Step 4), then create the PR:

```markdown
## Summary
- Richer sky on every Your Sky print: computed Milky Way, magnitude-toned stars with soft glows, constellation lines clipped at the horizon, ringed planets, a Moon with a lit face, a double horizon ring.
- Engine support for four layouts (Classic, Compass, Full sky, Minimal) and three details (constellation names, grid, time), signed as personalisation v2 end to end (cart → webhook → Prodigi → print). v1 lines and tokens still verify and render as Classic.
- Page images regenerated so /your-sky matches the new preview. The designer controls for layouts/details ship in the next PR; until then every new order is Classic with no details.

## Checks
- `npm test` <N>/<N>, typecheck, lint, build green.
- Render time: 20×24 Compass with every detail, warm median <T> ms (budget 2 s).
- Owner approved the review sheet (all layouts × styles).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

```bash
gh pr create --base main --title "Your Sky: richer sky, layouts and print details (engine)" --body-file <scratch file>
```

The PR base must be `main` (never another feature branch).

- [ ] **Step 6: Adversarial verification**

Invoke the `adversarial-verify` skill against the spec's PR 1 criteria (§2 items 1–3, §3, §4, §7 budgets). Fix defects, self-check each fix.

- [ ] **Step 7: Owner merges**

Owner approved the sheet (Task 11 Step 6) and merges the PR (or explicitly asks me to). Before any merge: `git fetch` and confirm `gh pr view --json mergeable,mergeStateStatus` is `MERGEABLE/CLEAN`.

- [ ] **Step 8: Live check after deploy**

Wait for the `main` Deploy run to succeed. Then, in the owner's Chrome, with screenshots: `/your-sky` shows the richer sky in the preview; choose Paris + a date, add to cart, the drawer shows `Layout: Classic`; remove the line. Fetch the live print route with a production-signed link (`node --env-file=<production env file> scripts/sky-print-link.mjs https://shopclaramendes.com`) for v1 and v2: both `200 application/pdf` under 2 s. Open the v2 PDF in Chrome and screenshot it.

---

## PR 2 and PR 3 (outline; detailed plans after PR 1 merges)

**PR 2 — Designer** (spec §5): Layout row (four generated thumbnails via `render-sky-review` pattern → `public/images/your-sky/layout-*.webp`) and Details switches in step 2 of `SkyConfigurator`; draft + share-link support for `layout`/`details` in `configuratorState.ts`; time-of-night slider (twilight shading from Sun altitude sampled every 15 min, sunset/sunrise ticks, keyboard + `aria-valuetext`); `sketch.ts` canvas sketch during drag; 250 ms crossfade between exact SVG renders; per-layer memoisation; reduced-motion path; mobile strip compatibility.

**PR 3 — Page** (spec §6): live hero canvas (tonight over Paris, pauses off-screen/hidden, reduced-motion still, DPR ≤ 2, SSR gradient first); "One sky, four ways" showcase with "Try this layout" preset events; occasion images varied by layout/theme; FAQ fixes (Hipparcos → Yale BSC) and new entries; Your Sky Shopify product images regenerated and replaced (upload new, verify READY/order, delete old with local backup).
