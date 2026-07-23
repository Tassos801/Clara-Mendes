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
