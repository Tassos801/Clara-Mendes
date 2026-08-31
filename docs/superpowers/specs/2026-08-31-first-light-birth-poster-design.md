# First Light — a personalised birth poster

Date: 2026-08-31. Status: designed; build now behind
`PERSONALISED_RELEASE_FLAGS`, go live only after Your Sky proves the
personalised fulfilment pipeline end-to-end.

## Why

Your Sky gave the store a personalisation engine; this is its second
product. Birth posters are among the strongest personalised-print gift
categories in exactly the markets we ship to (DE, NL, FR, Scandinavia),
and ours has a differentiator no template shop offers: the poster carries
a star-chart medallion of the actual sky over the birthplace at the moment
the child arrived — the same astronomy, typography, and archival print
chain as Your Sky. High gift intent means the product brings its own
search demand instead of competing on taste alone.

## The product

- Title: **First Light — a personalised birth poster**. Handle:
  `first-light-birth-poster`. Product type `Personalised Art`, tags
  `Clara Mendes Original`, `personalised`, `gift`.
- Options and prices mirror Your Sky exactly (same Prodigi SKUs, same
  costs): Size 8 × 10 / 20 × 24 in × Finish Unframed / Natural frame /
  Black frame; EUR 39.99 / 64.99 unframed, 99.99 / 129.99 framed. Variant
  SKUs `CM-NATAL-<SIZE>-<FIN>` map to `GLOBAL-FAP-*` and `GLOBAL-CFP-*`
  (color natural/black) in a `NATAL_VARIANTS` table parallel to
  `SKY_VARIANTS`.
- Composition (portrait, per-size 300 dpi plates like the sky's): the
  medallion — a circular star chart of the birth sky, reusing
  `computeSky()` and the sky projection at reduced radius — over the
  child's name set large in EB Garamond, then the birth details: the date
  written out, the time if given, the place, and one optional free-text
  details line (weight, length, a welcome — the customer's words, max 60
  chars). The three sky themes (linen default, quiet-form,
  midnight-garden) carry over.

## What the customer enters

Name (required, max 40 chars), place (the existing place search), date,
time (optional — defaults to 12:00; the chart stays astronomically
truthful), details line (optional, max 60), theme. Every text field passes
the shared font-coverage validation so preview and print always agree.

## Architecture

A parallel module, not a fork of the sky's:

- `app/lib/natal/params.ts` — `NatalParams` (v, name, date, time, lat,
  lon, tz, place, details, theme), validation, canonicalization, and cart
  attribute codec. Lines carry a kind discriminator in the versioned `_v`
  attribute so sky (v `1`) and natal lines are distinguishable.
- `app/lib/natal/products.ts` — handle, type, sizes, `NATAL_VARIANTS`.
- `app/lib/natal/scene.ts` + preview SVG + PDF layout — the poster
  composition; the medallion imports the sky engine's astro/projection
  modules directly (they are pure). Text fitting reuses `sky/fit.ts`; the
  fitted-name worst case is asserted in tests like the sky's title fit.
- Shared plumbing learns to dispatch by kind instead of being duplicated:
  the cart-action signer (`signSkyCartLines`) and the webhook fulfilment
  builder (`buildProdigiOrderFromShopify`) route each personalised line to
  its kind's decoder, variant table, and print URL. Sky behavior is
  unchanged — existing tests must stay green untouched.
- `app/routes/api.natal-print.$token[.pdf].tsx` — on-demand PDF, signed
  token, same statelessness: nothing stored, everything reproducible from
  the order.
- PDP: the personalised configurator mounts per product handle (not per
  product type) so each personalised product gets its own form and
  preview; `NatalConfigurator` renders the live medallion + typography
  preview.
- Release: `PERSONALISED_RELEASE_FLAGS['first-light-birth-poster']:
  false`. Until flipped the product is invisible everywhere the sky is
  (nav, grids, sitemap, direct route), by the same mechanism.

## Fulfilment and release

Identical shape to Your Sky: cart signs, `orders/paid` webhook creates the
Prodigi order with the print URL as asset. The release runbook gains a
First Light section (product table, SKUs, sandbox checks via
`sky-check-prodigi` extended to the natal SKUs, go-live steps). Owner-side
prerequisites are the ones Your Sky already needs — secrets, webhook,
product creation, sandbox E2E; First Light adds only its own product and
flag flip, and should follow after Your Sky's first live order proves the
chain.

## Rejected alternatives

- **Extending `SkyParams` with optional natal fields** — one params type
  serving two layouts breeds conditional validation and canonicalization
  churn inside signed, verified code; parallel params with a shared kind
  dispatch keeps each product's contract closed.
- **A generic "personalised product framework"** — YAGNI at two products;
  the dispatch seam (kind → decoder/variants/print URL) is the only
  generalisation the second product actually forces.
- **Structured weight/length fields** — two more inputs to validate and
  typeset for data the customer can phrase better themselves; one optional
  details line covers weight, length, and words like "welcomed at dawn".

## Testing

Node tests mirroring the sky's: params validation round-trips, canonical
signing stability, cart-attribute codec, variant table ↔ Prodigi SKU
integrity, fitted-name worst cases in both preview and PDF metrics, and
fulfilment dispatch — a mixed order (one sky line, one natal line, one
plain print) builds one Prodigi order with the right SKUs and asset URLs.
Existing sky tests stay untouched and green.
