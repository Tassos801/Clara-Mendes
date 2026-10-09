# Clara Mendes: new direction

**Updated:** 9 October 2026  
**Owner:** Tassos  
**Status:** Implementation started on 9 October 2026; not released  
**Development branch:** `codex/artist-shops-pilot` (production remains `main`)  
**Resume:** Read [HANDOFF.md](HANDOFF.md) and [status.md](status.md) before editing.

## 1. Direction

Clara Mendes will offer a curated range of historical art sourced directly from museum open-access collections. The brand's value is its selection, faithful reproduction, room presentation and buying experience. Access to freely available artwork is not a competitive advantage by itself.

Each artist will have a dedicated shop page containing every approved product featuring their work. Customers can browse by artist or by product type. Both journeys lead to the same product listings.

Start with one coherent collection of approximately ten artworks, across one or two artists, sold as fine art prints. Build the artist structure from the beginning so framing and other products can be added later. A broad Society6-style catalogue is a possible destination, not the first release.

Keep the Clara Mendes name, our storefront, Shopify checkout and customer relationships. Prodigi remains the intended print supplier. Existing Printful apparel and Clara Mendes generated collections remain supported, with their current approval requirements.

## 2. First release

| Area | First release | Later, when justified |
| --- | --- | --- |
| Collection | Approximately ten selected artworks | More works and coherent collections |
| Artists | One or two, with dedicated shops | More artists and useful era/movement filters |
| Sources | One museum adapter; a second only if needed | Additional adapters when a collection needs them |
| Products | Fine art prints in qualifying existing sizes | Framed prints, then selected additional families |
| Storefront | Artists index, artist shops, artist links, existing product pages | Artwork pages with multiple product families |
| Operations | Verify and reuse the existing print workflow | Custom Prodigi API routing if needed |
| Presentation | Approved artwork image and accurate room mockups | Templates for each additional family |

**Working candidate:** a Japanese landscape collection using Hokusai and/or Hiroshige. Final selection depends on museum images, rights evidence, print dimensions and visual coherence. This is not a completed artwork shortlist.

Mucha, Haeckel and William Morris remain future candidates. There is no requirement to launch five artists together.

Outside the first release: living-artist uploads, royalties, payouts, marketplace functionality, furniture, new apparel, automatic restoration at scale, ten museum integrations, bundles and a full merchandise catalogue.

This is a build brief. Deployment, catalogue publication, orders, payments, advertising and public communications require the relevant later instructions. Nothing is scheduled by this document.

## 3. Catalogue model

```text
Artist
  Artwork
    Product family listing
      Sellable variant
```

| Record | Required information | Rules / Notes |
| --- | --- | --- |
| Artist | Stable ID, display name, unique slug, aliases, biography, representative image, attribution type | Historical artists need evidenced life dates. Distinguish historical artists from Clara Mendes Studio. Era/movement/country tags are optional. |
| Artwork | Stable ID, artist reference, title, source date text, museum/object ID, object URL, rights evidence, credit line, original file and approved master version | Store dimensions, aspect ratio, processing history and review status. Preserve uncertain dates and source attribution. |
| Product | Shopify ID, artwork reference, family, handle, gallery, copy and approval state | One listing per artwork and enabled family. |
| Variant | Shopify variant ID, size/finish, price, provider SKU, exact print asset version, fulfilment route and verification evidence | Only qualified sizes with verified routes become sellable. |

Relationships: one artist has many artworks; one artwork can have many product families; one product has many variants. Pilot works have one verified artist. Disputed or collaborative attributions stay outside automated release.

Use stable IDs, not names, as relationship keys. Preserve update times and reviewer/time for approvals. Unknown optional fields remain empty. Archive rather than delete records and files referenced by orders. A product appearing on several browse pages remains one product.

### Shopify implementation direction

- Use artist and artwork metaobjects with product references, subject to the initial store audit.
- Proposed fields: `custom.artist`, `custom.artwork`, `custom.product_family`. Confirm exact definitions, Storefront access and migration before implementation.
- Keep provenance primarily on the artwork record; mirror fields only when an existing integration needs them.
- Preserve separate `custom.storefront_approved` and `custom.fulfillment_verified` gates. Reconcile their current implementation before changing it.
- Do not use `Vendor` as the only artist identity or bulk-overwrite existing vendors. It may mirror the artist if compatible with existing supplier/reporting use.
- Derive artist/family membership from approved catalogue data. Verify supported collection rules before choosing smart collections.
- Adding an artwork or product to an existing family should update its artist page through data, without hand-editing that page or deploying code for every addition.

Existing approved generated works may appear under **Clara Mendes Studio**, clearly labelled as generated. Preserve existing URLs and collection browsing. Historical-artist rules must not hide approved studio work or expose its drafts.

## 4. Dedicated artist shops

**Required from the first release:** a customer searching for an artist can find that artist and see all the approved products we sell featuring their work.

```text
Artists -> Hokusai -> All available Hokusai products
Shop -> Prints -> Prints from all artists
Later: Shop -> Cushions -> A Hokusai cushion -> Hokusai's shop
```

### Artists index: `/artists`

- Show artists with at least one publicly available, approved product.
- Cards show representative artwork, artist name and appropriate life dates.
- Provide alphabetical browsing and name search, including aliases. Reuse existing search where practical.
- Keep controls proportionate to the catalogue. Store era/movement tags now; add those filters when useful.
- Searching "Hokusai" should lead to his shop and relevant products.

### Artist shop: `/artists/hokusai`

- Show name, life dates, short sourced biography and a curator's note.
- Default to **All products**, containing every eligible listing for that artist across enabled families.
- Filters can become **Prints / Framed prints / Canvas / Cushions / Bags / Mugs** as those products become available.
- Show only filters with eligible products. At a prints-only launch, omit redundant controls and empty merchandise tabs.
- Cards show artwork title, product type, accurate price and appropriate product image.
- Also support browsing distinct artworks from the same records. With one family, an artwork can link directly to its print product page.
- Adding an approved Hokusai cushion later must automatically place it on both the Hokusai and Cushions pages.
- Hide artists with no eligible products from public navigation, search and sitemap. Handle old direct URLs consistently with the store's unavailable-content policy.

### Product and artwork pages

Reuse `/products/...`, variant selection, cart and checkout for the pilot. Add artist links, artwork details, credit lines and museum links to historical-art products.

When a work has several approved families, introduce `/art/<artist>/<artwork>` with a product switcher. Image, price, size and add-to-cart must match the selected variant. Decide canonical URLs and structured data before introducing overlapping routes.

All new pages use the same approval filtering as Shop, search, recommendations and sitemap. Preserve existing navigation patterns after inspecting them. Verify mobile journeys at 320, 360, 390 and 430 px, keyboard access and clear control labels.

## 5. Sourcing and rights

Source files by script from the owning institution. Human curation and review are expected; manual image downloads and aggregator scraping are not the sourcing workflow.

| Pilot source | Candidate route | Required checks |
| --- | --- | --- |
| Metropolitan Museum of Art | Collection API and official dataset | Object-level public-domain flag, usable original, artist identity and rights evidence |
| Art Institute of Chicago | Collection API and IIIF | Object-level public-domain flag, image rights, maximum dimensions and artist identity |

Start with whichever supplies enough suitable works. Add the other only if needed. Follow current rate limits, cache responses and retry safely. API search results are candidates, not a publication queue.

Cleveland, Rijksmuseum, Smithsonian, NGA, Paris Musees, NYPL, Library of Congress, BHL and Getty are future research candidates. Verify access and item-level rights when needed; do not retain unverified blanket claims about their APIs or licences.

### Release rules

1. The specific image must have CC0 or an explicit institution-provided public-domain designation suitable for the intended use. Metadata access alone is insufficient.
2. Use artist death year as an initial screen. Under the ordinary EU life-plus-70 calculation, death in 1955 or earlier clears that time calculation in 2026. Keep the cutoff year-aware. Authorship, special cases and intended sales territories still need review; this is not universal clearance. [EU term directive, Articles 1 and 8](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32006L0116).
3. Assess artist-name use and other applicable rights separately. CC0 does not waive third-party trademark, privacy or publicity rights. Do not promise zero legal or takedown risk. [CC0 terms](https://creativecommons.org/publicdomain/zero/1.0/).
4. Missing or contradictory attribution/rights evidence blocks release. Preserve approximate dates such as "c. 1830-1832"; do not invent exact dates.
5. Save museum, object ID/URL, image URL, licence/rights text and evidence URL, artist, title, date, credit line, fetch timestamp and original-file checksum.
6. Show the source credit and link. Do not use museum logos or imply museum/estate endorsement.
7. Preserve source files and evidence; recheck before initial publication and record subsequent corrections.

Example: "Source: The Metropolitan Museum of Art, Open Access (CC0). Object [verified ID]." Use the actual rights designation for each item.

## 6. Image preparation and print quality

The aim is faithful reproduction. Use "digitally restored" only when documented processing justifies it.

- Preserve the untouched original and a separate, versioned production master.
- Detect borders, rulers, skew and possible damage as review suggestions. Do not automatically remove inscriptions, signatures, texture or intentional margins.
- No blanket whitening, saturation boost or smoothing. Record conservative adjustments individually.
- Review **every pilot master and final print layout**. Batch sampling is insufficient for the first collection.
- Artist/title/date similarity flags possible duplicates; it does not prove editions or impressions are interchangeable. Compare them and preserve distinct source records.
- Retain original colour/depth information where available; export to the provider's verified specification. Converting an 8-bit source to 16-bit adds no detail.
- No artificial upscaling for the pilot. Omit sizes an image cannot support.

Prodigi identifies 300 dpi as ideal for fine art and framed prints. Use **300 pixels per printed inch as the pilot target**, with any lower-resolution exception requiring explicit review and a recorded reason. [Image guidance](https://www.prodigi.com/faq/images/).

| Full image area | Pixels at 300 ppi, before additional bleed |
| --- | --- |
| 8 x 10 in | 2400 x 3000 |
| 16 x 20 in | 4800 x 6000 |
| 20 x 24 in | 6000 x 7200 |

Check both dimensions at the actual placed image size after cropping, borders and bleed. A bordered print has a smaller image area than its paper size. The 20 x 24 format has a different aspect ratio from the other two.

Preserve the full composition by default using a suitable format or intentional border. Do not stretch. A saliency score is not approval to crop historical artwork. Mockups must show the same crop and border as the production file.

Digital review, mockups and sandbox orders do not verify physical colour, paper, packaging or delivery. Record physical-quality evidence separately. If no sample is ordered, that quality remains untested.

## 7. Product expansion

The family catalogue is reusable, but each artwork qualifies independently for each family.

| Stage | Families | Requirement |
| --- | --- | --- |
| Pilot | Fine art prints | Selected works, qualified sizes, approved layouts, exact mapping and cost checks |
| Next | Framed prints | Verified frames, layouts, galleries, delivery costs and routing |
| Selective expansion | Canvas, cushions, totes, mugs, notebooks/cards, blankets | Demand evidence plus complete templates, presentation and fulfilment checks |
| Longer-term options | Tapestries, curtains, rugs, bedding, phone cases | Separate scope based on customer interest and economics |

Use fixed pricing by family/size/finish if costs support it. No per-artwork premium is planned. Do not reprice existing products or add discounts, sale badges or automatic bundle discounts as part of this work.

The October 2026 catalogue check found broad Society6 overlap in Prodigi's prints, home textiles, drinkware, bags, stationery and phone cases. Catalogue presence does not establish configured store fulfilment. [Prodigi catalogue](https://www.prodigi.com/sitemap/).

Known limits from the check:

- [Maple wood prints](https://www.prodigi.com/products/wall-art/wooden-prints/maple-wood-prints/): US delivery only.
- [Beach towels](https://www.prodigi.com/products/home-and-living/bathroom/towels/): UK delivery only.
- [Yoga mats](https://www.prodigi.com/products/sport-and-games/yoga-mats/): discontinued.
- Direct current equivalents were not confirmed for Society6 furniture, serving/acrylic trays, wine chillers, tablecloths, oven mitts, carry-all pouches, welcome mats, sheet sets, comforters, wallpaper or wall murals.

Recheck each exact SKU and intended destination. Printful apparel keeps its separate route.

## 8. Pipeline and approval

**Input:** selected artists and museum candidates.  
**Routine output:** reviewed assets, provenance and draft listings.  
**Publication:** a separate authorised step after all conditions pass.

1. **Fetch:** capture originals, metadata, rights evidence and checksums.
2. **Select:** curator/owner chooses approximately ten coherent works and resolves rights/attribution questions.
3. **Prepare:** create versioned masters, size qualification, layouts and review evidence. Record rejected candidates and reasons.
4. **Present:** prepare accurate artwork images and room galleries using existing tooling where suitable.
5. **Stage:** create/update artist/artwork records and draft products. New products start with both approval flags false. Reruns update stable source/artwork/family records without duplicates.
6. **Verify:** confirm every proposed variant's provider SKU, exact file, destination coverage, cost, billing and order route independently of image approval.
7. **Release:** obtain required approval, then publish only qualifying products/variants through the store's release contract.
8. **Read back:** verify saved data, artist and family pages, product selection, cart and checkout handoff. Failed items remain unavailable.

Rights review, digital review, fulfilment verification and publication remain separate states. Changes to master files or mappings invalidate dependent checks. Orders retain the asset version purchased.

Public visibility fails closed: products must satisfy the current Active/publication, storefront-approval and fulfilment-verification contract. Apply it to artist cards, product counts, filters, search, recommendations and sitemap.

## 9. Fulfilment and assets

### Pilot: verify and reuse

Inspect the actual Shopify/Prodigi configuration first. Existing mapping is acceptable for a small collection if every variant is verified. Record any manual supplier setup honestly; automated sourcing does not imply automated fulfilment configuration.

Do not require a new order worker just because the range may grow. Build a replacement before release only if the existing route cannot meet the pilot's requirements.

### If a Prodigi API route is needed

- Authenticate events and process only eligible paid order lines.
- Assign exactly one route per line; app and API routing must not both order it.
- Persist Shopify order/line-to-provider records and use stable idempotency keys.
- Resolve exact approved provider SKU, finish and immutable asset version.
- Handle validation/address errors, cancellations, edits, timeouts and retries with a visible exception queue.
- Reconcile an uncertain submission before retrying or using manual fallback.
- Return shipment/tracking updates only for relevant lines and quantities. Partial Prodigi shipments must not fulfil unrelated Printful items.
- Verify current Shopify fulfilment-order requirements and scopes during implementation.
- Test normal, duplicate, failure and partial-order cases in the sandbox. Sandbox success does not prove live billing or physical fulfilment.

Prodigi documents idempotency keys and a sandbox that does not produce orders. [API reference](https://www.prodigi.com/print-api/docs/reference/).

Use a durable asset host, stable provider-accessible URLs and versioned files. Compare the existing host, Shopify Files and object storage during the audit. Verify actual scopes; do not assume a token has or lacks them. Do not rely on temporary staging URLs or overwrite files referenced by orders.

## 10. Brand and copy

- Keep Clara Mendes as the curatorial brand; no rename is required.
- Use sourced artist biographies and plain curator's notes. Do not invent artist intentions, personal relationships or endorsement.
- Show title, artist, source date/medium, a factual paragraph and an accurate source/processing note.
- Never imply Clara painted historical works. Keep generated studio work clearly labelled and preserve restrictions on misleading "adapted from" copy.
- Do not present digital mockups as photographed physical samples.
- Preserve current delivery/returns promises until compatibility with the new products is checked.

## 11. Economics and marketing

Withdraw the earlier illustrative margin as a forecast. Do not assume unchanged margins or cost-free catalogue growth.

Get actual production/shipping quotes for intended destinations. Account for customer delivery charges, applicable taxes, payment/platform fees, extras, replacements/refunds and currency conversion.

```text
Contribution before acquisition = net product and delivery revenue
  - production - supplier shipping - variable fees
  - expected replacement/refund costs

Contribution after acquisition = contribution before acquisition
  - customer acquisition cost
```

Track fixed development, hosting and curation costs separately. Set an acceptable contribution threshold before release; do not substitute remembered supplier rates for missing evidence.

Audit existing analytics and consent behaviour before installing anything. Local code previously showed event hooks, but that does not establish deployed pixel configuration or working purchase tracking.

Pinterest, organic Instagram/Facebook and search are channels to test. Prepare media and landing pages; verify purchase measurement against order records and exclude internal tests. Two weeks of pixel history alone does not justify spending. Ads, account creation, posts and email sends require their own instructions.

Assess attributable purchases, contribution, artist/product interest, support issues and delivery outcomes. With little qualified traffic, low sales are inconclusive; adding more products is not an automatic remedy.

## 12. Build sequence

| Phase | Work | Exit condition |
| --- | --- | --- |
| 0. Baseline | Find actual repo/worktree; inspect current main, local changes, pipeline, approvals, tracking, assets and supplier route | Reuse plan and specific blockers |
| 1. One artwork | Scripted fetch, provenance, master, qualified sizes and one draft | Complete reviewable record and verified fulfilment approach |
| 2. Artist browsing | Reusable records, artists index, artist shop and existing product-page integration | Preview demonstrates both browse journeys without draft leakage |
| 3. Collection | Expand to approximately ten works; prepare galleries/copy; verify variants and costs | Complete pilot with held items clearly identified |
| 4. Release | Obtain approval, publish/deploy scoped changes and verify live purchase paths | Acceptance checks pass and operating instructions are recorded |
| 5. Expansion | Choose another collection or family from evidence | Scope and costs agreed for the next increment |

The old 7-8 week minimum and 10-11 week platform estimates are withdrawn. Estimate after the baseline establishes reuse and remaining work. Starting this week is not a commitment to complete the wider catalogue this week.

## 13. Acceptance checks

- Artist-name search leads to the correct dedicated shop.
- The artist shop shows all eligible products across every published family and no unrelated items.
- Artist and product-type browsing reach the same product listing.
- Approved additions appear automatically. Unapproved/unpublished products disappear from all relevant discovery surfaces after normal cache refresh. Empty artists/filters stay hidden.
- Every historical work has evidenced rights, attribution, provenance and a reviewed master.
- Every sellable size has a checked layout, price, provider SKU and exact asset.
- Product imagery matches the selected variant. Physical quality is described only to the extent verified.
- Variants reach cart and checkout with correct product, price and delivery information in intended markets.
- Existing collections, products and Printful apparel retain their established access and routing.
- Mobile/keyboard journeys and required repository checks pass; live results are read back after release.
- Another artwork can be added through the configured workflow without manually rebuilding its artist page.

No paid test order is implied. Agree any live production test and cost separately.

## 14. Build-time decisions

Resolve using actual evidence during implementation:

1. Final artist(s) and approximately ten artworks.
2. One or two museum sources with eligible, adequate originals.
3. Qualified print sizes and border layouts.
4. Existing supplier route or necessary API replacement.
5. Asset host and immutable version strategy.
6. New-product prices, delivery markets and contribution threshold.
7. Remaining release approval and physical-quality evidence gaps.

## 15. References and evidence boundaries

This brief reflects the October 9 discussion: a manageable pilot, artist shops from the beginning, automatic categorisation and selective expansion. Supplier references do not prove connected-account configuration, physical quality or demand.

Primary references:

- [Met Collection API](https://metmuseum.github.io/)
- [Art Institute of Chicago API](https://api.artic.edu/docs/)
- [CC0 terms](https://creativecommons.org/publicdomain/zero/1.0/)
- [EU copyright term directive](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32006L0116)
- [Prodigi image guidance](https://www.prodigi.com/faq/images/)
- [Prodigi product catalogue](https://www.prodigi.com/sitemap/)
- [Prodigi API reference](https://www.prodigi.com/print-api/docs/reference/)

Earlier repository pointers to locate and verify against current main:

- `docs/add-products-runbook.md`
- `data/print-catalog.json`
- `scripts/product.mjs`
- `scripts/generate-print-room-mockups.mjs`
- `docs/clothing-destination.md`

An old directory, catalogue snapshot, price or token scope is not current evidence. Inspect the actual repository and store when the build begins.
