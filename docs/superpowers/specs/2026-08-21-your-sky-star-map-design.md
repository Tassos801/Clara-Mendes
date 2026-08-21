# Your Sky — personalised star map: design

Date: 2026-08-21 · Status: approved by owner (Approach A) · Branch: `fable/your-sky-star-map`

## 1. Goal and definition of done

Add a personalised product line to shopclaramendes.com that people buy for
occasions rather than for the art alone: a star map of the real night sky
over a chosen place at a chosen moment, rendered in a Clara Mendes
treatment, sold as an 8×10 or 20×24 print, unframed or framed.

**Done means all of the following are true and evidenced:**

1. `/products/your-sky-star-map` lets a customer enter place, date, optional
   time and a title line, and shows their actual sky rendered live, on
   desktop and on a phone.
2. Adding to cart stores the personalisation on the cart line; it is
   visible in cart, checkout and order emails.
3. A paid order automatically creates a Prodigi order (correct SKU, frame
   attribute, quantity, recipient, Standard shipping) whose asset URL serves
   a print-ready PDF of that customer's sky. No human step.
4. Proof: a real checkout on the live store using a 100 % discount code
   produces a Prodigi **sandbox** order whose status shows
   `downloadAssets: Complete`, screenshot-verified together with the
   storefront (desktop + mobile), cart and checkout.
5. Unit tests cover the sky maths, attribute signing, SKU mapping, webhook
   verification, PDF page geometry and place search; `npm test`,
   `npm run typecheck` and `npm run lint` pass.
6. `/adversarial-verify` has been run against the finished deliverable and
   every defect it found has been fixed and re-verified until it returns
   PASS.

Going live afterwards is a separate, small step: switch `PRODIGI_API_BASE`
and key to live, flip the release flag, publish the product to both sales
channels. The first paid order is the first physical QC, as with the prints.

### Non-goals (v1)

- Customer choice of palette/theme (one launch theme; themes are a code
  constant so more can be added later).
- Prodigi status callbacks, customer-facing order tracking of production.
- A persisted artwork file per order (the order carries the parameters; the
  PDF is regenerated deterministically on demand).
- Other sizes, canvas, posters, gift wrap, multi-language UI.
- Any change to how the existing prints are fulfilled.

## 2. Offer

| Field | Value |
|---|---|
| Title | Your Sky — a personalised star map |
| Handle | `your-sky-star-map` |
| productType | `Personalised Art` |
| Vendor | Clara Mendes |
| Tags | `Clara Mendes Original`, `personalised`, `gift` |
| Options | **Size**: `8 × 10 in`, `20 × 24 in` · **Finish**: `Unframed`, `Natural frame`, `Black frame` |
| Variants | 6 (Size × Finish) |
| Variant SKUs | `CM-SKY-8X10-UNF`, `CM-SKY-8X10-NAT`, `CM-SKY-8X10-BLK`, `CM-SKY-20X24-UNF`, `CM-SKY-20X24-NAT`, `CM-SKY-20X24-BLK` |
| Prices (EUR) | Unframed 39.99 / 64.99 · Framed 89.99 / 139.99 |
| Shipping | Store's EU-only markets; Prodigi Standard |

Prodigi mapping (in code, `app/lib/sky/products.ts`):

| Variant SKU | Prodigi SKU | Attributes |
|---|---|---|
| `CM-SKY-8X10-UNF` | `GLOBAL-FAP-8X10` | — |
| `CM-SKY-20X24-UNF` | `GLOBAL-FAP-20X24` | — |
| `CM-SKY-8X10-NAT` | `GLOBAL-CFP-8X10` | `color: natural`, `mount: none`, `glaze: perspex` |
| `CM-SKY-8X10-BLK` | `GLOBAL-CFP-8X10` | `color: black`, `mount: none`, `glaze: perspex` |
| `CM-SKY-20X24-NAT` | `GLOBAL-CFP-20X24` | `color: natural`, `mount: none`, `glaze: perspex` |
| `CM-SKY-20X24-BLK` | `GLOBAL-CFP-20X24` | `color: black`, `mount: none`, `glaze: perspex` |

Exact attribute keys/values are confirmed against `GET /v4.0/products/{sku}`
in the sandbox during implementation; the mapping table is a unit-tested
constant. "No mount" is deliberate so the same PDF serves framed and
unframed at each size. Prices are confirmed against `POST /v4.0/quotes`
(item + Standard shipping to DE, FR, NL) before launch; the landed-cost
table is recorded in `docs/your-sky-release.md`.

Copy: occasions-led ("the night you met, the morning she was born, the
place you said yes"), the store's editorial voice, no urgency or scarcity.
A short "How it's made" block states that the sky is astronomically
accurate for the chosen place and moment and names the data sources.

## 3. Personalisation UX

The PDP branches on `productType === 'Personalised Art'` and renders
`SkyConfigurator` in place of the image gallery; the rest of the PDP
(price, variant pickers, add to cart, spec rows, JSON-LD) is reused.

Inputs:

- **Place** — text input with typeahead. Source: bundled GeoNames
  `cities15000` (≈25 k places) reduced to `name, asciiName, country,
  admin1, lat, lon, tz`. Search runs in a resource route
  (`GET /api/places?q=`) over the in-memory list: case/diacritic-insensitive
  prefix match on name/asciiName, ranked by population, max 8 results.
  Selection fills a read-only summary "Paris, France · 48.8566° N, 2.3522° E".
- **Date** — native date input, constrained to 1900-01-01 … 2100-12-31.
- **Time** — native time input, optional, default `22:00` (local time at the
  place). Helper text: "Leave as is for the evening sky, or set the exact
  hour."
- **Title** — single line, max 40 characters, Unicode letters/digits/
  punctuation; control characters stripped; rendered in EB Garamond.
- Fixed subtitle, generated: `PARIS, FRANCE · 14 JUNE 2019 · 48.8566° N, 2.3522° E`
  (place upper-cased, date in the store locale, coordinates to 4 dp).

Preview: an inline SVG of the chosen size's aspect ratio, recomputed
client-side (debounced 150 ms) from `computeSky()`. The star catalogue
(~120 KB) and `astronomy-engine` load lazily with the configurator. On
viewports < 768 px the preview sits above the form, the add-to-cart bar is
sticky, and only stars above the horizon are drawn (~4.5 k circles).

Validation before add to cart: place selected, date in range, title
length. Errors render inline; the button stays disabled until valid.

Cart line attributes (Storefront `attributes` on the line):

| Key | Visible | Example |
|---|---|---|
| `Title` | yes | `The night we met` |
| `Place` | yes | `Paris, France` |
| `Date` | yes | `14 June 2019, 22:00` |
| `_v` | no | `1` |
| `_lat` / `_lon` | no | `48.8566` / `2.3522` |
| `_tz` | no | `Europe/Paris` |
| `_time` | no | `22:00` |
| `_date` | no | `2019-06-14` (ISO) |
| `_theme` | no | `linen` |
| `_sig` | no | HMAC-SHA256 over the canonical parameter string, base64url |

Keys starting with `_` are hidden by Shopify in cart/checkout/notifications.
The browser submits the unsigned set; the existing `cart.tsx` action
(`LinesAdd`) detects lines carrying `_v`, validates the parameters, computes
`_sig` with `SKY_SIGNING_SECRET` and adds the line with the signed set —
server-side, no extra round trip, and the secret never reaches the browser.
Lines that fail validation are rejected with a form error. `CartLineItem`
renders the three visible attributes under the product title.

## 4. Visual system

One engine, themed by a `SkyTheme` constant (`app/lib/sky/themes.ts`).
Three directions are rendered from the real engine for the owner to choose
the launch theme; the other two stay in code, unexposed:

- **Linen** — warm linen plate, ink stars, hairline constellations, clay
  accent ring (the blog's ink → linen → clay language).
- **Midnight Garden** — deep ink-blue painterly plate, pale-gold stars.
- **Quiet Form** — circular sky held inside a soft form on an off-white field.

Composition (both sizes share proportions): sky disc centred in the upper
~68 % of the sheet; title, subtitle and a small Clara Mendes mark in the
lower band. Elements:

- Stars: magnitude ≤ 6.5, radius by magnitude in six buckets; stars brighter
  than 1.5 get a soft halo.
- Constellation lines: 0.35 pt hairlines, theme colour at 55 % opacity.
- Horizon ring with cardinal letters N E S W; optional faint altitude rings.
- Moon: drawn at its true altitude/azimuth with its true phase (lit fraction
  and orientation) when above the horizon.
- Planets (Mercury–Saturn) as slightly larger, subtly tinted marks when
  above the horizon.
- Projection: stereographic from the zenith, north up, east on the left
  (the sky as seen looking up).
- Typography: EB Garamond (OFL) regular + italic, shipped as static TTF in
  `public/fonts/` for the preview and embedded (subset) in the PDF.

Background plates: generated once by `scripts/generate-sky-plates.mjs`
(sharp; layered gradients + noise from the capsule palettes) at exact print
pixel size per size — 2400×3000 for 8×10 and 6000×7200 for 20×24 — as
JPEG q85, committed under `public/sky/plates/<theme>-<size>.jpg`. A
web-sized version (`-preview.jpg`, ≤ 1600 px) backs the SVG preview.

## 5. Architecture and data flow

```
PDP (browser)                          Oxygen (worker)                      Prodigi
─────────────                          ───────────────                      ───────
SkyConfigurator                        GET /api/places?q=            
  place typeahead ───────────────────▶   in-memory GeoNames search
  computeSky() → <SkySvg/>              
  CartForm LinesAdd (attributes) ───▶ cart action: validate, canonicalise,
                                        HMAC → add line with _sig

checkout paid ── Shopify webhook orders/paid ─▶ POST /webhooks/orders-paid
                                         verify X-Shopify-Hmac-SHA256
                                         for each line with _v & _sig:
                                           verify _sig, map SKU → Prodigi
                                           POST /v4.0/orders ───────────────▶ order created
                                             idempotencyKey shopify:<orderId>
                                             asset url = /api/sky-print/<token>.pdf
                                         2xx on success, 5xx on failure
                                         (Shopify retries 8× over 4 h)

                                       GET /api/sky-print/<token>.pdf  ◀──── asset download (≤10 tries)
                                         verify token, computeSky(),
                                         pdf-lib: plate JPEG + vector marks
                                         + subset font → PDF stream
```

### Modules

| Path | Responsibility |
|---|---|
| `app/lib/sky/scene.ts` | `computeSky(params, theme, size)` → pure scene (stars, lines, moon, planets, labels in frame units). No DOM, no I/O. |
| `app/lib/sky/astro.ts` | Thin wrapper over `astronomy-engine`: local → UTC via IANA zone (`Intl`), equatorial → alt/az, moon phase, planets. |
| `app/lib/sky/projection.ts` | Stereographic projection + frame layout maths. |
| `app/lib/sky/themes.ts` | `SkyTheme` constants (colours, plate ids, stroke weights). |
| `app/lib/sky/params.ts` | `SkyParams` type, canonical string, validation, encode/decode of cart attributes. |
| `app/lib/sky/sign.server.ts` | HMAC-SHA256 sign/verify with `crypto.subtle`; token = base64url(params) + `.` + sig. |
| `app/lib/sky/products.ts` | Variant SKU → Prodigi SKU + attributes; size → page geometry (inches, pixels). |
| `app/lib/sky/svg.tsx` | `<SkySvg scene/>` React renderer (preview). |
| `app/lib/sky/pdf.server.ts` | `renderSkyPdf(scene, size, theme)` with pdf-lib + fontkit; plate fetched from own origin. |
| `app/lib/sky/places.server.ts` | Load + search the bundled places list. |
| `app/lib/prodigi.server.ts` | Prodigi client: `createOrder`, `getProduct`, `quote`; base URL + key from env. |
| `app/lib/shopifyWebhook.server.ts` | Raw-body HMAC verification. |
| `app/components/SkyConfigurator.tsx` | Form + preview + validation + sign-then-add flow. |
| `app/routes/api.places.tsx` | GET search endpoint (cache 1 h). |
| `app/routes/api.sky-print.$token[.pdf].tsx` | GET → PDF. |
| `app/routes/webhooks.orders-paid.tsx` | POST webhook handler. |
| `app/data/sky/stars.json` | `[ra°, dec°, mag]` triples from BSC5 (built by script). |
| `app/data/sky/constellations.json` | Line segments from d3-celestial GeoJSON (built by script). |
| `app/data/sky/places.json` | Reduced GeoNames list (built by script). |
| `scripts/build-sky-data.mjs` | Downloads/derives the three data files; records source + licence. |
| `scripts/generate-sky-plates.mjs` | Renders background plates. |
| `scripts/sky-render-local.mjs` | Render any params to PDF locally for QA. |
| `scripts/sky-replay-order.mjs` | Re-run fulfilment for a Shopify order id (Admin API). |
| `scripts/sky-register-webhook.mjs` | Create/inspect the `orders/paid` subscription (Admin API). |

### Webhook handler rules

- Verify HMAC over the raw body with `SHOPIFY_WEBHOOK_SECRET`; 401 otherwise.
- Ignore orders with no qualifying line (200).
- Qualifying line = has `_v` and `_sig` attributes and a SKU in the map.
- Recompute the canonical string from attributes and verify `_sig`; a bad
  signature logs and returns 200 (no retry can fix it) and is surfaced by
  `sky-replay-order` for manual handling.
- One Prodigi order per Shopify order containing all qualifying lines;
  `idempotencyKey = shopify:<orderId>`; `merchantReference = order name`.
- Recipient from `shipping_address`; email/phone included.
- Prodigi call is awaited inside the request (well under the 5 s window);
  non-2xx from Prodigi → respond 500 so Shopify retries; the idempotency key
  makes retries safe.
- Unknown SKU in a signed line → 200 + error log (configuration bug, not a
  transient).

### Print PDF

- Page size = inches × 72 pt (8×10 → 576×720 pt; 20×24 → 1440×1728 pt).
  Prodigi processes PDFs at received size, so no bleed is added (matches
  how the current JPEG prints are supplied, fill-print-area).
- Plate JPEG embedded full-bleed; marks drawn as vector paths; text drawn
  with the embedded, subset EB Garamond.
- Deterministic: same token → byte-equivalent content (pdf-lib creation
  date pinned from the order date).
- Target size ≤ 3 MB; render time budget ≤ 2 s in the worker.

### Release gate

`SKY_RELEASE_FLAG` (build-time constant beside `EXTENSION_RELEASE_FLAGS`,
reusing the same helpers) hides the product from nav, grids, search,
recommendations and the sitemap while off; the PDP itself stays reachable
so the webhook test can be run on an Active product before launch.
`isUnreleasedExtensionHandle` semantics apply to `your-sky-star-map`.

### Environment

| Variable | Where | Purpose |
|---|---|---|
| `PRODIGI_API_KEY` | Oxygen (secret) | Sandbox key until launch, live key after |
| `PRODIGI_API_BASE` | Oxygen | `https://api.sandbox.prodigi.com` → `https://api.prodigi.com` |
| `SHOPIFY_WEBHOOK_SECRET` | Oxygen (secret) | Custom app API secret key |
| `SKY_SIGNING_SECRET` | Oxygen (secret) | Random 32+ bytes |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | existing | Used only by local scripts (webhook registration, replay) |

Missing variables degrade safely: the PDP still previews; add to cart
fails with "Personalisation is not available right now"; the webhook
returns 500 (so Shopify retries once configuration is fixed).

## 6. Data sources, accuracy, legal

| Data | Source | Licence | Handling |
|---|---|---|---|
| Stars | Yale Bright Star Catalogue v5 (JSON mirror) | Public domain | Trimmed to `[ra, dec, mag]`, mag ≤ 6.5 |
| Constellation lines | d3-celestial `constellations.lines.json` | BSD-3 | Converted to RA/Dec segment list; notice kept |
| Places | GeoNames `cities15000` | CC-BY 4.0 | Reduced fields; attribution in NOTICE and PDP credits |
| Ephemeris | `astronomy-engine` | MIT | npm dependency |
| Font | EB Garamond | SIL OFL 1.1 | Embedding permitted; files in `public/fonts/` |

A repo-level `NOTICE.md` lists the above. The PDP's "How it's made" block
carries one attribution line.

Accuracy: local date/time interpreted in the place's IANA zone (historical
DST via `Intl`), converted to UTC; positions via `astronomy-engine`
(`Horizon`, `Equator`, `MoonPhase`, `Illumination`) without refraction;
three reference skies (Paris 2019-06-14 22:00, Athens 1990-01-01 00:00,
Lisbon 2024-12-31 23:30) are pinned in unit tests against Stellarium
altitude/azimuth for Sirius, Vega, Polaris and the Moon within 0.5°.

Privacy: only place, date, time and title are stored, on the order; nothing
is logged beyond order ids and Prodigi order ids.

## 7. Error handling summary

| Failure | Behaviour |
|---|---|
| Places search unavailable | Input accepts free text but add to cart is disabled with a message |
| Signing action fails | Add to cart disabled with a message; logged |
| Webhook HMAC invalid | 401, logged |
| Prodigi 4xx/5xx | 500 → Shopify retry; idempotent |
| Asset render error | 500 → Prodigi retries up to 10×; logged with token |
| Plate fetch fails | Render falls back to a flat theme background so the order is never blocked; logged |
| Bad `_sig` on an order line | 200, logged, listed by `sky-replay-order --list-problems` |

## 8. Testing

Unit (`node --test`, in `scripts/*.node-test.mjs`):

- `sky-scene`: reference skies within 0.5°; moon phase; planets above/below horizon; projection round-trips.
- `sky-params`: canonical string stable across key order; validation bounds; encode/decode of attributes.
- `sky-sign`: sign/verify; tampered params rejected; token parse.
- `sky-products`: all six variant SKUs map; page geometry.
- `sky-pdf`: renders all sizes × themes, asserts page size in points, font embedded, size ≤ 3 MB.
- `sky-places`: diacritics, ranking, limit.
- `shopify-webhook`: HMAC accept/reject.
- Existing `csp`, `sitemap`, `catalogFilters` tests extended for the new route/flag.

Manual/visual: local renders of all sizes × themes inspected; Oxygen
preview deployment; storefront desktop + mobile screenshots; cart and
checkout screenshots showing attributes.

End-to-end: 100 % discount checkout on the live store → webhook →
sandbox Prodigi order, screenshot of the sandbox dashboard showing SKU,
attributes, recipient and asset status.

Final: `/adversarial-verify`, fix, repeat until PASS.

## 9. Owner prerequisites and sequence

1. Prodigi sandbox account (sandbox-beta-dashboard.pwinty.com) + sandbox API key; live API key from the live dashboard.
2. Custom app: add `read_orders` (webhooks) scope; copy the API secret key.
3. Paste `PRODIGI_API_KEY`, `PRODIGI_API_BASE`, `SHOPIFY_WEBHOOK_SECRET`, `SKY_SIGNING_SECRET` into Oxygen environment variables (production and preview).
4. Shopify product created via admin UI in the owner's Chrome session (options, variants, SKUs, prices, Active, *not* published to channels until launch); toggled OFF in the Prodigi channel.
5. Webhook subscription registered with `scripts/sky-register-webhook.mjs` once the handler is deployed.
6. Discount code `SKY-TEST-100` (100 %, limited to one use) for the proof order.

## 10. Risks and decisions taken

- **Worker memory**: raster print files don't fit; decided on vector PDF + pre-rendered plates.
- **Double fulfilment** with the Prodigi Shopify app: product toggled OFF in that channel; verified on the first sandbox run.
- **Webhook latency**: Prodigi call is synchronous but small; measured in preview before launch.
- **Font coverage**: EB Garamond covers Latin/Greek/Cyrillic; titles in other scripts render as tofu — validation warns when a character is outside the font's coverage.
- **Data size in worker**: places JSON ≈ 1.2 MB raw; loaded lazily in the places route only.
- **Plan dependency**: webhooks, not Shopify Flow, so no plan upgrade is needed.
