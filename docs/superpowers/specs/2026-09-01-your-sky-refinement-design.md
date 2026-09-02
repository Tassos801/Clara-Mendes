# Your Sky refinement: guided configurator design

Date: 2026-09-01 · Status: approved by owner · Branch: `codex/refine-your-sky`

## 1. Goal

Refine the live Your Sky product into a clearer, more trustworthy,
mobile-first buying experience while reusing the personalization, theme,
preview, Shopify variant, signed-cart, PDF, and Prodigi fulfillment systems
that already exist.

The refinement must make the existing product easier to understand and buy,
unlock the three completed visual styles, and improve recovery from incomplete
or failed input states. It must not introduce a second fulfillment path or
weaken the guarantee that the purchased print matches the rendered preview.
This specification supplements the 2026-08-21 product design and supersedes
only its v1 decision to keep customer theme choice hidden.

### Definition of done

1. A phone visitor sees the product title, short value proposition, current
   price, production window, and returns promise before beginning the
   configurator.
2. The page presents one guided flow: **Personalise → Style and finish →
   Review and buy**, with one source of truth for state and price.
3. Customers can select Linen, Midnight Garden, or Quiet Form, and the chosen
   style reaches the live preview, signed cart line, checkout/order
   confirmation, generated PDF, and Prodigi asset without a new Shopify
   variant.
4. The preview reflects the selected unframed, Natural-frame, or Black-frame
   presentation without altering the printable artwork.
5. Place search works with pointer and keyboard, reports loading, no-results,
   and request-failure states, and can be cleared without reloading the page.
6. Field validation identifies the exact action needed. An incomplete mobile
   purchase action takes the customer to that field; it becomes Add to cart
   only when the current preview is ready.
7. A valid unfinished configuration survives route-level size/finish changes
   and a same-tab reload, and Reset removes it.
8. The review summary confirms style, place, date/time, title when present,
   size, finish, and current price before purchase.
9. Existing signed-cart canonicalization, webhook verification, Shopify SKUs,
   Prodigi mappings, idempotency, and PDF geometry remain compatible.
10. Automated checks and real-browser desktop/mobile verification cover the
    changed behavior.

## 2. Current evidence

The live product already has a strong base:

- Place, date, time, and optional title generate the real sky in an inline SVG.
- Six Shopify variants cover two sizes and three finishes, with correct live
  price and descriptive-copy updates.
- Personalization survives size and finish navigation during the mounted
  session.
- The cart action validates and signs the submitted parameters; the paid-order
  webhook verifies them before creating the custom Prodigi order.
- All three styles and their print plates already exist, and the PDF tests
  already render every style.

The live audit found the following gaps:

- At 390 × 844, the first viewport contains the preview and part of the form,
  but not the product name, price, variant choices, or buying context.
- The public product exposes only Linen even though Midnight Garden and Quiet
  Form are complete throughout the render pipeline.
- ArrowDown and Enter do not select a place from the combobox.
- A query with no matches renders no explanation, and fetch failures are
  silently swallowed.
- The title has a hard limit but no remaining-character feedback.
- Catalog/preview failure can still leave valid order parameters available,
  conflicting with “we print exactly what the preview shows.”
- Selecting a frame changes the variant and price but does not change the
  preview presentation.
- The mobile sticky purchase bar appears only after the main buy box has
  already scrolled past, so it does not help during configuration.

## 3. Approaches considered

### A. Surface polish only

Reorder mobile content, improve labels, and add missing error text. This has
the smallest implementation footprint but leaves completed themes unused and
does not make the preview truthful to the selected presentation.

### B. Guided single-page configurator — selected

Keep the live preview and all choices on one page, but divide them into three
clear stages with a shared readiness model and review summary. This preserves
the immediacy of the existing live preview while improving mobile hierarchy,
accessibility, recovery, and merchandising.

### C. Multi-step wizard

Move each choice to a separate screen. This provides strict sequencing but
adds back/forward navigation, more persistence complexity, and more friction
for customers who want to compare styles, sizes, and frames.

## 4. Experience structure

### Mobile order

1. Product eyebrow, H1, one-sentence value proposition, price, and compact
   trust row.
2. Live preview with a visible state label: Example, Updating, Ready to print,
   or Preview unavailable.
3. **1 · Personalise**: place, date, local time, and optional title.
4. **2 · Style and finish**: style, size, and finish.
5. **3 · Review and buy**: human-readable summary, quantity, and purchase
   action.
6. Accuracy, materials, shipping, returns, support, reviews, and related
   products.

The mobile action bar appears once the compact product introduction leaves the
viewport. While incomplete it shows the current price plus the next action,
such as “Choose a place” or “Choose a date,” and links to that field. When the
configuration and current preview are ready, the same location becomes the
real signed Add-to-cart form.

### Desktop order

At wide viewports, the same semantic blocks use grid areas instead of a
different DOM tree:

- the preview remains visible in the left column;
- personalization fields occupy the middle column;
- product introduction, style/variant choices, review, and buy box occupy the
  purchase column.

At intermediate widths the preview and form may stack within the left side,
while the purchase column remains visible. Content is never duplicated for
responsive layout, so screen readers, analytics, and cart forms see one flow.

### Visual language

The feature keeps the storefront's warm paper-and-glass system. Stage headings
use restrained numbered labels, not a heavy progress widget. Selected options
must remain identifiable by more than color. Focus rings, error text, and
ready/error statuses use existing accessible storefront patterns.

## 5. Preview and visual choices

### Style selector

Expose the existing `SKY_THEMES` entries as three preview cards:

- **Linen** — warm neutral plate and ink stars.
- **Midnight Garden** — deep blue plate and pale-gold stars.
- **Quiet Form** — light sculptural field and clay detail.

Each choice shows a small crop from its existing preview plate and a text
label. Selection updates the live SVG immediately and becomes the `theme`
inside the validated and signed `SkyParams`. The browser does not invent a
separate or unsigned style value.

The selected style is added as a visible, server-normalized cart attribute so
the customer can confirm it in cart, checkout, order email, and support
conversations. `_theme` remains the signed internal source of truth.

### Finish presentation

The selected Shopify variant remains authoritative for finish and price. The
configurator receives the normalized finish and wraps the artwork preview in:

- no frame for Unframed;
- a restrained natural-wood-colored frame for Natural frame;
- a restrained dark frame for Black frame.

This is a presentation preview, not a new print asset or a photorealistic wood
promise. Copy states that the artwork preview is exact while screen color and
natural frame grain can vary. The PDF remains the same full-bleed artwork for
framed and unframed variants.

### Preview state

The preview uses an explicit state model:

- `example`: sample Paris sky while required inputs are incomplete;
- `updating`: current validated inputs are being rendered;
- `ready`: the rendered scene key exactly matches the current validated input;
- `error`: catalog or renderer failed, with Retry.

Only `ready` reports purchasable parameters to the product route. A stale or
failed preview can never enable purchase.

## 6. Personalization behavior

### Place combobox

The existing `/api/places` search and bundled GeoNames data remain unchanged.
The UI adds:

- a visible loading status after the debounce starts;
- “No places found” for a successful empty response;
- a connection-error message and Retry for failed/non-OK responses;
- ArrowDown/ArrowUp navigation, Enter selection, Escape close, and Home/End;
- `aria-activedescendant`, stable option ids, and a polite result-count status;
- a Clear action after selection;
- request cancellation and stale-response protection.

Typed text is not treated as a valid place. A customer must choose a result,
preserving the latitude, longitude, and IANA time zone required for accuracy.

### Date, time, and title

- Date remains required and constrained to 1900–2100.
- Time remains local to the selected place and defaults to 22:00. Helper copy
  is shortened and kept adjacent to the input.
- Title remains optional and limited to 40 printable characters. A live
  counter is shown, and the existing printable-font validation remains the
  authority.
- Errors attach to their fields with `aria-describedby` and render only after
  blur, attempted progression, or restoration of invalid saved data.

### Draft persistence

A versioned session-storage record stores only the current Your Sky draft:
selected place data, date, time, title, and style. It is restored after client
mount in the same browser tab through a partial-draft codec that validates each
present field, preserves valid incomplete input, and discards malformed,
out-of-range, or unknown-theme values. Once the required fields are complete,
the result must still pass `validateSkyParams` before it can render as ready or
be purchased.

The draft does not contain signatures, merchandise ids, cart ids, customer
identity, or fulfillment data. It is not sent to analytics. Reset clears both
component state and the session-storage record, then returns to the example.

Shopify size and finish remain URL-backed variant selections. They already
survive navigation and are intentionally not duplicated in the draft record.

## 7. Review and purchase behavior

When required inputs are complete, the Review section displays:

- style label;
- title if supplied;
- selected place;
- formatted local date and time;
- size;
- finish;
- current variant price;
- “We print exactly this artwork” reassurance.

Before readiness, the main action is a normal button that names and navigates
to the next missing field; it is not a disabled cart form. Once ready, it is
replaced by the existing `AddToCartButton` with the same signed attributes and
analytics payload used today.

Quantity remains available in the final stage. Shop Pay remains excluded for
personalized products because it cannot bypass required line attributes.

## 8. Data, security, and fulfillment invariants

The refinement must preserve these contracts:

1. `validateSkyParams` is the only route from browser state to `SkyParams`.
2. The browser submits no `_sig`; `signSkyCartLines` canonicalizes and signs
   the line server-side.
3. The visible Style cart attribute is derived server-side from the validated
   `_theme`, preventing a mismatch between customer confirmation and the
   generated asset.
4. `canonicalSkyParams` field order and version remain unchanged.
5. Existing six Shopify variant SKUs and `SKY_VARIANTS` Prodigi mappings remain
   unchanged.
6. The order webhook still verifies the signature before creating one
   idempotent Prodigi order.
7. The PDF endpoint still renders from the signed theme, place, date, time,
   title, and requested mapped size.
8. No personalization values are added to analytics events, logs, query
   strings, or public URLs.

## 9. Error and recovery behavior

| Failure | Customer behavior |
| --- | --- |
| Sky catalog loading | Preview shows “Charting your sky…”; purchase is not ready. |
| Sky catalog/render failure | Preview shows a calm error and Retry; purchase remains unavailable. |
| Place search returns zero | Combobox announces “No places found. Try a nearby city or another spelling.” |
| Place request fails | Combobox retains the query and offers Retry. |
| Saved draft is invalid | Invalid record is discarded and the example returns without an alarming error. |
| Title cannot be printed | Inline validation identifies the first unsupported character. |
| Current Shopify variant unavailable | Review remains visible; purchase action states Unavailable. |
| Cart signing/addition fails | Existing cart-form error handling remains visible and the valid configuration is retained for retry. |

## 10. Implementation boundaries

Expected implementation surfaces:

- `app/components/SkyConfigurator.tsx` — controlled style, finish preview,
  combobox state, draft restore/reset, preview readiness, and field statuses.
- `app/routes/products.$handle.tsx` — personalized PDP grid areas, finish
  normalization, staged review/purchase blocks, and mobile action behavior.
- `app/lib/sky/themes.ts` and/or `app/lib/sky/params.ts` — customer-facing
  theme labels without changing signed ids.
- `app/lib/sky/products.ts` — safe selected-finish normalization helper.
- `app/styles/app.css` — responsive personalized layout, style cards, frame
  presentation, statuses, review summary, and mobile action bar.
- `scripts/*.node-test.mjs` — pure-state, cart-attribute, option-normalization,
  and source-contract regression coverage.
- `docs/llm-wiki/*` — durable behavior note and maintenance log.

The birth-poster configurator may reuse small generic helpers where that
reduces duplication, but this refinement must not silently change First
Light's UI or release state.

## 11. Non-goals

- New Shopify products, variants, sizes, SKUs, prices, or Prodigi mappings.
- A new image-generation service or stored per-order artwork.
- Customer accounts, cross-device saved designs, shareable personalized URLs,
  downloadable previews, or email capture.
- Theme-specific pricing.
- Releasing First Light or changing its catalog visibility.
- Checkout, payment, shipping-market, returns-policy, or fulfillment-window
  changes.
- A real paid order during this UI refinement unless separately authorized.

## 12. Verification and acceptance

### Automated

- Existing sky parameter, cart signing, fulfillment, PDF, place, product, and
  scene tests remain green.
- New tests prove all three style labels normalize into visible cart
  confirmation while signed ids round-trip unchanged.
- New tests prove finish normalization for all six current variants and a safe
  fallback.
- New pure-state tests cover example/updating/ready/error, next-required-field,
  valid draft restoration, invalid draft rejection, and reset.
- Source regression checks protect the single-DOM responsive order, accessible
  combobox wiring, preview-ready purchase gate, and personalized sticky action.
- TypeScript, ESLint, production build, and Shopify route checks pass.

### Browser

Verify the local production candidate and, after deployment, the live store:

- 390 × 844 phone and 1440 × 1000 desktop;
- product identity and price visible before configuration on phone;
- pointer and keyboard place selection;
- loading, no-results, and simulated request-failure recovery;
- all three styles visibly distinct;
- all size/finish combinations preserve personalization and update price;
- unframed/Natural/Black presentation changes;
- same-tab reload restores the draft; Reset clears it;
- preview failure prevents purchase;
- review summary matches the preview and selected variant;
- cart drawer shows Style, Place, Date, and Title when supplied;
- checkout handoff remains standard Shopify checkout; stop before payment.

### Release

Use the normal controlled release: feature branch, pull request, complete CI,
squash merge, watch the exact `main` workflow, then verify the production URL
with a fresh browser session. A rollback is the revert of the refinement PR;
no Shopify or Prodigi record needs mutation.

## 13. Self-review

- The selected approach implements every owner-approved item without adding a
  wizard or a second data path.
- Existing assets are reused: three theme plates, `SkySvg`, signed theme ids,
  six Shopify variants, and the current Prodigi PDF pipeline.
- Customer-visible confirmation is strengthened while canonical signing stays
  stable.
- Mobile hierarchy, accessibility, recovery, persistence, truthful preview,
  and final review each have explicit acceptance evidence.
- The scope does not change prices, fulfillment, checkout, release flags, or
  the unreleased birth poster.
