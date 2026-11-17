# Art & Words blankets: catalogue integration audit

Agent D, 17 November 2026. Read-only audit of branch
`codex/blanket-quotes-europe-2026-11-16` (base main `9de5486`). Answers plan
section 0.4: can a quote edition go through the existing `blanket` family with
no new pipeline code? Nothing was changed in code, data, Shopify or Printful.

## Verdict

**Works with small changes. No new family is needed.** The no-code route fails
on three uniqueness checks. The "own artwork record" variant of it cannot be
done truthfully. One optional `edition` field on a print-catalog collection, read by
those three checks and two smaller guards, removes the collisions. Everything else (handles,
SKUs, Shopify ids, feed ids, Printful routing, file-hash re-mapping, artist
pages) already works for a second blanket of the same museum work.

The three studio lines (Counter-Diagonal, Free Abyss, Circle Rhythm) cannot use
this route at all (see section 5). They need their own decision in Phase 3.

## 1. How a blanket product gets its identity

| Field | Rule | Source |
| --- | --- | --- |
| Handle | `<print slug>-blanket` | `app/lib/artProductCatalog.ts:1098-1103` |
| Title | `<print title> Throw Blanket` | `artProductCatalog.ts:1105-1110` |
| SKU | `CM-<collection skuCode>-<print sequence>-BLANKET50X60` | `artProductCatalog.ts:1116-1136`, variant def `:320-330` |
| Printful variant | `10986`, one variant, file key `blanket-50x60`, 7500 × 9000 at 150 dpi | `artProductCatalog.ts:737-772` |
| Shopify ids | written by `stage` per product | `scripts/lib/art-product-steps.mjs` |
| Feed item id | the variant SKU; `item_group_id` = handle | `app/lib/merchantFeed.ts:356-361` |
| Artist | `print.artworkId` → registry artwork → `artistId` | `app/lib/artistShops.ts:124-148` |
| Feed / search title | `titleWithArtist` adds "by <artist>" from the handle map | `artistShops.ts:286-316` |

A product hangs off a **print-catalog print** (`collection` + `print` slug,
`artworkId` must equal the print's, `artProductCatalog.ts:1716-1717`), and its
collection must be a print-catalog collection of `kind: "museum"`
(`artProductCatalog.ts:1554-1557`).

So a new collection, for example slug `art-and-words`, skuCode `AW`, with a print
`houses-at-murnau-quote` (sequence 1, `artworkId: "aic-129849"`), gives:

- handle `houses-at-murnau-quote-blanket`: no collision with `houses-at-murnau-blanket`;
- SKU `CM-AW-01-BLANKET50X60`: no collision (LC uses `CM-LC-03-…`);
- new Shopify product and variant ids, new Printful sync product: no collision;
- feed id = new SKU: no collision;
- supplied files read from the new collection's own `suppliedFiles` folder,
  whose `products/manifest.json` row is keyed by `work` + `product`
  (`scripts/lib/art-product-pipeline.mjs:483-485`). The existing
  `museum/seven-products-lc` folder is not touched.
- `syncFamilyProducts` finds existing entries by handle only
  (`art-product-pipeline.mjs:198-200`), so the live blanket is never refreshed by
  mistake.

## 2. Where it collides (the blockers)

| # | Check | File:line | What fails |
| --- | --- | --- | --- |
| C1 | One product per artwork per family | `app/lib/artProductCatalog.ts:1689-1695` | `aic-129849 already has a blanket product` |
| C2 | One museum print per artwork, across all collections | `app/lib/artistShops.ts:920-926` (`validateArtistLinks`) | `artwork aic-129849 is already sold as line-and-colour/houses-at-murnau` |
| C3 | One family product per artwork, across collections | `app/lib/artistShops.ts:943-951` | same message for `aic-129849:blanket` |

All three run in `npm test` and before every pipeline step, so the route stops
at `prepare`.

### Why "register the composite as its own artwork" does not get round them truthfully

- An artwork id must be `<museum>-<objectId>` (`app/lib/artRegistry.ts:447-448`),
  and `museum` must be one of six museum adapters (`:61`, `:443-445`). An id such
  as `aic-129849-quote` would require a false `source.objectId`.
- `original.sha256` is the museum file that was fetched. The rights screen and
  `familySourceSignature` treat it as the museum source (`artRegistry.ts:266`,
  `artProductCatalog.ts:1224-1240`). Putting the composite's hash there would be false.
- The rights screen needs the museum's own public-domain flag, designation and
  evidence URL for the object (`artRegistry.ts:238-241`). A composite has
  none of its own.
- The registry would hold two "artworks" for one painting. Artist pages
  (`artistArtworks`, `artistShops.ts:426-440`) and `llms.txt` work counts
  (`app/lib/llmsTxt.ts:362-364`) would count Houses at Murnau twice.

The quote edition is the same museum work with different product
layout. It should reuse `aic-129849` and be told apart by an explicit edition.

## 3. The smallest change (not implemented)

Add an optional `edition` (kebab-case string) to a **print-catalog collection**,
for example `"edition": "art-and-words"` on the new collection only. Existing
collections leave it out, so their keys and behaviour do not change.

| # | File | Change |
| --- | --- | --- |
| 1 | `app/lib/printCatalog.ts:86-101`, `:276-305` | Add `edition?: string` to `PrintCatalogCollection`; validate kebab-case. |
| 2 | `app/lib/artProductCatalog.ts:1690` | Identity key `${artworkId}:${family}:${edition ?? ''}`, with edition read from the print-catalog collection of `product.collection` (already loaded at `:1706`). |
| 3 | `app/lib/artistShops.ts:920` and `:945` | Same suffix on the `Prints` key and the family key. |
| 4 | `app/lib/artProductCatalog.ts:1327-1337` | For an edition collection, do not accept the global `cropsApproved(artworkId)`. Require the collection's own `suppliedApprovals[artworkId]`. Today `aic-129849` has an approved crop (`data/museum-crops.json`), so a quote composite would pass "crop approval" on an approval given for a different layout. This conflicts with plan §5 ("do not copy release approvals"). |
| 5 | `scripts/museum.mjs:694-702` (`catalogLinks`) | Skip edition collections. Today the last print of an artwork wins, so the museum tool would point `aic-129849` at the quote print. |
| 6 (guard) | `scripts/product.mjs` print verbs (`stage`, `expand`, `release`, `media`, `rooms` without `--family`) | Refuse an edition collection. Its prints exist only to carry family products. Without this, `stage art-and-words` with no `--family` would create plain art-print Drafts that duplicate Line and Colour. |

Tests: add cases to `scripts/artProductPipeline.node-test.mjs` and
`scripts/artistShops.node-test.mjs`. (a) The same artwork in an edition
collection validates. (b) The same artwork in a second collection **without**
an edition still fails C1–C3. (c) An edition product with only a global crop
approval is blocked. (d) A changed file sha256 after `prepare` unverifies the
mapping. The test for (d) already passes without changes, see section 4.

No change is needed to `FAMILY_SPECS`, `familySourceSignature`, the Printful
step, routing (`isPrintfulArtProduct` resolves by handle,
`app/lib/printfulShipping.ts:115-118`), feeds, or preview rotation (keyed on the
manifest's `rotated_90`, `scripts/lib/art-product-assets.mjs:483-517`).

## 4. Release gate for the composite: what holds truthfully

`familyReleaseIssues` (`artProductCatalog.ts:1298-1370`) needs the following:

| Gate | Source | Composite (artwork + typeset strip) |
| --- | --- | --- |
| Artist approval | registry artist | Inherited, true: same artist. |
| Cleared rights review + automated screen | registry artwork | Inherited, true **for the image**. The quote's own clearance (original text, translator death year, plan §0.3) is **not** checked by code. It lives in `docs/blanket-line/art-and-quotes.md` and must be a release-table item. |
| Cleared master review | registry artwork | Inherited, true: same museum master. |
| Crop approval or `suppliedApprovals` | `museum-crops.json` / collection | Today inherited from the global crop approval. **This is not truthful for a new layout.** Change 4 above. Until then the lead records `suppliedApprovals["aic-129849"]` in the new collection only after the owner approves the composite. |
| `block_identical` on every file | `masters/assembly.json` entry, copied verbatim (`art-product-pipeline.mjs:519-533`, `art-product-steps.mjs:321-350`) | **Truthful only if the text sits outside the museum pixels.** The composer must compare the pasted museum block with the source pixel for pixel and log `status: "ok"`, `block_identical: true` and `block_positions`. If the quote is set **on** the artwork (plan design rule 3, first option), the honest value is `false`, and the code correctly blocks release (`artProductCatalog.ts:1338-1345`, `:1795-1803`). **Releasable layouts under the current gate: strip or margin outside the artwork only.** |
| Current assets | `familySourceSignature` = renderer, family, file keys, museum original sha256, trim, crop area, preview renderer (`:1224-1240`) | Same as the plain blanket's signature. The signature does **not** include quote text, font or layout. |
| Native ppi ≥ floor or owner exception | `ppi` from the assembly `canvas` (`art-product-pipeline.mjs:531-540`), floor 150, exceptions per collection and artwork (`:1284-1295`, `:1593-1616`), lowest allowed 40 | Houses at Murnau was 48.7 ppi edge to edge. With a strip, the work prints smaller, so ppi rises slightly (about 52 at 47 in tall). It still needs a **new** owner exception in the new collection. Exceptions are keyed by collection and are not inherited. `canvas` must be logged at **museum-pixel scale** (museum image plus strip and margins, before upscaling), or the ppi figure is false. Typeset the text at the final 7500 × 9000 export, not on the 48-ppi canvas. |
| Shopify ids | `stage` | New product. |
| Verified mapping of the current file | `variantMappingCurrent`: `mapping.assetSha256 === file.sha256` and sync ids (`:1377-1392`) | New Printful sync product. |

### Does a quote change invalidate the Printful mapping?

**Yes, through the file hash, without code.** A new quote, font or layout gives
a new export, so a new sha256 in the manifest row. `prepare` then records it and
marks every verified variant whose file changed `verified: false`
(`art-product-steps.mjs:377-390`), and `variantMappingCurrent` fails until
the Printful file is re-synced and read back. A manifest row left on the old
hash fails `prepare` ("not the file its manifest records",
`art-product-steps.mjs:298-301`).

What is **not** covered: the catalogue does not say *which* quote is on the
file. A no-code way to record it is to put the quote facts in the composer's
`assembly.json` entry: `quote.text`, `quote.author`, `quote.source`,
`quote.translator`, `font.name`, `font.version`, `font.sha256`, `layout` (strip
box in file px), `composer` version. `prepare` copies that entry verbatim into
`assets.files["blanket-50x60"].provenance.aiFill`. That makes the catalogue
show what is printed. Putting the quote in `familySourceSignature`
adds nothing while files are supplied, because the file hash already changes.
Leave it out unless the pipeline starts to render the strip itself.

### Copy

- `familyDescription` (`art-product-pipeline.mjs:600-616`) prints
  `print.description`, the artist and work line, the collection `copy`, the
  family bullets, `SUPPLIED_REPRODUCTION`, and the museum credit. The quote,
  its source and "translation: Clara Mendes" go in `print.description` and the
  collection `copy` (data only).
- `SUPPLIED_REPRODUCTION` (`artProductCatalog.ts:203-204`) says a *plain*
  margin was added. That is incomplete for a strip that carries text. Either the
  collection copy states it ("A short line of the artist's own words is printed
  in a plain strip below the work"), or, as an optional extra change, the
  sentence becomes edition-aware.
- Title: `<print title> Throw Blanket`. If the print title is just "Houses at
  Murnau", the Shopify title repeats the live product's. No validator stops
  that. **Owner decision:** print title pattern, for example
  "Houses at Murnau, Art & Words" → "Houses at Murnau, Art & Words Throw
  Blanket by Kandinsky" in feeds.

### Artist pages and browsing (no change needed)

- `artistProducts` puts the quote blanket under Kandinsky (`artistShops.ts:124-148`).
  The new collection's title becomes a Shopify tag (`familyTags`,
  `art-product-pipeline.mjs:619-628`), and the artist query selects by tag
  (`artistShops.ts:394-397`). No Shopify collection is required.
- Works are deduplicated by `artworkId` (`artistShops.ts:426-440`), so the
  artist page still shows one Houses at Murnau. "Pair with" lists the plain
  and quote blankets next to each other (`artistShops.ts:481-483`).
- The facet "Collection" offers "Art & Words". The type filter stays "Blankets"
  (`releasedArtProductTypes`).
- A print-catalog print is required, so the new collection must also satisfy
  print rules that do nothing here: four room scenes (`printCatalog.ts:349-388`),
  at least one print variant (`:304-322`), and a committed web image
  `public/images/product-art/art-and-words/<slug>.webp` plus its
  `.sheet-small` copy (`scripts/printCatalog.node-test.mjs:67-75`,
  `scripts/siteSpeed.node-test.mjs:294-298`). Museum `prepare` makes the images.
  The rooms can stay unrendered because the print is never staged (change 6).
  This is friction, not a blocker. A later `familiesOnly` flag could remove it.

## 5. Studio lines (Counter-Diagonal, Free Abyss, Circle Rhythm)

They cannot use the family pipeline, with or without the changes above:

- Family collections must be `kind: "museum"` (`artProductCatalog.ts:1556-1557`).
  Museum prints need a registry artwork (`printCatalog.ts:338-341`), and registry
  artworks need a museum source and id (`artRegistry.ts:443-448`).
- The rights screen requires `kind: "historical"` and a museum attribution
  match (`artRegistry.ts:245-257`). A studio composition is neither. Registering
  one would put "Art by Van Doesburg" on our own work, which plan §3 forbids.
- `clothingArtists.ts` is a static list of capsule handles for `/artists`. It
  carries no product data and must not hold blankets (plan §5).

A studio blanket made outside the catalogue (as the clothing lines are) is
also not enough today. It would be hidden by `isStoreThemeProduct`
(`app/lib/catalogFilters.ts:501-518`: only listed handles or approved clothing
pass), and a `Blankets` product that is not a family product gets no Printful
fee line and no feed item (`app/lib/printfulShipping.ts:132-135`,
`app/lib/merchantFeed.ts:222`).

**Phase 3 needs its own design:** a studio source kind (artwork authored by
Clara Mendes Studio, with an `inspiredBy` registry artist used for discovery
and "Inspired by" copy only), or a deliberate second sales path for studio
home goods. Decide after Phase 1 (plan §0.5 item 4). Do not stretch the museum
records to fit.

## 6. Steps for one design (after changes 1–6 are merged)

Example: Houses at Murnau. Run on a machine with the launch folder
(`~/.clara-mendes.json`). Every Shopify and Printful write step is a dry run
unless `--apply` is given. The steps that write are marked; run them only with
owner authorisation (plan Task 6).

1. Data (one PR):
   - `data/print-catalog.json`: new collection `art-and-words`, `kind: "museum"`,
     `edition: "art-and-words"`, `skuCode: "AW"`, title "Art & Words" (working name),
     `publications`, one placeholder print variant (never staged), and print
     `houses-at-murnau-quote` (sequence 1, `artworkId: "aic-129849"`,
     `orientation: "landscape"`, quote and credit in `description`,
     `released: false`, four room entries).
   - `data/art-product-catalog.json`: collection `art-and-words`, `copy`,
     `suppliedFiles: "museum/art-and-words"`, `families.blanket` with
     `providerSku: "10986"` and **no `priceEUR`** until the owner approves a price.
     Do not copy `ppiExceptions` or `suppliedApprovals` from `line-and-colour`.
2. Files (Agent C) in `<launch>/museum/art-and-words/`:
   `products/manifest.json` row `{work: "aic-129849", product: "blanket-50x60",
   pixels: [7500, 9000], dpi: 150, sku: "Printful 395 / Throw Blanket 50x60
   (variant 10986)", rotated_90: true, file, sha256, source_master:
   "masters/aic-129849/blanket.png", source_sha256, aspect_trim_percent,
   hanger_strip_mm: 0}`, and `masters/assembly.json["aic-129849/blanket"]` with
   the truthful `block_identical` check, `canvas` at museum scale, and the quote
   and font facts (section 4). Follow `docs/blanket-line/print-template.md` for
   margins and text size.
3. `npm run product -- prepare art-and-words` (museum print web image and sheet
   only, local), then
   `npm run product -- prepare art-and-words --family blanket` (local; checks
   the manifest and log, records provenance, draws the upright preview).
   Expect "below floor" until the owner adds the exception.
4. `npm test` (C1–C3 must pass), then `npm run lint`, `npm run typecheck`.
5. Owner: approve the composite (`suppliedApprovals`), the ppi exception, the
   price and the title, recorded in `data/art-product-catalog.json`.
6. `npm run product -- stage art-and-words --family blanket` (dry run), then
   `--apply` (**writes**: hidden Shopify Draft, tracked at 0 with DENY).
7. `npm run product -- printful art-and-words --family blanket` (dry run), then
   `--apply` (**writes**: Printful file and sync). Then
   `npm run product -- mapped art-and-words --family blanket --printful <readback.json>`.
8. Before and after evidence: `houses-at-murnau-blanket` keeps its ids, file
   sha256 `86f716bb…` and sync ids `482179489` / `5577605633`.
9. Release only with explicit owner go-ahead:
   `npm run product -- release art-and-words --family blanket --apply`, then
   `npm run product -- verify art-and-words --families`.

## 7. Risks

- **Overlay placement is not releasable.** A quote on the artwork makes
  `block_identical` false. If the owner prefers that look, the gate needs a
  different, honest check (museum pixels unchanged outside a logged text box).
  That is a code change and an owner decision.
- **Inherited crop approval** (change 4) is the one place where the current
  code would pass a new layout on an old approval.
- **Edge loss on the supplier side.** Printful's print file for 10986 is
  9450 × 7950, not 7500 × 9000. See `print-template.md`. The live 28 blankets
  are affected the same way. Not in scope here.
- **Quote rights are outside the code gate.** They must be a release-table row
  per design.
- **Placeholder print data.** The new collection needs print variants and rooms
  it never uses. Change 6 stops accidental staging. Without it, an operator
  mistake could create duplicate art-print Drafts.
- **Studio lines** have no route yet (section 5).
