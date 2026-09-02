# Introducing Clara Mendes — brand film

Date: 2026-09-02. Status: approved in session by the owner (purpose, no
artist footage, silent captions, ~45 s, Remotion build, Shopify Files
hosting, Our Story embed). Ready for an implementation plan.

## Why

The store has no motion anywhere and acquisition is its bottleneck. One
canonical launch film gives Our Story, YouTube and social a single asset
that says what the collection is in under a minute. The register is
borrowed from Anthropic's "Introducing Claude Fable 5.1" (85 s, YouTube,
2026-09-01): a presenter speaking plainly to camera — "Today we're
releasing Fable 5.1" — one idea per shot, cutaways to tactile objects that
illustrate each line, serif lower-thirds, and the wordmark over sky at the
close. Here the captions take the presenter's role and the prints take
the props' role. No presenter, no voice, no music.

## Deliverables

- `introducing-clara-mendes.mp4` — 1920 × 1080, 24 fps, 45 s (1080
  frames), H.264 CRF 20, no audio track. Expected 6–9 MB.
- `introducing-clara-mendes-poster.jpg` — the opening anchor frame with
  the first caption, 1920 × 1080.
- Both hosted on Shopify Files (`cdn.shopify.com`), not in git. Their CDN
  URLs are the only thing the storefront needs.
- A new film section on `/our-story` between the hero and "The
  collection".
- YouTube title and description copy in `docs/brand-film.md` for the
  owner's upload (the upload itself is an owner action).

## Beat sheet

Captions are held ~3.5 s each. Portrait mockups are cropped to 16:9 with
a per-beat focal point. Slow 4–8 % push-ins or drifts inside a beat;
hard cuts between beats; 12-frame crossfades only within a beat (room →
print). Times are mm:ss from the start.

| # | Time | Picture | Words |
|---|------|---------|-------|
| 1 | 00:00–00:04.0 | Anchor room: `home-editorial/quiet-form-living.jpg`, slow push-in on the frame | "Today we're opening Clara Mendes." |
| 2 | 00:04.0–00:07.5 | `quiet-form/quiet-form-01-room-detail-20x24.webp`, drift right | "Fifteen original works, in five capsules, made to live with." |
| 3 | 00:07.5–00:11.0 | Trio: Quiet Form I · II · III (`product-art/quiet-form/*.webp`) laid on paper `#fbfaf6`, settling in one after another | "Each capsule holds three works composed together." |
| 4 | 00:11.0–00:14.0 | Quiet Form: `quiet-form-01-room-context-20x24.webp` → crossfade into `product-art/quiet-form/quiet-form-01.webp` | Lower-third: **Quiet Form** / Sculptural arches, warm architectural balance |
| 5 | 00:14.0–00:17.0 | Patina Blue: `patina-blue-01-room-context-20x24.webp` → `patina-blue-01.webp` | **Patina Blue** / Weathered indigo across a chalk-white field |
| 6 | 00:17.0–00:20.0 | Neo Deco: `neo-deco-01-room-sofa-20x24.jpg` → `neo-deco-01.webp` | **Neo Deco** / The discipline of Deco, none of its gilt |
| 7 | 00:20.0–00:23.0 | Sunlit Mosaic: `sunlit-mosaic-02-room-context-20x24.webp` → `sunlit-mosaic-02.webp` | **Sunlit Mosaic** / Torn paper, mineral colour, warm rhythm |
| 8 | 00:23.0–00:26.0 | Midnight Garden: `midnight-garden-01-room-detail-20x24.webp` → `midnight-garden-01.webp` | **Midnight Garden** / Botanicals after dark |
| 9 | 00:26.0–00:30.0 | Same sofa wall, three hard cuts at 1.33 s each: `quiet-form-01-room-sofa-8x10.jpg`, `-16x20.jpg`, `-20x24.jpg` (identical framing, the print grows) | "Three sizes. Printed when you order it." |
| 10 | 00:30.0–00:33.5 | `home-editorial/patina-blue-detail.jpg`, slow push | "Giclée on 200 gsm enhanced matte paper." |
| 11 | 00:33.5–00:37.0 | Trio again, now Midnight Garden I · II · III on paper | "Buy one now. Add its companions later." |
| 12 | 00:37.0–00:40.5 | Anchor room wide, slow pull back | "Clara Mendes is open today. Ships across the EU." |
| 13 | 00:40.5–00:45.0 | End card: `backdrops/hero-interior.jpg` with 8 % drift under a 20 % ink wash; wordmark **Clara Mendes** and `shopclaramendes.com` fade up | — |

Capsule palette lines (beats 4–8) come from the catalog blurbs and
`galleryPages.ts` subtitles, shortened to one line each. Every caption is
at most two lines of ~40 characters.

## Visual system

- Frame 1920 × 1080, 24 fps. Paper `#fbfaf6`, ink `#26231f`, clay
  `#9c6f5d` — the site tokens.
- Captions: EB Garamond Regular 56 px, white, centred, baseline at 88 %
  height, on an ink band `rgba(30,28,24,0.48)` with 22 px backdrop blur,
  14 px × 28 px padding, 4 px radius — the site's dark glass, standing in
  for YouTube's black caption boxes. 6-frame fade in and out.
- Lower-thirds (beats 4–8): bottom-left at x = 96 px, baseline y = 940 px.
  Name in EB Garamond 64 px white; palette line in the site sans stack,
  26 px, 0.04 em tracking, 78 % white. Rises 12 px while fading in over
  10 frames.
- End card: wordmark EB Garamond 120 px white, letter-spacing 0.02 em;
  URL in sans 28 px, 0.12 em tracking, 70 % white; both fade over 18
  frames.
- A static SVG noise overlay at 4 % opacity on every beat, matching the
  site's `os-noise-overlay`.
- Motion is `interpolate()`-driven with `Easing.bezier(0.16, 1, 0.3, 1)`;
  no CSS transitions (they do not render in Remotion).

## Architecture

New package, isolated from Hydrogen:

- `video/package.json` — `remotion`, `@remotion/cli`, `@remotion/fonts`,
  `react`, `react-dom`, `typescript`, `zod`. Own lockfile and
  `node_modules` (already git-ignored by `**/node_modules/`). Remotion is
  free for teams of up to three people, which covers this shop.
- `video/remotion.config.ts` — `Config.setPublicDir('../public')` so
  `staticFile('images/…')` and `staticFile('fonts/EBGaramond-Regular.ttf')`
  read the storefront's own assets; JPEG frames; overwrite output.
- `video/tsconfig.json` — standalone; the root tsconfig only includes
  `app/**` and is unaffected.
- `video/src/Root.tsx` — one `Composition` id `IntroducingClaraMendes`,
  1920 × 1080, fps 24, `durationInFrames` derived from the script.
- `video/src/film/script.ts` — the beat sheet as typed data: picture
  source(s), focal point, motion, caption or lower-third, duration in
  frames. Rewording or reordering is a data edit.
- `video/src/film/Film.tsx` — lays the beats out with `<Sequence>`.
- `video/src/film/Scene.tsx` (cropped image with push/drift and optional
  in-beat crossfade), `Trio.tsx`, `Caption.tsx`, `LowerThird.tsx`,
  `EndCard.tsx`, `Noise.tsx`, `fonts.ts` (`loadFont` from
  `@remotion/fonts`).
- `video/README.md` — studio, still and render commands, licence note.
- `video/out/` — render output, git-ignored.
- Root `eslint.config.js` — add `video/` to `ignores` so the Hydrogen
  lint config does not run over the film sources.

Render (from `video/`):

```
npx remotion render IntroducingClaraMendes out/introducing-clara-mendes.mp4 --codec h264 --crf 20
npx remotion still IntroducingClaraMendes out/introducing-clara-mendes-poster.jpg --frame 48
```

Remotion downloads its own headless Chrome and ships its own encoder; no
system ffmpeg is needed (none is installed).

Hosting — `scripts/upload-brand-film.mjs`, reusing
`scripts/lib/admin.mjs` (`resolveAdminClient(env, {requiredScope:
'write_files'})`) and the `stagedUploadsCreate` → upload → `fileCreate`
pattern already in `scripts/sync-classic-frame-mockups.mjs`: stage the
MP4 (`resource: FILE`, `mimeType: video/mp4`) and the poster (`IMAGE`),
create the Files, poll `files` until `fileStatus` is `READY`, print both
CDN URLs. The URLs are pasted into `app/lib/brandFilm.ts` as constants.
If the token lacks `write_files`, the fallback is a manual upload in
Admin → Content → Files and the same constants.

Storefront — `app/routes/our-story.tsx` gains `<section
className="os-film">` between the hero and `#os-collection`: a `<video>`
with `muted autoPlay loop playsInline preload="metadata"`, the poster,
no controls, `aria-label="Introducing Clara Mendes — a silent 45-second
film"`, inside the page's existing max-width column with a 4 px radius
and the page's shadow. A mount-time `matchMedia('(prefers-reduced-motion:
reduce)')` check pauses the video and shows the poster instead. CSP
needs no change: the installed Hydrogen build's `defaultSrc` already lists
`https://cdn.shopify.com`, and `mediaSrc` inherits it.

Docs — `docs/llm-wiki/modules/brand-film.md` (what it is, where it is
hosted, how to re-render and re-upload), index entry, dated `log.md`
entry; `docs/brand-film.md` with the YouTube title, description and the
beat sheet for the owner.

## Verification

1. `npx remotion still` at each beat's midpoint (13 stills) reviewed as
   images before the full render: crop, caption legibility, lower-third
   placement, end card.
2. Full render; duration and dimensions read back with Mediabunny (per
   the Remotion rules) — expect 1080 frames at 24 fps, 1920 × 1080, no
   audio track.
3. Upload; both CDN URLs fetched with `HEAD` — `200`, `video/mp4` and
   `image/jpeg`.
4. Our Story on the dev server: desktop and mobile screenshots showing
   the film section; network log shows the MP4 served from
   `cdn.shopify.com`; no console errors; reduced-motion emulation shows
   the poster.
5. `npm run lint` and `npm run typecheck` at the root stay green.
6. After merge and deploy: the live `/our-story` screenshot with the
   film playing, per the standing verification rule.
7. The MP4 is sent to the owner directly as well.

## Out of scope

Audio, voiceover, 4K, a 9:16 social cut, artist or studio footage, the
homepage hero. Each can follow as its own change; the script data and
components are built so a social cut is a second `Composition`, not a
rewrite.

## Owner items

- Upload the MP4 to YouTube with the supplied copy.
- Confirm the Admin token's scopes if the upload script reports a missing
  `write_files` scope (fallback is manual upload in Files).
