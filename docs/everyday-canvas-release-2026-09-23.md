# Everyday canvas release — 2026-09-23

The owner waived physical samples for the current release. `stretched-canvas-art-16x20` is the only newly released Art for Everyday Living family. Its five artwork variants are automatically fulfilled in the connected Prodigi Shopify channel as `GLOBAL-CAN-16X20`, 16 × 20 in stretched canvas with a 38 mm bar and mirror wrap. Prodigi rates all five attached files **Acceptable**. Standard shipping is selected. The Cyprus single-item Standard quote was €30.00 item + €25.84 shipping + €10.61 tax = **€66.45**; Shopify retail is **€89.00** before any customer shipping charge. Payment fees, market tax treatment, mixed-cart shipping, and physical print quality remain to be confirmed by a real order.

In Shopify the canvas is Active, tagged without pending gates, published to `Clara Mendes` and `Clara Mendes Headless`, and untracked as a print-on-demand item. All five variants returned `availableForSale: true` at EUR 89 through the Storefront API and each created a one-line cart without an error. The Art for Everyday Living manual collection now contains the canvas plus the previously released greeting card and postcard; unreleased drafts in that collection remain hidden by their Draft status and the storefront release flags.

Other draft decisions from this audit:

- `large-fine-art-print-16x20` is still Draft and unpublished. It duplicates the existing 16 × 20 in original-art print (same first artwork in each capsule and 200gsm enhanced matte paper) at €49 versus the existing €39.99 price. A brief activation was reversed before this deployment; Storefront API readback must show it absent.
- `classic-framed-art-print-16x20` remains Draft and unpublished because the owner previously specified a separate frame-only product in 8 × 10, 16 × 20, and 20 × 24 in sizes. The connected `GLOBAL-CFP-16X20` mapping supplies a print with the frame, so it cannot satisfy that offer.
- `art-premium-fleece-blanket-30x40` remains Draft: Cyprus supplier total €84.58 exceeds its €79 retail price.
- The notebook's connected Prodigi product is A5 (14.8 × 21 cm), while its Shopify and manifest copy says 6 × 8 in. The 2026 calendar maps to 2027 dates. Journal, tote, cushion, phone case, and Light & Silence prints lack complete per-variant automatic fulfillment mappings. These families stay hidden until their specific gaps are fixed.

Live Hydrogen verification and social scheduling are recorded separately after production deployment.
