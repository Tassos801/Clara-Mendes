# US market status

**Updated:** 2026-10-18  
**Branch:** `claude/us-market`  
**State:** A1 (country pin) and A2 (US delivery wording) are built and verified on this branch (not merged). Nothing has changed in Shopify, Prodigi or Merchant Center.  
**Current writer:** none. Claude Code (owner's Mac) wrote the plan and did A1–A2 on 2026-10-18, then stopped. The next writer names themselves here before editing.

Rules and pick-up steps: [HANDOFF.md](HANDOFF.md).

## Stopped here

1. D2–D7 decided 2026-10-18: the owner said "Go with the proposed
   defaults for D2–D7 and start step A1 (the country pin), then A2."
2. A1 and A2 are done (commit `1fb4c5f`). The other code steps are
   blocked: A2b needs B1, A3 needs B2, A4 needs B3, and A5 is optional.
3. **B1 is approved** (owner, 2026-10-18: "Yes, run B1: read-only Prodigi
   US quotes, no orders"). It's blocked only on the key: no
   `PRODIGI_API_KEY` exists on the Mac (no `.env.sky.local`; none of the
   shop `.env` files has it). Once the owner puts it in
   `~/Desktop/shopify/Clara-Mendes-github/.env.sky.local`, run
   `node scripts/prodigi-market-quotes.mjs --country US,CY --env-dir ~/Desktop/shopify/Clara-Mendes-github --json output/us-market/prodigi-quotes-<date>.json`
   from this branch and record the table under B1. Then B2–B3, each with
   the owner's go-ahead in chat.

## Decisions

| # | Question | Status | Default (chosen) |
| --- | --- | --- | --- |
| D1 | Additive and dynamic? | **Decided 2026-10-18** by the owner: "dont erase anything. ideally the change would be dynamic" | – |
| D2 | How are USD prices set? | **Decided 2026-10-18**: owner chose the default | Shopify's automatic conversion from EUR with a rounding rule (x.99), so prices follow the exchange rate. No fixed USD price list. |
| D3 | US shipping rates | **Decided 2026-10-18**: owner chose the default | Give the US its own zone in each profile that reaches it, priced from B1's fresh Prodigi US quotes. Prints and canvas are made in Prodigi's US lab, so today's International print rate (€17.99 for most countries; B3 confirms which zone the US sits in) is probably far above cost. All other zones stay unchanged. |
| D4 | Book nooks for US buyers | **Decided 2026-10-18**: owner chose the default | Keep them listed, but don't promote them in the US until CJ's US route is checked (they ship from China, the US ended duty-free entry for small parcels in 2025, and the price includes delivery). |
| D5 | Framed prints and cards for the US | **Decided 2026-10-18**: owner chose the default | Later. Re-quote first in B1: the 2026-10-06 sweep put US framed (GLOBAL-CFP-20X24) at about €67, and cards go by EU letter post. |
| D6 | Structured data follows the page's market | **Decided 2026-10-18**: owner chose the default | Yes, for buyers whose market can buy the item (USD price plus US `shippingDetails` on US pages). The Cyprus fallback stays for items the US can't buy. This revisits the owner's 2026-10-14 choice. It's needed because Googlebot crawls as a US buyer and would otherwise see `$` on the page but `€` in the data. |
| D7 | Merchant Center landing links | **Decided 2026-10-18**: owner chose the default | Append `?country=CY` to the EUR feed's links and use `?country=US` in the US feed. Nothing is removed. This prevents price-mismatch disapprovals once US visitors see USD. |

## Evidence (2026-10-18)

**Live catalogue, by buyer country.** Storefront API, public token,
`products(first: 100)` under `@inContext(country: CY)` and
`@inContext(country: US)`, comparing `availableForSale`. Quiet Current is
not visible to this token (known); its US zone is €4.95 per
`APPAREL_SHIPPING_RATES`.

| Product type | Listed | Buyable CY | Buyable US | From (both, EUR) |
| --- | --- | --- | --- | --- |
| Art Prints | 34 | 34 | 34 | 26.99 |
| Canvas Art | 11 | 11 | 11 | 80.10 |
| Phone Cases | 11 | 11 | 11 | 35.99 |
| Book Nooks | 10 | 10 | 10 | 62.10 |
| Personalised Art (Your Sky) | 1 | 1 | 1 | 35.99 |
| Framed Art | 10 | 10 | 0 | 89.10 |
| Cards | 11 | 11 | 0 | 7.20 |
| Postcards | 11 | 11 | 0 | 5.40 |
| Plant Pots | 4 | 4 | 0 | 26.99 |

`localization.country.currency` reads **EUR for US** today: the US sits
inside the "International" market.

**Code facts** (main at `9fca667`):
- Prices are already currency-aware. `formatCardPrice`
  (`app/lib/productCardPricing.ts`) formats with the API's `currencyCode`,
  and `app/lib/seo.ts` uses `price.currencyCode` for `priceCurrency`. A USD
  market shows `$` on cards and product pages with no code change.
- The buyer's market is chosen as saved choice (session `marketCountry`, set
  by `/locale`) → `oxygen-buyer-country` header → `CY`
  (`getLocaleFromRequest`, `app/lib/context.ts`). There is no URL override
  yet.
- Canonical URLs are built from the pathname only (`getCanonicalUrl`,
  `app/lib/seo.ts`), so a `?country=` parameter can't create duplicate pages.
- Hardcoded `€`/EUR or EU-only wording that a US buyer would see:
  `app/components/ApparelShipping.tsx`, `app/routes/clothing.tsx`,
  `app/lib/collectionHeroes.ts` (activewear "from €3.99");
  `app/lib/featurePages.ts` (Your Sky "From €35.99"),
  `app/components/YourSkyTeaser.tsx`;
  `app/components/ProductShippingText.tsx`,
  `app/routes/products.$handle.tsx`,
  `app/routes/products.art-tough-phone-case.tsx`,
  `app/routes/collections.$handle.tsx`, `app/routes/your-sky.tsx`
  ("5–10 across the EU, 7–20 elsewhere"); `public/llms.txt`.
  Pot wording (`app/routes/pastel-forms.tsx`) doesn't matter here: US buyers
  can't buy pots and already get "Doesn't ship to the United States".
- Delivery constants live in `app/lib/storefrontBasics.ts`: EU 5–10 and
  international 7–20 business days after dispatch. Prodigi's documented US
  Standard estimate is 7–15 (same file, and
  [fulfillment](../llm-wiki/modules/fulfillment.md)).
- `SHIPPING_COUNTRY_CODES` (structured data) is the EU-27 only.
- Merchant Center is fed by an owner-maintained TSV feed `CLARA-PRINTS-EUR`
  ([your-sky-release.md](../your-sky-release.md)), and a Google & YouTube
  sales channel exists ([scifi-cinema-prints.md](../scifi-cinema-prints.md)).
  Its target countries and shipping settings haven't been read yet (C1).
- `origin/codex/fix-market-selection` (2026-08-13) is an old, unmerged
  cart-verification fix. It's unrelated to this work, so leave it alone.

## Plan

Each step lists the files involved, what "done" means and its gate. Tick
`[x]` with the evidence when finished.

### A. Code (this branch; no Admin writes)

US-only branches activate only for US buyers, so this can merge before the
US market exists. Non-US output must stay byte-for-byte the same. Add a
test that asserts it.

- [x] **A1 Country pin.** `?country=XX` (a valid `MARKET_COUNTRIES` code)
  picks the market for that request only. Order: URL → saved choice →
  header → CY. It doesn't overwrite the visitor's saved choice. Files:
  `app/lib/markets.ts`, `app/lib/context.ts`, plus a node test.
  *Done when* `/products/<handle>?country=CY` renders the Cyprus view to a
  US visitor, the canonical is unchanged, and `npm test`, `npm run
  typecheck` and `npm run lint` pass. *Gate:* none.
  **Done 2026-10-18 (`1fb4c5f`):** `pinnedMarketCountry` and
  `MARKET_URL_PARAM` in `app/lib/markets.ts`; `getLocaleFromRequest` reads
  the pin. Root consent uses the new `visitorMarketCountry` (ignores the
  pin), so the privacy banner follows the person. Tests are in
  `scripts/googleCommerce.node-test.mjs`. Local check:
  `/products/the-great-wave-off-kanagawa-art-print?country=CY` renders the
  EU wording to the (US) local session, the next unpinned request is back
  to US, and the canonical has no query. Known limits: links built from
  scratch (e.g. the phone-case option links) drop the pin, and the cart
  drawer on a pinned page is read in the pinned market. Neither matters
  for feed landings.
- [x] **A2 US delivery wording.** Add `DELIVERY_US_BUSINESS_DAYS = '7–15'`
  and one helper that returns the delivery promise for (buyer country,
  product line): EU, US or elsewhere. US buyers read "delivered in an
  estimated 7–15 business days within the US". EU and other countries keep
  today's wording exactly. Keep the import-duty sentence for US buyers until
  A2b. Files: `app/lib/storefrontBasics.ts`,
  `app/components/ProductShippingText.tsx`, and the routes listed under
  Evidence. *Gate:* none.
  **Done 2026-10-18 (`1fb4c5f`):** `DELIVERY_US_BUSINESS_DAYS` and
  `readsUsDelivery()` in `app/lib/storefrontBasics.ts`. US wording appears
  in `ProductShippingText` (PDP, only when some variant reaches the buyer),
  the phone-case page, the gallery collection "Delivery" fact, the Your Sky
  "how" item (`usBody` in `app/lib/featurePages.ts`) and `public/llms.txt`.
  Quiet Current deliberately keeps the generic wording until Printful's US
  transit is verified (add to A2b). Non-US wording is unchanged; tests are
  in `scripts/usDelivery.node-test.mjs`. `npm test` (501 pass), typecheck
  and eslint on the changed files are clean. The local preview (port 3142,
  US session) showed the US text on a print, case, collection and Your
  Sky, the EU text with `?country=CY`, and the generic text on a framed
  print (out of US reach). No new console errors.
- [ ] **A2b Where US orders are made.** Confirm per line from the Prodigi
  quote's `shipments[].fulfillmentLocation` (B1) and the Printful product
  info. Drop the import-duty sentence for US buyers only on lines made in
  the US. Also confirm Printful's US transit for Quiet Current; if it fits
  7–15, drop `isApparel` from the PDP call. *Gate:* B1.
- [ ] **A3 Money in fixed wording.** Replace hardcoded amounts with market-aware
  ones: the Your Sky price line from the live minimum price in the buyer's
  currency; the activewear rate table keyed by market (the US row must match
  checkout, see B3). Files: `app/lib/featurePages.ts`,
  `app/components/YourSkyTeaser.tsx`, `app/lib/storefrontBasics.ts`,
  `app/components/ApparelShipping.tsx`, `app/routes/clothing.tsx`,
  `app/lib/collectionHeroes.ts`. *Gate:* B2 for the USD figures.
- [ ] **A4 Structured data follows the market.** In `app/lib/seo.ts`, use
  the buyer market's price and currency when the item is buyable there, and
  add US `shippingDetails` (rate, 2–4 handling, 7–15 transit) on US pages.
  The Cyprus fallback stays for items the US can't buy. *Gate:* D6, B3.
- [ ] **A5 Merchant feed route (optional, dynamic).** A route such as
  `/feeds/google/<country>.tsv` that lists live products at that market's
  prices with `?country=` links, so Merchant Center can fetch it daily
  instead of the hand-kept TSV. *Gate:* D7, owner prefers it over a TSV.
- [ ] **A6 Docs.** Update [fulfillment](../llm-wiki/modules/fulfillment.md)
  and the shipping-policy draft (`docs/shopify-policies-drafts.md`, add a
  US paragraph), and append to `docs/llm-wiki/log.md`.

### B. Shopify Admin and Prodigi (owner go-ahead per step, Claude in Chrome)

- [ ] **B1 Prodigi US quotes (read-only).** `POST /v4.0/quotes`, Standard,
  US address, never an order, for: ART-FAP-EMA-8X10 / 16X20 / 20X24,
  GLOBAL-CAN-16X20, framed 16×20 and GLOBAL-CFP-20X24, the iPhone 16 Pro
  tough case, the greeting card and the postcard. Record the cost and
  `fulfillmentLocation` here. The key is `PRODIGI_API_KEY` (set in Oxygen;
  ask the owner where the local copy is).
  *Tooling ready:* `scripts/prodigi-market-quotes.mjs` (GET product + POST
  quote only, never an order). It also covers the mug, acrylic, hanger and
  plant pot. It needs `.env.sky.local` with `PRODIGI_API_KEY` and
  `PRODIGI_API_BASE=https://api.prodigi.com`; without a key it exits 2
  with a message.
- [ ] **B2 United States market.** Move US out of "International" (which
  keeps its other 177 countries) into a new "United States" market:
  currency USD, prices per D2, prices shown without tax. Check under
  Settings → Taxes and duties how converted prices treat the EUR price's
  VAT.
- [ ] **B3 US shipping zones.** Add a "United States" zone at the D3 rate
  to the General (prints, unframed Your Sky), canvas and phone-case
  profiles. Quiet Current already has US €4.95. Leave every existing zone
  and rate untouched. Note whether Shopify lets the zone rate be entered in
  USD; if not, A3 shows the converted figure.
- [ ] **B4 US sales tax.** Confirm Shopify Tax is monitoring US thresholds.
  A foreign seller registers in a state only after crossing that state's
  threshold.
- [ ] **B5 Shipping policy.** Paste the A6 US paragraph (see the
  policy-editor notes in the wiki and the owner's memory). Additive only.
- [ ] **B6 Verify.** The Storefront readback shows US `currency: USD`.
  `audit-customer-purchase-path.mjs` for a US address returns the D3 rate
  for one item per included line. A Cyprus run returns exactly today's
  rates.

### C. Google Merchant Center (owner go-ahead per step)

- [ ] **C1 Read the current setup:** feeds, the Google & YouTube channel's
  markets, target countries, shipping services. Record it here.
- [ ] **C2 Add the US:** a USD feed targeting the US (A5 route or a new TSV
  `CLARA-PRINTS-USD`) and a US shipping service (B3 rates, 2–4 handling,
  7–15 transit).
- [ ] **C3 Pin the EUR feed's links** to `?country=CY` (after A1 is live).
- [ ] **C4 Watch diagnostics** for 3–7 days and fix price or availability
  mismatches.

### D. Which products go to the US

| Group | Products | US plan |
| --- | --- | --- |
| Launch | Art prints (34), canvas (11), Your Sky unframed (1), Quiet Current (4), phone cases (11) | Already buyable in the US. Show in USD with US wording once A–B are done. Confirm the case lab in B1. |
| Decide (D4) | Book nooks (10) | Buyable with delivery included. Ships from China, so duty risk. |
| After quotes (D5) | Framed (10, plus framed Your Sky), cards (11), postcards (11) | Not offered in the US today. Add a US zone only if B1's cost fits. |
| Not for the US | Plant pots (4) | Prodigi can't quote the US. They keep showing "Doesn't ship to the United States". |
| Not live yet | Line and Colour (36 prepared), home-decor Drafts (120) | Get US reach when they're released; nothing extra needed. |
