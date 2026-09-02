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
