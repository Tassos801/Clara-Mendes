# Your Sky designer (PR 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Customers choose a layout and the three details in step 2 of the Your Sky designer, scrub a time-of-night slider shaded by real twilight, and watch a living preview (canvas sketch while scrubbing, crossfades between exact renders), on desktop and phone, keyboard-accessible, reduced motion respected.

**Architecture:** Pure helpers first (twilight timeline, slider maths, draft v2, scene memo, canvas sketch), each node-tested. Then React: `SkySvg` split into memoised layer components (markup byte-identical), a `SkyLivePreview` that overlays a canvas sketch of the disc while the slider is scrubbed and crossfades exact SVG renders with a cloned "ghost", a `SkyTimeSlider` (native range input over a twilight-shaded track), and the configurator wiring (layout, details, slider, draft/share/reset). One set of 12 generated swatches (`swatch-{layout}-{theme}.webp`) serves both the colour and the layout pickers.

**Tech Stack:** React 18 + React Router (Hydrogen), TypeScript, astronomy-engine, Canvas 2D, node:test (Node 24 type stripping), esbuild + sharp (image generator only).

**Spec:** `docs/superpowers/specs/2026-09-23-your-sky-enhancements-design.md` §5 (and §2 item 4). Engine API from PR 1 (#90, merged).

**Interpretations recorded here (not spec changes):**
1. "All edits crossfade" applies to edits that change the sky or the style (place, date, time via the form, colour, layout, details). Title edits update the text in place with no crossfade: typing would otherwise ghost the whole map every 150 ms. Stars never redraw for a title edit (layer memo), which is the point of §5's memoisation.
2. The sketch covers only the map disc. The rings, cardinals and text don't move with time, so the exact SVG underneath keeps showing them. With the Time detail on, the hour in the details line catches up when the exact render lands (≤ 150 ms after the last move).
3. "Dark" in the caption means the Sun is below −12° (end of nautical twilight). Astronomical darkness (−18°) never comes in a European summer, so a −18° caption would be empty for most summer orders.

**Worktree:** `C:/Users/admin/Desktop/Mine/shopify/clara-wt-ls`, branch `fable/sky-designer` (from `origin/main` a589336). Dev server: Browser pane `preview_start {name: "hydrogen-wt-ls"}` (port 3006). If an npm `.bin` shim fails, run the tool as `node node_modules/...`.

---

## File structure

| File | Status | Responsibility |
| --- | --- | --- |
| `app/lib/sky/time.ts` | modify | Cache one `Intl.DateTimeFormat` per zone (twilight samples 97 local times) |
| `app/lib/sky/twilight.ts` | create | Sun-altitude timeline for a date and place: phases, sunrise/sunset, dark from/until |
| `app/lib/sky/timeSlider.ts` | create | Slider maths: minutes↔HH:MM, key steps, phase words, value text, track gradient, caption |
| `app/lib/sky/configuratorState.ts` | modify | Draft v2 (`layout`, `details`), v1 drafts still restore |
| `app/lib/sky/scene.ts` | modify | `skySceneText()` (text fields) used by `computeSky` |
| `app/lib/sky/sceneMemo.ts` | create | `createSkySceneMemo()`: reuse sky layers when only text changed |
| `app/lib/sky/sketch.ts` | create | `drawSkySketch()`: the disc on a canvas, same layers/constants as svg.tsx |
| `app/lib/sky/svg.tsx` | modify | Layers split into memoised components; output byte-identical |
| `app/lib/useReducedMotion.ts` | create | `prefers-reduced-motion` hook (PR 3's hero reuses it) |
| `app/components/SkyLivePreview.tsx` | create | Exact SVG + ghost crossfade + canvas sketch overlay |
| `app/components/SkyTimeSlider.tsx` | create | The slider UI |
| `app/components/SkyConfigurator.tsx` | modify | Layout/details state + step 2 UI + slider + live preview |
| `app/components/SkyStudio.tsx` | modify | Review rows for Layout and Details |
| `app/styles/app.css` | modify | Slider, switches, layout grid, live preview, swatch crop fix |
| `scripts/generate-your-sky-images.mjs` | modify | 12 swatches replace the 3 style swatches |
| `public/images/your-sky/swatch-*.webp` | create (generated) | 4 layouts × 3 colours, 320 px |
| `public/images/your-sky/style-*.webp` | delete | Superseded by swatches |
| `scripts/sky-svg-fingerprint.mjs` | create | SHA-256 of rendered SkySvg markup across cases (refactor guard) |
| `scripts/skyTwilight.node-test.mjs`, `skyTimeSlider…`, `skySceneMemo…`, `skySketch…` | create | Tests |
| `scripts/skyConfigurator.node-test.mjs`, `skyShare.node-test.mjs` | modify | Draft v2, share-link layout/details, source tokens |
| `docs/llm-wiki/log.md`, `docs/your-sky-release.md` | modify | Wiki log, release note |

---

### Task 0: Baseline

- [ ] **Step 1: Confirm a green baseline**

Run: `npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: `ℹ fail 0` (251 tests at the time of writing).

- [ ] **Step 2: Confirm the branch**

Run: `git status --short --branch`
Expected: `## fable/sky-designer...origin/main` and nothing else.

---

### Task 1: One time-zone formatter per zone

**Files:**
- Modify: `app/lib/sky/time.ts`
- Test: `scripts/skyTwilight.node-test.mjs` (created here, extended in Task 2)

`tzOffsetMinutes` builds a new `Intl.DateTimeFormat` on every call; the twilight timeline calls it ~200 times per date/place. Cache per zone. Behaviour must not change.

- [ ] **Step 1: Write the test**

Create `scripts/skyTwilight.node-test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {localToUtc, tzOffsetMinutes} from '../app/lib/sky/time.ts';

test('local wall-clock times convert to UTC across DST and zones', () => {
  assert.equal(localToUtc('2019-06-14', '22:00', 'Europe/Paris').toISOString(), '2019-06-14T20:00:00.000Z');
  assert.equal(localToUtc('2019-01-14', '22:00', 'Europe/Paris').toISOString(), '2019-01-14T21:00:00.000Z');
  assert.equal(localToUtc('2024-01-10', '06:00', 'Australia/Sydney').toISOString(), '2024-01-09T19:00:00.000Z');
  assert.equal(tzOffsetMinutes(Date.UTC(2023, 2, 26, 1, 30), 'Europe/Lisbon'), 60);
  assert.equal(tzOffsetMinutes(Date.UTC(2023, 2, 26, 0, 30), 'Europe/Lisbon'), 0);
});

test('an unknown zone still throws', () => {
  assert.throws(() => tzOffsetMinutes(0, 'Mars/Olympus'), RangeError);
});
```

- [ ] **Step 2: Run it (passes before the change: it pins current behaviour)**

Run: `node --test scripts/skyTwilight.node-test.mjs`
Expected: 2 pass.

- [ ] **Step 3: Cache the formatter**

In `app/lib/sky/time.ts`, replace the body of `tzOffsetMinutes` so it reads the formatter from a cache:

```ts
const formatters = new Map<string, Intl.DateTimeFormat>();

/** One formatter per zone: building one costs far more than using it. */
function formatterFor(tz: string) {
  let formatter = formatters.get(tz);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(tz, formatter);
  }
  return formatter;
}

/** Offset (minutes east of UTC) that `tz` applies at the instant `utcMs`. */
export function tzOffsetMinutes(utcMs: number, tz: string) {
  const parts = Object.fromEntries(
    formatterFor(tz)
      .formatToParts(new Date(utcMs))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - utcMs) / 60000);
}
```

(`localToUtc` stays as it is.)

- [ ] **Step 4: Run the tests**

Run: `node --test scripts/skyTwilight.node-test.mjs && npm test 2>&1 | grep -E "^ℹ fail"`
Expected: 2 pass; `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add app/lib/sky/time.ts scripts/skyTwilight.node-test.mjs
git commit -m "Sky time: one Intl formatter per zone"
```

---

### Task 2: Twilight timeline

**Files:**
- Create: `app/lib/sky/twilight.ts`
- Test: `scripts/skyTwilight.node-test.mjs` (extend)

Sun altitude every 15 minutes of the local calendar day (00:00 … 24:00 = 97 samples), geometric (no refraction), so the standard limits apply: sunrise/sunset −0.833°, civil −6°, nautical −12°, astronomical −18°. Crossings are interpolated linearly inside each 15-minute step (checked against astronomy-engine's own searches to ±2 min).

- [ ] **Step 1: Write the failing tests**

Append to `scripts/skyTwilight.node-test.mjs`:

```js
import {Astronomy} from '../app/lib/sky/astronomyEngine.ts';
import {
  altitudeAt,
  phaseAt,
  phaseForAltitude,
  skyTimeline,
  TIMELINE_STEP,
} from '../app/lib/sky/twilight.ts';

const PARIS = {date: '2019-06-14', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris'};
const LISBON = {date: '2023-03-02', lat: 38.7223, lon: -9.1393, tz: 'Europe/Lisbon'};
const SYDNEY = {date: '2024-01-10', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney'};
const TROMSO_SUMMER = {date: '2023-06-21', lat: 69.6492, lon: 18.9553, tz: 'Europe/Oslo'};
const TROMSO_WINTER = {date: '2023-12-21', lat: 69.6492, lon: 18.9553, tz: 'Europe/Oslo'};

/** astronomy-engine's own search, as local minutes after midnight. */
function searched(place, kind) {
  const observer = new Astronomy.Observer(place.lat, place.lon, 0);
  const midnight = localToUtc(place.date, '00:00', place.tz);
  const start = Astronomy.MakeTime(midnight);
  const found =
    kind === 'rise' ? Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, start, 1)
    : kind === 'set' ? Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, start, 1)
    : Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, start, 1, -12);
  return found ? (found.date.getTime() - midnight.getTime()) / 60000 : null;
}

test('phases follow the standard Sun altitude limits', () => {
  assert.equal(phaseForAltitude(10), 'day');
  assert.equal(phaseForAltitude(-0.5), 'day');
  assert.equal(phaseForAltitude(-3), 'civil');
  assert.equal(phaseForAltitude(-9), 'nautical');
  assert.equal(phaseForAltitude(-15), 'astronomical');
  assert.equal(phaseForAltitude(-30), 'night');
});

test('sunrise, sunset and dark-from match astronomy-engine within two minutes', () => {
  for (const place of [PARIS, LISBON, SYDNEY]) {
    const t = skyTimeline(place);
    assert.equal(t.altitudes.length, 1440 / TIMELINE_STEP + 1);
    assert.ok(Math.abs(t.sunrise - searched(place, 'rise')) < 2, `${place.tz} sunrise`);
    assert.ok(Math.abs(t.sunset - searched(place, 'set')) < 2, `${place.tz} sunset`);
    assert.ok(Math.abs(t.darkFrom - searched(place, 'dark')) < 2, `${place.tz} dark`);
  }
  const paris = skyTimeline(PARIS);
  assert.equal(Math.round(paris.sunrise), 5 * 60 + 47);
  assert.equal(Math.round(paris.sunset), 21 * 60 + 55);
  assert.equal(Math.round(paris.darkFrom), 23 * 60 + 38);
  assert.equal(Math.round(paris.darkUntil), 4 * 60 + 4);
});

test('segments cover the whole day in order with merged phases', () => {
  const t = skyTimeline(PARIS);
  assert.equal(t.segments[0].from, 0);
  assert.equal(t.segments.at(-1).to, 1440);
  for (let i = 1; i < t.segments.length; i++) {
    assert.equal(t.segments[i].from, t.segments[i - 1].to);
    assert.notEqual(t.segments[i].phase, t.segments[i - 1].phase);
  }
  // Paris in June never reaches astronomical night.
  assert.ok(!t.segments.some((s) => s.phase === 'night'));
  assert.equal(phaseAt(t, 13 * 60), 'day');
  assert.equal(phaseAt(t, 22 * 60), 'civil');
  assert.equal(phaseAt(t, 1 * 60), 'astronomical');
});

test('polar days and nights have no sunrise or sunset', () => {
  const summer = skyTimeline(TROMSO_SUMMER);
  assert.equal(summer.sunrise, null);
  assert.equal(summer.sunset, null);
  assert.deepEqual(summer.segments.map((s) => s.phase), ['day']);
  const winter = skyTimeline(TROMSO_WINTER);
  assert.equal(winter.sunrise, null);
  assert.equal(winter.sunset, null);
  assert.ok(Math.abs(winter.darkFrom - searched(TROMSO_WINTER, 'dark')) < 2);
});

test('altitude interpolates between samples', () => {
  const t = skyTimeline(PARIS);
  const mid = altitudeAt(t.altitudes, 7.5);
  assert.ok(mid < Math.max(t.altitudes[0], t.altitudes[1]));
  assert.ok(mid > Math.min(t.altitudes[0], t.altitudes[1]));
  assert.equal(altitudeAt(t.altitudes, 1440), t.altitudes.at(-1));
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test scripts/skyTwilight.node-test.mjs`
Expected: FAIL, cannot find module `twilight.ts`.

- [ ] **Step 3: Implement `app/lib/sky/twilight.ts`**

```ts
/**
 * The Sun through one local calendar day at a place: altitude every 15
 * minutes and the twilight phases between them. Drives the time slider's
 * shading and caption. Altitudes are geometric (no refraction), so the
 * standard limits apply: sunrise/sunset at −0.833° (refraction plus the
 * Sun's radius), civil −6°, nautical −12°, astronomical −18°.
 */
import {Astronomy} from './astronomyEngine.ts';
import {localToUtc} from './time.ts';

export type SkyPhase = 'day' | 'civil' | 'nautical' | 'astronomical' | 'night';

export const SUN_HORIZON = -0.833;
/** "Dark" in the caption: the end of nautical twilight. */
export const DARK_LIMIT = -12;
export const TIMELINE_STEP = 15;
export const DAY_MINUTES = 1440;

const LIMITS: Array<[number, SkyPhase]> = [
  [SUN_HORIZON, 'day'],
  [-6, 'civil'],
  [DARK_LIMIT, 'nautical'],
  [-18, 'astronomical'],
];

export type SkyTimeline = {
  /** Sun altitude (degrees) at local minute i × TIMELINE_STEP, 00:00 … 24:00. */
  altitudes: number[];
  /** Merged phases covering 0 … 1440 local minutes. */
  segments: Array<{from: number; to: number; phase: SkyPhase}>;
  sunrise: number | null;
  sunset: number | null;
  /** Evening moment the Sun sinks below DARK_LIMIT. */
  darkFrom: number | null;
  /** Morning moment the Sun climbs above DARK_LIMIT. */
  darkUntil: number | null;
};

export function phaseForAltitude(altitude: number): SkyPhase {
  for (const [limit, phase] of LIMITS) if (altitude > limit) return phase;
  return 'night';
}

/** Altitude at any local minute, linear between samples. */
export function altitudeAt(altitudes: number[], minutes: number) {
  const position = Math.max(0, Math.min(DAY_MINUTES, minutes)) / TIMELINE_STEP;
  const i = Math.min(Math.floor(position), altitudes.length - 2);
  const t = position - i;
  return altitudes[i] + (altitudes[i + 1] - altitudes[i]) * t;
}

export function phaseAt(timeline: SkyTimeline, minutes: number) {
  return phaseForAltitude(altitudeAt(timeline.altitudes, minutes));
}

const pad = (n: number) => String(n).padStart(2, '0');

function nextDate(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** Local minutes where the altitude crosses `limit` going up (rising) or down. */
function crossings(altitudes: number[], limit: number, rising: boolean) {
  const found: number[] = [];
  for (let i = 0; i + 1 < altitudes.length; i++) {
    const a = altitudes[i];
    const b = altitudes[i + 1];
    const crosses = rising ? a < limit && b >= limit : a >= limit && b < limit;
    if (crosses) found.push(i * TIMELINE_STEP + (TIMELINE_STEP * (limit - a)) / (b - a));
  }
  return found;
}

export function skyTimeline({
  date,
  lat,
  lon,
  tz,
}: {
  date: string;
  lat: number;
  lon: number;
  tz: string;
}): SkyTimeline {
  const observer = new Astronomy.Observer(lat, lon, 0);
  const altitudes: number[] = [];
  for (let minutes = 0; minutes <= DAY_MINUTES; minutes += TIMELINE_STEP) {
    const when =
      minutes === DAY_MINUTES
        ? localToUtc(nextDate(date), '00:00', tz)
        : localToUtc(date, `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`, tz);
    const time = Astronomy.MakeTime(when);
    const equator = Astronomy.Equator(Astronomy.Body.Sun, time, observer, true, true);
    altitudes.push(Astronomy.Horizon(time, observer, equator.ra, equator.dec).altitude);
  }

  const cuts = [0, DAY_MINUTES];
  for (const [limit] of LIMITS) {
    cuts.push(...crossings(altitudes, limit, true), ...crossings(altitudes, limit, false));
  }
  cuts.sort((a, b) => a - b);
  const segments: SkyTimeline['segments'] = [];
  for (let k = 0; k + 1 < cuts.length; k++) {
    const from = cuts[k];
    const to = cuts[k + 1];
    if (to - from < 1e-6) continue;
    const phase = phaseForAltitude(altitudeAt(altitudes, (from + to) / 2));
    const last = segments.at(-1);
    if (last && last.phase === phase) last.to = to;
    else segments.push({from, to, phase});
  }

  return {
    altitudes,
    segments,
    sunrise: crossings(altitudes, SUN_HORIZON, true)[0] ?? null,
    sunset: crossings(altitudes, SUN_HORIZON, false).at(-1) ?? null,
    darkFrom: crossings(altitudes, DARK_LIMIT, false).at(-1) ?? null,
    darkUntil: crossings(altitudes, DARK_LIMIT, true)[0] ?? null,
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test scripts/skyTwilight.node-test.mjs`
Expected: all pass. (Measured while planning: Paris rise 05:47 / set 21:55 / dark 23:38 / dark until 04:04; Tromsø winter dark from 15:37 vs search 15:38.)

- [ ] **Step 5: Commit**

```bash
git add app/lib/sky/twilight.ts scripts/skyTwilight.node-test.mjs
git commit -m "Sky twilight timeline for the time slider"
```

---

### Task 3: Slider maths

**Files:**
- Create: `app/lib/sky/timeSlider.ts`
- Test: `scripts/skyTimeSlider.node-test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `scripts/skyTimeSlider.node-test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  minutesToTime,
  phaseWord,
  SLIDER_MAX,
  SLIDER_STEP,
  sliderKeyTarget,
  sliderPercent,
  timeToMinutes,
  timeValueText,
  trackGradient,
  twilightCaption,
} from '../app/lib/sky/timeSlider.ts';
import {skyTimeline} from '../app/lib/sky/twilight.ts';

const paris = skyTimeline({date: '2019-06-14', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris'});

test('times and minutes convert both ways', () => {
  assert.equal(SLIDER_STEP, 5);
  assert.equal(SLIDER_MAX, 1435);
  assert.equal(timeToMinutes('22:00'), 1320);
  assert.equal(timeToMinutes('00:05'), 5);
  assert.equal(timeToMinutes('7:5'), null);
  assert.equal(minutesToTime(1320), '22:00');
  assert.equal(minutesToTime(0), '00:00');
  assert.equal(minutesToTime(1435), '23:55');
  assert.equal(minutesToTime(1439.6), '23:59');
});

test('PageUp and PageDown move an hour; other keys are left to the input', () => {
  assert.equal(sliderKeyTarget('PageUp', 1320), 1380);
  assert.equal(sliderKeyTarget('PageDown', 1320), 1260);
  assert.equal(sliderKeyTarget('PageUp', 1420), SLIDER_MAX);
  assert.equal(sliderKeyTarget('PageDown', 30), 0);
  assert.equal(sliderKeyTarget('ArrowRight', 1320), null);
  assert.equal(sliderKeyTarget('Home', 1320), null);
});

test('value text names the time and the light', () => {
  assert.equal(phaseWord(paris, 13 * 60), 'daylight');
  assert.equal(phaseWord(paris, 22 * 60 + 10), 'dusk');
  assert.equal(phaseWord(paris, 5 * 60 + 20), 'dawn');
  assert.equal(phaseWord(paris, 23 * 60), 'twilight');
  assert.equal(phaseWord(paris, 60), 'last light');
  assert.equal(timeValueText(paris, 1320), '22:00, dusk');
  assert.equal(timeValueText(null, 1320), '22:00');
});

test('the caption reads sunrise, sunset and darkness, or the polar case', () => {
  assert.equal(twilightCaption(paris), 'Sunrise 05:47 · sunset 21:55 · dark from 23:38');
  const tromsoSummer = skyTimeline({date: '2023-06-21', lat: 69.6492, lon: 18.9553, tz: 'Europe/Oslo'});
  assert.equal(twilightCaption(tromsoSummer), 'Midnight sun — the sun never sets');
  const tromsoWinter = skyTimeline({date: '2023-12-21', lat: 69.6492, lon: 18.9553, tz: 'Europe/Oslo'});
  assert.equal(twilightCaption(tromsoWinter), 'The sun stays down · dark from 15:37');
  const stockholm = skyTimeline({date: '2023-06-21', lat: 59.3293, lon: 18.0686, tz: 'Europe/Stockholm'});
  assert.match(twilightCaption(stockholm), /^Sunrise 03:\d\d · sunset 22:\d\d · twilight all night$/);
});

test('the track gradient runs through every phase in order', () => {
  const gradient = trackGradient(paris);
  assert.match(gradient, /^linear-gradient\(to right, /);
  const stops = gradient.match(/#[0-9a-f]{6}/g);
  assert.equal(stops.length, paris.segments.length * 2);
  assert.equal(sliderPercent(0), 0);
  assert.equal(sliderPercent(SLIDER_MAX), 100);
  assert.equal(sliderPercent(1440), 100);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test scripts/skyTimeSlider.node-test.mjs`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement `app/lib/sky/timeSlider.ts`**

```ts
/**
 * Pure maths behind the time-of-night slider: the value is local minutes
 * after midnight in 5-minute steps (00:00 … 23:55), bound to the same
 * `time` parameter as the Time field.
 */
import {
  altitudeAt,
  DAY_MINUTES,
  phaseAt,
  SUN_HORIZON,
  type SkyPhase,
  type SkyTimeline,
} from './twilight.ts';

export const SLIDER_STEP = 5;
export const SLIDER_MAX = DAY_MINUTES - SLIDER_STEP;
const HOUR = 60;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const pad = (n: number) => String(n).padStart(2, '0');

export function timeToMinutes(time: string): number | null {
  const match = time.match(TIME_RE);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function minutesToTime(minutes: number) {
  const m = Math.max(0, Math.min(DAY_MINUTES - 1, Math.round(minutes)));
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** An hour per PageUp/PageDown; null leaves the key to the native input. */
export function sliderKeyTarget(key: string, minutes: number): number | null {
  if (key === 'PageUp') return Math.min(SLIDER_MAX, minutes + HOUR);
  if (key === 'PageDown') return Math.max(0, minutes - HOUR);
  return null;
}

/** Position along the track, 0–100. */
export function sliderPercent(minutes: number) {
  return Math.max(0, Math.min(100, (minutes / SLIDER_MAX) * 100));
}

const WORDS: Record<SkyPhase, {morning: string; evening: string}> = {
  day: {morning: 'daylight', evening: 'daylight'},
  civil: {morning: 'dawn', evening: 'dusk'},
  nautical: {morning: 'twilight', evening: 'twilight'},
  astronomical: {morning: 'first light', evening: 'last light'},
  night: {morning: 'night', evening: 'night'},
};

/**
 * Plain words for the light at that minute. Morning or evening follows the
 * Sun itself (climbing or sinking), not the clock: at 01:00 in a Paris
 * June the Sun is still sinking, so that is "last light", not "first".
 */
export function phaseWord(timeline: SkyTimeline, minutes: number) {
  const rising =
    altitudeAt(timeline.altitudes, minutes + 5) >=
    altitudeAt(timeline.altitudes, minutes - 5);
  const words = WORDS[phaseAt(timeline, minutes)];
  return rising ? words.morning : words.evening;
}

export function timeValueText(timeline: SkyTimeline | null, minutes: number) {
  const time = minutesToTime(minutes);
  return timeline ? `${time}, ${phaseWord(timeline, minutes)}` : time;
}

export const PHASE_COLOURS: Record<SkyPhase, string> = {
  day: '#e9dfcc',
  civil: '#b39f95',
  nautical: '#5f5d77',
  astronomical: '#373a52',
  night: '#1f2233',
};

/**
 * CSS gradient for the track: each phase's colour across its span, with
 * a short blend (≤ 6 min each side) at every boundary.
 */
export function trackGradient(timeline: SkyTimeline) {
  const stops = timeline.segments.flatMap(({from, to, phase}) => {
    const blend = Math.min(6, (to - from) / 4);
    const colour = PHASE_COLOURS[phase];
    return [
      `${colour} ${sliderPercent(from + blend).toFixed(2)}%`,
      `${colour} ${sliderPercent(to - blend).toFixed(2)}%`,
    ];
  });
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

export function twilightCaption(timeline: SkyTimeline) {
  const clock = (minutes: number) => minutesToTime(minutes);
  const highest = Math.max(...timeline.altitudes);
  const lowest = Math.min(...timeline.altitudes);
  if (lowest > SUN_HORIZON) return 'Midnight sun — the sun never sets';
  if (highest <= SUN_HORIZON) {
    return timeline.darkFrom !== null
      ? `The sun stays down · dark from ${clock(timeline.darkFrom)}`
      : 'The sun stays down all day';
  }
  const parts: string[] = [];
  if (timeline.sunrise !== null) parts.push(`Sunrise ${clock(timeline.sunrise)}`);
  if (timeline.sunset !== null) {
    parts.push(`${parts.length ? 'sunset' : 'Sunset'} ${clock(timeline.sunset)}`);
  }
  if (timeline.darkFrom !== null) parts.push(`dark from ${clock(timeline.darkFrom)}`);
  else if (timeline.darkUntil !== null) parts.push(`dark until ${clock(timeline.darkUntil)}`);
  else parts.push('twilight all night');
  return parts.join(' · ');
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test scripts/skyTimeSlider.node-test.mjs`
Expected: all pass. If the Stockholm or `phaseWord` expectations disagree with the computed phase, print `skyTimeline(...)` segments and fix the TEST only if the computed value is astronomically right (e.g. `23:00` in Paris is nautical → "twilight"); never bend the limits.

- [ ] **Step 5: Commit**

```bash
git add app/lib/sky/timeSlider.ts scripts/skyTimeSlider.node-test.mjs
git commit -m "Sky time slider maths: steps, value text, track gradient, caption"
```

---

### Task 4: Drafts carry layout and details

**Files:**
- Modify: `app/lib/sky/configuratorState.ts`
- Test: `scripts/skyConfigurator.node-test.mjs`, `scripts/skyShare.node-test.mjs`

The session draft gains `layout` and `details` (value `v: 2`); a `v: 1` draft still restores with Classic and no details. The storage key stays `cm:your-sky:draft:v1` (the value carries its own version). Share links already carry both through `canonicalSkyParams` (PR 1); add a test that proves it.

- [ ] **Step 1: Update and add tests**

In `scripts/skyConfigurator.node-test.mjs`, change the `complete` fixture to:

```js
const complete = {
  place,
  date: '2019-06-14',
  time: '22:00',
  title: 'Our first night',
  theme: 'midnight-garden',
  layout: 'compass',
  details: ['names', 'time'],
};
```

and add after the first test:

```js
test('a v1 draft restores as Classic with no details', () => {
  const v1 = {
    place,
    date: complete.date,
    time: complete.time,
    title: complete.title,
    theme: complete.theme,
  };
  assert.deepEqual(
    parseSkyDraft(JSON.stringify({v: 1, ...v1}), 'linen'),
    {...v1, layout: 'classic', details: []},
  );
});

test('draft details are canonical and unknown layouts or details are refused', () => {
  const shuffled = JSON.stringify({v: 2, ...complete, details: ['time', 'names', 'time']});
  assert.deepEqual(parseSkyDraft(shuffled, 'linen').details, ['names', 'time']);
  assert.equal(parseSkyDraft(JSON.stringify({v: 2, ...complete, layout: 'spiral'}), 'linen'), null);
  assert.equal(parseSkyDraft(JSON.stringify({v: 2, ...complete, details: ['stars']}), 'linen'), null);
  assert.equal(JSON.parse(serializeSkyDraft(complete)).v, 2);
});
```

In `scripts/skyShare.node-test.mjs` (it already imports `buildSkyShareUrl`, `parseSkySearch` and `validateSkyParams`), add:

```js
test('a share link carries layout and details', () => {
  const layered = validateSkyParams({
    date: '2019-06-14', time: '22:00', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris',
    place: 'Paris, France', title: '', theme: 'linen', layout: 'minimal', details: 'grid,time',
  }).params;
  const url = buildSkyShareUrl('https://shop.example', '/your-sky', layered, '');
  const back = parseSkySearch(new URL(url).search);
  assert.equal(back.layout, 'minimal');
  assert.deepEqual(back.details, ['grid', 'time']);
});
```

- [ ] **Step 2: Run them to see the draft tests fail**

Run: `node --test scripts/skyConfigurator.node-test.mjs scripts/skyShare.node-test.mjs`
Expected: the draft tests FAIL (no `layout`/`details` in drafts); the share test passes already.

- [ ] **Step 3: Implement**

In `app/lib/sky/configuratorState.ts`:

1. Extend the imports from `./params.ts` with `SKY_LAYOUT_IDS`, `parseSkyDetails`, `type SkyLayoutId`, `type SkyDetail`.
2. Replace `SkyDraft`, `serializeSkyDraft` and `parseSkyDraft`:

```ts
export type SkyDraft = {
  place: PlaceResult | null;
  date: string;
  time: string;
  title: string;
  theme: SkyThemeId;
  layout: SkyLayoutId;
  details: SkyDetail[];
};

export function serializeSkyDraft(draft: SkyDraft) {
  return JSON.stringify({v: 2, ...draft});
}

export function parseSkyDraft(
  raw: string | null,
  fallbackTheme: SkyThemeId,
): SkyDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value.v !== 1 && value.v !== 2) return null;
    const theme = String(value.theme ?? fallbackTheme) as SkyThemeId;
    if (!SKY_THEME_IDS.includes(theme)) return null;
    // v1 drafts predate layouts and details.
    const layout = (value.v === 2 ? String(value.layout ?? 'classic') : 'classic') as SkyLayoutId;
    if (!SKY_LAYOUT_IDS.includes(layout)) return null;
    const details = value.v === 2 ? parseSkyDetails(value.details ?? []) : [];
    if (!details) return null;
    const date = String(value.date ?? '');
    const time = String(value.time ?? SKY_DEFAULT_TIME);
    const title = String(value.title ?? '');
    if (title.length > SKY_TITLE_MAX) return null;
    // … the existing `candidate` / `place` block, unchanged …
    const validationPlace = place ?? FALLBACK_PLACE;
    const validation = validateSkyParams({
      date: date || '2000-01-01',
      time,
      lat: validationPlace.lat,
      lon: validationPlace.lon,
      tz: validationPlace.tz,
      place: validationPlace.label,
      title,
      theme,
      layout,
      details,
    });
    if (!validation.ok) return null;
    return {
      // … the existing `place` mapping, unchanged …
      date,
      time: validation.params.time,
      title: validation.params.title,
      theme,
      layout: validation.params.layout,
      details: validation.params.details,
    };
  } catch {
    return null;
  }
}
```

Keep every line marked "unchanged" exactly as it is in the file today.

- [ ] **Step 4: Run the tests**

Run: `node --test scripts/skyConfigurator.node-test.mjs scripts/skyShare.node-test.mjs && npm run typecheck 2>&1 | tail -3`
Expected: all pass. Typecheck FAILS in `SkyConfigurator.tsx` (the draft it writes lacks `layout`/`details`); that is fixed in Task 11. Do not touch the component yet.

- [ ] **Step 5: Commit**

```bash
git add app/lib/sky/configuratorState.ts scripts/skyConfigurator.node-test.mjs scripts/skyShare.node-test.mjs
git commit -m "Sky drafts carry layout and details (v1 drafts still restore)"
```

---

### Task 5: Reuse sky layers when only the text changes

**Files:**
- Modify: `app/lib/sky/scene.ts`
- Create: `app/lib/sky/sceneMemo.ts`
- Test: `scripts/skySceneMemo.node-test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `scripts/skySceneMemo.node-test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {validateSkyParams} from '../app/lib/sky/params.ts';
import {computeSky} from '../app/lib/sky/scene.ts';
import {createSkySceneMemo, skyLayerKey} from '../app/lib/sky/sceneMemo.ts';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

const catalog = loadSkyCatalogSync();
const base = {
  date: '2019-06-14', time: '22:00', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris',
  place: 'Paris, France', title: 'One', theme: 'linen', layout: 'compass', details: 'names',
};
const params = (over = {}) => validateSkyParams({...base, ...over}).params;

test('a text-only edit keeps every sky layer and updates the text', () => {
  const memo = createSkySceneMemo();
  const first = memo({params: params(), size: '8x10', catalog});
  const titled = memo({params: params({title: 'Two', place: 'Paris, Île-de-France'}), size: '8x10', catalog});
  for (const layer of ['stars', 'glows', 'lines', 'milkyWay', 'grid', 'labels', 'compass', 'moon', 'planets', 'cardinal', 'disc']) {
    assert.equal(titled[layer], first[layer], `${layer} was rebuilt`);
  }
  assert.equal(titled.title, 'Two');
  assert.match(titled.subtitle, /^PARIS, ÎLE-DE-FRANCE · /);
  assert.deepEqual(titled, computeSky({params: params({title: 'Two', place: 'Paris, Île-de-France'}), size: '8x10', catalog}));
});

test('the Time detail only changes the text; the other details change layers', () => {
  const memo = createSkySceneMemo();
  const first = memo({params: params(), size: '8x10', catalog});
  const timed = memo({params: params({details: 'names,time'}), size: '8x10', catalog});
  assert.equal(timed.stars, first.stars);
  assert.match(timed.subtitle, / · 22:00 · /);
  const gridded = memo({params: params({details: 'names,grid,time'}), size: '8x10', catalog});
  assert.notEqual(gridded.stars, first.stars);
  assert.ok(gridded.grid);
});

test('time, place, layout, size or catalogue changes recompute', () => {
  const memo = createSkySceneMemo();
  const first = memo({params: params(), size: '8x10', catalog});
  assert.notEqual(memo({params: params({time: '22:05'}), size: '8x10', catalog}).stars, first.stars);
  const again = memo({params: params(), size: '8x10', catalog});
  const big = memo({params: params(), size: '20x24', catalog});
  assert.notEqual(big.stars, again.stars);
  const copied = memo({params: params(), size: '20x24', catalog: {...catalog}});
  assert.notEqual(copied.stars, big.stars);
  assert.notEqual(skyLayerKey(params(), '8x10'), skyLayerKey(params({layout: 'full'}), '8x10'));
  assert.equal(skyLayerKey(params(), '8x10'), skyLayerKey(params({title: 'x', theme: 'quiet-form'}), '8x10'));
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test scripts/skySceneMemo.node-test.mjs`
Expected: FAIL, cannot find module `sceneMemo.ts`.

- [ ] **Step 3: Extract the text fields in `scene.ts`**

Add after `skySubtitle`:

```ts
/** The scene's text: everything a title or place-label edit can change. */
export function skySceneText(p: SkyParams) {
  return {
    title: p.title,
    subtitle: skySubtitle(p),
    subtitleParts: skySubtitleParts(p),
    credit: SKY_CREDIT,
  };
}
```

and in `computeSky`'s return, replace the four lines `title: params.title, subtitle: …, subtitleParts: …, credit: SKY_CREDIT,` with `...skySceneText(params),`.

- [ ] **Step 4: Create `app/lib/sky/sceneMemo.ts`**

```ts
/**
 * computeSky for the live preview, reusing the previous scene's sky layers
 * when only the text changed. A title or place-label edit then hands the
 * SVG the very same star, line and Milky Way arrays, so its memoised
 * layers skip redrawing ~5,000 elements.
 */
import type {SkyCatalog} from './catalog.ts';
import type {SkyParams} from './params.ts';
import type {SkySizeKey} from './products.ts';
import {computeSky, skySceneText, type SkyScene} from './scene.ts';

/** Everything that moves a mark in the disc or the rings. `time` among the details only changes the text. */
export function skyLayerKey(p: SkyParams, size: SkySizeKey) {
  const layerDetails = p.details.filter((d) => d !== 'time').join(',');
  return [size, p.date, p.time, p.lat, p.lon, p.tz, p.layout, layerDetails].join('|');
}

export function createSkySceneMemo() {
  let last: {key: string; catalog: SkyCatalog; scene: SkyScene} | null = null;
  return (input: {params: SkyParams; size: SkySizeKey; catalog: SkyCatalog}): SkyScene => {
    const key = skyLayerKey(input.params, input.size);
    if (last && last.key === key && last.catalog === input.catalog) {
      return {...last.scene, ...skySceneText(input.params)};
    }
    const scene = computeSky(input);
    last = {key, catalog: input.catalog, scene};
    return scene;
  };
}
```

- [ ] **Step 5: Run the tests**

Run: `node --test scripts/skySceneMemo.node-test.mjs && npm test 2>&1 | grep -E "^ℹ fail"`
Expected: all pass; `ℹ fail 0`.

- [ ] **Step 6: Commit**

```bash
git add app/lib/sky/scene.ts app/lib/sky/sceneMemo.ts scripts/skySceneMemo.node-test.mjs
git commit -m "Sky scene memo: reuse layers when only the text changes"
```

---

### Task 6: Memoised SVG layers, byte-identical

**Files:**
- Create: `scripts/sky-svg-fingerprint.mjs`
- Modify: `app/lib/sky/svg.tsx`

- [ ] **Step 1: Create the fingerprint script**

`scripts/sky-svg-fingerprint.mjs`:

```js
#!/usr/bin/env node
/* eslint-disable no-console */
// Renders SkySvg to static markup for every layout × style (details off and
// all on, both sizes) and prints one SHA-256 over all of it. Run before and
// after a refactor of app/lib/sky/svg.tsx: the hashes must match.
//
//   node scripts/sky-svg-fingerprint.mjs
import {createHash} from 'node:crypto';
import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import esbuild from 'esbuild';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(root, 'output', 'sky-fingerprint');
mkdirSync(buildDir, {recursive: true});
const bundle = await esbuild.build({
  bundle: true,
  entryPoints: [path.join(root, 'scripts', 'lib', 'your-sky-render.mjs')],
  format: 'esm',
  jsx: 'automatic',
  packages: 'external',
  platform: 'node',
  target: 'node22',
  write: false,
});
const rendererPath = path.join(buildDir, 'render.mjs');
writeFileSync(rendererPath, bundle.outputFiles[0].text);
const {renderSkySvg} = await import(pathToFileURL(rendererPath).href);

const catalog = loadSkyCatalogSync();
const hash = createHash('sha256');
let cases = 0;
for (const size of ['8x10', '20x24']) {
  for (const layout of ['classic', 'compass', 'full', 'minimal']) {
    for (const theme of ['linen', 'midnight-garden', 'quiet-form']) {
      for (const details of ['none', 'names,grid,time']) {
        const {svg} = renderSkySvg({
          catalog,
          params: {
            date: '2019-06-14', time: '22:00', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris',
            place: 'Paris, France', title: 'The night we met', theme, layout, details,
          },
          plateDataUrl: null,
          size,
          theme,
        });
        hash.update(svg);
        cases += 1;
      }
    }
  }
}
console.log(`${cases} cases ${hash.digest('hex')}`);
/* eslint-enable no-console */
```

- [ ] **Step 2: Record the fingerprint BEFORE touching svg.tsx**

Run: `node scripts/sky-svg-fingerprint.mjs`
Expected: `48 cases <hash>`. Write the hash down (paste it in your report).

- [ ] **Step 3: Split `SkySvg` into memoised layers**

In `app/lib/sky/svg.tsx`:

1. Import `memo` from react: `import {memo, useEffect, useId, useMemo, useState} from 'react';` and add `import type {SkyScene} from './scene';` (already imported as type; keep one import).
2. Add above `SkySvg`:

```tsx
type DiscLayerProps = Pick<
  SkyScene,
  'milkyWay' | 'grid' | 'lines' | 'glows' | 'stars' | 'planets' | 'moon' | 'labels' | 'disc' | 'scale'
> & {theme: SkyTheme; clipId: string};

/**
 * Everything inside the horizon. Memoised: the live preview's scene memo
 * hands over the same arrays for a text-only edit, so ~5,000 elements are
 * not re-rendered while a title is typed.
 */
const SkyDiscLayers = memo(function SkyDiscLayers({
  milkyWay, grid, lines, glows, stars, planets, moon, labels, disc, scale, theme, clipId,
}: DiscLayerProps) {
  const moonPath = moon
    ? moonLitPath(moon.x, moon.y, moon.r, moon.phaseFraction, moon.litRight)
    : '';
  return (
    <g clipPath={`url(#${clipId})`}>
      {/* … move here, unchanged, everything that is inside <g clipPath=…> today,
          renaming `scene.milkyWay` → `milkyWay`, `scene.grid` → `grid`,
          `scene.lines` → `lines`, `scene.glows` → `glows`,
          `scene.stars` → `stars`, `scene.planets` → `planets`,
          `scene.labels` → `labels` … */}
    </g>
  );
});

type FrameLayerProps = Pick<SkyScene, 'disc' | 'scale' | 'compass' | 'cardinal' | 'cardinalSize'> & {
  theme: SkyTheme;
};

/** Horizon rings, compass ticks and cardinals: they only move with the layout. */
const SkyFrameLayers = memo(function SkyFrameLayers({
  disc, scale, compass, cardinal, cardinalSize, theme,
}: FrameLayerProps) {
  return (
    <>
      {/* … move here, unchanged, the two ring <circle>s, the
          {scene.compass ? … : null} block and the cardinal <g>, renaming
          `scene.compass` → `compass`, `scene.cardinal` → `cardinal`,
          `scene.cardinalSize` → `cardinalSize` … */}
    </>
  );
});
```

3. In `SkySvg`, delete the `moon`/`moonPath` constants and the moved JSX, and render instead, in the same positions:

```tsx
      <SkyDiscLayers
        clipId={clipId}
        disc={disc}
        glows={scene.glows}
        grid={scene.grid}
        labels={scene.labels}
        lines={scene.lines}
        milkyWay={scene.milkyWay}
        moon={scene.moon}
        planets={scene.planets}
        scale={scale}
        stars={scene.stars}
        theme={theme}
      />
      <SkyFrameLayers
        cardinal={scene.cardinal}
        cardinalSize={scene.cardinalSize}
        compass={scene.compass}
        disc={disc}
        scale={scale}
        theme={theme}
      />
```

The element order inside `<svg>` must stay: background rect, plate image, disc tint circle, clipped group, rings, compass, cardinals, title lines, subtitle lines, credit.

- [ ] **Step 4: Fingerprint AFTER**

Run: `node scripts/sky-svg-fingerprint.mjs`
Expected: the SAME `48 cases <hash>` as Step 2. If it differs, diff one case's markup before/after (checkout the old svg.tsx to a temp path and render with it) and fix the order or an attribute until the hash matches.

- [ ] **Step 5: Typecheck, lint, tests**

Run: `npm run typecheck 2>&1 | tail -5; npx eslint app/lib/sky/svg.tsx scripts/sky-svg-fingerprint.mjs; npm test 2>&1 | grep -E "^ℹ fail"`
Expected: the only typecheck error is Task 4's pending one in `SkyConfigurator.tsx`; lint clean; `ℹ fail 0`.

- [ ] **Step 6: Commit**

```bash
git add app/lib/sky/svg.tsx scripts/sky-svg-fingerprint.mjs
git commit -m "Sky SVG: memoised disc and frame layers (markup unchanged)"
```

---

### Task 7: Canvas sketch of the disc

**Files:**
- Create: `app/lib/sky/sketch.ts`
- Test: `scripts/skySketch.node-test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `scripts/skySketch.node-test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {validateSkyParams} from '../app/lib/sky/params.ts';
import {computeSky} from '../app/lib/sky/scene.ts';
import {drawSkySketch} from '../app/lib/sky/sketch.ts';
import {SKY_THEMES} from '../app/lib/sky/themes.ts';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

const catalog = loadSkyCatalogSync();
const scene = computeSky({
  params: validateSkyParams({
    date: '2019-06-14', time: '22:00', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris',
    place: 'Paris, France', title: 'x', theme: 'linen', layout: 'compass', details: 'names,grid',
  }).params,
  size: '8x10',
  catalog,
});

/** A 2D context that records every call and property write. */
function recorder() {
  const calls = [];
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      return (...args) => calls.push([key, ...args]);
    },
    set(target, key, value) {
      calls.push([`=${String(key)}`, value]);
      target[key] = value;
      return true;
    },
  });
  return {ctx, calls};
}

const makePath = (d) => ({d});

test('the sketch clips to the disc and draws every layer inside save/restore', () => {
  const {ctx, calls} = recorder();
  drawSkySketch(ctx, scene, SKY_THEMES.linen, {plate: null, pixelScale: 2, makePath});
  const names = calls.map((c) => c[0]);
  assert.deepEqual(calls.find((c) => c[0] === 'setTransform' && c[1] === 2), ['setTransform', 2, 0, 0, 2, 0, 0]);
  const save = names.indexOf('save');
  const clip = names.indexOf('clip');
  assert.ok(save >= 0 && clip > save);
  assert.equal(names.lastIndexOf('restore'), names.length - 1);
  const clipArc = calls.slice(save, clip).find((c) => c[0] === 'arc');
  assert.deepEqual(clipArc.slice(1, 4), [scene.disc.cx, scene.disc.cy, scene.disc.r]);
  const pathFills = calls.filter((c) => c[0] === 'fill' && c[1] && c[1].d);
  // Milky Way passes, plus the Moon's lit part when the Moon is up.
  assert.equal(pathFills.length, scene.milkyWay.length + (scene.moon && scene.moon.phaseFraction > 0.005 ? 1 : 0));
  const labels = calls.filter((c) => c[0] === 'fillText');
  assert.equal(labels.length, scene.labels.length);
});

test('every star is one arc; stars are batched by opacity', () => {
  const {ctx, calls} = recorder();
  drawSkySketch(ctx, scene, SKY_THEMES['midnight-garden'], {plate: null, pixelScale: 1, makePath});
  const opacities = new Set(scene.stars.map((s) => s.opacity));
  const starArcs = calls.filter((c) => c[0] === 'arc' && scene.stars.some((s) => s.x === c[1] && s.y === c[2] && s.r === c[3]));
  assert.ok(starArcs.length >= scene.stars.length);
  const alphaWrites = calls.filter((c) => c[0] === '=globalAlpha').map((c) => c[1]);
  for (const o of opacities) assert.ok(alphaWrites.includes(o), `no batch at ${o}`);
});

test('the plate is drawn like the SVG slice (cover, centred)', () => {
  const {ctx, calls} = recorder();
  const plate = {width: 1000, height: 1000};
  drawSkySketch(ctx, scene, SKY_THEMES.linen, {plate, pixelScale: 1, makePath});
  const draw = calls.find((c) => c[0] === 'drawImage');
  const s = Math.max(scene.width / 1000, scene.height / 1000);
  assert.deepEqual(draw.slice(1), [plate, (scene.width - 1000 * s) / 2, (scene.height - 1000 * s) / 2, 1000 * s, 1000 * s]);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test scripts/skySketch.node-test.mjs`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement `app/lib/sky/sketch.ts`**

```ts
/**
 * Canvas sketch of the map disc for the living preview. While the time
 * slider is scrubbed the preview recomputes the scene every frame and
 * draws just the disc here, over the exact SVG (whose rings, cardinals and
 * text don't move with time). Same layers, order and constants as
 * svg.tsx, so the hand-back to the exact SVG is a quiet fade. Browser
 * only; `makePath` is injectable so node tests can record calls.
 */
import {moonLitPath} from './moon.ts';
import type {SkyScene} from './scene.ts';
import {
  GLOW_RINGS,
  GRID_WIDTH,
  LABEL_SIZE,
  LABEL_TRACKING,
  LINE_WIDTH,
  MOON_EDGE_OPACITY,
  MOON_EDGE_WIDTH,
  MOON_GLOW,
  PLANET_DOT,
  PLANET_STROKE,
} from './style.ts';
import type {SkyTheme} from './themes.ts';

const TAU = Math.PI * 2;
const FONT = "'EB Garamond', Georgia, 'Times New Roman', serif";

export type SketchPlate = CanvasImageSource & {width: number; height: number};

export type SketchOptions = {
  /** Loaded background plate, drawn like the SVG's `xMidYMid slice`. */
  plate: SketchPlate | null;
  /** Canvas pixels per scene point. */
  pixelScale: number;
  makePath?: (d: string) => Path2D;
};

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}

export function drawSkySketch(
  ctx: CanvasRenderingContext2D,
  scene: SkyScene,
  theme: SkyTheme,
  {plate, pixelScale, makePath = (d) => new Path2D(d)}: SketchOptions,
) {
  const {width: W, height: H, disc, scale} = scene;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W * pixelScale, H * pixelScale);
  ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
  ctx.save();
  circle(ctx, disc.cx, disc.cy, disc.r);
  ctx.clip();

  // Paper: background, plate, disc tint — as the SVG draws under the disc.
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.background;
  ctx.fillRect(disc.cx - disc.r, disc.cy - disc.r, 2 * disc.r, 2 * disc.r);
  if (plate && plate.width > 0 && plate.height > 0) {
    const s = Math.max(W / plate.width, H / plate.height);
    const w = plate.width * s;
    const h = plate.height * s;
    ctx.drawImage(plate, (W - w) / 2, (H - h) / 2, w, h);
  }
  if (theme.disc) {
    ctx.globalAlpha = theme.discOpacity;
    ctx.fillStyle = theme.disc;
    circle(ctx, disc.cx, disc.cy, disc.r);
    ctx.fill();
  }

  ctx.fillStyle = theme.milkyWay;
  for (const pass of scene.milkyWay) {
    ctx.globalAlpha = theme.milkyWayOpacity * pass.weight;
    ctx.fill(makePath(pass.path));
  }

  if (scene.grid) {
    ctx.globalAlpha = theme.gridOpacity;
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = GRID_WIDTH * scale;
    ctx.beginPath();
    for (const r of scene.grid.circles) {
      ctx.moveTo(disc.cx + r, disc.cy);
      ctx.arc(disc.cx, disc.cy, r, 0, TAU);
    }
    for (const l of scene.grid.spokes) {
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = theme.lineOpacity;
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = LINE_WIDTH * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const l of scene.lines) {
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
  }
  ctx.stroke();

  ctx.fillStyle = theme.glow;
  for (const ring of GLOW_RINGS) {
    ctx.globalAlpha = ring.opacity;
    ctx.beginPath();
    for (const g of scene.glows) {
      ctx.moveTo(g.x + g.r * ring.radius, g.y);
      ctx.arc(g.x, g.y, g.r * ring.radius, 0, TAU);
    }
    ctx.fill();
  }

  // Stars, one path per opacity step (starStyle has five).
  const byOpacity = new Map<number, SkyScene['stars']>();
  for (const s of scene.stars) {
    const group = byOpacity.get(s.opacity);
    if (group) group.push(s);
    else byOpacity.set(s.opacity, [s]);
  }
  ctx.fillStyle = theme.star;
  for (const [opacity, group] of byOpacity) {
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    for (const s of group) {
      ctx.moveTo(s.x + s.r, s.y);
      ctx.arc(s.x, s.y, s.r, 0, TAU);
    }
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.planet;
  ctx.fillStyle = theme.planet;
  ctx.lineWidth = PLANET_STROKE * scale;
  for (const p of scene.planets) {
    circle(ctx, p.x, p.y, p.r);
    ctx.stroke();
    circle(ctx, p.x, p.y, p.r * PLANET_DOT);
    ctx.fill();
  }

  const moon = scene.moon;
  if (moon) {
    ctx.fillStyle = theme.moonGlow;
    for (const g of MOON_GLOW) {
      ctx.globalAlpha = Math.min(1, g.opacity * theme.moonGlowStrength);
      circle(ctx, moon.x, moon.y, moon.r * g.radius);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.background;
    circle(ctx, moon.x, moon.y, moon.r);
    ctx.fill();
    ctx.globalAlpha = theme.moonShadeOpacity;
    ctx.fillStyle = theme.moonShade;
    circle(ctx, moon.x, moon.y, moon.r);
    ctx.fill();
    const lit = moonLitPath(moon.x, moon.y, moon.r, moon.phaseFraction, moon.litRight);
    if (lit) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = theme.moonFace;
      ctx.fill(makePath(lit));
    }
    ctx.globalAlpha = MOON_EDGE_OPACITY;
    ctx.strokeStyle = theme.moonEdge;
    ctx.lineWidth = MOON_EDGE_WIDTH * scale;
    circle(ctx, moon.x, moon.y, moon.r);
    ctx.stroke();
  }

  if (scene.labels.length) {
    ctx.globalAlpha = theme.labelColorOpacity;
    ctx.fillStyle = theme.labelColor;
    ctx.font = `${LABEL_SIZE * scale}px ${FONT}`;
    ctx.textAlign = 'center';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${LABEL_TRACKING * scale}px`;
    for (const l of scene.labels) ctx.fillText(l.text, l.x, l.y);
  }
  ctx.restore();
}
```

Note: `'letterSpacing' in ctx` is false on the test recorder (the Proxy has no such key until set), which is fine. The SVG's `letterSpacing` shifts centred text by half a tracking unit; the sketch is allowed that difference.

- [ ] **Step 4: Run the tests**

Run: `node --test scripts/skySketch.node-test.mjs && npx eslint app/lib/sky/sketch.ts`
Expected: pass; lint clean.

- [ ] **Step 5: Commit**

```bash
git add app/lib/sky/sketch.ts scripts/skySketch.node-test.mjs
git commit -m "Sky sketch: the disc on a canvas for the living preview"
```

---

### Task 8: Twelve swatches replace the three style swatches

**Files:**
- Modify: `scripts/generate-your-sky-images.mjs`
- Create: `public/images/your-sky/swatch-{classic,compass,full,minimal}-{linen,midnight-garden,quiet-form}.webp`
- Delete: `public/images/your-sky/style-{linen,midnight-garden,quiet-form}.webp`
- Test: `scripts/skyConfigurator.node-test.mjs`

The colour picker shows each colour in the chosen layout; the layout picker shows each layout in the chosen colour. Both read `swatch-{layout}-{theme}.webp`.

- [ ] **Step 1: Write the failing test**

Append to `scripts/skyConfigurator.node-test.mjs` (add `existsSync` to the `node:fs` import):

```js
test('a 320 px swatch exists for every layout in every colour', () => {
  for (const layout of ['classic', 'compass', 'full', 'minimal']) {
    for (const theme of ['linen', 'midnight-garden', 'quiet-form']) {
      assert.ok(
        existsSync(path.join(ROOT, `public/images/your-sky/swatch-${layout}-${theme}.webp`)),
        `missing swatch-${layout}-${theme}.webp`,
      );
    }
  }
  assert.ok(!existsSync(path.join(ROOT, 'public/images/your-sky/style-linen.webp')));
});
```

Run: `node --test scripts/skyConfigurator.node-test.mjs` → FAIL (missing swatches).

- [ ] **Step 2: Generate swatches**

In `scripts/generate-your-sky-images.mjs`:

1. Update the header comment: "…the hero …, three occasion skies and twelve swatches (four layouts × three colours) for the designer's style step."
2. Give `printPng` a layout: `async function printPng(key, width, theme = SKIES[key].theme, layout = 'classic')` and pass `params: {...SKIES[key], theme, layout},`.
3. Replace the style-swatch loop with:

```js
// Swatches: the example sky in every layout on every plate, 320px wide.
for (const layout of ['classic', 'compass', 'full', 'minimal']) {
  for (const theme of ['linen', 'midnight-garden', 'quiet-form']) {
    const {png} = await printPng('hero', 320, theme, layout);
    const out = path.join(outDir, `swatch-${layout}-${theme}.webp`);
    await sharp(png).webp({quality: 84}).toFile(out);
    console.log('wrote', path.relative(repoRoot, out));
  }
}
```

- [ ] **Step 3: Run the generator and keep only the swatch changes**

```bash
node scripts/generate-your-sky-images.mjs
git rm -q public/images/your-sky/style-linen.webp public/images/your-sky/style-midnight-garden.webp public/images/your-sky/style-quiet-form.webp
git status --short public/images/your-sky
```

If `hero-print.webp` or `occasion-*.webp` show as modified, they were re-encoded without a design change: restore them with `git checkout -- public/images/your-sky/hero-print.webp public/images/your-sky/occasion-*.webp` (PR 3 regenerates those deliberately).

Open three swatches (Read tool on the .webp) and confirm: whole print visible, title legible, the layout is recognisable at 320 px.

- [ ] **Step 4: Run the test**

Run: `node --test scripts/skyConfigurator.node-test.mjs`
Expected: the swatch test passes (the component still points at `style-*`; Task 11 switches it — do not ship between tasks).

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-your-sky-images.mjs public/images/your-sky scripts/skyConfigurator.node-test.mjs
git commit -m "Your Sky swatches: every layout in every colour"
```

---

### Task 9: Reduced-motion hook and the time slider

**Files:**
- Create: `app/lib/useReducedMotion.ts`
- Create: `app/components/SkyTimeSlider.tsx`
- Modify: `app/styles/app.css`

- [ ] **Step 1: `app/lib/useReducedMotion.ts`**

```ts
import {useEffect, useState} from 'react';

/** True when the visitor asks for reduced motion; false during SSR. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}
```

- [ ] **Step 2: `app/components/SkyTimeSlider.tsx`**

```tsx
import {type CSSProperties, useEffect} from 'react';
import {
  minutesToTime,
  phaseWord,
  SLIDER_MAX,
  SLIDER_STEP,
  sliderKeyTarget,
  sliderPercent,
  timeValueText,
  trackGradient,
  twilightCaption,
} from '~/lib/sky/timeSlider';
import {phaseAt, type SkyTimeline} from '~/lib/sky/twilight';

const SCRUB_KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End',
]);

/**
 * Time-of-night slider under the map: local minutes in 5-minute steps,
 * shaded by the Sun's altitude for the chosen date and place. `onScrub`
 * reports when the customer is actively moving it (pointer down or a key
 * held), so the preview can sketch at frame rate.
 */
export function SkyTimeSlider({
  minutes,
  timeline,
  onChange,
  onScrub,
}: {
  minutes: number;
  timeline: SkyTimeline | null;
  onChange: (minutes: number) => void;
  onScrub: (active: boolean) => void;
}) {
  // A drag can end anywhere on the page.
  useEffect(() => {
    const end = () => onScrub(false);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [onScrub]);

  const value = Math.min(minutes, SLIDER_MAX);
  const word = timeline ? phaseWord(timeline, value) : null;
  const ticks = timeline
    ? [timeline.sunrise, timeline.sunset].filter((m): m is number => m !== null)
    : [];
  const trackStyle = timeline
    ? ({'--sky-time-track': trackGradient(timeline)} as CSSProperties)
    : undefined;

  return (
    <div className="sky-time">
      <div className="sky-time-head">
        <label htmlFor="sky-time-slider">Time of night</label>
        <output aria-hidden="true" htmlFor="sky-time-slider">
          {minutesToTime(value)}
          {word ? ` · ${word[0].toUpperCase()}${word.slice(1)}` : ''}
        </output>
      </div>
      <div className="sky-time-track" style={trackStyle}>
        {ticks.map((tick) => (
          <span
            aria-hidden="true"
            className="sky-time-tick"
            key={tick}
            style={{'--at': sliderPercent(tick) / 100} as CSSProperties}
          />
        ))}
        <input
          aria-describedby={timeline ? 'sky-time-caption' : undefined}
          aria-valuetext={timeValueText(timeline, value)}
          id="sky-time-slider"
          max={SLIDER_MAX}
          min={0}
          onBlur={() => onScrub(false)}
          onChange={(event) => onChange(Number(event.target.value))}
          onKeyDown={(event) => {
            if (!SCRUB_KEYS.has(event.key)) return;
            onScrub(true);
            const target = sliderKeyTarget(event.key, value);
            if (target !== null) {
              event.preventDefault();
              onChange(target);
            }
          }}
          onKeyUp={() => onScrub(false)}
          onPointerDown={() => onScrub(true)}
          step={SLIDER_STEP}
          type="range"
          value={value}
        />
      </div>
      {timeline ? (
        <p className="sky-time-caption" id="sky-time-caption">
          {twilightCaption(timeline)}
        </p>
      ) : null}
      {timeline && phaseAt(timeline, value) === 'day' ? (
        <p className="sky-time-note">
          Daylight: the stars are shown as they stood above the horizon.
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Slider CSS**

Append to `app/styles/app.css` right after the `.sky-view-toggle button:focus-visible` rule:

```css
/* Time-of-night slider under the Your Sky preview. The shaded track is a
   pseudo-element inset by the thumb radius, so ticks and gradient stops line
   up with the thumb's centre at every value. */
.sky-time {
  background: rgba(251, 250, 246, 0.92);
  border-top: 1px solid rgba(38, 35, 31, 0.1);
  padding: 10px 12px 8px;
}

.sky-time-head {
  align-items: baseline;
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.sky-time-head label {
  color: var(--color-muted);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.sky-time-head output {
  font-family: var(--serif);
  font-size: 0.92rem;
}

.sky-time-track {
  --thumb: 20px;
  margin-top: 4px;
  position: relative;
}

.sky-time-track::before {
  background: var(--sky-time-track, #373a52);
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(38, 35, 31, 0.14);
  content: '';
  height: 8px;
  left: calc(var(--thumb) / 2);
  position: absolute;
  right: calc(var(--thumb) / 2);
  top: 50%;
  transform: translateY(-50%);
}

.sky-time-tick {
  background: rgba(246, 242, 234, 0.95);
  height: 16px;
  left: calc(var(--thumb) / 2 + (100% - var(--thumb)) * var(--at));
  pointer-events: none;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 1.5px;
}

.sky-time-track input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  display: block;
  height: 32px;
  margin: 0;
  position: relative;
  touch-action: pan-y;
  width: 100%;
}

.sky-time-track input[type='range']::-webkit-slider-runnable-track {
  background: transparent;
  height: 8px;
}

.sky-time-track input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  background: var(--color-paper);
  border: 2px solid var(--color-ink);
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(24, 21, 18, 0.25);
  height: var(--thumb);
  margin-top: -6px;
  width: var(--thumb);
}

.sky-time-track input[type='range']::-moz-range-track {
  background: transparent;
  height: 8px;
}

.sky-time-track input[type='range']::-moz-range-thumb {
  background: var(--color-paper);
  border: 2px solid var(--color-ink);
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(24, 21, 18, 0.25);
  height: 16px;
  width: 16px;
}

.sky-time-track input[type='range']:focus-visible {
  border-radius: 999px;
  outline: 2px solid var(--color-ink);
  outline-offset: 2px;
}

.sky-time-caption,
.sky-time-note {
  color: var(--color-muted);
  font-size: 0.72rem;
  line-height: 1.4;
  margin: 2px 0 0;
}
```

`touch-action: pan-y` lets a phone scroll the page vertically across the slider while horizontal drags move it.

- [ ] **Step 4: Lint and commit**

Run: `npx eslint app/lib/useReducedMotion.ts app/components/SkyTimeSlider.tsx`
Expected: clean. (Typecheck still reports only Task 4's pending error.)

```bash
git add app/lib/useReducedMotion.ts app/components/SkyTimeSlider.tsx app/styles/app.css
git commit -m "Your Sky time-of-night slider with twilight shading"
```

---

### Task 10: Living preview

**Files:**
- Create: `app/components/SkyLivePreview.tsx`
- Modify: `app/styles/app.css`

- [ ] **Step 1: `app/components/SkyLivePreview.tsx`**

```tsx
import {Component, createRef, type ReactNode, useEffect, useRef, useState} from 'react';
import type {SkyCatalog} from '~/lib/sky/catalog';
import type {SkyParams} from '~/lib/sky/params';
import type {SkySizeKey} from '~/lib/sky/products';
import {computeSky, type SkyScene} from '~/lib/sky/scene';
import {drawSkySketch, type SketchPlate} from '~/lib/sky/sketch';
import {SkySvg} from '~/lib/sky/svg';
import type {SkyTheme} from '~/lib/sky/themes';

export const SKY_CROSSFADE_MS = 250;
const MAX_PIXEL_RATIO = 2;

/**
 * A copy of the outgoing SVG to fade out over the new one. Its clip path
 * gets its own id: `url(#…)` resolves to the first match in the document,
 * which would otherwise be the live SVG's (possibly re-laid-out) disc.
 */
function ghostOf(svg: SVGSVGElement) {
  const ghost = svg.cloneNode(true) as SVGSVGElement;
  ghost.removeAttribute('role');
  ghost.removeAttribute('aria-label');
  ghost.setAttribute('aria-hidden', 'true');
  const clip = ghost.querySelector('clipPath');
  if (clip) {
    const id = `${clip.id}-ghost`;
    clip.id = id;
    for (const node of ghost.querySelectorAll('[clip-path]')) {
      node.setAttribute('clip-path', `url(#${id})`);
    }
  }
  return ghost;
}

type CrossfadeProps = {
  scene: SkyScene;
  theme: SkyTheme;
  disabled: boolean;
  children: ReactNode;
};

/**
 * Crossfades the exact SVG between sky or style changes: the DOM is cloned
 * just before React updates it (getSnapshotBeforeUpdate, so nothing is
 * cloned for text-only edits) and the clone fades out on top.
 */
class SkyCrossfade extends Component<CrossfadeProps> {
  host = createRef<HTMLDivElement>();
  ghosts = createRef<HTMLDivElement>();
  timer = 0;

  getSnapshotBeforeUpdate(prev: CrossfadeProps) {
    const {scene, theme, disabled} = this.props;
    if (disabled) return null;
    if (prev.scene.stars === scene.stars && prev.theme.id === theme.id) return null;
    const svg = this.host.current?.querySelector(':scope > svg');
    return svg instanceof SVGSVGElement ? ghostOf(svg) : null;
  }

  componentDidUpdate(_prev: CrossfadeProps, _state: unknown, ghost: SVGSVGElement | null) {
    const layer = this.ghosts.current;
    if (!ghost || !layer) return;
    window.clearTimeout(this.timer);
    layer.replaceChildren(ghost);
    // Paint the ghost fully opaque once, then let the transition run.
    void ghost.getBoundingClientRect();
    ghost.classList.add('is-leaving');
    this.timer = window.setTimeout(() => ghost.remove(), SKY_CROSSFADE_MS + 60);
  }

  componentWillUnmount() {
    window.clearTimeout(this.timer);
  }

  render() {
    return (
      <div className="sky-live-host" ref={this.host}>
        {this.props.children}
        <div aria-hidden="true" className="sky-live-ghosts" ref={this.ghosts} />
      </div>
    );
  }
}

/**
 * The print preview: the exact SVG at rest; a canvas sketch of the disc at
 * frame rate while the time slider is scrubbed (and until the exact render
 * catches up); crossfades for other changes. Reduced motion: instant swaps
 * and no sketch.
 */
export function SkyLivePreview({
  scene,
  sceneKey,
  live,
  scrubbing,
  catalog,
  size,
  theme,
  plateUrl,
  reducedMotion,
}: {
  scene: SkyScene;
  sceneKey: string;
  live: {params: SkyParams; key: string} | null;
  scrubbing: boolean;
  catalog: SkyCatalog | null;
  size: SkySizeKey;
  theme: SkyTheme;
  plateUrl: string | null;
  reducedMotion: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const plateRef = useRef<SketchPlate | null>(null);
  const [sketchOn, setSketchOn] = useState(false);
  const sketching =
    !reducedMotion &&
    catalog !== null &&
    live !== null &&
    (scrubbing || (sketchOn && live.key !== sceneKey));

  useEffect(() => {
    plateRef.current = null;
    if (!plateUrl) return;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      plateRef.current = image;
    };
    image.src = plateUrl;
    return () => {
      image.onload = null;
    };
  }, [plateUrl]);

  // One draw per frame at most: a newer slider value cancels the pending one.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!sketching || !canvas || !catalog || !live) return;
    const frame = window.requestAnimationFrame(() => {
      const context = canvas.getContext('2d');
      if (!context) return;
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      const width = Math.max(1, Math.round(box.width * ratio));
      const height = Math.max(1, Math.round(box.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const liveScene = computeSky({params: live.params, size, catalog});
      drawSkySketch(context, liveScene, theme, {
        plate: plateRef.current,
        pixelScale: width / liveScene.width,
      });
      setSketchOn(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [catalog, live, size, sketching, theme]);

  // Once the exact render has caught up, fade the sketch out.
  useEffect(() => {
    if (sketching || !sketchOn) return;
    const timeout = window.setTimeout(() => setSketchOn(false), SKY_CROSSFADE_MS);
    return () => window.clearTimeout(timeout);
  }, [sketchOn, sketching]);

  return (
    <div className="sky-live">
      <SkyCrossfade disabled={reducedMotion || sketchOn} scene={scene} theme={theme}>
        <SkySvg className="sky-preview-svg" plateUrl={plateUrl} scene={scene} theme={theme} />
      </SkyCrossfade>
      <canvas
        aria-hidden="true"
        className={`sky-live-sketch${sketching && sketchOn ? ' is-visible' : ''}`}
        ref={canvasRef}
      />
    </div>
  );
}
```

- [ ] **Step 2: Live preview CSS**

Append after the slider CSS in `app/styles/app.css`:

```css
/* Living preview: a fading copy of the previous SVG over the new one, and a
   canvas sketch of the disc while the time slider moves. */
.sky-live,
.sky-live-host {
  position: relative;
}

.sky-live-ghosts {
  inset: 0;
  pointer-events: none;
  position: absolute;
}

.sky-live-ghosts svg {
  display: block;
  height: 100%;
  inset: 0;
  position: absolute;
  transition: opacity 250ms ease;
  width: 100%;
}

.sky-live-ghosts svg.is-leaving {
  opacity: 0;
}

.sky-live-sketch {
  height: 100%;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  position: absolute;
  transition: opacity 250ms ease;
  width: 100%;
}

.sky-live-sketch.is-visible {
  opacity: 1;
  transition: none;
}
```

(The global `prefers-reduced-motion` rule already shortens these transitions to nothing; the component also skips the ghost and the sketch.)

- [ ] **Step 3: Lint and commit**

Run: `npx eslint app/components/SkyLivePreview.tsx`
Expected: clean.

```bash
git add app/components/SkyLivePreview.tsx app/styles/app.css
git commit -m "Your Sky living preview: crossfades and a canvas sketch while scrubbing"
```

---

### Task 11: Wire the designer

**Files:**
- Modify: `app/components/SkyConfigurator.tsx`
- Modify: `app/styles/app.css`
- Test: `scripts/skyConfigurator.node-test.mjs`

- [ ] **Step 1: Extend the source-token test**

In `scripts/skyConfigurator.node-test.mjs`, add to the token list of `'configurator exposes accessible recovery and all existing styles'`:

```js
    'SKY_LAYOUT_IDS',
    'SKY_DETAIL_IDS',
    'role="switch"',
    'SkyTimeSlider',
    'SkyLivePreview',
    'swatch-',
```

and to `'Your Sky uses one responsive grid with theme and frame treatments'`:

```js
    '.sky-layout-options',
    '.sky-switch',
    '.sky-time-track',
    '.sky-live-sketch',
```

Run: `node --test scripts/skyConfigurator.node-test.mjs` → FAIL on the new tokens.

- [ ] **Step 2: State, draft, share, reset**

In `SkyConfigurator.tsx`:

1. Imports: add `useCallback`; from params add `parseSkyDetails`, `SKY_DETAIL_IDS`, `SKY_DETAIL_LABELS`, `SKY_LAYOUT_IDS`, `SKY_LAYOUT_LABELS`, `type SkyDetail`, `type SkyLayoutId`; add `import {createSkySceneMemo} from '~/lib/sky/sceneMemo';`, `import {minutesToTime, timeToMinutes} from '~/lib/sky/timeSlider';`, `import {skyTimeline} from '~/lib/sky/twilight';`, `import {useReducedMotion} from '~/lib/useReducedMotion';`, `import {SkyLivePreview} from '~/components/SkyLivePreview';`, `import {SkyTimeSlider} from '~/components/SkyTimeSlider';`. Remove the now-unused `computeSky` import only if nothing else uses it.
2. Add a constant under `EXAMPLE_PLACE`:

```ts
const DETAIL_HINTS: Record<SkyDetail, string> = {
  names: 'Latin names of the constellations above the horizon',
  grid: 'Altitude rings and compass spokes',
  time: 'Adds the hour to the line under the title',
};
```

3. State after `theme`: `const [layout, setLayout] = useState<SkyLayoutId>('classic');`, `const [details, setDetails] = useState<SkyDetail[]>([]);`, `const [scrubbing, setScrubbing] = useState(false);`, `const reducedMotion = useReducedMotion();`, `const [sceneMemo] = useState(createSkySceneMemo);`.
4. Share restore: after `setTheme(shared.theme);` add `setLayout(shared.layout); setDetails(shared.details);`. Draft restore: after `setTheme(restoredDraft.theme);` add `setLayout(restoredDraft.layout); setDetails(restoredDraft.details);`.
5. Draft write effect: the "empty" condition gains `&& layout === 'classic' && details.length === 0`; `serializeSkyDraft({place, date, time, title, theme, layout, details})`; add `layout, details` to the dependency list.
6. `resetConfigurator`: add `setLayout('classic'); setDetails([]);` after `setTheme(initialTheme);`.
7. `previewInput` and `purchasable`: add `layout,` and `details,` to both objects and their dependency lists.
8. `rendered`: replace `computeSky({params: previewValidation.params, size, catalog})` with `sceneMemo({params: previewValidation.params, size, catalog})` and add `sceneMemo` to the deps.
9. After `rendered`, add:

```ts
  // The undebounced current sky, for the sketch while the slider moves.
  const live = useMemo(() => {
    const validation = validateSkyParams(previewInput);
    return validation.ok
      ? {params: validation.params, key: createSkyRenderKey(validation.params, size)}
      : null;
  }, [previewInput, size]);
  const timeline = useMemo(() => {
    try {
      return skyTimeline({
        date: previewInput.date,
        lat: previewInput.lat,
        lon: previewInput.lon,
        tz: previewInput.tz,
      });
    } catch {
      return null;
    }
  }, [previewInput.date, previewInput.lat, previewInput.lon, previewInput.tz]);
  const onSlide = useCallback((minutes: number) => setTime(minutesToTime(minutes)), []);
  function toggleDetail(id: SkyDetail, on: boolean) {
    setDetails((current) =>
      parseSkyDetails(on ? [...current, id] : current.filter((d) => d !== id)) ?? [],
    );
    setTouched(true);
  }
```

- [ ] **Step 3: Preview: living preview + slider**

In the print-view branch replace the `<SkySvg className="sky-preview-svg" …/>` inside `.sky-preview-frame` with:

```tsx
              <SkyLivePreview
                catalog={catalog}
                live={live}
                plateUrl={platePath(theme, 'preview')}
                reducedMotion={reducedMotion}
                scene={rendered.scene}
                sceneKey={rendered.key}
                scrubbing={scrubbing}
                size={size}
                theme={SKY_THEMES[theme]}
              />
```

Directly before `{rendered.kind === 'ready' ? (<div className="sky-preview-footer">…`, insert (always rendered, so the preview's height doesn't jump when the catalogue arrives):

```tsx
        <SkyTimeSlider
          minutes={timeToMinutes(time) ?? timeToMinutes(SKY_DEFAULT_TIME) ?? 1320}
          onChange={onSlide}
          onScrub={setScrubbing}
          timeline={timeline}
        />
```

- [ ] **Step 4: Step 2 — colour, layout, details**

Replace the whole `<fieldset … className="sky-theme-picker">…</fieldset>` with:

```tsx
      <fieldset
        aria-label="Choose the style, layout and details"
        className="sky-theme-picker"
      >
        <legend>
          <span>2</span> Style
        </legend>
        <p className="sky-option-label" id="sky-colour-label">Colour</p>
        <div aria-labelledby="sky-colour-label" className="sky-theme-options" role="group">
          {SKY_THEME_IDS.map((id) => (
            <button
              aria-pressed={theme === id}
              className={theme === id ? 'is-selected' : ''}
              key={id}
              onClick={() => {
                setTheme(id);
                setTouched(true);
              }}
              type="button"
            >
              <img
                alt=""
                aria-hidden="true"
                height={400}
                loading="lazy"
                src={`/images/your-sky/swatch-${layout}-${id}.webp`}
                width={320}
              />
              <span>{SKY_THEME_LABELS[id]}</span>
            </button>
          ))}
        </div>
        <p className="sky-option-label" id="sky-layout-label">Layout</p>
        <div
          aria-labelledby="sky-layout-label"
          className="sky-theme-options sky-layout-options"
          role="group"
        >
          {SKY_LAYOUT_IDS.map((id) => (
            <button
              aria-pressed={layout === id}
              className={layout === id ? 'is-selected' : ''}
              key={id}
              onClick={() => {
                setLayout(id);
                setTouched(true);
              }}
              type="button"
            >
              <img
                alt=""
                aria-hidden="true"
                height={400}
                loading="lazy"
                src={`/images/your-sky/swatch-${id}-${theme}.webp`}
                width={320}
              />
              <span>{SKY_LAYOUT_LABELS[id]}</span>
            </button>
          ))}
        </div>
        <p className="sky-option-label" id="sky-details-label">Details</p>
        <div aria-labelledby="sky-details-label" className="sky-detail-switches" role="group">
          {SKY_DETAIL_IDS.map((id) => (
            <label className="sky-switch" key={id}>
              <input
                checked={details.includes(id)}
                onChange={(event) => toggleDetail(id, event.target.checked)}
                role="switch"
                type="checkbox"
              />
              <span aria-hidden="true" className="sky-switch-track" />
              <span className="sky-switch-text">
                <strong>{SKY_DETAIL_LABELS[id]}</strong>
                <small>{DETAIL_HINTS[id]}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
```

- [ ] **Step 5: Step 2 CSS (and the swatch crop fix)**

In `app/styles/app.css`:

1. In the existing `.sky-theme-options img` rule add `height: auto;` (the `height={400}` attribute otherwise wins over `aspect-ratio`: live today the swatches render 118 × 400 px and the title is cropped).
2. Append after `.sky-theme-options span { … }`:

```css
.sky-option-label {
  color: var(--color-muted);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  margin: 1.1rem 0 0.55rem;
  text-transform: uppercase;
}

.sky-theme-picker legend + .sky-option-label {
  margin-top: 0;
}

.sky-layout-options {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.sky-detail-switches {
  display: grid;
  gap: 0.35rem;
}

.sky-switch {
  align-items: center;
  cursor: pointer;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: auto minmax(0, 1fr);
  min-height: 44px;
  position: relative;
}

.sky-switch input {
  height: 1px;
  margin: 0;
  opacity: 0;
  position: absolute;
  width: 1px;
}

.sky-switch-track {
  background: rgba(38, 35, 31, 0.2);
  border-radius: 999px;
  height: 20px;
  position: relative;
  transition: background 160ms ease;
  width: 36px;
}

.sky-switch-track::after {
  background: var(--color-paper);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(24, 21, 18, 0.3);
  content: '';
  height: 16px;
  left: 2px;
  position: absolute;
  top: 2px;
  transition: transform 160ms ease;
  width: 16px;
}

.sky-switch input:checked + .sky-switch-track {
  background: var(--color-ink);
}

.sky-switch input:checked + .sky-switch-track::after {
  transform: translateX(16px);
}

.sky-switch input:focus-visible + .sky-switch-track {
  outline: 2px solid var(--color-ink);
  outline-offset: 2px;
}

.sky-switch-text strong {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
}

.sky-switch-text small {
  color: var(--color-muted);
  display: block;
  font-size: 0.72rem;
  line-height: 1.35;
}
```

3. In the `@media (max-width: 767px)` block, after `.sky-theme-options span { font-size: 0.66rem; }` add:

```css
  .sky-layout-options {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.4rem;
  }
```

- [ ] **Step 6: Tests, typecheck, lint**

Run: `npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"; npm run typecheck 2>&1 | tail -3; npm run lint 2>&1 | tail -3`
Expected: `ℹ fail 0`; typecheck clean (Task 4's error is gone); lint clean.

- [ ] **Step 7: Commit**

```bash
git add app/components/SkyConfigurator.tsx app/styles/app.css scripts/skyConfigurator.node-test.mjs
git commit -m "Your Sky designer: layout, details, time slider and living preview"
```

---

### Task 12: Review rows

**Files:**
- Modify: `app/components/SkyStudio.tsx`

- [ ] **Step 1: Show Layout and Details in step 4**

Import `SKY_DETAIL_LABELS` and `SKY_LAYOUT_LABELS` from `~/lib/sky/params` next to `SKY_THEME_LABELS`. In the `<dl>` of `.sky-review`, directly after the Style row:

```tsx
                <div>
                  <dt>Layout</dt>
                  <dd>{SKY_LAYOUT_LABELS[skyParams.layout]}</dd>
                </div>
                {skyParams.details.length ? (
                  <div>
                    <dt>Details</dt>
                    <dd>
                      {skyParams.details.map((d) => SKY_DETAIL_LABELS[d]).join(' · ')}
                    </dd>
                  </div>
                ) : null}
```

- [ ] **Step 2: Typecheck, lint, commit**

Run: `npm run typecheck 2>&1 | tail -3; npx eslint app/components/SkyStudio.tsx`
Expected: clean.

```bash
git add app/components/SkyStudio.tsx
git commit -m "Your Sky review shows layout and details"
```

---

### Task 13: Browser verification, docs, PR, verify, release

- [ ] **Step 1: Start the dev server**

Browser pane `preview_start {name: "hydrogen-wt-ls"}`; open `/your-sky`. The pane may be hidden: use `read_page`/`javascript_tool` for checks; screenshots come from the owner's Chrome after deploy.

- [ ] **Step 2: Functional checks (record each result)**

1. Pick Lisbon (`#sky-place` → type "Lisbon" → mousedown on the first `#sky-place-results [role=option]`), date 2023-03-02. Preview says "Ready to print".
2. Layout: click each of the four layout buttons; the preview changes (`svg circle` count or ring ticks for Compass) and after ~400 ms there is exactly one `svg` under `.sky-live-host` and none under `.sky-live-ghosts`.
3. Details: toggle each switch; Names adds `<text>` labels in the disc, Grid adds grid circles, Time adds `· 22:00 ·` to the subtitle text.
4. Slider: set `#sky-time-slider` value via the native setter + `input` event to 1380 → Time field shows `23:00`; `aria-valuetext` starts `23:00, `. The caption reads about `Sunrise 07:08 · sunset 18:30 · dark from 19:28` for Lisbon 2023-03-02 (±1 min: the place search's Lisbon coordinates differ slightly from the planning run's).
5. Keyboard: focus the slider, press PageUp → +60 min; ArrowRight → +5 min.
6. Sketch: dispatch `pointerdown` on the slider, then 30 value changes one per animation frame; during them `.sky-live-sketch.is-visible` exists; after `pointerup` and 600 ms it doesn't, and the SVG subtitle/scene matches the last time.
7. Crossfade: switch colour; within 100 ms `.sky-live-ghosts svg.is-leaving` exists; after 400 ms none.
8. Reduced motion: `resize_window {colorScheme…}` can't emulate reduced motion; instead verify in code review + `matchMedia` override: `window.matchMedia = (q) => ({matches: q.includes('reduce'), addEventListener(){}, removeEventListener(){}})` BEFORE hydration is not possible on a live page, so check it in the owner's Chrome with DevTools rendering emulation during the live check, or accept the code-level check (state it).
9. Draft: reload the page; layout, details and time are restored. Copy link → open it in a new tab → same layout/details.
10. Add to cart with Compass + Names + Time: the drawer line shows "Linen · Compass · …" and the Details attribute; then remove the line.
11. Title typing: type 20 characters into the title; no `.sky-live-ghosts svg` appears (no crossfade for text).
12. Phone width (`resize_window` preset mobile, reload): slider usable, four layout swatches fit, switches ≥ 44 px tall, the fixed preview strip still appears when scrolling past the preview. Reset with preset desktop afterwards.

- [ ] **Step 3: Performance check**

In the page, with a PerformanceObserver for `longtask`, drive 60 slider changes one per rAF while `pointerdown` is active. Expected: median frame interval ≤ 34 ms on this machine and no long task > 100 ms during the scrub (the exact render after release may take one long task). Record the numbers.

- [ ] **Step 4: Docs**

1. `docs/your-sky-release.md`: add a "Designer (2026-09-24)" section: layout/details controls, time slider (twilight limits, "dark" = −12°), living preview behaviour, reduced motion, swatch files and how to regenerate them (`node scripts/generate-your-sky-images.mjs`, keep only swatch changes), and the SVG fingerprint guard (`node scripts/sky-svg-fingerprint.mjs` before/after any svg.tsx refactor).
2. `docs/llm-wiki/log.md`: append a dated entry "2026-09-24 - Your Sky designer: layouts, details, time slider, living preview" with sources (`app/components/SkyConfigurator.tsx`, `SkyLivePreview.tsx`, `SkyTimeSlider.tsx`, `app/lib/sky/{twilight,timeSlider,sceneMemo,sketch}.ts`, tests).

```bash
git add docs/your-sky-release.md docs/llm-wiki/log.md
git commit -m "Docs: Your Sky designer release notes"
```

- [ ] **Step 5: Full checks and PR**

Run: `npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"; npm run typecheck 2>&1 | tail -2; npm run lint 2>&1 | tail -2; npm run build 2>&1 | tail -5`
Expected: all green.

```bash
git push -u origin fable/sky-designer
gh pr create --base main --title "Your Sky designer: layouts, details, time slider, living preview" --body-file <body file>
```

Body: summary, spec link, interpretations (the three at the top of this plan), test counts, perf numbers, "owner merges", and the line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 6: Adversarial verify (one round)**

Use the adversarial-verify skill: task = spec §5 + §2 item 4 + this plan's interpretations; deliverables = the PR, branch, worktree, launch entry `hydrogen-wt-ls`. Fix every defect, self-check each fix, report.

- [ ] **Step 7: Owner merges; live check with screenshots**

After the owner merges and Oxygen deploys: in the owner's Chrome on shopclaramendes.com/your-sky — screenshots of step 2 (colour/layout/details), the slider with its caption, a Compass + details preview, the cart line showing Layout and Details (then remove it). Update memory.
