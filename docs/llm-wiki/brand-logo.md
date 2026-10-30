# Brand Logo

Snapshot: 2026-10-30 (branch `claude/brand-logo`).

## The logo

The owner's official logo since 2026-10-30: bold uppercase **CLARA** over
**MENDES**, and to the right a Mondrian-style mark of six rectangles that meet
on one seam: a tall black bar, a red block (`#CE1415`), a blue block
(`#023E95`), a lower black bar, a yellow bar (`#F9C006`) and a black square.
The file is `docs/brand/clara-mendes-logo-2026-10-30.webp` (1536 × 1024,
transparent). It replaced the Georgia Italic "Clara Mendes" wordmark and the
"CM" monogram favicon of PR #122.

## Vector data, not a picture

`scripts/trace-logo.mjs` turns the file into `app/content/logo.ts`: the
wordmark traced into one path (potrace at 4×, integer coordinates, ≈ 12 KB,
`fill-rule="evenodd"` for the counters of A, R and D) and the mark as six
measured rectangles. It exports:

- `LOGO_COLORS` — the three block colours and the file's black `#111111`.
- `LOGO_MARK` — 284 × 497, six rects; `fill: 'ink'` rects take the text colour.
- `LOGO_STACKED` — the official lockup, 803 × 497, cap height 100, mark at
  x = 519.
- `LOGO_HORIZONTAL` — a one-line CLARA MENDES with the mark at 2.4 cap
  heights (1249 × 240), for short, wide places.

The script also writes the standalone files `public/images/brand/
clara-mendes-logo.svg`, `-horizontal.svg` and `-mark.svg`, then rebuilds the
stacked lockup and measures its overlap with the file's alpha mask (0.989; it
exits 1 under 0.98). potrace is a pure-JS package installed in a scratch
folder, not a repo dependency; the script takes that folder as its argument.
`scripts/logo.node-test.mjs` pins the data (six rects on the y = 290 seam,
fifteen subpaths, integer coordinates, the files share one trace).

## Where it appears

| Surface | Lockup | Size and colour | Code |
| --- | --- | --- | --- |
| Header (glass pill) | one-line | 36 px tall; 30 px ≤ 720 px (header 68); 26 px ≤ 480 px (header 60); 24 px ≤ 340 px; ink via `currentColor` | `ClaraHeader` → `<BrandLogo variant="horizontal">` |
| Homepage and Our Story hero headers (over the photo) | one-line | 34 px tall (30/28/26/24 px down the breakpoints), paper via `currentColor` | `.hm-brand` in `app/routes/_index.tsx`, `.os-brand` in `app/routes/our-story.tsx` |
| Mobile drawer header | stacked | 72 px tall, ink; the SVG is drawn on the first open and kept, never in the server HTML, so closed drawers add no path data | `ClaraMobileNav` |
| Footer | stacked | 82 px tall (≈ 132 px wide), paper (`currentColor` from `--color-paper`); blocks unchanged; paper focus ring | `ClaraFooter` |
| Favicon | mark | oat tile `rx 6`, mark 28 px tall centred (26 turned the bars grey at 16 px); `favicon.ico` 16/32/48 | `app/assets/favicon.svg`, written by `scripts/build-app-icons.mjs` |
| App icons (192/512/maskable/Apple 180) | mark | oat background, 64 % tall (maskable 56 %) | `scripts/build-app-icons.mjs` → `public/icons/` |
| Share card (`og:image` default) | stacked | 1200 × 630, paper, lockup 560 px wide, ink `#26231F` | `scripts/build-share-card.mjs` → `public/images/share/og-default.jpg` |
| Organization JSON-LD `logo` | stacked | palette PNG on paper, 1200 × 798 | `public/images/brand/clara-mendes-logo.png`, `organizationSchema` in `app/lib/seo.ts` |

`app/components/BrandLogo.tsx` draws the inline SVG from `logo.ts`; the five
links around it keep `aria-label="Clara Mendes home"` and the SVG is
`aria-hidden`. The italic Georgia rules (`.brand-mark`, `.hm-brand`,
`.os-brand`) are gone.
The one-line lockup in the header is a decision, not the owner's file: at the
header's 60 px inner height the stacked lockup would give ≈ 10 px capitals,
the one-line version gives ≈ 15 px. The official stacked lockup is what the
drawer, footer and share card show.

House rules: the black parts take the surrounding text colour (ink on light,
paper on the deep footer); the blocks never change colour; the mark stays on
the right; nothing in `public/` is WebP (Oxygen re-encodes it). The skill
`clara-brand-assets` (user-level) holds the procedure for new assets and for a
new logo file.

## Owner hand-off (not in the repo)

`Mine/shopify/clara-mendes-brand-2026-10-30/` holds the files only the owner
can place: the one-line lockup as a transparent PNG for the checkout logo
(Settings → Checkout → Customize) and the email templates (Settings →
Notifications → Customize), the stacked lockup, and square avatars (mark on
oat; lockup on paper) plus a Facebook cover for the social profiles. The
checkout and email logos still show the old italic wordmark until the owner
uploads these.

## Verification

Tests (616 on 2026-10-30): `scripts/logo.node-test.mjs`, `scripts/brandLogo.node-test.mjs`,
`scripts/shareCard.node-test.mjs`, `scripts/webManifest.node-test.mjs`.
Visual: dev-server screenshots at 1440 and 375 px of the header, open drawer
and footer, the favicon in a tab, and the share card file itself.
