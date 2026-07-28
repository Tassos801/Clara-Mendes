# LLM Wiki Log

## [2026-07-02] ingest | Initial Shopify codebase wiki

Created a Karpathy-style LLM wiki for the Clara Mendes Shopify Hydrogen
storefront. The initial ingest synthesized README, package metadata, Hydrogen
runtime files, route files, cart/analytics/catalog/fulfillment modules, CJ
product data, and launch/admin/fulfillment docs. Added `AGENTS.md` at repo root
to route future Codex threads to `docs/llm-wiki/index.md`.

## [2026-07-02] correction | CJ no longer current

Updated the wiki after the user clarified that Clara Mendes no longer uses CJ.
CJ-specific code, scripts, data, and docs are now described as legacy material,
and open questions now point to documenting the current non-CJ supplier and
fulfillment workflow.

## [2026-07-03] cleanup | Removed abandoned CJ integration

2026-07-03 — Removed abandoned CJ Dropshipping integration (code, scripts, data,
docs) from the repo and purged all CJ/fulfillment-webhook references from the
wiki. Deleted wiki pages: modules/fulfillment-automation.md,
modules/product-sourcing-automation.md.

## [2026-07-23] catalog | Prepared original-art replacement launch

Verified that the live Storefront API still exposed 47 available products and
that the saved Admin token had expired. Added nine original 4:5 artworks across
Quiet Form, Patina Blue, and Neo Deco; optimized storefront previews; prepared
8 × 10 sample-print candidates; added an idempotent Draft product staging
script; replaced the permissive supplier filter with a nine-product launch
allowlist; and documented the provider, sample, landed-cost, and activation
gates.

## [2026-07-24] catalog | Prepared Draft product-extension assets

Added deterministic production candidates and 56 review previews for twelve
art-product families across the five capsules. Created and audited all twelve
Shopify records as Draft, totalling 71 variants; kept the production generator
separate from the guarded Shopify sync; updated the storefront's fifteen-work
copy and print specifications; and retained SKU, shipping, margin, billing, and
physical-sample gates.

## [2026-07-24] storefront | Removed legacy navigation and email gate

Filtered empty collections from the former home-goods catalog, replaced
home-goods-only copy with print-led and product-neutral language, and removed
the customer-facing early-access mail links. Original-art previews now become
product links automatically when their handles are available through the
Storefront API; Draft works remain honest non-interactive previews until the
documented cost and billing gates are resolved.

## [2026-07-25] storefront | Added product-aware homepage editorial

Replaced the homepage's unrelated stock imagery with a coordinated art-in-room
suite built around Quiet Form, Patina Blue, and Sunlit Mosaic. Extracted the
section into a reusable component and content model, and added a
`homepage-editorial` Shopify collection integration so published product media,
titles, alt text, ordering, and links can replace the branded fallbacks without
changing storefront code.

## [2026-07-28] catalog | Reconciled Active prints with open Prodigi gates

Verified exactly 15 Active original prints available through the production
Storefront API and exactly 12 Draft extension families with 71 variants. Updated
the combined catalog audit to accept the intended split and removed the false
extension-product warnings. Recorded that activation occurred while Prodigi
billing, the Standard-shipping cost decision, and physical samples remain open,
and added acceptance criteria for a controlled three-design sample batch.
