# Prodigi Natural Classic Frame Source

`prodigi-natural-classic-frame.png` is the Natural blank from Prodigi's
official [Classic frame blanks](https://www.prodigi.com/download/blanks/prodigi-classic-frame-blanks.zip)
download. The five files in `artwork/` are the original 1120 x 1400 product
images downloaded from the corresponding live Clara Mendes Shopify products.

`scripts/generate-classic-frame-mockups.mjs` verifies every source digest before
combining them. It preserves the artwork pixels, uses a 16:20 no-mat opening,
and scales the frame face to Prodigi's published 20 mm specification.
