# Clothing destination implementation plan

> Use subagent-driven-development for the catalog implementation and independent specification and code reviews. The user approved the full design brief in this chat and requested implementation.

**Goal:** Build a permanent clothing destination, homepage entry and coherent shop navigation that supports future Shopify-managed garments without exposing unapproved products.

**Architecture:** A `/clothing` route loads approved channel-visible apparel and collection metadata from Shopify. A shared classification module separates garment categories from named capsules. Existing product routes, cart behavior and fulfillment guards remain authoritative. The homepage gets an editorial teaser and the shell gains Clothing navigation. Changes stay in this isolated local review branch; no deployment or Admin mutation occurs during preparation.

**Tech stack:** Existing Hydrogen 2026.4, React Router 7, TypeScript, CSS, Shopify Storefront and read-only Admin queries, native Node tests, browser inspection.

## Task 1 — Catalog foundation and audit
- [ ] Inspect existing eligibility queries and obtain a read-only catalog snapshot.
- [ ] Implement `app/lib/clothing.ts` for strict clothing membership, future approval eligibility, garment categories, capsules and safe query assembly.
- [ ] Extend `catalogFilters.ts` and product fragments/query consumers so future explicitly approved apparel works on listing, search, PDP and sitemap surfaces, preserving all existing forbidden/release gates.
- [ ] Add behavioral tests proving future approved garments work, missing approvals remain hidden, non-clothing cannot leak in, and existing releases remain valid.
- [ ] Prepare a product/collection before-and-after audit and Shopify Admin addition runbook; no live edits.

## Task 2 — Art direction and clothing page
- [ ] Create new watercolor page artwork in the approved palette; save source and optimized variants with provenance separately from garment artwork.
- [ ] Implement `app/routes/clothing.tsx`, `app/components/ClothingProductCard.tsx` and `app/styles/clothing.css`.
- [ ] Use real product option/variant images for color selection and real price data; route size selection and cart through existing PDPs.
- [ ] Provide a compact editorial hero, category navigation based on actual products, sort/load-more behavior, current capsule and story/detail sections, empty/error states and SEO.
- [ ] Verify at narrow mobile and desktop widths, including keyboard and reduced motion.

## Task 3 — Home and shop integration
- [ ] Add a data-driven `ClothingFeature` to homepage and Clothing in desktop/mobile/footer navigation.
- [ ] Present garment types under Clothing, capsule discovery separately, and preserve older URLs.
- [ ] Add `/clothing` to custom sitemap and redirect `/collections/clothing` to the permanent destination.

## Task 4 — Review and verification
- [ ] Run baseline and final native Node tests, typecheck, lint and production build.
- [ ] Review specification compliance, resolve findings, then review code quality.
- [ ] Exercise homepage → clothing → color → product → size → cart and remove test cart lines.
- [ ] Update the maintained wiki, asset provenance, category audit and operator instructions.
- [ ] Open a persistent local preview and report exact delivered/untested state. Keep live site and Shopify publication states unchanged.
