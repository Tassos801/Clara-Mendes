# Art & Words blankets: print template and text limits

Agent B delta check, 17 November 2026 (plan §0.4 a and b). Sources: read-only
Printful API GETs (catalog product 395, variant 10986, printfiles, mockup
templates, mockup styles, availability; store 18868484) and Printful's public
help centre. No orders, uploads or mockup tasks. Costs are left out on purpose
(public repository).

## 1. Printful's own statements

| Item | Value | Source |
| --- | --- | --- |
| Product | Throw Blanket, catalog product 395, variant 10986 "Throw blanket 50″×60″", technique sublimation, not discontinued | `GET /products/395`, `GET /v2/catalog-variants/10986` |
| Material | 100% polyester, soft silk-touch, printed on one side, white reverse, machine-washable, hypoallergenic, flame retardant, "Blank product sourced from China" | product description (API) |
| Stock | 10986 in stock in regions EU, EU_LV (Latvia) and US; v2 availability: sublimation, worldwide, in stock | `GET /products/variant/10986`, `GET /v2/catalog-variants/10986/availability` |
| Print file | printfile 208: **9450 × 7950 px at 150 dpi** (63 × 53 in, 160.0 × 134.6 cm), `fill_mode: cover`, `can_rotate: true`; vertical orientation uses printfile 209, 53 × 63 in | `GET /mockup-generator/printfiles/395`, `GET /v2/catalog-variants/10986` (`placement_dimensions`) |
| Minimum dpi accepted | 75 | `GET /mockup-generator/templates/395` |
| Placement shift | Sublimation design "may shift slightly during printing, up to 2 inches in any direction"; avoid designs that rely on exact placement | [What should I know about all-over printing?](https://help.printful.com/hc/en-us/articles/50264464097297-What-should-I-know-about-all-over-printing) (updated 2026-10-25) |
| Edges | Pre-made sublimated items: "minor white streaks or creases" possible near stitched areas such as edges | same article |
| Safe area | Keep text and key visuals inside the safe print area; small shifts in printing and cutting can crop elements near the edge | [What is the safe print area?](https://help.printful.com/hc/en-us/articles/50264024409233-What-is-the-safe-print-area) |
| Text resolution | Sublimation smooths fine detail; for "fine lines, small details, or text" Printful recommends **300 DPI** | [150 vs 300 DPI](https://help.printful.com/hc/en-us/articles/50264138559377-Is-there-a-difference-in-quality-between-150-and-300-DPI) |
| Care | Sublimation blankets: machine-wash cold (max 30 °C), no bleach or dry-clean, hang-dry or tumble-dry low | [How do I take care of my products?](https://help.printful.com/hc/en-us/articles/50263252811537-How-do-I-take-care-of-my-products) |

**Not found:** a blanket-specific safe area, hem width or minimum text size or
line thickness for sublimation. The API returns none, and the public product page and
help centre do not state one. The product's "File guidelines" tab in the
logged-in Printful dashboard is the remaining place to check. Printful's only
numeric text rule is for a different technique (DTFlex: lines ≥ 1 pt, text
10–12 pt, [Disclaimers](https://help.printful.com/hc/en-us/articles/50264395400337-Disclaimers-for-Printing-Techniques)).

## 2. What that means for our file (judgement)

The finished blanket is 50 × 60 in. Printful's print area is 53 × 63 in, so
it extends **1.5 in (38 mm) past each finished edge**. That margin is lost to
the hem and the edge, or printed past it.

Our pipeline supplies **7500 × 9000 px** (`blanket-50x60`,
`app/lib/artProductCatalog.ts:747`), not Printful's 7950 × 9450. With
`fill_mode: cover` and the default centred position, Printful enlarges it
×1.06 to 7950 × 9540 and trims 45 px from each short end. (The sync position cannot be read
through the API for a Shopify-connected store, so this is an inference.) In our file's pixels:

| Our file edge | Beyond the finished edge | Effective scale |
| --- | --- | --- |
| Long sides (x = 0, x = 7500) | **≈ 212 px** | 141.5 file px per printed inch |
| Short ends (y = 0, y = 9000) | **≈ 255 px** | (≈ 5.57 px per mm) |

A landscape work is rotated 90° in the portrait file (manifest `rotated_90`),
so the **lower edge as the shopper sees it is a long side of the file**. For a
portrait work it is the file's bottom end.

## 3. Numbers for the designers

| Rule | Value | Basis |
| --- | --- | --- |
| Text to finished edge, **minimum** | **64 mm (2.5 in)** | Printful's 2 in maximum shift plus 0.5 in for the hem streak zone (judgement) |
| Text to finished edge, **recommended** | **76 mm (3.0 in)** | judgement |
| Same, in our 7500 × 9000 file, landscape work (lower edge = long side) | min **570 px**, recommended **640 px** from the file edge | 212 px + margin × 141.5 px/in |
| Same, portrait work (lower edge = bottom end) | min **610 px**, recommended **680 px** from the file edge | 255 px + margin × 141.5 px/in |
| One rule for both | **keep all text ≥ 700 px from every file edge** | rounds the above up |
| Same, if files ever move to Printful's own 9450 × 7950 template | min 600 px, recommended 675 px from the template edge | 225 px + margin × 150 px/in |
| Quote capital height, **minimum** | **8 mm = 47 px at 150 dpi** (prints ≈ 8.5 mm after ×1.06) | plan §0.4 start value (judgement); no Printful figure |
| Quote capital height, **recommended** | **10 mm = 59 px** | judgement for brushed polyester |
| Credit line capital height, minimum | 5 mm = 30 px | judgement |
| Thinnest stroke (stems, serifs, rules) | ≥ 1.3 mm ≈ 8 px | judgement; in line with Printful's "lines can't be too thin" and DTFlex 1 pt rule (other technique) |
| Weight and face | Regular only if the stems pass 1.3 mm at the chosen size, else medium. No hairline (Didone) serifs. Tracking +2–4%. | judgement |
| Text resolution | Typeset from vector at the final 7500 × 9000 export with anti-aliasing. Printful recommends 300 dpi for text; our pipeline fixes 150 dpi | Printful statement + pipeline constraint |

Text at the 8 mm minimum on a 38 mm edge allowance plus a possible 2 in shift
means the first physical piece is the real proof. A sample remains the owner's
call (plan §0.5 item 1).

### Consequence for the strip

A plain strip of about 6% of the 127 cm side (76 mm, as in the concept
reference) cannot hold text with a 64 mm bottom margin. With a 10 mm quote in
two lines, a 5 mm credit and a 15 mm gap to the artwork, the strip needs about
**125 mm (≈ 10% of 127 cm)**. **Designer and owner choice:**

1. a strip of about 10% below the work (releasable under the current gate);
2. a thinner strip, accepting text closer to the edge than Printful's stated shift;
3. text on the artwork itself. This needs a code change: the museum-pixel check
   fails, see `integration.md` section 4.

## 4. Open items for the lead

- Check the "File guidelines" tab for product 395 in the logged-in dashboard
  for a stated safe area or hem width. Replace the judgement rows if it gives one.
- Moving to 300 dpi text, or to Printful's native 7950 × 9450 file, means a
  change to `FAMILY_SPECS.blanket.suppliedFiles` and new files for the whole
  family. Not proposed for Phase 1. The pipeline notes that files over 20 MB
  need a manual Printful upload (`docs/add-products-runbook.md`).
- The same ×1.06 enlargement and edge loss apply to the 28 live blankets. No
  action is proposed; noted for completeness.
