# Sci-fi Listing Expansion and Social Launch Design

**Date:** 2026-09-22

## Objective

Turn the four released Sci-fi & Cinema prints into complete consumer-ready listings, each with a clean artwork image, four tailored room images, and three purchasable sizes. After the storefront and fulfilment path are verified, schedule a coordinated post for each design to the Clara Mendes Facebook and Instagram accounts.

## Products in scope

- Orbital Silence
- Neon After Rain
- Desert Signal
- The Fold

Unrelated Shopify products, publications, navigation, pricing, and fulfilment settings are out of scope.

## Listing media

Each product will have exactly five ordered media items:

1. Clean flat artwork as the primary image.
2. Tailored living-room scene.
3. Tailored bedroom scene.
4. Tailored study or reading-space scene.
5. Tailored wide interior that makes the print's physical scale legible.

Empty interiors may be generated, but the supplied artwork must be composited into each scene without being redrawn. Mockups may use a decorative frame for context, while product copy must say that the sold print is unframed and the frame is not included. Images must contain no text, logo, watermark, recognizable film property, actor, or franchise element.

The room palettes are:

- **Orbital Silence:** midnight blue, charcoal, brushed metal, restrained copper.
- **Neon After Rain:** mineral teal, dark walnut, charcoal, warm brass light.
- **Desert Signal:** terracotta plaster, sand linen, oak, warm desert daylight.
- **The Fold:** ivory plaster, travertine, mineral blue, terracotta, Mediterranean daylight.

## Variants and fulfilment

Each product will offer:

| Size | Price | Prodigi product |
| --- | ---: | --- |
| 8 × 10 in | €29.99 | `ART-FAP-EMA-8X10` |
| 16 × 20 in | €39.99 | `ART-FAP-EMA-16X20` |
| 20 × 24 in | €49.99 | `GLOBAL-FAP-20X24` |

The existing released 8 × 10 variants remain available. New variants are staged unavailable until their exact print file, full-bleed crop, Standard shipping, Prodigi channel product, and automatic fulfilment configuration are verified. The 20 × 24 asset uses the provider's 5:6 format and therefore requires an approximately four-percent crop from the 4:5 source; each design must pass an individual visual crop review. Low native-detail warnings remain visible in launch evidence and may not be described as native 300-DPI quality.

## Product copy and discovery

Descriptions will retain the design-specific story while adding concise material and buying information: 200gsm enhanced matte fine-art paper, archival pigment printing, three sizes, printed to order, unframed, frame not included, and a colour-variation note. SEO titles, descriptions, image alt text, and storefront size presentation must match the actual product state.

The Sci-fi & Cinema filter and rights-safe original-world positioning remain unchanged. No recognizable franchise terminology will be introduced.

## Reusable product pipeline

The current data-driven print pipeline remains the source of truth. It will be extended so an existing released print collection can safely gain:

- additional staged size variants without replacing the live base variant;
- four product-specific room-scene definitions;
- deterministic generation and upload of the five-image media set;
- idempotent readback that rejects duplicate, missing, misordered, or unexpected media;
- launch evidence for assets, mappings, Shopify state, storefront behavior, and cart behavior.

The same catalog structure and commands must support future print offerings without one-off product scripts.

## Consumer-readiness gates

A product is ready to buy only when all of the following are directly verified:

- exactly five READY Shopify media items in the intended order;
- three size variants with the approved SKU and EUR price;
- every size available for sale on the intended Clara Mendes sales channels;
- exact Prodigi mapping, full-bleed placement, Standard shipping, and automatic fulfilment for every variant;
- product description and SEO reflect the actual sizes and unframed finish;
- product page returns 200 on the live origin;
- mobile gallery exposes all five images;
- each size can be selected and added to cart with the correct price;
- collection filter, search, recommendations, and sitemap continue to expose the released products;
- unrelated products remain unchanged.

## Facebook and Instagram launch

After all four products pass the consumer-readiness gates, prepare and schedule four paired Facebook/Instagram posts through the verified `shopclaramendes` Clara Mendes identity, one post per design. Each post uses the design's signature tailored room image, a concise standalone caption, a soft shop call to action, and three to five relevant Instagram hashtags. Facebook copy stays shorter and uses no more than two hashtags.

Posts will be spaced approximately 48 hours apart in the 19:00–21:00 Europe/Bucharest window. Before scheduling, inspect the existing queue and move a post if it would collide with another campaign. A schedule is complete only when Business Suite readback shows the correct Facebook page and Instagram account, future timestamp, media, and Scheduled state. A processing or scheduling spinner is not completion.

## Evidence and rollback

Local tests, generated-asset manifests, Shopify GraphQL readback, Storefront API checks, live page/cart checks, and Meta Business Suite scheduled-state readback form the evidence pack. Product media and variant mutations must capture before-state IDs. If a listing update fails verification, restore its prior media order and keep unverified larger variants unavailable; do not disturb the working 8 × 10 purchase path.
