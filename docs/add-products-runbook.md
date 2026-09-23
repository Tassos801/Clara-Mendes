# Adding prints — the runbook

One data file and one command from artwork to live verification. Nothing here needs a new module, a
route edit, or a one-off script. If a launch seems to need one, fix the
pipeline instead and update this page.

- **Data:** [data/print-catalog.json](../data/print-catalog.json) — the only file a launch edits by hand.
- **Command:** `npm run product -- <step> <collection>` ([scripts/product.mjs](../scripts/product.mjs)).
- **Storefront:** [app/lib/printCatalog.ts](../app/lib/printCatalog.ts) reads the same file; the shop filter, sellable list, sitemap gate and copy all derive from it.

`npm run product -- status` shows every print and its next step at any time.

## The launch, start to finish

| # | Step | What it does | Writes to |
| --- | --- | --- | --- |
| 0 | Edit the catalog | Add the collection and/or print entries (template below), `released: false` | repo |
| 1 | `prepare <collection>` | Source artwork → 1120×1400 WebP + 300 DPI JPEG per size; reports native PPI and crop | `public/images/product-art/<collection>/`, launch folder |
| 2 | `stage <collection> --apply` | Creates Shopify **Drafts** (tracked at 0 + DENY, pending tags); writes ids back to the catalog; proves no other product changed | Shopify, repo |
| 2b | `expand <collection> --apply` | For a size added to an already-released collection: creates the missing variants (tracked at 0 + DENY) on the live products, keeps every existing variant untouched, writes ids back | Shopify, repo |
| 3 | `handoff <collection>` | Prodigi checklist (SKU, provider SKU, print file, hash) as `.md` + `.csv` | launch folder |
| 4 | Map in Prodigi, then `mapped <collection> [--size 8x10] <print>=<channel product id> …` | Records each verified mapping | repo |
| 4a | `rooms <collection>` | Composites and checks four current room images per print; `--only a,b` leaves other prints untouched | `public/images/product-art-mockups/<collection>/` |
| 4b | `media <collection> --apply` | Checks room image hashes, then uploads four scenes to the **Draft** (or Active), keeps the flat image first, orders the gallery, refines copy/SEO; preserves product status | Shopify |
| 5 | `release <collection> --apply` | Untracks inventory, removes pending tags, activates, publishes, checks the Storefront API, then sets `released: true` | Shopify, repo |
| 6 | Commit → PR → owner merges → `verify <collection>` | Live checks: Storefront API price/availability, add to cart, PDP 200, sitemap, shop filter | launch folder |

`stage`, `expand`, `media` and `release` are dry runs without `--apply`. Every step is safe to
re-run; `--only a,b` limits any step to some prints, including `rooms`. Open the PR after step 2
so CI runs early — a staged print is invisible on the storefront until both
`released: true` is deployed **and** the product is Active and published.

Put the source artwork at `<launch folder>/<collection>/source/<print-slug>.png`
before step 1 (4:5 portrait; `.jpg`/`.tif` also accepted). The launch folder is
printed by `status`.

### Adding a size to a released collection

Add the variant to `collection.variants` (see the size table below). Each
released print keeps `releasedSizes` (the sizes a shopper can buy); the new
size is absent there until `release --apply` proves it on the Storefront API.
Then: `prepare` → `expand --apply` → `handoff` → map in Prodigi →
`mapped --size <size>` → `release --apply`. Between `expand` and `release` the
storefront shows the new size struck through as unavailable, with its price.

### Room scenes (four tailored images per print)

Each print carries `rooms`: four scenes in the order `living-room`, `bedroom`,
`study`, `wide-interior`, each with its own `alt`, a blank interior
`backgroundFile` under `scripts/assets/print-room-mockups/<collection>/`, and
a 4:5 `placement`. Run `npm run product -- rooms <collection> --only=<print-slug>`
after preparing its artwork and placing the four blank backgrounds. It composites
the exact flat artwork into every interior (1080×1350 JPEG under
`public/images/product-art-mockups/<collection>/` plus a hash manifest).
`status` shows `roomsReady`; `media` refuses missing or stale artwork,
backgrounds, or mockups before touching Shopify. It can finish the gallery
while the product is still Draft. Interiors are empty rooms: no art, text,
people or brands. The older `catalog:prints:room-mockups` command remains an
alias for regenerating a whole collection.

### Catalog entry template

```json
{
  "slug": "botanical-study",
  "title": "Botanical Study",
  "note": "One line shown beside the shop filter",
  "skuCode": "BS",
  "collectionCopy": "A Clara Mendes composition from the Botanical Study collection, …",
  "seoSuffix": "One sentence appended to every SEO description.",
  "publications": ["Clara Mendes", "Clara Mendes Headless"],
  "variants": [
    {"size": "8x10", "finish": "Unframed", "priceEUR": "29.99", "providerSku": "ART-FAP-EMA-8X10"}
  ],
  "prints": [
    {
      "slug": "fern-in-shade",
      "title": "Fern in Shade",
      "sequence": 1,
      "description": "One sentence; becomes the product description and SEO lead.",
      "alt": "Image alt text.",
      "palette": "Moss, ivory, charcoal",
      "rooms": [
        {"key": "living-room", "alt": "Specific living-room scene", "backgroundFile": "fern-living-room.png", "placement": {"left": 400, "top": 280, "width": 240, "height": 300}},
        {"key": "bedroom", "alt": "Specific bedroom scene", "backgroundFile": "fern-bedroom.png", "placement": {"left": 400, "top": 280, "width": 240, "height": 300}},
        {"key": "study", "alt": "Specific study scene", "backgroundFile": "fern-study.png", "placement": {"left": 400, "top": 280, "width": 240, "height": 300}},
        {"key": "wide-interior", "alt": "Specific wide interior scene", "backgroundFile": "fern-wide-interior.png", "placement": {"left": 400, "top": 280, "width": 240, "height": 300}}
      ],
      "released": false
    }
  ]
}
```

Derived, never typed: handle `fern-in-shade-art-print`, title `Fern in Shade Art
Print`, SKU `CM-BS-01-8X10`, image `/images/product-art/botanical-study/fern-in-shade.webp`.
Adding a print to an existing collection is just a new `prints` entry with the
next `sequence`.

Known sizes and their verified Prodigi SKUs (current prices for the originals):

| Size | Print file | Provider SKU | Price |
| --- | --- | --- | --- |
| `8x10` | 2400×3000 | `ART-FAP-EMA-8X10` (not `GLOBAL-FAP-8X10`) | €29.99 |
| `16x20` | 4800×6000 | `ART-FAP-EMA-16X20` | €39.99 |
| `20x24` | 6000×7200 | `GLOBAL-FAP-20X24` (metric 50×60 cm; 5:6, so a 4:5 source is cropped ~4%) | €49.99 |

## Gates that need a person

- **Owner:** accepts any print `prepare` flags (below 150 PPI native, or cropped); approves prices; merges the release PR.
- **Prodigi mapping** is dashboard-only. Per row in the handoff: provider SKU as listed, **Standard** shipping, **100% full bleed**, quality **Excellent**, "Fulfilled by Prodigi automatically" on a fresh load. Record the channel product id Prodigi shows for the row.
- **Publishing** is automatic only when the Admin token has `read_publications` + `write_publications`. Without them `release` activates the products, prints the Admin clicks (Products → filter tag = collection title → select all → ⋯ → Include in sales channels), and is simply re-run afterwards. Google and Facebook & Instagram are deliberately not in `publications`.

## Verify

`verify` must pass, and a launch is not done without screenshots (in the
owner's Chrome, not a hidden pane) of: the shop filter
`/collections/all?capsule=<collection>`, one PDP, and the cart after add to
cart. Follow-ups outside this pipeline: Merchant Center feed items, social.

## Machine setup (once)

Credentials and launch evidence live outside any one worktree. Lookup order:
`CLARA_ENV_DIR` / `CLARA_LAUNCH_DIR`, then `~/.clara-mendes.json`, then the
main worktree:

```json
{"envDir": "<folder holding .env and .env.shopify-admin.local>", "launchDir": "<folder for launch evidence>"}
```

`prepare` needs Python with Pillow (`PYTHON` overrides the interpreter).

## Known traps

- Prodigi image processing can stall account-wide (22 Sep 2026: every upload sat at "Processing" for hours, including a 2 MB file that had processed fine four days earlier). Nothing on our side fixes it; wait, then re-check the library before mapping.
- Prodigi "Add from URL" accepts a public Shopify staged-upload URL (`stagedUploadsCreate`, resource `IMAGE`) when a file cannot be sent from disk; the Admin token has no `write_files` scope, so Shopify Files is not an option.
- Chrome-extension uploads: the Prodigi file input is recreated after every upload, so look it up again before each file, and send one file per call (10 MB limit).
- Prodigi: upload print files from the **Image library page**, not the editor modal (it wedges on "Uploading…"). Both modals drop the first typed search — type, check, retype. The shipping select needs a focusing click; confirm it took after a reload.
- Browser automation: file upload only reads files under the session's working directory — copy the print files there first. `ctrl+a` types a literal "a"; triple-click instead.
- Dev server in a worktree: start it with `npm --prefix <abs path> run dev -- --path <abs path>`; codegen dirties `*.generated.d.ts` — revert before committing.
- `?variant=` links do nothing on Hydrogen; link sizes with option params.

## What this does not cover

The fifteen launch originals (`data/original-art-catalog.json`, their own sync
scripts and landing pages), the extension families (`EXTENSION_RELEASE_FLAGS`)
and the personalised products (`PERSONALISED_RELEASE_FLAGS`) keep their
existing runbooks. New print collections get a shop filter, not a landing page.
