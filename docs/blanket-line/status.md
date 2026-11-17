# Art & Words blanket line status

**Updated:** 17 November 2026, end of day (office PC)

**Shared branch:** `codex/blanket-quotes-europe-2026-11-16` (draft PR #206, tracking issue #205)

**Current writer:** none. The next session must claim it here before writing.

On a new PC, read [the handoff](HANDOFF.md) first. Plan: [implementation plan](../superpowers/plans/2026-11-16-blanket-quotes-europe.md); its section 0 wins over later sections.

## Where we are

Three of the 14 designs are finished, staged as hidden Shopify Drafts and mapped in Printful. They are **not released**. The other 11 designs are not started beyond the quote research.

## Owner decisions taken on 17 November

| Decision | Choice |
| --- | --- |
| Where the quote sits | Printed on the artwork, not on a separate strip |
| Text size | Larger second round: the quote line is 20–22% of the blanket width |
| Kandinsky artwork | Painting with Troika (Houses at Murnau was too busy for black text) |
| Mondrian wording | The full sentence, in four lines |
| Physical sample | None before launch; the first paid order is the quality check |

## Done

- **Quotes** ([art-and-quotes.md](art-and-quotes.md), PR #212): 10 of 14 rows cleared. Every English wording is a Clara Mendes translation from the artist's own text. Klimt needs a source check. Hiroshige, Renoir and Vermeer have no authentic quote and need a line credited to the studio.
- **Catalogue audit and print limits** ([integration.md](integration.md), [print-template.md](print-template.md), PR #211): text at least 64 mm from the finished edge, capitals at least 8 mm.
- **Three final print files:** Great Wave (Hokusai), Composition with Red, Yellow, and Blue (Mondrian), Painting with Troika (Kandinsky). EB Garamond Regular from the repo's `public/fonts`, near-black, quote capitals 14.5–16.8 mm, strokes 1.5–1.9 mm, every letter at least 93 mm from an edge, no artwork pixel changed outside the letters. See the [final contact sheet](proofs/final-contact-sheet.jpg), the [round-two comparison](proofs/round-two-contact-sheet.jpg) and the [manifest](proofs/final-manifest.json). The 7500 × 9000 print files are in the office launch folder (collection `art-and-words`) and in Printful.
- **Code on `main`** (PR #213, merged): `edition` support in the blanket family, a release check for text on the artwork, mapping invalidated when quote, credit or font change, and the three designs registered in collection `art-and-words`.
- **Staged and mapped** (PR #214, open against `main`): three hidden Drafts, one 50 × 60 in variant each, title "<Work> Throw Blanket, Art & Words", at the existing blanket price as a placeholder. Handles: `the-great-wave-off-kanagawa-quote-blanket`, `composition-with-red-yellow-and-blue-quote-blanket`, `painting-with-troika-quote-blanket`. Printful sync variants are on catalog variant 10986 and each Printful file matches the approved print file. `verify` passed 6 of 6. The three handles return 404 on the storefront. The three existing blankets of the same artworks were read before and after and are unchanged.

## Still missing

1. **Merge PR #214** (records the Shopify ids and Printful mappings on `main`).
2. **Owner confirms before release:** the title pattern, the retail price, and the credit wording ("Vasily" or "Wassily"; "1914" or "letter, 1914").
3. **Mondrian credit line:** its stroke is 1.19 mm, under the 1.3 mm target. It was kept at 80% of the quote size on purpose; the owner may want it larger, which means a new file, a new approval and a new mapping.
4. **Release of the three**, only on the owner's word: `npm run product -- release art-and-words --family blanket --apply`, add the products to the sales channels in Shopify admin (the API token cannot publish), run `release` again, then `verify`, then a PR with the release flags. After release: check the checkout shipping fee, add them to the gifts page if wanted, check the feeds and the artist pages.
5. **The other 11 designs:** layouts for the 7 remaining cleared quotes; studio lines for Hiroshige, Renoir and Vermeer (owner approves the wording); the Klimt source check; and new blanket compositions for the three studio lines (Counter-Diagonal, Free Abyss, Circle Rhythm), which also need a studio source kind in the catalogue.
6. **Plan section 0.5 decisions still open:** countries beyond the EU, and whether the studio lines start now.
7. **Not verified by anything yet:** how the text prints on real fleece.

## How to continue on another PC

```sh
git clone https://github.com/Tassos801/Clara-Mendes.git
cd Clara-Mendes
git switch codex/blanket-quotes-europe-2026-11-16   # plan, quotes, audit, proofs, this file
git switch main && npm ci && npm run product -- status
```

Live writes (release, mapping, publishing) need the Shopify admin and Printful credentials and the launch folder with the print files; these exist only on the office PC. Work that can continue anywhere: quote research, studio lines, review of PR #214, layouts for the next designs (the scripts that built the proofs are on the office PC; the method and all measurements are in the manifest).
