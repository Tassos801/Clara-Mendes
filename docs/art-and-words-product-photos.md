# Art & Words blankets: product photos with Codex

Brief for a Codex session on the owner's PC: one professional in-room
photo for each of the three Art & Words quote blankets. These photos fill
the gallery's scene slot that `media` already supports. Written
2026-11-17 for PR #214 (products staged as Drafts, unreleased).

Codex has the image tool, the launch folder with the print files, and the
Shopify token. A cloud session has none of them.

## What goes where

| Product handle | Work | Print file (launch folder) | Scene file to write |
| --- | --- | --- | --- |
| `the-great-wave-off-kanagawa-quote-blanket` | Hokusai, landscape | `museum/art-and-words/products/met-39799/the-great-wave-off-kanagawa-blanket-quote-print.jpg` | `art-and-words/blanket/scene/the-great-wave-off-kanagawa-quote-blanket.jpg` |
| `composition-with-red-yellow-and-blue-quote-blanket` | Mondrian, portrait | `museum/art-and-words/products/cma-1967.215/composition-with-red-yellow-and-blue-blanket-quote-print.jpg` | `art-and-words/blanket/scene/composition-with-red-yellow-and-blue-quote-blanket.jpg` |
| `painting-with-troika-quote-blanket` | Kandinsky, landscape | `museum/art-and-words/products/aic-8983/painting-with-troika-blanket-quote-print.jpg` | `art-and-words/blanket/scene/painting-with-troika-quote-blanket.jpg` |

- The scene paths come from `familyScenePath()` in `scripts/lib/art-product-pipeline.mjs`.
- The upright previews (`art-and-words/blanket/web/<handle>.webp`, 1600 × 2000) show the blanket as a shopper sees it. Use them as the reference image.
- The print files are 7500 × 9000. The two landscape works are stored a quarter-turn anticlockwise (manifest `rotated_90`), so always work from the preview, or turn the file clockwise first.
- Never edit, re-save or move a print file or a preview. Their sha256 values are recorded, and `release` stops if either changes.

## The product, so the photo does not mislead

- Silk-touch 100% polyester throw, 50 × 60 in (127 × 152 cm), printed on one side with a white back (`FAMILY_SPECS.blanket` in `app/lib/artProductCatalog.ts`). Ask Printful's product page about the edge finish before showing one up close; the repo doesn't record it, so keep the edges soft in the photo.
- Scale matters: on a three-seat sofa the throw covers roughly one seat and the arm, not the whole sofa.
- The face is the artwork with the words set on it in EB Garamond, in black, plus a small credit line and a smaller "Clara Mendes". Exact text, character for character:

| Work | Quote | Credit | Where it sits (upright, from the top left) |
| --- | --- | --- | --- |
| Great Wave | At a hundred and ten, every dot and every stroke will seem alive. | Katsushika Hokusai, 1834 | Quote at the right, about 71–92% across and 50–54% down. Credit just below it. Brand near the bottom right. |
| Composition with Red, Yellow, and Blue | On a flat plane I construct lines and colour combinations, to show universal beauty as consciously as I can. | Piet Mondrian, 1914 | Quote at the lower right, about 69–91% across and 72–79% down. Credit below it. Brand at the bottom left. |
| Painting with Troika | Colour is a means of exerting a direct influence on the soul. | Vasily Kandinsky, 1912 | Quote at the upper right, about 71–91% across and 16–20% down. Credit below it. Brand lower right. |

These positions were worked out from `editionFiles[*].textBoxes` in
`data/art-product-catalog.json`. The previews are what counts.

## Shot list (one hero scene per blanket)

All three photos are one set: natural daylight from the side, soft
shadows, eye-level or slightly above, a 50 mm look, and calm, uncluttered
interiors. They should be evergreen: no Christmas props, because these
photos stay in the gallery. Each blanket is draped so that **the part of
the face with the words lies flat, unfolded and square to the camera**,
and a fold or roll shows the white back at one edge.

1. **Great Wave.** A Japandi living room with light oak, a warm-white linen sofa and pale plaster walls. The throw lies over the sofa back and down the seat, landscape and upright. Indigo and white should be the strongest colours in the room.
2. **Mondrian.** A bright, minimal reading corner with white walls, a black steel floor lamp and a pale bouclé armchair. The throw hangs portrait over the chair back onto the seat, with the lower-right quote flat on the seat-back face.
3. **Kandinsky Troika.** A warm reading nook with terracotta and olive tones, a low wooden bench or daybed, and a woven rug. The throw lies landscape across the bench with its upper right edge (the quote) flat on top.

Leave out: people, pets with faces in focus, other artworks or posters,
books with readable titles, any logo or brand other than the one printed
on the blanket, and any text in the room.

## How Codex makes each photo

1. Generate the scene with the image tool, giving the upright preview as the reference image. Tell it: "the printed design and its words must be reproduced exactly; do not redraw, translate, restyle or add text."
2. **Check the words.** Crop the text region of the result at full size and read it against the table above, character for character, including the credit and "Clara Mendes". Then compare the artwork's colours and composition with the preview. Image models often garble small text, so expect retries.
3. **If the words are wrong after two tries,** keep the room and the drape and repair the face from the real pixels: perspective-warp the matching region of the preview onto the flat panel (PIL or sharp locally), match the light with a gentle shadow and grain pass, and check the words again. The words in the final photo must be pixels from our file or a letter-perfect generation, never an approximation.
4. **Write the result** as JPEG, sRGB, 4:5 portrait, at least 1600 × 2000 (2400 × 3000 preferred), quality around 88. Strip metadata other than the colour profile.
5. Note for each photo the tool, the prompt, the reference file and the sha256 of the result in `art-and-words/blanket/scene/PROVENANCE.md` in the launch folder.

## Into Shopify (staged Drafts only)

```sh
npm run product -- media art-and-words --family blanket          # dry run: plan per product
npm run product -- media art-and-words --family blanket --apply  # preview first, scene second
```

`media` only adds images and reorders them. It never deletes and never
touches the print files, prices or copy. The scene gets the alt text
"<work> by <artist> as a throw blanket, in a room" (`familyImageAlt`). The products stay Draft. Run it before or after
`release`; it works on both.

## Review before release (owner)

- Look at each gallery in Admin: the preview first, then the scene.
- The scene must be a fair picture of the product. The colours, the words, the size against the furniture and a one-sided print with a white back must all match. Delete any photo that fails in Admin and re-run `media` once a new one exists.
- Then continue with the release steps in PR #214.
