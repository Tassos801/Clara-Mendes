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
- `app/components/BrandFilm.tsx` — the homepage section (right after the trust band): poster first with a play control
  on top (`.brand-film-control` covers the frame; states idle / playing / paused / ended via `data-film-state`); the film
  plays inline, muted, on the visitor's tap, pauses on another, and returns to the poster with "Watch again" when it ends.
  No autoplay. Video and caption styles are global in `app/styles/app.css` (`.brand-film-*`, `.home-film`). Our Story carries no film (owner decision 2026-09-02).
- `docs/brand-film.md` — owner-facing YouTube copy and re-render steps.

## Invariants

- `video/src/film/script.test.mts` pins 1080 frames at 24 fps, contiguous
  beats, every picture present under `public/`, captions ≤ 80 chars.
- `video/scripts/check-render.mjs` reads the MP4 back: 45 s, 1920 × 1080,
  24 fps, no audio track.
- CSP: `mediaSrc` is not set, so it inherits Hydrogen's `defaultSrc`,
  which already allows `https://cdn.shopify.com`.

## Verified

See the dated entry in [log.md](../log.md) for what was checked and how.
