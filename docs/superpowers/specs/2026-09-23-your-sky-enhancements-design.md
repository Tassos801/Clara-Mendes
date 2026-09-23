# Your Sky — richer sky, layouts, living preview: design

Date: 2026-09-23 · Status: approved by owner in conversation (all five
sections) · Branch: `fable/your-sky-enhancements`

## 1. Goal and decisions

Owner ask: "enhance and make Your Sky more beautiful and add more features".
Scope chosen by the owner: **the print itself** and **the designer & page**.
Not in scope: new colour styles, dual sky, room-mockup gallery, map
explorer, gifting extras, First Light (stays unreleased and unchanged).

| Decision | Choice |
| --- | --- |
| Print look | Richer sky for every print and every style (§3) |
| New options | Layouts Classic / Compass / Full sky / Minimal; toggles constellation names, grid, time on print |
| Pricing | Unchanged — all options included, same six variants |
| Designer | Time-of-night slider + living preview (§5) |
| Page | Live hero sky + "One sky, four ways" showcase + refreshed imagery (§6) |
| Architecture | **A**: extend both existing renderers (SVG preview, pdf-lib vector print) from one scene; no raster print, no blur filters |

Why A: the print PDF renders on Oxygen when Prodigi fetches it. Oxygen has
no sharp/native imaging, and the Milky Way and glows depend on date, time
and place, so they cannot be pre-rendered. Vector layers keep screen and
print identical and the 20×24 sharp. Soft effects come from stacked low
opacity shapes, not filters.

## 2. Definition of done

1. Every new print (all three styles, both sizes, all finishes) shows the
   richer sky of §3. Screen preview and print PDF match layer for layer.
2. Customers can choose a layout and the three toggles in step 2 of the
   designer; the choice reaches the cart, the order, the Prodigi order and
   the printed PDF, and is covered by the existing signature.
3. v1 lines, share links and print tokens still decode and render
   (Classic, toggles off). No price or variant changes.
4. The time slider and living preview of §5 work on desktop and phone,
   keyboard-accessible, reduced-motion respected.
5. `/your-sky` has the live hero and the showcase of §6; imagery and the
   Shopify product images are regenerated; FAQ corrected and extended.
6. Tests of §8 pass; `npm test`, `npm run typecheck`, `npm run lint`,
   build green. Owner approved the rendered layout × style sheet before
   PR 1 merges. Each PR adversarially verified and live-checked with
   screenshots in the owner's Chrome.

## 3. Richer sky (always on)

- **Star field:** same Yale BSC catalogue (8,404 stars, mag ≤ 6.5). Tone by
  magnitude instead of one flat ink: full ink for the brightest, stepping
  down to ~35% opacity and slightly smaller radii for mag 5.5–6.5.
- **Glows:** the ~25 brightest stars above the horizon get three faint
  concentric rings (replacing today's single 12% halo).
- **Milky Way:** d3-celestial `mw.json` (BSD-3), five brightness contours
  stacked at 3–4% opacity each in a per-style `milkyWay` tint (warm grey on
  Linen, pale cream on Midnight Garden, stone on Quiet Form), projected with
  the stars and clipped to the map circle.
- **Constellation lines:** finer, ~45% opacity; segments crossing the
  horizon are clipped at the circle instead of dropped.
- **Planets:** small ring around a dot in the style's planet colour, so they
  read as planets.
- **Moon:** larger; real phase with the lit part in paper tone and a hairline
  edge, the shadow part as faint ink, plus a soft glow.
- **Horizon ring:** fine double ring.

New theme tokens in `themes.ts`: `milkyWay`, `glow`, `moonLit`, `moonShadow`,
`grid`, `label`. Plates unchanged.

## 4. Layouts and toggles

**Params (`params.ts`)**, format `v` → 2, appended to the signed canonical:
`layout` ∈ `classic | compass | full | minimal` (default `classic`),
`details` — a signed list of `names`, `grid`, `time` in canonical order
(default empty). v1 inputs decode with the defaults. Cart attributes:
visible `Layout` (e.g. "Compass") and `Details` (e.g. "Constellation names ·
Time", omitted when none), hidden `_layout`, `_details`. Carried through
every hop: `canonicalSkyParams` /
`parseCanonicalSkyParams`, `toCartAttributes` / `fromCartAttributes`,
`cart.tsx` → `cartLines.server.ts`, `webhooks.orders-paid` →
`fulfilment.ts`, `sign.server.ts` token, `api.sky-print.$token[.pdf].tsx`,
share links and drafts in `configuratorState.ts`.

**Layouts (`app/lib/sky/layouts.ts`, single source of geometry):**

| Layout | Map | Text |
| --- | --- | --- |
| Classic | today's disc (centre 40% H, r = min(0.4W, 0.32H)) | today's title / details / credit |
| Compass | ~10% smaller disc inside an outer ring: ticks every 2°, long ticks every 10°, numerals every 30°, large N/E/S/W | as Classic |
| Full sky | ~15% larger disc filling most of the sheet | slim bottom band, smaller title |
| Minimal | smaller disc, generous margins | quieter, smaller title |

`fit.ts` rules apply per layout; a 40-character title must fit in every
layout at both sizes.

**Toggles:**
- *Constellation names:* IAU Latin names (d3-celestial `constellations.json`
  label points, BSD-3) in small tracked capitals; only above the horizon;
  greedy collision check against other labels and the Moon, skip on clash.
- *Grid:* hairline altitude circles at 30° and 60°, azimuth spokes every
  30°, in the `grid` tint behind the stars.
- *Time:* details line gains local 24-hour time:
  `PARIS, FRANCE · 14 JUNE 2019 · 22:00 · 48.8566° N, 2.3522° E`.

## 5. Designer: time slider and living preview

- **Slider** under the map: 00:00–23:55, 5-minute steps, bound to the same
  `time` param as the Time field. Track shaded for the chosen date and place
  from the Sun's altitude (night / civil–astronomical twilight / day,
  sampled every 15 min with astronomy-engine); ticks at sunset and sunrise;
  caption "Dark from 21:48". Arrows ±5 min, PageUp/Down ±1 h,
  `aria-valuetext` "22:00, night". Daytime choice shows the existing
  "stars as they stood above the horizon" note.
- **Living preview:** while dragging, `sketch.ts` draws a canvas sketch at
  frame rate from the same positions (one catalogue rotation per frame).
  On release or 150 ms idle the exact SVG renders and crossfades in
  (~250 ms). All edits crossfade. At rest the preview is always the exact
  SVG. Layers are memoised separately (Milky Way, grid, lines, stars,
  labels, text) so text edits don't redraw stars.
- `prefers-reduced-motion`: instant swaps, no sketch animation.
- Step 2 "Style" gains **Layout** (four generated thumbnails) and
  **Details** (three switches) in the shared configurator. The product
  page's duplicated sky review UI (`products.$handle.tsx`) is unreachable
  for Your Sky (301 to `/your-sky`) and stays unchanged; the cart drawer
  and order show the new visible attributes.

## 6. Page

- **Live hero:** canvas behind the headline showing tonight's real sky over
  Paris for the current moment (Milky Way, faint lines, ~1,500 brightest
  stars, subtle twinkle on a few), turning slowly; caption "Tonight's sky
  over Paris, right now". Framed example print stays in front (desktop);
  on phones the sky sits behind the headline. Server-rendered dark gradient
  first (no layout shift, headline stays the LCP element); canvas starts
  after hydration, pauses off-screen or when hidden, one still frame for
  reduced motion, DPR capped at 2. Homepage teaser keeps its static image.
- **"One sky, four ways":** four cards (same example sky in each layout)
  with "Try this layout" → sets the layout in the designer and scrolls there
  (same event pattern as occasion presets), plus a before/after pair
  (plain vs names + grid + time).
- **Imagery:** regenerate hero print, occasion cards, style swatches and the
  new layout thumbnails/showcase via `scripts/generate-your-sky-images.mjs`
  (deterministic, committed). Occasion variety: met = Classic Linen,
  born = Minimal Quiet Form, yes = Compass Midnight Garden. Replace the
  Your Sky Shopify product images with regenerated ones (upload new, verify
  READY and order, then delete old — backups kept).
- **Copy (`featurePages.ts`):** FAQ "Hipparcos" → Yale Bright Star
  Catalogue; add FAQ entries on layouts, details and the time slider.

## 7. Architecture

- `scripts/build-sky-data.mjs` adds `mw.json` (simplified, target ≤ 150 KB)
  and constellation names/label points; notices kept.
- `computeSky` returns named layers: `milkyWay`, `grid`, `lines`, `stars`,
  `glows`, `planets`, `moon`, `labels`, `ring` (plain or compass), `text`.
  Clipping to the disc is a clip path in both renderers.
- `svg.tsx` and `pdf.server.ts` render every layer (pdf-lib opacity via
  graphics state). `sketch.ts` (browser only) renders the canvas sketch.
- Errors: a data layer that fails to load is skipped, never fatal; labels
  that don't fit are dropped; `fontCoverage.ts` still guards titles.
- Budgets: SVG ≤ ~6,000 nodes; print route ≤ 2 s for 20×24 with all
  toggles on (measured on an Oxygen preview); hero canvas ≤ 4 ms/frame.

## 8. Testing and verification

- Node tests: v2 round-trip and v1 compatibility; new fields survive
  signing, webhook and Prodigi order build; scene layers (Milky Way clipped,
  glow count, label collisions, grid); 40-character title fits every layout
  at both sizes; PDF for every layout × style deterministic with correct
  geometry; twilight shading; showcase preset event.
- Visual sheet: every layout × style rendered to PNG at both sizes → owner
  approval before PR 1 merges.
- Print path on an Oxygen preview: fetch the print route for every layout ×
  size; check 200, size and render time.

## 9. Rollout

Three PRs to `main` (never stacked on each other's branches), each
adversarially verified, then live-checked with screenshots:

1. **Engine** — data, richer sky, layouts, toggles, params v2 end to end.
   Safe alone: defaults render Classic with toggles off.
2. **Designer** — Layout and Details controls, time slider, living preview.
3. **Page** — live hero, showcase, imagery, FAQ, Shopify product images.

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
  rather than three booleans: canonical `details=names,grid` or
  `details=none`.
- **Page images** are regenerated in PR 1 (the generator uses the real
  renderer), so `/your-sky` never shows the old look beside the new
  preview; PR 3 adds layout variety.
