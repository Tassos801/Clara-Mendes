# Introducing Clara Mendes — Brand Film Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the silent 45-second "Introducing Clara Mendes" launch film from the storefront's own mockups, host it on Shopify Files, and embed it on `/our-story`.

**Architecture:** A self-contained Remotion package in `video/` reads the storefront's `public/` folder directly (mockups and EB Garamond) and renders one 1920 × 1080, 24 fps composition whose beats are typed data in `script.ts`. A root-level script stages the MP4 and poster into Shopify Files; the storefront only learns two CDN URLs (`app/lib/brandFilm.ts`) and renders a muted, looping `<video>` section on Our Story that respects reduced motion.

**Tech Stack:** Remotion 4.0.520 (`remotion`, `@remotion/cli`, `@remotion/fonts`), React 18, TypeScript 5.9, Node 24 (`node --test` with native type stripping), mediabunny 1.55 for render checks, Shopify Admin GraphQL (`stagedUploadsCreate`, `fileCreate`) via the existing `scripts/lib/admin.mjs`, Hydrogen storefront (`app/routes/our-story.tsx`).

Spec: `docs/superpowers/specs/2026-09-02-brand-film-design.md`. Work in the
`clara-wt-film` worktree on branch `fable/brand-film` (already created from
`origin/main`). All paths below are relative to that worktree root unless
noted. Commands prefixed `video$` run inside `video/`; others run at the root.

---

## File map

| Path | Responsibility |
|------|----------------|
| `video/package.json`, `video/package-lock.json` | Isolated Remotion package; own dependencies and scripts. |
| `video/tsconfig.json` | Standalone TypeScript config for the film. |
| `video/remotion.config.ts` | Points Remotion's public dir at `../public`; JPEG frames; overwrite output. |
| `video/src/index.ts` | `registerRoot`. |
| `video/src/Root.tsx` | The one `Composition`: `IntroducingClaraMendes`. |
| `video/src/film/script.ts` | The beat sheet as typed data, constants (FPS, size, palette), timing helpers. |
| `video/src/film/script.test.mts` | Duration, contiguity, asset-existence and caption-length invariants. |
| `video/src/film/timing.ts` + `timing.test.mts` | Pure fade math (no Remotion import) so it is testable in Node. |
| `video/src/film/motion.ts` | Remotion easing helper (`eased`). |
| `video/src/film/fonts.ts` | Loads EB Garamond Regular and Italic from the storefront's `public/fonts`. |
| `video/src/film/Noise.tsx` | Static SVG grain overlay. |
| `video/src/film/Scene.tsx` | `PictureLayer` (cropped, focal-pointed, push/drift image) and `Scene` (one or two pictures with an in-beat crossfade). |
| `video/src/film/Caption.tsx` | Bottom-centre caption on the ink glass band. |
| `video/src/film/LowerThird.tsx` | Capsule name + palette line, bottom-left. |
| `video/src/film/Trio.tsx` | Three prints settling onto paper. |
| `video/src/film/Cuts.tsx` | Hard cuts between pictures inside one beat (the three sizes). |
| `video/src/film/EndCard.tsx` | Backdrop, ink wash, italic wordmark, URL. |
| `video/src/film/Film.tsx` | Lays the beats out with `<Sequence>`; waits for fonts. |
| `video/scripts/check-render.mjs` | Reads the rendered MP4 back with mediabunny and asserts duration, size, fps, no audio. |
| `video/README.md` | Commands and licence note. |
| `scripts/upload-brand-film.mjs` | Stages MP4 + poster into Shopify Files, polls until READY, prints CDN URLs. |
| `app/lib/brandFilm.ts` | The two CDN URLs and film metadata; `brandFilmIsLive()`. |
| `app/components/BrandFilm.tsx` | The Our Story film section (`<video>` + reduced-motion handling). |
| `app/routes/our-story.tsx` | Mounts `<BrandFilm />` between the hero and `#os-collection`; adds `.os-film*` CSS. |
| `eslint.config.js`, `.gitignore` | Ignore `video/` for the Hydrogen lint config; ignore `video/out/`. |
| `docs/brand-film.md` | Owner-facing: YouTube title/description, beat sheet, re-render/re-upload steps. |
| `docs/llm-wiki/modules/brand-film.md`, `docs/llm-wiki/index.md`, `docs/llm-wiki/log.md` | Wiki page, index entry, dated log entry. |

---

### Task 1: Scaffold the `video/` package

**Files:**
- Create: `video/package.json`
- Create: `video/tsconfig.json`
- Create: `video/remotion.config.ts`
- Create: `video/src/index.ts`
- Create: `video/src/Root.tsx`
- Create: `video/src/film/Film.tsx` (paper placeholder; replaced in Task 8)
- Modify: `.gitignore`
- Modify: `eslint.config.js:26-36`

- [ ] **Step 1: Write `video/package.json`**

```json
{
  "name": "clara-mendes-film",
  "private": true,
  "version": "1.0.0",
  "description": "Introducing Clara Mendes — the silent 45-second brand film, rendered with Remotion from the storefront's own assets.",
  "scripts": {
    "studio": "remotion studio",
    "compositions": "remotion compositions",
    "still": "remotion still IntroducingClaraMendes",
    "poster": "remotion still IntroducingClaraMendes out/introducing-clara-mendes-poster.jpg --frame=48",
    "render": "remotion render IntroducingClaraMendes out/introducing-clara-mendes.mp4 --codec=h264 --crf=20",
    "check": "node scripts/check-render.mjs out/introducing-clara-mendes.mp4",
    "test": "node --test src/film/*.test.mts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@remotion/cli": "4.0.520",
    "@remotion/fonts": "4.0.520",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "remotion": "4.0.520"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "@types/react": "^18.3.28",
    "@types/react-dom": "^18.3.7",
    "mediabunny": "^1.55.5",
    "typescript": "^5.9.2"
  }
}
```

- [ ] **Step 2: Write `video/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src", "remotion.config.ts"]
}
```

- [ ] **Step 3: Write `video/remotion.config.ts`**

```ts
import {Config} from '@remotion/cli/config';

// The film reads the storefront's own mockups and fonts; nothing is copied.
Config.setPublicDir('../public');
Config.setEntryPoint('./src/index.ts');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(90);
Config.setOverwriteOutput(true);
```

- [ ] **Step 4: Write `video/src/index.ts`, `video/src/Root.tsx` and the placeholder `video/src/film/Film.tsx`**

`video/src/index.ts`:

```ts
import {registerRoot} from 'remotion';
import {RemotionRoot} from './Root';

registerRoot(RemotionRoot);
```

`video/src/Root.tsx`:

```tsx
import {Composition} from 'remotion';
import {Film} from './film/Film';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="IntroducingClaraMendes"
      component={Film}
      durationInFrames={1080}
      fps={24}
      width={1920}
      height={1080}
    />
  );
};
```

`video/src/film/Film.tsx` (placeholder until Task 8):

```tsx
import {AbsoluteFill} from 'remotion';

export const Film: React.FC = () => {
  return <AbsoluteFill style={{backgroundColor: '#fbfaf6'}} />;
};
```

- [ ] **Step 5: Ignore the render output and keep the Hydrogen lint config off the film**

Append to `.gitignore` (after the `/output/` line):

```
/video/out/
```

In `eslint.config.js`, add one entry to the `ignores` array so it reads:

```js
    ignores: [
      '**/node_modules/',
      '**/build/',
      '**/dist/',
      '**/output/',
      '**/*.graphql.d.ts',
      '**/*.graphql.ts',
      '**/*.generated.d.ts',
      '**/.react-router/',
      '**/packages/hydrogen/dist/',
      'video/',
    ],
```

- [ ] **Step 6: Install and verify the composition registers**

Run: `video$ npm install`
Expected: completes with `added N packages`; `video/node_modules` and `video/package-lock.json` appear.

Run: `video$ npx remotion compositions`
Expected output contains:

```
IntroducingClaraMendes  1920x1080  24fps  1080 frames (45.00s)
```

(On first run Remotion downloads its headless Chrome; allow a minute.) A warning that the public folder is large is expected and harmless.

Run: `video$ npm run typecheck`
Expected: no output, exit 0.

Run (root): `npm run lint`
Expected: exit 0, no complaints about `video/`.

- [ ] **Step 7: Commit**

```bash
git add video/package.json video/package-lock.json video/tsconfig.json video/remotion.config.ts video/src .gitignore eslint.config.js
git commit -m "Scaffold the Remotion film package

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: The beat sheet as data (`script.ts`)

**Files:**
- Create: `video/src/film/script.ts`
- Test: `video/src/film/script.test.mts`

- [ ] **Step 1: Write the failing test**

`video/src/film/script.test.mts`:

```ts
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {test} from 'node:test';
import {
  BEATS,
  FPS,
  beatFrames,
  beatStarts,
  picturesOf,
  totalFrames,
} from './script.ts';

const PUBLIC = path.resolve(import.meta.dirname, '../../../public');

test('the film is exactly 45 seconds at 24 fps', () => {
  assert.equal(FPS, 24);
  assert.equal(totalFrames(BEATS), 1080);
});

test('there are thirteen beats with unique ids', () => {
  assert.equal(BEATS.length, 13);
  assert.equal(new Set(BEATS.map((beat) => beat.id)).size, 13);
});

test('beat starts are contiguous from frame 0', () => {
  const starts = beatStarts(BEATS);
  assert.equal(starts[0], 0);
  for (let index = 1; index < starts.length; index += 1) {
    assert.equal(starts[index], starts[index - 1] + beatFrames(BEATS[index - 1]));
  }
});

test('every picture exists in the storefront public folder', () => {
  for (const beat of BEATS) {
    for (const src of picturesOf(beat)) {
      assert.ok(existsSync(path.join(PUBLIC, src)), `${beat.id}: missing ${src}`);
    }
  }
});

test('captions fit two lines of the caption band', () => {
  for (const beat of BEATS) {
    if ('caption' in beat && beat.caption) {
      assert.ok(beat.caption.length <= 80, `${beat.id}: caption too long`);
    }
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `video$ npm test`
Expected: FAIL — `Cannot find module '.../script.ts'`.

- [ ] **Step 3: Write `video/src/film/script.ts`**

```ts
export const FPS = 24;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const PAPER = '#fbfaf6';
export const INK = '#26231f';
export const CLAY = '#9c6f5d';

/** Where the crop centres, as fractions of the image (CSS object-position). */
export type Focal = {x: number; y: number};

export type Motion =
  | {kind: 'push'; from: number; to: number}
  | {kind: 'drift'; scale: number; from: number; to: number};

export type Picture = {src: string; focal: Focal; motion: Motion};

export type LowerThird = {name: string; line: string};

export type Beat =
  | {
      kind: 'scene';
      id: string;
      seconds: number;
      picture: Picture;
      crossfadeTo?: Picture;
      caption?: string;
      lowerThird?: LowerThird;
    }
  | {kind: 'cuts'; id: string; seconds: number; pictures: Picture[]; caption: string}
  | {kind: 'trio'; id: string; seconds: number; prints: string[]; caption: string}
  | {
      kind: 'end';
      id: string;
      seconds: number;
      background: Picture;
      wordmark: string;
      url: string;
    };

const MOCKUPS = 'images/product-art-mockups';
const ART = 'images/product-art';
const EDITORIAL = 'images/home-editorial';
const BACKDROPS = 'images/backdrops';

const at = (x: number, y: number): Focal => ({x, y});
const push = (from: number, to: number): Motion => ({kind: 'push', from, to});
const drift = (scale: number, from: number, to: number): Motion => ({
  kind: 'drift',
  scale,
  from,
  to,
});
const picture = (src: string, focal: Focal, motion: Motion): Picture => ({
  src,
  focal,
  motion,
});

const print = (capsule: string, index: string): Picture =>
  picture(`${ART}/${capsule}/${capsule}-${index}.webp`, at(0.5, 0.5), push(1.0, 1.06));

export const BEATS: readonly Beat[] = [
  {
    kind: 'scene',
    id: 'open',
    seconds: 4.0,
    picture: picture(`${EDITORIAL}/quiet-form-living.jpg`, at(0.5, 0.36), push(1.04, 1.1)),
    caption: "Today we're opening Clara Mendes.",
  },
  {
    kind: 'scene',
    id: 'fifteen',
    seconds: 3.5,
    picture: picture(
      `${MOCKUPS}/quiet-form/quiet-form-01-room-detail-20x24.webp`,
      at(0.5, 0.45),
      drift(1.06, -30, 30),
    ),
    caption: 'Fifteen original works, in five capsules, made to live with.',
  },
  {
    kind: 'trio',
    id: 'trio-quiet-form',
    seconds: 3.5,
    prints: [
      `${ART}/quiet-form/quiet-form-01.webp`,
      `${ART}/quiet-form/quiet-form-02.webp`,
      `${ART}/quiet-form/quiet-form-03.webp`,
    ],
    caption: 'Each capsule holds three works composed together.',
  },
  {
    kind: 'scene',
    id: 'capsule-quiet-form',
    seconds: 3.0,
    picture: picture(
      `${MOCKUPS}/quiet-form/quiet-form-01-room-context-20x24.webp`,
      at(0.5, 0.42),
      push(1.02, 1.06),
    ),
    crossfadeTo: print('quiet-form', '01'),
    lowerThird: {name: 'Quiet Form', line: 'Sculptural arches, warm architectural balance'},
  },
  {
    kind: 'scene',
    id: 'capsule-patina-blue',
    seconds: 3.0,
    picture: picture(
      `${MOCKUPS}/patina-blue/patina-blue-01-room-context-20x24.webp`,
      at(0.5, 0.42),
      push(1.02, 1.06),
    ),
    crossfadeTo: print('patina-blue', '01'),
    lowerThird: {name: 'Patina Blue', line: 'Weathered indigo across a chalk-white field'},
  },
  {
    kind: 'scene',
    id: 'capsule-neo-deco',
    seconds: 3.0,
    picture: picture(
      `${MOCKUPS}/neo-deco/neo-deco-01-room-sofa-20x24.jpg`,
      at(0.5, 0.36),
      push(1.02, 1.06),
    ),
    crossfadeTo: print('neo-deco', '01'),
    lowerThird: {name: 'Neo Deco', line: 'The discipline of Deco, none of its gilt'},
  },
  {
    kind: 'scene',
    id: 'capsule-sunlit-mosaic',
    seconds: 3.0,
    picture: picture(
      `${MOCKUPS}/sunlit-mosaic/sunlit-mosaic-02-room-context-20x24.webp`,
      at(0.5, 0.42),
      push(1.02, 1.06),
    ),
    crossfadeTo: print('sunlit-mosaic', '02'),
    lowerThird: {name: 'Sunlit Mosaic', line: 'Torn paper, mineral colour, warm rhythm'},
  },
  {
    kind: 'scene',
    id: 'capsule-midnight-garden',
    seconds: 3.0,
    picture: picture(
      `${MOCKUPS}/midnight-garden/midnight-garden-01-room-detail-20x24.webp`,
      at(0.5, 0.45),
      push(1.02, 1.06),
    ),
    crossfadeTo: print('midnight-garden', '01'),
    lowerThird: {name: 'Midnight Garden', line: 'Botanicals after dark'},
  },
  {
    kind: 'cuts',
    id: 'sizes',
    seconds: 4.0,
    pictures: [
      picture(`${MOCKUPS}/quiet-form/quiet-form-01-room-sofa-8x10.jpg`, at(0.5, 0.4), push(1.0, 1.0)),
      picture(`${MOCKUPS}/quiet-form/quiet-form-01-room-sofa-16x20.jpg`, at(0.5, 0.4), push(1.0, 1.0)),
      picture(`${MOCKUPS}/quiet-form/quiet-form-01-room-sofa-20x24.jpg`, at(0.5, 0.4), push(1.0, 1.0)),
    ],
    caption: 'Three sizes. Printed when you order it.',
  },
  {
    kind: 'scene',
    id: 'paper',
    seconds: 3.5,
    picture: picture(`${EDITORIAL}/patina-blue-detail.jpg`, at(0.5, 0.45), push(1.02, 1.08)),
    caption: 'Giclée on 200 gsm enhanced matte paper.',
  },
  {
    kind: 'trio',
    id: 'trio-midnight-garden',
    seconds: 3.5,
    prints: [
      `${ART}/midnight-garden/midnight-garden-01.webp`,
      `${ART}/midnight-garden/midnight-garden-02.webp`,
      `${ART}/midnight-garden/midnight-garden-03.webp`,
    ],
    caption: 'Buy one now. Add its companions later.',
  },
  {
    kind: 'scene',
    id: 'open-today',
    seconds: 3.5,
    picture: picture(`${EDITORIAL}/quiet-form-living.jpg`, at(0.5, 0.36), push(1.08, 1.02)),
    caption: 'Clara Mendes is open today. Ships across the EU.',
  },
  {
    kind: 'end',
    id: 'end-card',
    seconds: 4.5,
    background: picture(`${BACKDROPS}/hero-interior.jpg`, at(0.5, 0.5), drift(1.08, 0, -40)),
    wordmark: 'Clara Mendes',
    url: 'shopclaramendes.com',
  },
];

export const framesFor = (seconds: number): number => Math.round(seconds * FPS);

export const beatFrames = (beat: Beat): number => framesFor(beat.seconds);

export const totalFrames = (beats: readonly Beat[]): number =>
  beats.reduce((sum, beat) => sum + beatFrames(beat), 0);

export const beatStarts = (beats: readonly Beat[]): number[] => {
  let from = 0;
  return beats.map((beat) => {
    const start = from;
    from += beatFrames(beat);
    return start;
  });
};

export const picturesOf = (beat: Beat): string[] => {
  switch (beat.kind) {
    case 'scene':
      return beat.crossfadeTo ? [beat.picture.src, beat.crossfadeTo.src] : [beat.picture.src];
    case 'cuts':
      return beat.pictures.map((item) => item.src);
    case 'trio':
      return beat.prints;
    case 'end':
      return [beat.background.src];
  }
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `video$ npm test`
Expected: `# pass 5`, `# fail 0`.

Run: `video$ npm run typecheck`
Expected: exit 0.

- [ ] **Step 5: Wire the real duration into `Root.tsx`**

Replace `video/src/Root.tsx` with:

```tsx
import {Composition} from 'remotion';
import {Film} from './film/Film';
import {BEATS, FPS, HEIGHT, WIDTH, totalFrames} from './film/script';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="IntroducingClaraMendes"
      component={Film}
      durationInFrames={totalFrames(BEATS)}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
```

Run: `video$ npx remotion compositions`
Expected: still `1080 frames (45.00s)`.

- [ ] **Step 6: Commit**

```bash
git add video/src/film/script.ts video/src/film/script.test.mts video/src/Root.tsx
git commit -m "Add the brand film beat sheet as typed data

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Timing, motion, fonts and grain

**Files:**
- Create: `video/src/film/timing.ts`
- Test: `video/src/film/timing.test.mts`
- Create: `video/src/film/motion.ts`
- Create: `video/src/film/fonts.ts`
- Create: `video/src/film/Noise.tsx`

- [ ] **Step 1: Write the failing test for the pure fade math**

`video/src/film/timing.test.mts`:

```ts
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fadeInOut} from './timing.ts';

test('fadeInOut ramps in, holds at 1, ramps out', () => {
  assert.equal(fadeInOut(0, 72, 6), 0);
  assert.equal(fadeInOut(3, 72, 6), 0.5);
  assert.equal(fadeInOut(6, 72, 6), 1);
  assert.equal(fadeInOut(36, 72, 6), 1);
  assert.equal(fadeInOut(69, 72, 6), 0.5);
  assert.equal(fadeInOut(72, 72, 6), 0);
});

test('fadeInOut never leaves [0, 1]', () => {
  assert.equal(fadeInOut(-10, 72, 6), 0);
  assert.equal(fadeInOut(500, 72, 6), 0);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `video$ npm test`
Expected: the timing test FAILS with `Cannot find module '.../timing.ts'`; the script tests still pass.

- [ ] **Step 3: Write `timing.ts`**

```ts
const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * Opacity for an element that fades in over `fade` frames at the start of a
 * span of `duration` frames and fades out over `fade` frames at its end.
 */
export const fadeInOut = (frame: number, duration: number, fade: number): number =>
  Math.min(clamp01(frame / fade), clamp01((duration - frame) / fade));
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `video$ npm test`
Expected: `# pass 7`, `# fail 0`.

- [ ] **Step 5: Write `motion.ts`, `fonts.ts` and `Noise.tsx`**

`video/src/film/motion.ts`:

```ts
import {Easing, interpolate} from 'remotion';

/** The site's "crisp entrance" curve — strong ease-out, no overshoot. */
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export const eased = (
  frame: number,
  fromFrame: number,
  toFrame: number,
  fromValue: number,
  toValue: number,
): number =>
  interpolate(frame, [fromFrame, toFrame], [fromValue, toValue], {
    easing: EASE,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
```

`video/src/film/fonts.ts`:

```ts
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

export const SERIF = 'EB Garamond';
export const SANS =
  "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

let loading: Promise<void> | null = null;

/** Loads the storefront's own EB Garamond files once per render process. */
export const loadFilmFonts = (): Promise<void> => {
  loading ??= Promise.all([
    loadFont({
      family: SERIF,
      url: staticFile('fonts/EBGaramond-Regular.ttf'),
      weight: '400',
      style: 'normal',
    }),
    loadFont({
      family: SERIF,
      url: staticFile('fonts/EBGaramond-Italic.ttf'),
      weight: '400',
      style: 'italic',
    }),
  ]).then(() => undefined);
  return loading;
};
```

`video/src/film/Noise.tsx`:

```tsx
import {AbsoluteFill} from 'remotion';

const NOISE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 1 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`;
const NOISE_URL = `data:image/svg+xml;utf8,${encodeURIComponent(NOISE_SVG)}`;

/** Static grain at 5 %, the film's version of the site's os-noise-overlay. */
export const Noise: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url("${NOISE_URL}")`,
        backgroundSize: '240px 240px',
        mixBlendMode: 'multiply',
        opacity: 0.05,
        pointerEvents: 'none',
      }}
    />
  );
};
```

- [ ] **Step 6: Typecheck and commit**

Run: `video$ npm run typecheck`
Expected: exit 0.

```bash
git add video/src/film/timing.ts video/src/film/timing.test.mts video/src/film/motion.ts video/src/film/fonts.ts video/src/film/Noise.tsx
git commit -m "Add film timing, easing, fonts and grain helpers

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: `Scene` — cropped pictures with push, drift and crossfade

**Files:**
- Create: `video/src/film/Scene.tsx`
- Modify: `video/src/film/Film.tsx` (temporary preview of beats 1 and 4; final version in Task 8)

- [ ] **Step 1: Write `Scene.tsx`**

```tsx
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {eased} from './motion';
import {PAPER, type Picture} from './script';

/** Frames the second picture takes to fade in over the first. */
export const CROSSFADE_FRAMES = 12;

type PictureLayerProps = {
  picture: Picture;
  /** Frame relative to the start of this picture's motion. */
  frame: number;
  /** Frames over which the motion runs. */
  duration: number;
  opacity?: number;
};

export const PictureLayer: React.FC<PictureLayerProps> = ({picture, frame, duration, opacity = 1}) => {
  const {motion, focal, src} = picture;
  const scale =
    motion.kind === 'push' ? eased(frame, 0, duration, motion.from, motion.to) : motion.scale;
  const shift = motion.kind === 'drift' ? eased(frame, 0, duration, motion.from, motion.to) : 0;
  const origin = `${focal.x * 100}% ${focal.y * 100}%`;

  return (
    <AbsoluteFill style={{opacity}}>
      <Img
        src={staticFile(src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: origin,
          transform: `translateX(${shift}px) scale(${scale})`,
          transformOrigin: origin,
        }}
      />
    </AbsoluteFill>
  );
};

type SceneProps = {
  picture: Picture;
  crossfadeTo?: Picture;
  durationInFrames: number;
};

/**
 * One picture for the whole beat, or a room that crossfades into the print
 * itself: room until `fadeStart`, a 12-frame fade, then the print holds for
 * the last 0.75 s.
 */
export const Scene: React.FC<SceneProps> = ({picture, crossfadeTo, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const holdAfter = Math.round(fps * 0.75);
  const fadeStart = durationInFrames - holdAfter - CROSSFADE_FRAMES;
  const secondOpacity = crossfadeTo
    ? interpolate(frame, [fadeStart, fadeStart + CROSSFADE_FRAMES], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  return (
    <AbsoluteFill style={{backgroundColor: PAPER}}>
      <PictureLayer picture={picture} frame={frame} duration={durationInFrames} />
      {crossfadeTo ? (
        <PictureLayer
          picture={crossfadeTo}
          frame={Math.max(0, frame - fadeStart)}
          duration={holdAfter + CROSSFADE_FRAMES}
          opacity={secondOpacity}
        />
      ) : null}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Preview two beats through the placeholder `Film.tsx`**

Replace `video/src/film/Film.tsx` with this temporary version (beats 1 and 4 only):

```tsx
import {AbsoluteFill, Sequence} from 'remotion';
import {Scene} from './Scene';
import {BEATS, PAPER, beatFrames} from './script';

const open = BEATS[0];
const capsule = BEATS[3];

export const Film: React.FC = () => {
  if (open.kind !== 'scene' || capsule.kind !== 'scene') {
    throw new Error('Preview expects scene beats at positions 0 and 3');
  }
  return (
    <AbsoluteFill style={{backgroundColor: PAPER}}>
      <Sequence from={0} durationInFrames={beatFrames(open)}>
        <Scene picture={open.picture} durationInFrames={beatFrames(open)} />
      </Sequence>
      <Sequence from={beatFrames(open)} durationInFrames={beatFrames(capsule)}>
        <Scene
          picture={capsule.picture}
          crossfadeTo={capsule.crossfadeTo}
          durationInFrames={beatFrames(capsule)}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Render stills and look at them**

Run:

```bash
cd video && mkdir -p out/stills && npx remotion still IntroducingClaraMendes out/stills/scene-open.jpg --frame=48 --scale=0.5 && npx remotion still IntroducingClaraMendes out/stills/scene-room.jpg --frame=132 --scale=0.5 && npx remotion still IntroducingClaraMendes out/stills/scene-print.jpg --frame=162 --scale=0.5
```

Expected: three JPEGs, 960 × 540. Open each with the Read tool. Check: `scene-open.jpg` shows the plaster living room with the framed print fully visible (not cropped at the top); `scene-room.jpg` shows the Quiet Form room context with the print whole; `scene-print.jpg` shows the Quiet Form I print close-up filling the frame. If a print is clipped, adjust that picture's `focal.y` in `script.ts` (lower value shows more of the top) and re-render the still.

- [ ] **Step 4: Typecheck and commit**

Run: `video$ npm run typecheck`
Expected: exit 0.

```bash
git add video/src/film/Scene.tsx video/src/film/Film.tsx video/src/film/script.ts
git commit -m "Add the film Scene layer with push, drift and crossfade

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: `Caption` and `LowerThird`

**Files:**
- Create: `video/src/film/Caption.tsx`
- Create: `video/src/film/LowerThird.tsx`
- Modify: `video/src/film/Film.tsx` (temporary preview)

- [ ] **Step 1: Write `Caption.tsx`**

```tsx
import {useCurrentFrame} from 'remotion';
import {SERIF} from './fonts';
import {fadeInOut} from './timing';

export const CAPTION_FADE = 6;

type CaptionProps = {text: string; durationInFrames: number};

/** The presenter's line: EB Garamond on the site's dark glass, bottom centre. */
export const Caption: React.FC<CaptionProps> = ({text, durationInFrames}) => {
  const frame = useCurrentFrame();
  const opacity = fadeInOut(frame, durationInFrames, CAPTION_FADE);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 96,
        display: 'flex',
        justifyContent: 'center',
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 56,
          lineHeight: 1.25,
          color: '#ffffff',
          textAlign: 'center',
          maxWidth: 1240,
          padding: '14px 28px',
          borderRadius: 4,
          background: 'rgba(30, 28, 24, 0.48)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
        }}
      >
        {text}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Write `LowerThird.tsx`**

```tsx
import {useCurrentFrame} from 'remotion';
import {SANS, SERIF} from './fonts';
import {eased} from './motion';
import {fadeInOut} from './timing';

type LowerThirdProps = {name: string; line: string; durationInFrames: number};

/** Capsule name and palette line, bottom-left, rising 12 px as it fades in. */
export const LowerThird: React.FC<LowerThirdProps> = ({name, line, durationInFrames}) => {
  const frame = useCurrentFrame();
  const enter = eased(frame, 0, 10, 0, 1);
  const opacity = Math.min(enter, fadeInOut(frame, durationInFrames, 6));
  const rise = (1 - enter) * 12;

  return (
    <div
      style={{
        position: 'absolute',
        left: 96,
        bottom: 140,
        transform: `translateY(${rise}px)`,
        opacity,
        color: '#ffffff',
        textShadow: '0 2px 24px rgba(38, 35, 31, 0.35)',
      }}
    >
      <div style={{fontFamily: SERIF, fontSize: 64, lineHeight: 1.1}}>{name}</div>
      <div
        style={{
          fontFamily: SANS,
          fontSize: 26,
          letterSpacing: '0.04em',
          color: 'rgba(255, 255, 255, 0.78)',
          marginTop: 10,
        }}
      >
        {line}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Preview with text through the temporary `Film.tsx`**

Replace `video/src/film/Film.tsx` with:

```tsx
import {useEffect, useState} from 'react';
import {AbsoluteFill, Sequence, cancelRender, continueRender, delayRender} from 'remotion';
import {Caption} from './Caption';
import {loadFilmFonts} from './fonts';
import {LowerThird} from './LowerThird';
import {Scene} from './Scene';
import {BEATS, PAPER, beatFrames} from './script';

const open = BEATS[0];
const capsule = BEATS[3];

export const Film: React.FC = () => {
  const [handle] = useState(() => delayRender('Loading EB Garamond'));
  useEffect(() => {
    loadFilmFonts()
      .then(() => continueRender(handle))
      .catch((error: unknown) => cancelRender(error));
  }, [handle]);

  if (open.kind !== 'scene' || capsule.kind !== 'scene') {
    throw new Error('Preview expects scene beats at positions 0 and 3');
  }
  return (
    <AbsoluteFill style={{backgroundColor: PAPER}}>
      <Sequence from={0} durationInFrames={beatFrames(open)}>
        <Scene picture={open.picture} durationInFrames={beatFrames(open)} />
        {open.caption ? <Caption text={open.caption} durationInFrames={beatFrames(open)} /> : null}
      </Sequence>
      <Sequence from={beatFrames(open)} durationInFrames={beatFrames(capsule)}>
        <Scene
          picture={capsule.picture}
          crossfadeTo={capsule.crossfadeTo}
          durationInFrames={beatFrames(capsule)}
        />
        {capsule.lowerThird ? (
          <LowerThird {...capsule.lowerThird} durationInFrames={beatFrames(capsule)} />
        ) : null}
      </Sequence>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: Render stills and look at them**

Run:

```bash
cd video && npx remotion still IntroducingClaraMendes out/stills/caption.jpg --frame=48 --scale=0.5 && npx remotion still IntroducingClaraMendes out/stills/lower-third.jpg --frame=132 --scale=0.5
```

Open both with the Read tool. Check: the caption is set in EB Garamond (serif with a visible italic-free roman; if it renders in a fallback serif the font did not load — check the `staticFile('fonts/…')` paths), legible on the band, centred, one line; the lower-third sits bottom-left with the serif name over the small sans line and is not covering the print.

- [ ] **Step 5: Typecheck and commit**

Run: `video$ npm run typecheck`
Expected: exit 0.

```bash
git add video/src/film/Caption.tsx video/src/film/LowerThird.tsx video/src/film/Film.tsx
git commit -m "Add film captions and capsule lower-thirds

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: `Trio`, `Cuts` and `EndCard`

**Files:**
- Create: `video/src/film/Trio.tsx`
- Create: `video/src/film/Cuts.tsx`
- Create: `video/src/film/EndCard.tsx`

- [ ] **Step 1: Write `Trio.tsx`**

```tsx
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {eased} from './motion';
import {PAPER} from './script';

type TrioProps = {prints: string[]; durationInFrames: number};

/** Three prints settle onto paper one after another, 8 frames apart. */
export const Trio: React.FC<TrioProps> = ({prints}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: PAPER,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 64,
        paddingBottom: 120,
      }}
    >
      {prints.map((src, index) => {
        const start = index * 8;
        const settle = eased(frame, start, start + 18, 0, 1);
        return (
          <Img
            key={src}
            src={staticFile(src)}
            style={{
              width: 496,
              height: 620,
              objectFit: 'cover',
              opacity: settle,
              transform: `translateY(${(1 - settle) * 24}px)`,
              boxShadow: '0 30px 60px -30px rgba(38, 35, 31, 0.35)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Write `Cuts.tsx`**

```tsx
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {PictureLayer} from './Scene';
import {PAPER, type Picture} from './script';

type CutsProps = {pictures: Picture[]; durationInFrames: number};

const CutFrame: React.FC<{picture: Picture; duration: number}> = ({picture, duration}) => {
  const frame = useCurrentFrame();
  return <PictureLayer picture={picture} frame={frame} duration={duration} />;
};

/** Hard cuts between pictures of equal length inside one beat. */
export const Cuts: React.FC<CutsProps> = ({pictures, durationInFrames}) => {
  const each = Math.floor(durationInFrames / pictures.length);

  return (
    <AbsoluteFill style={{backgroundColor: PAPER}}>
      {pictures.map((picture, index) => {
        const isLast = index === pictures.length - 1;
        const length = isLast ? durationInFrames - index * each : each;
        return (
          <Sequence key={picture.src} from={index * each} durationInFrames={length}>
            <CutFrame picture={picture} duration={length} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Write `EndCard.tsx`**

```tsx
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {SANS, SERIF} from './fonts';
import {eased} from './motion';
import {PictureLayer} from './Scene';
import {INK, type Picture} from './script';

type EndCardProps = {
  background: Picture;
  wordmark: string;
  url: string;
  durationInFrames: number;
};

/** Backdrop under a 20 % ink wash; italic wordmark and URL fade up. */
export const EndCard: React.FC<EndCardProps> = ({background, wordmark, url, durationInFrames}) => {
  const frame = useCurrentFrame();
  const wordmarkOpacity = eased(frame, 6, 24, 0, 1);
  const urlOpacity = eased(frame, 14, 32, 0, 1);

  return (
    <AbsoluteFill style={{backgroundColor: INK}}>
      <PictureLayer picture={background} frame={frame} duration={durationInFrames} />
      <AbsoluteFill style={{backgroundColor: 'rgba(38, 35, 31, 0.2)'}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', color: '#ffffff'}}>
        <div
          style={{
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontSize: 120,
            letterSpacing: '0.02em',
            lineHeight: 1,
            opacity: wordmarkOpacity,
          }}
        >
          {wordmark}
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 28,
            letterSpacing: '0.12em',
            color: 'rgba(255, 255, 255, 0.7)',
            marginTop: 28,
            opacity: urlOpacity,
          }}
        >
          {url}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: Typecheck and commit**

Run: `video$ npm run typecheck`
Expected: exit 0.

```bash
git add video/src/film/Trio.tsx video/src/film/Cuts.tsx video/src/film/EndCard.tsx
git commit -m "Add the film trio, size cuts and end card

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: `Film.tsx` — assemble every beat

**Files:**
- Modify: `video/src/film/Film.tsx` (final version)

- [ ] **Step 1: Write the final `Film.tsx`**

```tsx
import {useEffect, useState} from 'react';
import {AbsoluteFill, Sequence, cancelRender, continueRender, delayRender} from 'remotion';
import {Caption} from './Caption';
import {Cuts} from './Cuts';
import {EndCard} from './EndCard';
import {loadFilmFonts} from './fonts';
import {LowerThird} from './LowerThird';
import {Noise} from './Noise';
import {Scene} from './Scene';
import {BEATS, PAPER, beatFrames, beatStarts, type Beat} from './script';
import {Trio} from './Trio';

const BeatView: React.FC<{beat: Beat; durationInFrames: number}> = ({beat, durationInFrames}) => {
  switch (beat.kind) {
    case 'scene':
      return (
        <>
          <Scene
            picture={beat.picture}
            crossfadeTo={beat.crossfadeTo}
            durationInFrames={durationInFrames}
          />
          {beat.caption ? <Caption text={beat.caption} durationInFrames={durationInFrames} /> : null}
          {beat.lowerThird ? (
            <LowerThird {...beat.lowerThird} durationInFrames={durationInFrames} />
          ) : null}
        </>
      );
    case 'cuts':
      return (
        <>
          <Cuts pictures={beat.pictures} durationInFrames={durationInFrames} />
          <Caption text={beat.caption} durationInFrames={durationInFrames} />
        </>
      );
    case 'trio':
      return (
        <>
          <Trio prints={beat.prints} durationInFrames={durationInFrames} />
          <Caption text={beat.caption} durationInFrames={durationInFrames} />
        </>
      );
    case 'end':
      return (
        <EndCard
          background={beat.background}
          wordmark={beat.wordmark}
          url={beat.url}
          durationInFrames={durationInFrames}
        />
      );
  }
};

/** Introducing Clara Mendes — thirteen beats, hard cuts between them. */
export const Film: React.FC = () => {
  const [handle] = useState(() => delayRender('Loading EB Garamond'));
  useEffect(() => {
    loadFilmFonts()
      .then(() => continueRender(handle))
      .catch((error: unknown) => cancelRender(error));
  }, [handle]);

  const starts = beatStarts(BEATS);

  return (
    <AbsoluteFill style={{backgroundColor: PAPER}}>
      {BEATS.map((beat, index) => (
        <Sequence
          key={beat.id}
          name={beat.id}
          from={starts[index]}
          durationInFrames={beatFrames(beat)}
        >
          <BeatView beat={beat} durationInFrames={beatFrames(beat)} />
        </Sequence>
      ))}
      <Noise />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Verify the composition and tests**

Run: `video$ npm test && npm run typecheck && npx remotion compositions`
Expected: `# pass 7`; typecheck exit 0; `IntroducingClaraMendes 1920x1080 24fps 1080 frames (45.00s)`.

- [ ] **Step 3: Render a still at every beat's midpoint and at each capsule's print phase**

Run (from `video/`):

```bash
for f in 48 138 222 300 326 372 398 444 470 516 542 588 614 672 762 846 930 1026; do npx remotion still IntroducingClaraMendes out/stills/frame-$f.jpg --frame=$f --scale=0.5 || exit 1; done
```

Frame → beat: 48 open · 138 fifteen · 222 trio-quiet-form · 300/326 Quiet Form room/print · 372/398 Patina Blue · 444/470 Neo Deco · 516/542 Sunlit Mosaic · 588/614 Midnight Garden · 672 sizes (middle cut, 16 × 20) · 762 paper · 846 trio-midnight-garden · 930 open-today · 1026 end card.

Open all eighteen with the Read tool. Check each against the spec's beat sheet: the print is whole in every room shot; the lower-third does not overlap the print; captions are one or two lines and legible; the trio's three prints sit above the caption band; the end card shows the italic wordmark and URL over the interior. Fix any crop by editing that picture's `focal` in `script.ts` and re-rendering that frame only. Expected: no text clipped, no fallback fonts.

- [ ] **Step 4: Commit**

```bash
git add video/src/film/Film.tsx video/src/film/script.ts
git commit -m "Assemble the Introducing Clara Mendes film

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Render, poster and machine check

**Files:**
- Create: `video/scripts/check-render.mjs`
- Create: `video/README.md`

- [ ] **Step 1: Write `check-render.mjs`**

```js
#!/usr/bin/env node
// Reads a rendered MP4 back and asserts the film's contract:
// 45.0 s, 1920 x 1080, 24 fps, no audio track.
import {ALL_FORMATS, FilePathSource, Input} from 'mediabunny';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/check-render.mjs <file.mp4>');
  process.exit(2);
}

const readNumber = async (track, method, property) =>
  typeof track[method] === 'function' ? await track[method]() : track[property];

const input = new Input({formats: ALL_FORMATS, source: new FilePathSource(file)});
const duration = await input.computeDuration();
const video = await input.getPrimaryVideoTrack();
const audio = await input.getPrimaryAudioTrack();
if (!video) {
  console.error('FAIL no video track');
  process.exit(1);
}
const width = await readNumber(video, 'getDisplayWidth', 'displayWidth');
const height = await readNumber(video, 'getDisplayHeight', 'displayHeight');
const stats = await video.computePacketStats();
const fps = stats.averagePacketRate;

let failed = false;
const expect = (label, ok, actual) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${actual}`);
  if (!ok) failed = true;
};

expect('duration 45.0 s', Math.abs(duration - 45) < 0.1, duration.toFixed(3));
expect('width 1920', width === 1920, width);
expect('height 1080', height === 1080, height);
expect('24 fps', Math.abs(fps - 24) < 0.05, fps.toFixed(3));
expect('no audio track', audio === null, audio ? 'present' : 'none');

process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Render the film and the poster**

Run: `video$ npm run render`
Expected: progress to 1080/1080 frames, then `Rendered out/introducing-clara-mendes.mp4`. Allow 3–6 minutes.

Run: `video$ npm run poster`
Expected: `out/introducing-clara-mendes-poster.jpg` written (1920 × 1080).

- [ ] **Step 3: Check the render**

Run: `video$ npm run check`
Expected:

```
ok   duration 45.0 s: 45.000
ok   width 1920: 1920
ok   height 1080: 1080
ok   24 fps: 24.000
ok   no audio track: none
```

Run: `ls -la video/out/introducing-clara-mendes.mp4`
Expected: between 4 MB and 12 MB. If above 15 MB, re-render with `--crf=23` and re-check.

- [ ] **Step 4: Watch it**

Open `video/out/introducing-clara-mendes.mp4` in the Browser pane (`preview_start` with a `file://` URL is not allowed; instead run `video$ npx remotion studio` via `.claude/launch.json` entry `film-studio` — `{"name":"film-studio","runtimeExecutable":"npx","runtimeArgs":["remotion","studio","--port","3100"],"cwd":"video","port":3100}` — and scrub the timeline) or send the file to the owner with `SendUserFile` (display `render`). Confirm the crossfades land on the prints and the hard cuts on the sizes beat read as the print growing.

- [ ] **Step 5: Write `video/README.md`**

```markdown
# Clara Mendes — brand film

"Introducing Clara Mendes": a silent 45-second launch film rendered with
[Remotion](https://www.remotion.dev) from the storefront's own mockups
and EB Garamond. The beat sheet lives in `src/film/script.ts`; rewording a
caption or reordering a beat is a data edit.

Design spec: `../docs/superpowers/specs/2026-09-02-brand-film-design.md`.

## Commands

```bash
npm install          # once
npm test             # beat-sheet invariants (duration, assets, captions)
npm run typecheck
npm run studio       # Remotion Studio at http://localhost:3000
npm run still -- out/frame.jpg --frame=48 --scale=0.5
npm run render       # out/introducing-clara-mendes.mp4 (H.264, CRF 20)
npm run poster       # out/introducing-clara-mendes-poster.jpg (frame 48)
npm run check        # reads the MP4 back: 45 s, 1920x1080, 24 fps, silent
```

Publishing: `node ../scripts/upload-brand-film.mjs --apply` stages both
files into Shopify Files and prints their CDN URLs; paste them into
`../app/lib/brandFilm.ts`.

## Notes

- `remotion.config.ts` points the public dir at `../public`, so
  `staticFile('images/…')` reads the storefront assets in place. Remotion
  warns that the folder is large; that is expected.
- Remotion is free for individuals and companies of up to three people
  (see remotion.dev/license). Re-check before the team grows.
- Renders use Remotion's bundled Chrome Headless Shell; no system ffmpeg
  is required.
```

- [ ] **Step 6: Commit**

```bash
git add video/scripts/check-render.mjs video/README.md
git commit -m "Add the film render check and package README

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Upload to Shopify Files and record the URLs

**Files:**
- Create: `scripts/upload-brand-film.mjs`
- Create: `app/lib/brandFilm.ts`

- [ ] **Step 1: Write `scripts/upload-brand-film.mjs`**

```js
#!/usr/bin/env node
// Stages the rendered brand film and its poster into Shopify Files and
// prints their CDN URLs. Dry by default; pass --apply to upload.
//
//   node scripts/upload-brand-film.mjs            # checks the files exist
//   node scripts/upload-brand-film.mjs --apply    # uploads, polls, prints URLs
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveAdminClient} from './lib/admin.mjs';
import {envWithAdminDefaults} from './lib/env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');

const FILES = [
  {
    key: 'video',
    file: path.join(ROOT, 'video/out/introducing-clara-mendes.mp4'),
    mimeType: 'video/mp4',
    resource: 'VIDEO',
    contentType: 'VIDEO',
    alt: 'Introducing Clara Mendes — silent 45-second brand film',
  },
  {
    key: 'poster',
    file: path.join(ROOT, 'video/out/introducing-clara-mendes-poster.jpg'),
    mimeType: 'image/jpeg',
    resource: 'IMAGE',
    contentType: 'IMAGE',
    alt: 'Introducing Clara Mendes — poster frame',
  },
];

const STAGE = `#graphql
  mutation StageBrandFilm($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        parameters { name value }
        resourceUrl
        url
      }
      userErrors { field message }
    }
  }
`;

const CREATE = `#graphql
  mutation CreateBrandFilm($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files { id fileStatus alt }
      userErrors { field message }
    }
  }
`;

const READ = `#graphql
  query BrandFilmFiles($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Video {
        id
        fileStatus
        fileErrors { code message }
        originalSource { url mimeType width height }
        sources { url mimeType format width height }
      }
      ... on MediaImage {
        id
        fileStatus
        fileErrors { code message }
        image { url width height }
      }
    }
  }
`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function stage(adminGraphql, item) {
  const info = await stat(item.file);
  const staged = await adminGraphql(STAGE, {
    input: [
      {
        fileSize: String(info.size),
        filename: path.basename(item.file),
        httpMethod: 'POST',
        mimeType: item.mimeType,
        resource: item.resource,
      },
    ],
  });
  const payload = staged.data?.stagedUploadsCreate;
  if (payload?.userErrors?.length) {
    throw new Error(`${item.key}: ${JSON.stringify(payload.userErrors)}`);
  }
  const target = payload?.stagedTargets?.[0];
  if (!target?.url || !target.resourceUrl) {
    throw new Error(`${item.key}: Shopify returned no staged upload target`);
  }
  const form = new FormData();
  for (const parameter of target.parameters) {
    form.append(parameter.name, parameter.value);
  }
  form.append(
    'file',
    new Blob([await readFile(item.file)], {type: item.mimeType}),
    path.basename(item.file),
  );
  const response = await fetch(target.url, {body: form, method: 'POST'});
  if (!response.ok) {
    throw new Error(`${item.key}: staged upload failed with HTTP ${response.status}`);
  }
  return target.resourceUrl;
}

async function createFiles(adminGraphql, staged) {
  const result = await adminGraphql(CREATE, {
    files: FILES.map((item) => ({
      alt: item.alt,
      contentType: item.contentType,
      filename: path.basename(item.file),
      originalSource: staged[item.key],
    })),
  });
  const payload = result.data?.fileCreate;
  if (payload?.userErrors?.length) {
    throw new Error(`fileCreate: ${JSON.stringify(payload.userErrors)}`);
  }
  return payload.files.map((file) => file.id);
}

function pickVideoUrl(node) {
  const mp4s = (node.sources || []).filter((source) => source.mimeType === 'video/mp4');
  const exact = mp4s.find((source) => source.height === 1080);
  const best = exact || mp4s.sort((a, b) => b.height - a.height)[0];
  return best?.url || node.originalSource?.url || null;
}

async function waitForReady(adminGraphql, ids) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const result = await adminGraphql(READ, {ids});
    const nodes = result.data?.nodes || [];
    for (const node of nodes) {
      if (node?.fileErrors?.length) {
        throw new Error(`${node.id}: ${JSON.stringify(node.fileErrors)}`);
      }
    }
    if (nodes.length === ids.length && nodes.every((node) => node?.fileStatus === 'READY')) {
      return nodes;
    }
    await delay(3000);
  }
  throw new Error('Timed out waiting for the brand film files to be READY');
}

async function main() {
  for (const item of FILES) {
    const info = await stat(item.file);
    console.log(`${item.key}: ${path.relative(ROOT, item.file)} (${(info.size / 1024 / 1024).toFixed(1)} MB)`);
  }
  if (!APPLY) {
    console.log('Dry run. Re-run with --apply to upload to Shopify Files.');
    return;
  }

  const adminGraphql = await resolveAdminClient(envWithAdminDefaults(), {
    requiredScope: 'write_files',
  });
  const staged = {};
  for (const item of FILES) {
    staged[item.key] = await stage(adminGraphql, item);
    console.log(`${item.key}: staged`);
  }
  const ids = await createFiles(adminGraphql, staged);
  console.log(`created: ${ids.join(', ')}`);
  const nodes = await waitForReady(adminGraphql, ids);

  const video = nodes.find((node) => node.sources);
  const poster = nodes.find((node) => node.image);
  const videoUrl = video ? pickVideoUrl(video) : null;
  const posterUrl = poster?.image?.url || null;
  if (!videoUrl || !posterUrl) {
    throw new Error(`Missing URLs: video=${videoUrl} poster=${posterUrl}`);
  }
  console.log('\nPaste into app/lib/brandFilm.ts:');
  console.log(`  videoUrl: '${videoUrl}',`);
  console.log(`  posterUrl: '${posterUrl}',`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
```

- [ ] **Step 2: Dry run**

Run: `node scripts/upload-brand-film.mjs`
Expected:

```
video: video/out/introducing-clara-mendes.mp4 (N.N MB)
poster: video/out/introducing-clara-mendes-poster.jpg (0.N MB)
Dry run. Re-run with --apply to upload to Shopify Files.
```

- [ ] **Step 3: Upload**

Run: `node scripts/upload-brand-film.mjs --apply`
Expected: `video: staged`, `poster: staged`, `created: gid://shopify/Video/…, gid://shopify/MediaImage/…`, then after polling the two `Paste into app/lib/brandFilm.ts` lines with `https://cdn.shopify.com/…` URLs.

If it fails with `Admin token exchange failed` or `missing the write_files access scope`: the worktree's `.env.shopify-admin.local` (copied from `clara-wt-catalog`) no longer authenticates or lacks the scope. Fallback, same result: in the owner's Chrome (claude-in-chrome), open `https://admin.shopify.com/store/vre00g-8b/content/files`, click **Upload files**, upload `video/out/introducing-clara-mendes.mp4` then the poster JPEG with `file_upload`, wait for the video's status to leave "Processing", open each file's detail panel and copy its **Link** (a `cdn.shopify.com` URL). Note in the final report that the fallback was used and why.

- [ ] **Step 4: Write `app/lib/brandFilm.ts` with the URLs**

```ts
/**
 * "Introducing Clara Mendes" — the silent brand film. Rendered from
 * `video/` and hosted on Shopify Files; only the CDN URLs live here.
 * Re-render and re-upload with `node scripts/upload-brand-film.mjs --apply`.
 */
export const BRAND_FILM = {
  title: 'Introducing Clara Mendes',
  durationSeconds: 45,
  width: 1920,
  height: 1080,
  videoUrl: 'https://cdn.shopify.com/…/introducing-clara-mendes.mp4',
  posterUrl: 'https://cdn.shopify.com/…/introducing-clara-mendes-poster.jpg',
} as const;

export const brandFilmIsLive = (): boolean =>
  Boolean(BRAND_FILM.videoUrl && BRAND_FILM.posterUrl);
```

(Replace the two `…` URLs with the exact strings the script or the Files panel produced.)

- [ ] **Step 5: Verify the CDN serves both**

Run:

```bash
curl -sI "<videoUrl>" | grep -iE '^(HTTP|content-type|content-length)' && curl -sI "<posterUrl>" | grep -iE '^(HTTP|content-type)'
```

Expected: `HTTP/2 200`, `content-type: video/mp4` (and a `content-length` in the MB range); `HTTP/2 200`, `content-type: image/jpeg`.

- [ ] **Step 6: Commit**

```bash
git add scripts/upload-brand-film.mjs app/lib/brandFilm.ts
git commit -m "Publish the brand film to Shopify Files

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: The Our Story film section

**Files:**
- Create: `app/components/BrandFilm.tsx`
- Modify: `app/routes/our-story.tsx:1-8` (imports), `:157-159` (mount), `:469-475` (CSS)

- [ ] **Step 1: Write `app/components/BrandFilm.tsx`**

```tsx
import {useEffect, useRef} from 'react';
import {BRAND_FILM, brandFilmIsLive} from '~/lib/brandFilm';

/**
 * The silent brand film on Our Story: muted, looping, inline, poster
 * first. Visitors who prefer reduced motion see the poster only.
 */
export function BrandFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      if (query.matches) {
        video.pause();
        video.removeAttribute('autoplay');
        video.load();
      } else {
        video.play().catch(() => {});
      }
    };
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  if (!brandFilmIsLive()) return null;

  const label = `${BRAND_FILM.title} — a silent ${BRAND_FILM.durationSeconds}-second film`;

  return (
    <section className="os-film" aria-label={label}>
      <video
        ref={videoRef}
        className="os-film-video"
        muted
        autoPlay
        loop
        playsInline
        preload="metadata"
        poster={BRAND_FILM.posterUrl}
        width={BRAND_FILM.width}
        height={BRAND_FILM.height}
        aria-label={label}
      >
        <source src={BRAND_FILM.videoUrl} type="video/mp4" />
      </video>
      <p className="os-film-caption">
        Introducing Clara Mendes — the collection in forty-five seconds.
      </p>
    </section>
  );
}
```

- [ ] **Step 2: Mount it in `app/routes/our-story.tsx`**

Add the import after line 4 (`StructuredData`):

```tsx
import {BrandFilm} from '~/components/BrandFilm';
```

Between the hero's closing `</section>` (line 157) and `<section id="os-collection"` (line 159) insert:

```tsx
      <BrandFilm />
```

- [ ] **Step 3: Add the CSS inside `ourStoryCss`, just before the `/* ── Story content ── */` comment (line 470)**

```css
/* ── Brand film ── */
.os-film {
  margin: 0 auto;
  max-width: 1060px;
  padding: clamp(40px, 6vw, 88px) clamp(20px, 5vw, 70px) 0;
}

.os-film-video {
  aspect-ratio: 16 / 9;
  background: var(--os-ink);
  border-radius: 4px;
  box-shadow: 0 30px 60px -30px rgba(38, 35, 31, 0.45);
  display: block;
  height: auto;
  width: 100%;
}

.os-film-caption {
  color: var(--os-text-muted);
  font-family: var(--os-font-sans);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  margin: 14px 0 0;
  text-transform: uppercase;
}

```

- [ ] **Step 4: Lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: both exit 0.

- [ ] **Step 5: Verify on the dev server**

Copy the storefront env into the worktree if `.env` is missing (`cp ../clara-mendes/.env .env`; it is git-ignored). Start the dev server through the Browser pane (`preview_start` with the existing `.claude/launch.json` entry, or add `{"name":"clara-film-dev","runtimeExecutable":"npm","runtimeArgs":["run","dev","--","--port","3001"],"port":3001}`), open `/our-story`, and check:

1. `read_console_messages` — no errors.
2. `read_network_requests` with `urlPattern: "cdn.shopify.com"` — the MP4 and poster requests return 200.
3. `read_page` — a `section` labelled "Introducing Clara Mendes — a silent 45-second film" sits between the hero and "The collection".
4. `javascript_tool`: `document.querySelector('.os-film-video').paused` → `false` and `.currentTime` increasing between two reads.
5. `resize_window` preset `mobile`, reload, screenshot — the film spans the column with the caption below.
6. `resize_window` back to `desktop`; emulate reduced motion with `javascript_tool`: `window.matchMedia = (q) => ({matches: q.includes('reduce'), addEventListener(){}, removeEventListener(){}})`, reload is not possible after patching, so instead check the handler path by dispatching: verify `document.querySelector('.os-film-video').getAttribute('autoplay')` is present in the normal case and, in a fresh tab opened after enabling the OS-level reduced-motion setting is not available, rely on Playwright's emulation: `npx playwright screenshot --reduced-motion=reduce http://localhost:3001/our-story out/our-story-reduced.png` from the root and confirm the poster frame (not mid-film) is shown.
7. Desktop screenshot with the film visible.

Save the screenshots under the scratchpad and send the desktop and mobile ones to the owner with `SendUserFile`.

- [ ] **Step 6: Commit**

```bash
git add app/components/BrandFilm.tsx app/routes/our-story.tsx
git commit -m "Embed the brand film on Our Story

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Docs and wiki

**Files:**
- Create: `docs/brand-film.md`
- Create: `docs/llm-wiki/modules/brand-film.md`
- Modify: `docs/llm-wiki/index.md:19-24`
- Modify: `docs/llm-wiki/log.md` (append)

- [ ] **Step 1: Write `docs/brand-film.md`**

```markdown
# Introducing Clara Mendes — brand film

Silent, 45 seconds, 1920 × 1080, 24 fps. Rendered from `video/`
(Remotion) out of the storefront's own mockups; hosted on Shopify Files;
embedded on `/our-story`. Design: `superpowers/specs/2026-09-02-brand-film-design.md`.

## YouTube

**Title:** Introducing Clara Mendes

**Description:**

Today we're opening Clara Mendes: fifteen original works in five capsules
— Quiet Form, Patina Blue, Neo Deco, Sunlit Mosaic and Midnight Garden —
made to live with. Each capsule holds three works composed together; one
print carries a room, a pair or trio reads as one arrangement. Giclée on
200 gsm enhanced matte paper in three sizes (8 × 10, 16 × 20, 20 × 24 in),
printed when you order it and shipped across the EU.

https://shopclaramendes.com

**Tags:** wall art, art prints, abstract wall art, dark botanical, art deco
prints, living room wall art, giclée prints, Clara Mendes

**Thumbnail:** `video/out/introducing-clara-mendes-poster.jpg`.

Upload as unlisted first, check playback, then set Public and add the link
to the Instagram and Pinterest bios.

## Beat sheet

| # | Time | Picture | Words |
|---|------|---------|-------|
| 1 | 00:00–00:04 | Quiet Form living room | Today we're opening Clara Mendes. |
| 2 | 00:04–00:07.5 | Quiet Form I room detail | Fifteen original works, in five capsules, made to live with. |
| 3 | 00:07.5–00:11 | Quiet Form trio on paper | Each capsule holds three works composed together. |
| 4–8 | 00:11–00:26 | One room per capsule, into the print | Quiet Form · Patina Blue · Neo Deco · Sunlit Mosaic · Midnight Garden (lower-thirds) |
| 9 | 00:26–00:30 | The same sofa wall, 8 × 10 → 16 × 20 → 20 × 24 | Three sizes. Printed when you order it. |
| 10 | 00:30–00:33.5 | Patina Blue detail | Giclée on 200 gsm enhanced matte paper. |
| 11 | 00:33.5–00:37 | Midnight Garden trio | Buy one now. Add its companions later. |
| 12 | 00:37–00:40.5 | Living room, pulling back | Clara Mendes is open today. Ships across the EU. |
| 13 | 00:40.5–00:45 | Interior backdrop, wordmark, URL | — |

## Re-render and re-upload

1. Edit `video/src/film/script.ts` (captions, order, pictures).
2. `cd video && npm test && npm run render && npm run poster && npm run check`.
3. `node scripts/upload-brand-film.mjs --apply` and paste the two URLs into
   `app/lib/brandFilm.ts`. (Shopify Files keeps the old file; delete it in
   Admin → Content → Files once the new URL is live.)
```

- [ ] **Step 2: Write `docs/llm-wiki/modules/brand-film.md`**

```markdown
# Brand Film

Snapshot: 2026-09-02

"Introducing Clara Mendes" is a silent 45-second launch film (1920 × 1080,
24 fps, H.264) in the register of Anthropic's Fable 5.1 announcement:
one plain first-person line per shot, cutaways to the prints and rooms,
serif lower-thirds for the five capsules, wordmark over the interior at
the close.

## Where things live

- `video/` — isolated Remotion package (own `package.json`). The beat
  sheet is data in `video/src/film/script.ts`; components in
  `video/src/film/`. `remotion.config.ts` points the public dir at the
  storefront's `public/`, so mockups and EB Garamond are read in place.
- `video/out/` — renders (git-ignored).
- `scripts/upload-brand-film.mjs` — stages MP4 + poster into Shopify Files
  (`stagedUploadsCreate` → `fileCreate` → poll `READY`) and prints CDN URLs.
- `app/lib/brandFilm.ts` — the two CDN URLs; `brandFilmIsLive()`.
- `app/components/BrandFilm.tsx` — the `/our-story` section: muted,
  looping, inline `<video>` with poster; reduced-motion shows the poster.
- `docs/brand-film.md` — owner-facing YouTube copy and re-render steps.

## Invariants

- `video/src/film/script.test.mts` pins 1080 frames at 24 fps, contiguous
  beats, every picture present under `public/`, captions ≤ 80 chars.
- `video/scripts/check-render.mjs` reads the MP4 back: 45 s, 1920 × 1080,
  24 fps, no audio track.
- CSP: `mediaSrc` is not set, so it inherits Hydrogen's `defaultSrc`,
  which already allows `https://cdn.shopify.com`.

## Verified

2026-09-02: stills at every beat reviewed; render check passed; CDN URLs
return 200; `/our-story` verified on the dev server (desktop, mobile,
reduced motion) — see the log entry.
```

- [ ] **Step 3: Add the index entry and the log entry**

In `docs/llm-wiki/index.md`, after the "Analytics And Attribution" line (line 24) add:

```markdown
- [Brand Film](modules/brand-film.md) - The silent 45-second launch film: Remotion package, render check, Shopify Files upload, Our Story embed.
```

Append to `docs/llm-wiki/log.md`:

```markdown

## 2026-09-02 - Brand film: Introducing Clara Mendes

Added a silent 45-second launch film built with Remotion in `video/`
from the storefront's own mockups and EB Garamond, modelled on the
register of Anthropic's Fable 5.1 announcement (captions stand in for the
presenter, prints for the props). The MP4 and poster are hosted on
Shopify Files; `app/lib/brandFilm.ts` holds the CDN URLs and
`app/components/BrandFilm.tsx` embeds the film on `/our-story` (muted,
looping, poster for reduced motion). Verified: eighteen stills reviewed,
`check-render` passed (45 s, 1920 × 1080, 24 fps, no audio), CDN `HEAD`
200 for both files, dev-server screenshots on desktop and mobile. YouTube
upload remains an owner action (`docs/brand-film.md`).

Sources: [Brand Film](modules/brand-film.md), `docs/brand-film.md`,
`docs/superpowers/specs/2026-09-02-brand-film-design.md`.
```

- [ ] **Step 4: Check links and commit**

Run: `grep -c 'modules/brand-film.md' docs/llm-wiki/index.md docs/llm-wiki/log.md`
Expected: `1` for each.

```bash
git add docs/brand-film.md docs/llm-wiki/modules/brand-film.md docs/llm-wiki/index.md docs/llm-wiki/log.md
git commit -m "Document the brand film

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Pull request, merge gate, live verification

- [ ] **Step 1: Push and open the PR**

```bash
git push -u origin fable/brand-film
gh pr create --title "Add the Introducing Clara Mendes brand film" --body "$(cat <<'EOF'
## Summary
- New `video/` Remotion package renders the silent 45-second launch film from the storefront's own mockups and EB Garamond (beat sheet as data in `script.ts`).
- `scripts/upload-brand-film.mjs` publishes the MP4 and poster to Shopify Files; `app/lib/brandFilm.ts` holds the CDN URLs.
- `/our-story` gains a muted, looping film section between the hero and "The collection"; reduced motion shows the poster.
- Spec: `docs/superpowers/specs/2026-09-02-brand-film-design.md`; owner copy for YouTube in `docs/brand-film.md`.

## Verification
- `video$ npm test` (7 passing), `npm run typecheck`, root `npm run lint` + `npm run typecheck`.
- 18 stills reviewed; `check-render`: 45.000 s, 1920x1080, 24 fps, no audio.
- CDN HEAD 200 for both files; dev-server screenshots desktop + mobile attached.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: a PR URL on `Tassos801/Clara-Mendes`. Attach the desktop and mobile screenshots as a PR comment (`gh pr comment <n> --body-file`), or paste them via the GitHub UI.

- [ ] **Step 2: Merge gate**

Merging deploys to production through Oxygen. Report the PR to the owner with the screenshots and wait for their go-ahead before merging. Do not merge on your own.

- [ ] **Step 3: After merge — live verification**

Once deployed: open `https://shopclaramendes.com/our-story` in the owner's Chrome (claude-in-chrome), confirm the film section renders and plays (`document.querySelector('.os-film-video').paused === false`), take a screenshot, and send it to the owner. Update the wiki log entry's "Verified" line with the live check if anything differs from the dev-server run.

---

## Self-review

- **Spec coverage:** deliverables (Task 8, 9), beat sheet (Task 2), visual system (Tasks 3–7), architecture incl. eslint/gitignore/publicDir (Task 1), hosting script + fallback (Task 9), Our Story section + reduced motion + CSP note (Task 10), docs + wiki + YouTube copy (Task 11), verification steps 1–7 (Tasks 7, 8, 9, 10, 12; step 7 in Task 8). Out-of-scope items are not planned.
- **Placeholders:** none; the two `…` URL placeholders in Task 9 Step 4 are explicitly filled from the upload output in the same step.
- **Type consistency:** `Picture`, `Beat`, `LowerThird` defined once in `script.ts` and imported by name elsewhere; `PictureLayer` exported from `Scene.tsx` and used by `Cuts.tsx` and `EndCard.tsx`; `eased` signature `(frame, fromFrame, toFrame, fromValue, toValue)` used consistently; `fadeInOut(frame, duration, fade)` consistent; `BRAND_FILM` fields (`title`, `durationSeconds`, `width`, `height`, `videoUrl`, `posterUrl`) match between `brandFilm.ts` and `BrandFilm.tsx`.
