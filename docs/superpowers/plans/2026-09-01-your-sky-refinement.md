# Your Sky Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the live Your Sky PDP into the approved guided, mobile-first configurator while exposing the three existing styles and preserving the signed Shopify-to-Prodigi pipeline.

**Architecture:** Keep the existing sky renderer, Shopify variants, cart signer, webhook, and PDF routes authoritative. Add one pure configurator-state module for testable draft/readiness behavior, let `SkyConfigurator` own personalisation and style, and let the product route own Shopify size/finish, review, price, and cart submission. Use one DOM tree with CSS grid areas for responsive ordering.

**Tech Stack:** Shopify Hydrogen 2026.4, React 18, React Router 7, TypeScript, Node test runner, Storefront CartForm, inline SVG sky renderer, global storefront CSS, Playwright CLI for browser verification.

---

## Working conventions

- Worktree: `C:\Users\admin\Desktop\4. Work & Projects\shopify\clara-mendes-your-sky-refinement`
- Branch: `codex/refine-your-sky`
- Source specification: `docs/superpowers/specs/2026-09-01-your-sky-refinement-design.md`
- Do not edit Shopify product records, prices, SKUs, release flags, Prodigi mappings, Oxygen secrets, checkout, or First Light.
- The physical path contains `&`, which breaks npm-generated Windows command shims. Use the direct Node commands below locally. CI can continue using the package scripts.

Validation commands:

```powershell
node .\node_modules\@react-router\dev\bin.js typegen
node .\node_modules\typescript\bin\tsc --noEmit
node .\node_modules\eslint\bin\eslint.js --no-error-on-unmatched-pattern .
node --test "scripts/*.node-test.mjs"
node .\node_modules\@shopify\cli\bin\run.js hydrogen build --codegen
node .\node_modules\@shopify\cli\bin\run.js hydrogen check routes
```

## File structure

- Create `app/lib/sky/configuratorState.ts`: pure draft parsing, serialization, next-required-field, render-key, and preview-state logic.
- Create `scripts/skyConfigurator.node-test.mjs`: executable tests for the pure state module and source-level responsive/accessibility contracts.
- Modify `app/lib/sky/params.ts`: stable customer-facing theme labels and server-normalized visible Style cart attribute.
- Modify `app/lib/sky/themes.ts`: reuse the label map instead of duplicating labels.
- Modify `app/lib/sky/products.ts`: selected-finish normalization and customer-facing finish labels.
- Modify `scripts/skyParams.node-test.mjs`: Style cart confirmation and canonical-signature invariants.
- Modify `scripts/skyProducts.node-test.mjs`: finish-option normalization.
- Modify `app/components/SkyConfigurator.tsx`: accessible search, style selection, preview readiness, persistence, reset, and finish presentation.
- Modify `app/routes/products.$handle.tsx`: guided stages, review summary, exact pending action, and early mobile sticky trigger.
- Modify `app/styles/app.css`: single-DOM responsive grid, theme cards, frame treatments, statuses, review surface, and mobile action.
- Modify `docs/llm-wiki/modules/catalog-and-products.md`: replace the planned-state note with implemented behavior after verification.
- Modify `docs/llm-wiki/log.md`: append the implementation/release evidence.

### Task 1: Theme confirmation and finish normalization

**Files:**
- Modify: `app/lib/sky/params.ts`
- Modify: `app/lib/sky/themes.ts`
- Modify: `app/lib/sky/products.ts`
- Modify: `scripts/skyParams.node-test.mjs`
- Modify: `scripts/skyProducts.node-test.mjs`

- [ ] **Step 1: Write failing cart-style tests**

Add `SKY_THEME_LABELS` to the import list in `scripts/skyParams.node-test.mjs`, then extend the cart round-trip test:

```js
assert.deepEqual(SKY_THEME_LABELS, {
  linen: 'Linen',
  'midnight-garden': 'Midnight Garden',
  'quiet-form': 'Quiet Form',
});
assert.deepEqual(
  attrs.find((a) => a.key === 'Style'),
  {key: 'Style', value: 'Linen'},
);
assert.equal(
  attrs.filter((a) => !a.key.startsWith('_')).length,
  4,
  'Title, Style, Place, Date are visible',
);
```

In the empty-title test, assert the visible count is three and Style remains:

```js
assert.equal(attrs.filter((a) => !a.key.startsWith('_')).length, 3);
assert.deepEqual(attrs.find((a) => a.key === 'Style'), {
  key: 'Style',
  value: 'Linen',
});
```

- [ ] **Step 2: Write failing finish-normalization tests**

Import `SKY_FINISH_LABELS` and `skyFinishFromOptions` in `scripts/skyProducts.node-test.mjs`, then add:

```js
test('finish options normalize to the three supported presentations', () => {
  assert.deepEqual(SKY_FINISH_LABELS, {
    unframed: 'Unframed',
    natural: 'Natural frame',
    black: 'Black frame',
  });
  assert.equal(
    skyFinishFromOptions([{name: 'Finish', value: 'Natural frame'}]),
    'natural',
  );
  assert.equal(
    skyFinishFromOptions([{name: 'finish', value: 'BLACK FRAME'}]),
    'black',
  );
  assert.equal(
    skyFinishFromOptions([{name: 'Finish', value: 'Unframed'}]),
    'unframed',
  );
  assert.equal(skyFinishFromOptions(undefined), 'unframed');
});
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```powershell
node --test scripts/skyParams.node-test.mjs scripts/skyProducts.node-test.mjs
```

Expected: FAIL because the label constants, Style attribute, and finish helper do not exist.

- [ ] **Step 4: Add stable theme labels and server-normalized Style**

In `app/lib/sky/params.ts`, immediately after `SKY_THEME_IDS`, add:

```ts
export const SKY_THEME_LABELS: Record<SkyThemeId, string> = {
  linen: 'Linen',
  'midnight-garden': 'Midnight Garden',
  'quiet-form': 'Quiet Form',
};
```

Add Style immediately after optional Title in `toCartAttributes`:

```ts
const attrs: CartAttribute[] = [
  ...(p.title ? [{key: 'Title', value: p.title}] : []),
  {key: 'Style', value: SKY_THEME_LABELS[p.theme]},
  {key: 'Place', value: p.place},
  {key: 'Date', value: formatSkyDate(p)},
  // hidden attributes remain byte-for-byte unchanged below
];
```

Update the comment above `toCartAttributes` to say “visible attributes” instead of “the three visible ones.” `fromCartAttributes` must continue deriving theme only from `_theme`, so a forged visible Style value is discarded when the server re-encodes the line.

- [ ] **Step 5: Reuse labels in themes and add finish helpers**

Change the theme import to:

```ts
import {SKY_THEME_LABELS, type SkyThemeId} from './params.ts';
```

Replace the three literal theme labels with `SKY_THEME_LABELS.linen`, `SKY_THEME_LABELS['midnight-garden']`, and `SKY_THEME_LABELS['quiet-form']`.

In `app/lib/sky/products.ts`, after `SkyFinish`, add:

```ts
export const SKY_FINISH_LABELS: Record<SkyFinish, string> = {
  unframed: 'Unframed',
  natural: 'Natural frame',
  black: 'Black frame',
};
```

After `skySizeFromOptions`, add:

```ts
export function skyFinishFromOptions(
  options: ReadonlyArray<{name: string; value: string}> | null | undefined,
): SkyFinish {
  const value =
    options
      ?.find((option) => option.name.trim().toLowerCase() === 'finish')
      ?.value.trim()
      .toLowerCase() ?? '';
  if (value === 'natural frame') return 'natural';
  if (value === 'black frame') return 'black';
  return 'unframed';
}
```

- [ ] **Step 6: Run focused tests and verify GREEN**

Run the Step 3 command. Expected: all focused tests PASS and the canonical string assertion is unchanged.

- [ ] **Step 7: Commit**

```powershell
git add app/lib/sky/params.ts app/lib/sky/themes.ts app/lib/sky/products.ts scripts/skyParams.node-test.mjs scripts/skyProducts.node-test.mjs
git commit -m "Expose Your Sky style confirmation"
```

### Task 2: Pure configurator state and draft codec

**Files:**
- Create: `app/lib/sky/configuratorState.ts`
- Create: `scripts/skyConfigurator.node-test.mjs`

- [ ] **Step 1: Write failing state tests**

Create `scripts/skyConfigurator.node-test.mjs` with:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSkyRenderKey,
  getSkyPreviewStatus,
  nextSkyRequiredField,
  parseSkyDraft,
  serializeSkyDraft,
  SKY_DRAFT_STORAGE_KEY,
} from '../app/lib/sky/configuratorState.ts';
import {validateSkyParams} from '../app/lib/sky/params.ts';

const place = {
  name: 'Paris',
  country: 'France',
  countryCode: 'FR',
  lat: 48.8534,
  lon: 2.3488,
  tz: 'Europe/Paris',
  label: 'Paris, France',
};

const complete = {
  place,
  date: '2019-06-14',
  time: '22:00',
  title: 'Our first night',
  theme: 'midnight-garden',
};

test('draft codec preserves valid incomplete state and rejects unsafe state', () => {
  assert.equal(SKY_DRAFT_STORAGE_KEY, 'cm:your-sky:draft:v1');
  const incomplete = {...complete, date: ''};
  assert.deepEqual(parseSkyDraft(serializeSkyDraft(incomplete), 'linen'), incomplete);
  assert.equal(parseSkyDraft('{bad json', 'linen'), null);
  assert.equal(
    parseSkyDraft(JSON.stringify({...complete, theme: 'neon'}), 'linen'),
    null,
  );
  assert.equal(
    parseSkyDraft(JSON.stringify({...complete, date: '1850-01-01'}), 'linen'),
    null,
  );
});

test('next required field is deterministic', () => {
  assert.equal(nextSkyRequiredField({place: null, date: ''}), 'place');
  assert.equal(nextSkyRequiredField({place, date: ''}), 'date');
  assert.equal(nextSkyRequiredField({place, date: '2019-06-14'}), null);
});

test('preview is ready only for the exact current rendered input', () => {
  const validation = validateSkyParams({
    date: complete.date,
    time: complete.time,
    lat: place.lat,
    lon: place.lon,
    tz: place.tz,
    place: place.label,
    title: complete.title,
    theme: complete.theme,
  });
  assert.equal(validation.ok, true);
  const key = createSkyRenderKey(validation.params, '20x24');
  assert.equal(
    getSkyPreviewStatus({failed: false, hasRequired: true, renderKey: key, sceneKey: key}),
    'ready',
  );
  assert.equal(
    getSkyPreviewStatus({failed: false, hasRequired: true, renderKey: key, sceneKey: null}),
    'updating',
  );
  assert.equal(
    getSkyPreviewStatus({failed: false, hasRequired: false, renderKey: null, sceneKey: key}),
    'example',
  );
  assert.equal(
    getSkyPreviewStatus({failed: true, hasRequired: true, renderKey: key, sceneKey: null}),
    'error',
  );
});
```

- [ ] **Step 2: Run the new test and verify RED**

```powershell
node --test scripts/skyConfigurator.node-test.mjs
```

Expected: FAIL with module-not-found for `configuratorState.ts`.

- [ ] **Step 3: Implement the pure state module**

Create `app/lib/sky/configuratorState.ts`:

```ts
import {
  canonicalSkyParams,
  SKY_DEFAULT_TIME,
  SKY_THEME_IDS,
  SKY_TITLE_MAX,
  validateSkyParams,
  type SkyParams,
  type SkyThemeId,
} from './params.ts';
import type {PlaceResult} from './places.server.ts';
import type {SkySizeKey} from './products.ts';

export const SKY_DRAFT_STORAGE_KEY = 'cm:your-sky:draft:v1';

export type SkyDraft = {
  place: PlaceResult | null;
  date: string;
  time: string;
  title: string;
  theme: SkyThemeId;
};

export type SkyRequiredField = 'place' | 'date' | null;
export type SkyPreviewStatus = 'example' | 'updating' | 'ready' | 'error';

const FALLBACK_PLACE: PlaceResult = {
  name: 'Paris',
  country: 'France',
  countryCode: 'FR',
  lat: 48.8566,
  lon: 2.3522,
  tz: 'Europe/Paris',
  label: 'Paris, France',
};

export function nextSkyRequiredField(input: Pick<SkyDraft, 'place' | 'date'>): SkyRequiredField {
  if (!input.place) return 'place';
  if (!input.date) return 'date';
  return null;
}

export function serializeSkyDraft(draft: SkyDraft) {
  return JSON.stringify({v: 1, ...draft});
}

export function parseSkyDraft(raw: string | null, fallbackTheme: SkyThemeId): SkyDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value.v !== 1) return null;
    const theme = String(value.theme ?? fallbackTheme) as SkyThemeId;
    if (!SKY_THEME_IDS.includes(theme)) return null;
    const date = String(value.date ?? '');
    const time = String(value.time ?? SKY_DEFAULT_TIME);
    const title = String(value.title ?? '');
    if (title.length > SKY_TITLE_MAX) return null;
    const candidate = value.place as Partial<PlaceResult> | null | undefined;
    const place = candidate
      ? {
          name: String(candidate.name ?? ''),
          country: String(candidate.country ?? ''),
          countryCode: String(candidate.countryCode ?? ''),
          lat: Number(candidate.lat),
          lon: Number(candidate.lon),
          tz: String(candidate.tz ?? ''),
          label: String(candidate.label ?? ''),
        }
      : null;
    if (
      place &&
      (!place.name || !place.country || !/^[A-Z]{2}$/.test(place.countryCode))
    ) {
      return null;
    }
    const p = place ?? FALLBACK_PLACE;
    const validation = validateSkyParams({
      date: date || '2000-01-01',
      time,
      lat: p.lat,
      lon: p.lon,
      tz: p.tz,
      place: p.label,
      title,
      theme,
    });
    if (!validation.ok) return null;
    return {place, date, time: validation.params.time, title: validation.params.title, theme};
  } catch {
    return null;
  }
}

export function createSkyRenderKey(params: SkyParams, size: SkySizeKey) {
  return `${canonicalSkyParams(params)}&size=${size}`;
}

export function getSkyPreviewStatus({
  failed,
  hasRequired,
  renderKey,
  sceneKey,
}: {
  failed: boolean;
  hasRequired: boolean;
  renderKey: string | null;
  sceneKey: string | null;
}): SkyPreviewStatus {
  if (failed) return 'error';
  if (!hasRequired) return 'example';
  return renderKey && renderKey === sceneKey ? 'ready' : 'updating';
}
```

- [ ] **Step 4: Run the state test and verify GREEN**

Run the Step 2 command. Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/lib/sky/configuratorState.ts scripts/skyConfigurator.node-test.mjs
git commit -m "Add Your Sky draft and readiness state"
```

### Task 3: Refine SkyConfigurator functionality

**Files:**
- Modify: `app/components/SkyConfigurator.tsx`
- Modify: `scripts/skyConfigurator.node-test.mjs`

- [ ] **Step 1: Add failing source-contract assertions**

Extend `scripts/skyConfigurator.node-test.mjs` with source loading and this test:

```js
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const configuratorSource = readFileSync(
  path.join(ROOT, 'app/components/SkyConfigurator.tsx'),
  'utf8',
);

test('configurator exposes accessible recovery and all existing styles', () => {
  for (const token of [
    'aria-activedescendant',
    'ArrowDown',
    'ArrowUp',
    'No places found',
    'Try again',
    'SKY_DRAFT_STORAGE_KEY',
    'Reset',
    'SKY_THEME_IDS',
    'Ready to print',
  ]) {
    assert.ok(configuratorSource.includes(token), `missing ${token}`);
  }
});
```

- [ ] **Step 2: Run the test and verify RED**

Run Task 2 Step 2. Expected: the new source-contract test FAILS.

- [ ] **Step 3: Replace the component contract and state**

Change the public component types to:

```ts
export type SkyConfiguratorStatus = {
  nextRequired: SkyRequiredField;
  params: SkyParams | null;
  preview: SkyPreviewStatus;
};

export function SkyConfigurator({
  finish,
  initialTheme,
  size,
  onStatus,
}: {
  finish: SkyFinish;
  initialTheme: SkyThemeId;
  size: SkySizeKey;
  onStatus: (status: SkyConfiguratorStatus) => void;
}) {
```

Import the Task 2 helpers and replace the fixed `theme` prop with local state:

```ts
const [theme, setTheme] = useState(initialTheme);
const [placesStatus, setPlacesStatus] = useState<
  'idle' | 'loading' | 'ready' | 'empty' | 'error'
>('idle');
const [activePlaceIndex, setActivePlaceIndex] = useState(-1);
const [catalogAttempt, setCatalogAttempt] = useState(0);
const [placesAttempt, setPlacesAttempt] = useState(0);
const [renderAttempt, setRenderAttempt] = useState(0);
const [restored, setRestored] = useState(false);
const placesRequestRef = useRef(0);
```

Use this catalog-loading effect so Retry can increment `catalogAttempt`:

```ts
useEffect(() => {
  let alive = true;
  setCatalogFailed(false);
  loadSkyCatalog()
    .then((loaded) => {
      if (alive) setCatalog(loaded);
    })
    .catch((error) => {
      console.error('Sky catalogue failed to load', error);
      if (alive) setCatalogFailed(true);
    });
  return () => {
    alive = false;
  };
}, [catalogAttempt]);
```

- [ ] **Step 4: Implement validated restore, save, and Reset**

After mount, parse the versioned session record and restore present fields:

```ts
useEffect(() => {
  const restoredDraft = parseSkyDraft(
    window.sessionStorage.getItem(SKY_DRAFT_STORAGE_KEY),
    initialTheme,
  );
  if (restoredDraft) {
    setPlace(restoredDraft.place);
    setPlaceQuery(restoredDraft.place?.label ?? '');
    setDate(restoredDraft.date);
    setTime(restoredDraft.time);
    setTitle(restoredDraft.title);
    setTheme(restoredDraft.theme);
    setTouched(Boolean(restoredDraft.place || restoredDraft.date || restoredDraft.title));
  }
  setRestored(true);
}, [initialTheme]);

useEffect(() => {
  if (!restored) return;
  if (!place && !date && !title && time === SKY_DEFAULT_TIME && theme === initialTheme) {
    window.sessionStorage.removeItem(SKY_DRAFT_STORAGE_KEY);
  } else {
    window.sessionStorage.setItem(
      SKY_DRAFT_STORAGE_KEY,
      serializeSkyDraft({place, date, time, title, theme}),
    );
  }
}, [date, initialTheme, place, restored, theme, time, title]);
```

Implement Reset exactly as:

```ts
function resetConfigurator() {
  abortRef.current?.abort();
  setPlace(null);
  setPlaceQuery('');
  setPlaceResults([]);
  setPlacesOpen(false);
  setPlacesStatus('idle');
  setActivePlaceIndex(-1);
  setDate('');
  setTime(SKY_DEFAULT_TIME);
  setTitle('');
  setTheme(initialTheme);
  setTouched(false);
  setPlaceBlurred(false);
  setDateBlurred(false);
  window.sessionStorage.removeItem(SKY_DRAFT_STORAGE_KEY);
}
```

- [ ] **Step 5: Implement accessible, recoverable place search**

Use the existing debounce and AbortController, but set `loading` before fetch, throw on non-OK, ignore `AbortError`, and distinguish `ready`, `empty`, and `error`. Prevent stale responses with `placesRequestRef`:

```ts
useEffect(() => {
  abortRef.current?.abort();
  const requestId = ++placesRequestRef.current;
  const query = debouncedQuery.trim();
  if (query.length < 2 || place?.label === debouncedQuery) {
    setPlaceResults([]);
    setPlacesStatus('idle');
    return;
  }
  const controller = new AbortController();
  abortRef.current = controller;
  setPlacesStatus('loading');
  fetch(`/api/places?q=${encodeURIComponent(query)}`, {signal: controller.signal})
    .then(async (response) => {
      if (!response.ok) throw new Error(`Place search failed: ${response.status}`);
      return response.json() as Promise<{results: PlaceResult[]}>;
    })
    .then(({results}) => {
      if (requestId !== placesRequestRef.current) return;
      setPlaceResults(results);
      setActivePlaceIndex(results.length > 0 ? 0 : -1);
      setPlacesOpen(true);
      setPlacesStatus(results.length > 0 ? 'ready' : 'empty');
    })
    .catch((error: unknown) => {
      if (controller.signal.aborted || requestId !== placesRequestRef.current) return;
      console.error('Place search failed', error);
      setPlaceResults([]);
      setPlacesStatus('error');
      setPlacesOpen(true);
    });
  return () => controller.abort();
}, [debouncedQuery, place?.label, placesAttempt]);
```

Import `type KeyboardEvent` from React. Give the input and status stable ids. Define selection and clearing before the keyboard handler:

```ts
function selectPlace(result: PlaceResult) {
  setPlace(result);
  setPlaceQuery(result.label);
  setPlaceResults([]);
  setPlacesOpen(false);
  setPlacesStatus('idle');
  setActivePlaceIndex(-1);
  setPlaceBlurred(false);
  setTouched(true);
}

function clearPlace() {
  setPlace(null);
  setPlaceQuery('');
  setPlaceResults([]);
  setPlacesOpen(false);
  setPlacesStatus('idle');
  setActivePlaceIndex(-1);
  setPlaceBlurred(false);
}
```

Add this keyboard handler:

```ts
function handlePlaceKeyDown(event: KeyboardEvent<HTMLInputElement>) {
  if (!placesOpen || placeResults.length === 0) {
    if (event.key === 'Escape') setPlacesOpen(false);
    return;
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    setActivePlaceIndex((current) =>
      (current + delta + placeResults.length) % placeResults.length,
    );
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    setActivePlaceIndex(event.key === 'Home' ? 0 : placeResults.length - 1);
  } else if (event.key === 'Enter' && activePlaceIndex >= 0) {
    event.preventDefault();
    selectPlace(placeResults[activePlaceIndex]);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    setPlacesOpen(false);
    setActivePlaceIndex(-1);
  }
}
```

Render each result directly as an `li[role=option]` with id `sky-place-option-${index}`, pointer selection, and `aria-selected`. Set `aria-activedescendant` on the input only when an option is active. Render result count/no-results/error in a polite status, and render a Retry button that increments `placesAttempt` included in the search effect dependencies.

- [ ] **Step 6: Implement exact preview readiness**

Keep the example input, but compute a caught render result containing both scene and render key:

```ts
const rendered = useMemo(() => {
  if (!catalog || !previewValidation.ok) return {kind: 'empty'} as const;
  try {
    return {
      kind: 'ready',
      key: createSkyRenderKey(previewValidation.params, size),
      scene: computeSky({params: previewValidation.params, size, catalog}),
    } as const;
  } catch (error) {
    console.error('Sky preview failed to render', error);
    return {kind: 'error'} as const;
  }
}, [catalog, previewValidation, renderAttempt, size]);

const purchasableParams = purchasable?.ok ? purchasable.params : null;
const currentRenderKey = purchasableParams
  ? createSkyRenderKey(purchasableParams, size)
  : null;
const nextRequired = nextSkyRequiredField({place, date});
const preview = getSkyPreviewStatus({
  failed: catalogFailed || rendered.kind === 'error',
  hasRequired: nextRequired === null,
  renderKey: currentRenderKey,
  sceneKey: rendered.kind === 'ready' ? rendered.key : null,
});
const readyParams = preview === 'ready' ? purchasableParams : null;
```

Memoize and emit `{nextRequired, params: readyParams, preview}` through `onStatus`. The preview label must say Example, Updating, Ready to print, or Preview unavailable. Retry increments `catalogAttempt` when catalog loading failed and `renderAttempt` when rendering failed. The error state never reports params.

- [ ] **Step 7: Add style cards, frame presentation, field feedback, and Reset**

Wrap the SVG in:

```tsx
{rendered.kind === 'ready' ? (
  <div className={`sky-preview-frame sky-preview-frame--${finish}`}>
    <SkySvg
      className="sky-preview-svg"
      plateUrl={platePath(theme, 'preview')}
      scene={rendered.scene}
      theme={SKY_THEMES[theme]}
    />
  </div>
) : (
  <div className="sky-preview-loading">Charting your sky…</div>
)}
```

Render a fieldset after the personalization form:

```tsx
<fieldset className="sky-theme-picker" aria-label="Choose the artwork style">
  <legend><span>2</span> Style</legend>
  <div className="sky-theme-options">
    {SKY_THEME_IDS.map((id) => (
      <button
        aria-pressed={theme === id}
        className={theme === id ? 'is-selected' : ''}
        key={id}
        onClick={() => setTheme(id)}
        type="button"
      >
        <img alt="" aria-hidden="true" src={platePath(id, 'preview')} />
        <span>{SKY_THEME_LABELS[id]}</span>
      </button>
    ))}
  </div>
</fieldset>
```

Add exact field errors before JSX:

```ts
const badTitleCharacter = unprintableCharacters(title)[0] ?? null;
const placeError = placeBlurred && !place ? 'Choose a place from the list.' : null;
const dateError = dateBlurred && !date ? 'Choose a date.' : null;
const titleError = badTitleCharacter
  ? `“${badTitleCharacter}” can’t be printed — please use letters, numbers and punctuation.`
  : null;
```

Add `id="sky-place"`, `id="sky-date"`, `id="sky-title"`, field-specific error ids, `aria-invalid`, and `aria-describedby`. Render each error directly below its field. Add a `{title.length}/{SKY_TITLE_MAX}` counter and a `Reset` button. The `readyParams` gate must also require `!titleError`.

- [ ] **Step 8: Run focused tests, TypeScript, and ESLint**

```powershell
node --test scripts/skyConfigurator.node-test.mjs scripts/skyParams.node-test.mjs scripts/skyProducts.node-test.mjs
node .\node_modules\@react-router\dev\bin.js typegen
node .\node_modules\typescript\bin\tsc --noEmit
node .\node_modules\eslint\bin\eslint.js --no-error-on-unmatched-pattern app/components/SkyConfigurator.tsx app/lib/sky/configuratorState.ts
```

Expected: PASS, zero ESLint errors.

- [ ] **Step 9: Commit**

```powershell
git add app/components/SkyConfigurator.tsx app/lib/sky/configuratorState.ts scripts/skyConfigurator.node-test.mjs
git commit -m "Refine Your Sky configurator behavior"
```

### Task 4: Integrate guided review and purchase actions in the PDP

**Files:**
- Modify: `app/routes/products.$handle.tsx`
- Modify: `scripts/skyConfigurator.node-test.mjs`

- [ ] **Step 1: Add failing route-contract tests**

Load `products.$handle.tsx` in the existing source test and add:

```js
test('Your Sky PDP has one guided review and exact completion actions', () => {
  for (const token of [
    'product-detail-layout--sky',
    'product-purchase-intro',
    'sky-product-options-stage',
    'sky-review',
    'Choose a place',
    'Choose a date',
    'Check your preview',
    'We print exactly this artwork',
    'skyFinishFromOptions',
    'SKY_THEME_LABELS',
  ]) {
    assert.ok(productSource.includes(token), `missing ${token}`);
  }
  assert.equal(
    (productSource.match(/<SkyConfigurator/g) ?? []).length,
    1,
    'the route should render one Your Sky configurator',
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run `node --test scripts/skyConfigurator.node-test.mjs`. Expected: FAIL on missing route tokens.

- [ ] **Step 3: Replace sky params state with status state**

Import `SkyConfiguratorStatus`, `formatSkyDate`, `SKY_THEME_LABELS`, `SKY_FINISH_LABELS`, and `skyFinishFromOptions`. Add:

```ts
const EMPTY_SKY_STATUS: SkyConfiguratorStatus = {
  nextRequired: 'place',
  params: null,
  preview: 'example',
};
```

Replace `skyParams` state with:

```ts
const [skyStatus, setSkyStatus] = useState<SkyConfiguratorStatus>(EMPTY_SKY_STATUS);
const skyParams = skyStatus.params;
const skyFinish = skyFinishFromOptions(selectedVariant?.selectedOptions);
```

Mount the configurator as:

```tsx
<SkyConfigurator
  finish={skyFinish}
  initialTheme={skyTheme}
  size={skySize}
  onStatus={setSkyStatus}
/>
```

- [ ] **Step 4: Build exact incomplete-action behavior**

Derive the label and anchor:

```ts
const skyPendingAction =
  skyStatus.nextRequired === 'place'
    ? {href: '#sky-place', label: 'Choose a place'}
    : skyStatus.nextRequired === 'date'
      ? {href: '#sky-date', label: 'Choose a date'}
      : {href: '#sky-preview', label: 'Check your preview'};
```

Where the main and sticky AddToCartButton currently render, branch only for an incomplete sky:

```tsx
{isSkyMap && !skyParams ? (
  <a className="primary-button full-width" href={skyPendingAction.href}>
    {skyPendingAction.label}
  </a>
) : (
  <AddToCartButton
    analytics={addToCartAnalytics}
    className="primary-button full-width"
    disabled={purchaseBlocked}
    lines={
      selectedVariant
        ? [{
            merchandiseId: selectedVariant.id,
            quantity,
            selectedVariant,
            ...(skyAttributes ? {attributes: skyAttributes} : {}),
          }]
        : []
    }
    onSuccess={openCart}
    pendingChildren="Adding..."
  >
    {purchaseButtonLabel}
  </AddToCartButton>
)}
```

Use `sticky-atc-button` instead of `full-width` in the sticky bar. Natal and ordinary product behavior must remain unchanged.

- [ ] **Step 5: Split the purchase panel into semantic grid blocks**

Add `product-detail-layout--sky` only for Your Sky. Wrap the existing identity, lede, price, and status row in:

```tsx
<div className="product-purchase-intro" ref={skyIntroRef}>
  <p className="eyebrow">
    {product.productType || getVendorLabel(product.vendor) || 'Curated object'}
  </p>
  <h1>{product.title}</h1>
  <p className="product-lede">{productLede}</p>
  {selectedVariant ? (
    <ProductPrice
      compareAtPrice={selectedVariant.compareAtPrice}
      price={selectedVariant.price}
    />
  ) : null}
  <div className="product-availability-row" aria-label="Purchase status">
    <span className={`product-availability-chip ${selectedVariant?.availableForSale ? 'is-available' : 'is-unavailable'}`}>
      {selectedVariant?.availableForSale ? 'Made to order' : 'Unavailable'}
    </span>
    <span>Processes in {PRODUCTION_WINDOW_BUSINESS_DAYS} business days</span>
    <span>{RETURN_WINDOW_DAYS}-day returns</span>
  </div>
</div>
```

Wrap `VariantOptions` for Your Sky in:

```tsx
<section className="sky-product-options-stage" aria-labelledby="sky-options-heading">
  <p className="sky-stage-heading" id="sky-options-heading"><span>2</span> Size and finish</p>
  <VariantOptions product={product} selectedVariant={selectedVariant} />
</section>
```

Leave ordinary products rendering `VariantOptions` exactly once without this wrapper. Add the intro ref beside the existing buy-box ref:

```ts
const skyIntroRef = useRef<HTMLDivElement>(null);
```

Replace the sticky-bar observer effect with:

```ts
useEffect(() => {
  const target = isSkyMap ? skyIntroRef.current : atcRef.current;
  if (!target) return;
  const observer = new IntersectionObserver(
    ([entry]) => setShowStickyAtc(!entry.isIntersecting),
    {threshold: 0},
  );
  observer.observe(target);
  return () => observer.disconnect();
}, [isSkyMap]);
```

This reveals the sticky action once the compact Your Sky intro leaves view while ordinary products retain the existing buy-box trigger.

- [ ] **Step 6: Add the ready review summary**

Immediately before the buy box, render only when `isSkyMap && skyParams`:

```tsx
<section className="sky-review" aria-labelledby="sky-review-heading">
  <p className="sky-stage-heading" id="sky-review-heading"><span>3</span> Review and buy</p>
  <dl>
    <div><dt>Style</dt><dd>{SKY_THEME_LABELS[skyParams.theme]}</dd></div>
    {skyParams.title ? <div><dt>Title</dt><dd>{skyParams.title}</dd></div> : null}
    <div><dt>Place</dt><dd>{skyParams.place}</dd></div>
    <div><dt>Date</dt><dd>{formatSkyDate(skyParams)}</dd></div>
    <div><dt>Size</dt><dd>{SKY_SIZES[skySize].label}</dd></div>
    <div><dt>Finish</dt><dd>{SKY_FINISH_LABELS[skyFinish]}</dd></div>
    {selectedVariantPrice ? <div><dt>Price</dt><dd>{selectedVariantPrice}</dd></div> : null}
  </dl>
  <p>We print exactly this artwork. Screen colour and natural wood grain can vary slightly.</p>
</section>
```

- [ ] **Step 7: Run focused tests, TypeScript, and lint**

Use Task 3 Step 8, adding `app/routes/products.$handle.tsx` to the ESLint arguments. Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add app/routes/products.$handle.tsx scripts/skyConfigurator.node-test.mjs
git commit -m "Guide Your Sky review and purchase flow"
```

### Task 5: Implement the single-DOM responsive visual system

**Files:**
- Modify: `app/styles/app.css`
- Modify: `scripts/skyConfigurator.node-test.mjs`

- [ ] **Step 1: Add failing CSS-contract tests**

Load `app/styles/app.css` and add:

```js
test('Your Sky uses one responsive grid with theme and frame treatments', () => {
  for (const token of [
    '.product-detail-layout--sky',
    'grid-template-areas:',
    '.sky-theme-options',
    '.sky-preview-frame--natural',
    '.sky-preview-frame--black',
    '.sky-review',
    '.sky-preview-status',
    '.sky-place-status',
  ]) {
    assert.ok(appCss.includes(token), `missing ${token}`);
  }
  assert.match(
    appCss,
    /@media \(max-width: 767px\)[\s\S]*?"intro"[\s\S]*?"preview"[\s\S]*?"form"[\s\S]*?"themes"[\s\S]*?"options"[\s\S]*?"review"[\s\S]*?"buy"/,
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run `node --test scripts/skyConfigurator.node-test.mjs`. Expected: FAIL on missing selectors.

- [ ] **Step 3: Add base stage, status, theme, and frame styles**

Add rules beside the current sky section for:

```css
.sky-stage-heading {
  align-items: center;
  color: var(--color-muted);
  display: flex;
  font-size: 0.72rem;
  font-weight: 700;
  gap: 0.55rem;
  letter-spacing: 0.12em;
  margin: 0;
  text-transform: uppercase;
}

.sky-stage-heading span,
.sky-theme-picker legend span {
  align-items: center;
  border: 1px solid var(--glass-border-ink);
  border-radius: 50%;
  display: inline-flex;
  height: 1.65rem;
  justify-content: center;
  width: 1.65rem;
}

.sky-preview-frame { background: #f6f2ea; padding: 0; transition: padding 180ms ease, background 180ms ease; }
.sky-preview-frame--natural { background: #c7a47e; padding: clamp(10px, 2.2vw, 22px); }
.sky-preview-frame--black { background: #25231f; padding: clamp(10px, 2.2vw, 22px); }
.sky-preview-frame--natural .sky-preview-svg,
.sky-preview-frame--black .sky-preview-svg { box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.28); }
```

Add the exact interaction rules:

```css
.sky-theme-picker {
  border: 0;
  margin: 0;
  min-width: 0;
  padding: 0;
}

.sky-theme-picker legend {
  align-items: center;
  color: var(--color-muted);
  display: flex;
  font-size: 0.72rem;
  font-weight: 700;
  gap: 0.55rem;
  letter-spacing: 0.12em;
  margin-bottom: 0.85rem;
  text-transform: uppercase;
}

.sky-theme-options {
  display: grid;
  gap: 0.65rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.sky-theme-options button {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid var(--glass-border-ink);
  color: inherit;
  cursor: pointer;
  min-height: 44px;
  padding: 0.35rem;
  text-align: left;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.sky-theme-options button:hover { transform: translateY(-2px); }
.sky-theme-options button:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 3px; }
.sky-theme-options button[aria-pressed='true'] {
  border-color: var(--color-ink);
  box-shadow: inset 0 0 0 1px var(--color-ink);
}
.sky-theme-options img { aspect-ratio: 4 / 3; display: block; object-fit: cover; width: 100%; }
.sky-theme-options span { display: block; font-size: 0.72rem; margin-top: 0.4rem; }

.sky-preview-status,
.sky-place-status {
  align-items: center;
  color: var(--color-muted);
  display: flex;
  font-size: 0.76rem;
  gap: 0.55rem;
  justify-content: space-between;
  min-height: 1.5rem;
}

.sky-inline-action,
.sky-reset-button {
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  font: inherit;
  min-height: 44px;
  padding: 0.35rem 0;
  text-decoration: underline;
  text-underline-offset: 0.22em;
}

.sky-field-meta { display: flex; justify-content: space-between; }
.sky-field-error { color: #8f3127; font-size: 0.76rem; margin: 0.35rem 0 0; }
.sky-character-count { color: var(--color-muted); font-size: 0.72rem; }
```

- [ ] **Step 4: Add the flattened guided grid**

For Your Sky only, flatten the two structural wrappers and assign areas:

```css
.product-detail-layout--sky .sky-configurator,
.product-detail-layout--sky .product-purchase-panel {
  display: contents;
}

.product-detail-layout--sky {
  grid-template-areas:
    "preview form intro"
    "preview themes options"
    "preview themes review"
    "preview . buy"
    "preview . assurance"
    "preview . details";
  grid-template-columns: minmax(250px, 0.8fr) minmax(320px, 1fr) minmax(340px, 0.9fr);
  gap: clamp(20px, 3vw, 44px);
}

.product-detail-layout--sky .sky-preview { grid-area: preview; position: sticky; top: calc(var(--header-height) + 20px); }
.product-detail-layout--sky .sky-form { grid-area: form; }
.product-detail-layout--sky .sky-theme-picker { grid-area: themes; }
.product-detail-layout--sky .product-purchase-intro { grid-area: intro; }
.product-detail-layout--sky .sky-product-options-stage { grid-area: options; }
.product-detail-layout--sky .sky-review { grid-area: review; }
.product-detail-layout--sky .product-buy-box { grid-area: buy; }
.product-detail-layout--sky .product-assurance-list { grid-area: assurance; }
.product-detail-layout--sky .product-details-list { grid-area: details; }
```

Give intro/options/review/buy consistent glass surfaces without changing the generic `.product-purchase-panel` rule.

- [ ] **Step 5: Add tablet and phone ordering**

At 768–1279 px use two columns with preview/form on the left and intro/options/review/buy on the right. At max 767 px use:

```css
@media (max-width: 767px) {
  .product-detail-layout--sky {
    grid-template-areas:
      "intro"
      "preview"
      "form"
      "themes"
      "options"
      "review"
      "buy"
      "assurance"
      "details";
    grid-template-columns: minmax(0, 1fr);
  }

  .product-detail-layout--sky .sky-preview {
    position: relative;
    top: auto;
  }

  .sky-theme-options {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
```

Ensure the intro's H1 and price fit 390 px, the frame never overflows, and the bottom sticky bar preserves safe-area padding.

- [ ] **Step 6: Run focused tests and lint**

```powershell
node --test scripts/skyConfigurator.node-test.mjs scripts/liquidGlass.node-test.mjs
node .\node_modules\eslint\bin\eslint.js --no-error-on-unmatched-pattern scripts/skyConfigurator.node-test.mjs
```

Expected: tests PASS and ESLint reports no errors.

- [ ] **Step 7: Commit**

```powershell
git add app/styles/app.css scripts/skyConfigurator.node-test.mjs
git commit -m "Polish Your Sky responsive experience"
```

### Task 6: Local real-browser verification and defect correction

**Files:**
- Modify only files implicated by observed defects.
- Do not commit screenshots or Playwright temporary state.

- [ ] **Step 1: Make the existing local environment available without exposing values**

Verify the source and destination resolve inside the two Clara Mendes worktrees, then copy the ignored `.env` file:

```powershell
$sourceEnv = 'C:\Users\admin\Desktop\4. Work & Projects\shopify\clara-mendes\.env'
$targetEnv = 'C:\Users\admin\Desktop\4. Work & Projects\shopify\clara-mendes-your-sky-refinement\.env'
if (-not (Test-Path -LiteralPath $sourceEnv)) { throw 'Source .env is missing' }
Copy-Item -LiteralPath $sourceEnv -Destination $targetEnv
```

Report only that the file exists; never print values.

- [ ] **Step 2: Start the local Hydrogen server**

```powershell
node .\node_modules\@shopify\cli\bin\run.js hydrogen dev --codegen --port 3010
```

Wait for the exact local URL and keep the process session id.

- [ ] **Step 3: Verify the phone flow with Playwright CLI**

In a temporary directory, open the local Your Sky URL in a named session, resize to 390 × 844, decline cookies, and verify:

1. H1, price, and trust row appear before the preview.
2. ArrowDown + Enter selects Paris.
3. `zzzznotacity` announces no results.
4. A simulated failed place request shows Retry without clearing the query.
5. Date/title updates reach Ready to print.
6. Linen, Midnight Garden, and Quiet Form visibly change the artwork.
7. Natural and Black frame variants visibly wrap the preview and update price.
8. Size/finish switches retain personalisation.
9. Reload restores the draft; Reset clears it.
10. The early sticky action navigates to the missing field and becomes Add when ready.

Capture viewport screenshots to the temporary Playwright directory and inspect them with the image viewer.

- [ ] **Step 4: Verify desktop and cart confirmation**

Resize to 1440 × 1000 and confirm all three columns are readable without overlap. Configure Paris / 2019-06-14 / 22:00 / “Our first night” / Midnight Garden / 20 × 24 / Natural frame, add it to cart, and verify the cart drawer visibly shows Style, Title, Place, and Date. Continue to Shopify checkout only far enough to prove the handoff; stop before payment.

- [ ] **Step 5: Correct any observed defect with a failing regression first**

For each defect, add the smallest failing assertion to `scripts/skyConfigurator.node-test.mjs` or the relevant sky test, run it RED, edit the implicated source, rerun GREEN, and repeat the browser step. Do not bundle unrelated cleanup.

- [ ] **Step 6: Stop the server and close the browser session**

Send Ctrl+C to the exact dev-server session and run `playwright-cli --session your-sky-refinement close`.

- [ ] **Step 7: Commit verified corrections, if any**

```powershell
git add app scripts
git commit -m "Fix verified Your Sky interaction defects"
```

Skip the commit if browser verification required no changes.

### Task 7: Full validation and durable documentation

**Files:**
- Modify: `docs/llm-wiki/modules/catalog-and-products.md`
- Modify: `docs/llm-wiki/log.md`

- [ ] **Step 1: Run the complete test suite**

```powershell
node --test "scripts/*.node-test.mjs"
```

Expected: every test passes; baseline was 123 tests, so the final count must be greater than 123.

- [ ] **Step 2: Run type, lint, build, and route gates**

Run every command in the Working conventions validation block. Expected: zero errors and exit code 0 for each command. Record warnings separately; do not claim warnings are errors or silently hide them.

- [ ] **Step 3: Reconcile the wiki from planned to implemented state**

In `docs/llm-wiki/modules/catalog-and-products.md`, replace “This note records an approved implementation target, not a production claim” with verified implementation behavior and its source paths. Do not state production deployment until the live URL has been checked.

Append a new dated log entry containing the test count, desktop/mobile browser sizes, visible cart attributes, and explicit unchanged invariants. Keep the earlier design-approved entry append-only.

- [ ] **Step 4: Verify documentation links and diff hygiene**

```powershell
git diff --check
git status --short
rg -n "TB[D]|TO[D]O|implement la[t]er|appropriate error handl[i]ng|add validat[i]on|tests for the ab[o]ve" docs/superpowers/plans/2026-09-01-your-sky-refinement.md
```

Expected: no whitespace errors, no untracked artifacts, and no incomplete-marker matches.

- [ ] **Step 5: Commit**

```powershell
git add docs/llm-wiki/modules/catalog-and-products.md docs/llm-wiki/log.md
git commit -m "Document Your Sky refinement behavior"
```

### Task 8: Review, pull request, and controlled production release

**Files:**
- No new source files expected; fix only review findings.

- [ ] **Step 1: Review the complete branch diff against the specification**

Use `git diff origin/main...HEAD`, the 13 specification sections, and the definition-of-done list. Confirm every requirement has code evidence, automated evidence, or browser evidence. Check especially that canonical signing, six SKUs, Prodigi mappings, prices, First Light flags, and checkout are unchanged.

- [ ] **Step 2: Run verification-before-completion guidance**

Re-run focused checks for any changed files after review corrections, then rerun the full validation block. Do not rely on earlier green output after code changes.

- [ ] **Step 3: Push the feature branch and create a PR**

Create `C:\Users\admin\AppData\Local\Temp\clara-mendes-your-sky-pr.md` with `apply_patch` and this exact content:

```markdown
## Summary

- Refines Your Sky into a guided mobile-first configurator.
- Exposes the three existing print styles and selected frame presentation.
- Adds accessible place search, same-tab draft restore, exact preview readiness, and an order review.
- Preserves prices, six Shopify SKUs, signed cart canonicalization, PDF generation, and Prodigi fulfillment mappings.

## Verification

- Full repository Node test suite
- React Router type generation and TypeScript
- ESLint
- Hydrogen production build and route check
- Playwright phone and desktop flows
- Cart attribute and Shopify checkout handoff verification; stopped before payment
```

Do not include secrets or customer data. Then run:

```powershell
git push -u origin codex/refine-your-sky
gh pr create -R Tassos801/Clara-Mendes --base main --head codex/refine-your-sky --title "Refine the Your Sky configurator" --body-file C:\Users\admin\AppData\Local\Temp\clara-mendes-your-sky-pr.md
```

- [ ] **Step 4: Require complete CI and review**

Watch the PR checks. If a check fails, inspect the exact failing run, add a regression if it identifies a product defect, fix, rerun locally, push, and wait for the updated checks. Do not merge while any required check is pending or failing.

- [ ] **Step 5: Squash merge and watch the exact main run**

Resolve the PR number and main workflow id from GitHub in the command itself:

```powershell
$prNumber = gh pr view --repo Tassos801/Clara-Mendes --json number --jq '.number'
gh pr merge $prNumber --squash -R Tassos801/Clara-Mendes
$mainRunId = gh run list -R Tassos801/Clara-Mendes --branch main --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch $mainRunId -R Tassos801/Clara-Mendes --exit-status
```

- [ ] **Step 6: Verify production with a fresh browser session**

Open `https://shopclaramendes.com/products/your-sky-star-map` at 390 × 844 and 1440 × 1000. Repeat style selection, keyboard place choice, date/title, finish/size navigation, ready review, cart attributes, and checkout handoff. Stop before payment.

- [ ] **Step 7: Completion audit**

Build a requirement-by-requirement table from the specification definition of done and cite the authoritative evidence for each item: merged source, test output, CI run, rendered phone/desktop state, cart, and checkout handoff. Only then mark the active goal complete.

## Plan self-review

- Spec coverage: Tasks 1–5 implement theme confirmation, finish presentation, mobile hierarchy, guided stages, accessible search, field feedback, persistence, preview gating, review, and sticky action. Task 6 proves real interaction. Tasks 7–8 cover durable knowledge, complete validation, CI, deployment, and production readback.
- Invariants: the plan never edits `canonicalSkyParams`, `SKY_VARIANTS`, product records, prices, release flags, webhook routing, PDF geometry, or First Light.
- Type consistency: `SkyConfiguratorStatus`, `SkyRequiredField`, `SkyPreviewStatus`, `SkyDraft`, `SkyFinish`, and `SkyThemeId` are defined once and used under the same names throughout.
- TDD: every behavior task starts with a failing Node test and includes an exact RED/GREEN command before commit.
- Incomplete-marker scan: no unfinished or unspecified code steps remain. External PR/workflow ids are resolved from live GitHub state during execution.
