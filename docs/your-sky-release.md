# Your Sky — release runbook

**Progress 2026-08-31:** §2 done for BOTH products — `your-sky-star-map`
and `first-light-birth-poster` created by CSV import exactly per the
tables below (verified in admin: exact handles, options, 12 SKUs, prices,
Active, inventory untracked, **published nowhere**).

**Progress 2026-09-01 (with the owner):** §1 done — all five env vars are
set in Oxygen and the environments redeployed. §3 done — the `orders/paid`
webhook was created in **admin → Settings → Notifications → Webhooks**
(Order payment → `https://shopclaramendes.com/webhooks/orders-paid`, JSON,
2026-07), so deliveries are signed with the store's notification signing
key, which is what `SHOPIFY_WEBHOOK_SECRET` now holds (the app-secret
route in §3's script was not needed; the stale CJ-era value was replaced).
Prodigi toggles confirmed **OFF** for both products (the channel had
auto-enabled them — caught and switched off; a stale listing for a deleted
duplicate product was toggled off too). §2's Prodigi check passes 6/6
against the sandbox (§7 has the quotes) after fixing the variant attribute
maps.

**RELEASED 2026-09-01:** §4 sandbox E2E passed — test order #1001
(SKY-TEST-100 + SHIP-TEST-FREE, both single-use codes now exhausted)
reached the Prodigi sandbox as ord_1169904 and moved Created →
InProgress. The first delivery surfaced a real bug (Prodigi rejects
empty address `line2`, fixed in PR #59; attribute maps fixed in PR #58);
Shopify's webhook auto-retry then succeeded without manual replay. §5
done: featured images uploaded to both products (rendered from the real
engines), live `PRODIGI_API_KEY` + `PRODIGI_API_BASE` set in Oxygen and
redeployed, live catalogue check 6/6 ✔ (20×24 CFP landed 91.07 EUR), and
the flag flipped in PR #60. Your Sky is LIVE. Still owner-side: add the
six variants to the Merchant Center TSV feed (CLARA-PRINTS-EUR). First
Light stays dark per §8 until the first real Your Sky order proves the
live chain.

Personalised star map (`your-sky-star-map`). Design:
`docs/superpowers/specs/2026-08-21-your-sky-star-map-design.md`.
Plan: `docs/superpowers/plans/2026-08-21-your-sky-star-map.md`.

How it works in one paragraph: the PDP renders the customer's sky live from
`computeSky()`; add-to-cart stores place/date/time/title as line attributes,
which the cart action signs (`_sig`); a Shopify `orders/paid` webhook hits
`/webhooks/orders-paid`, which creates one Prodigi order per Shopify order
whose asset URL points at `/api/sky-print/<token>.pdf?size=…`; Prodigi
fetches that URL and the worker renders the vector PDF on demand. Nothing is
stored; everything is reproducible from the order.

## 1. Environment variables (Oxygen → Storefront settings → Environments)

| Variable | Production | Preview | Notes |
|---|---|---|---|
| `SKY_SIGNING_SECRET` | required | required (same value) | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `SHOPIFY_WEBHOOK_SECRET` | required | — | Custom app → API credentials → **API secret key** |
| `PRODIGI_API_KEY` | required | — | Sandbox key until go-live, then the live key |
| `PRODIGI_API_BASE` | `https://api.sandbox.prodigi.com` | — | Switch to `https://api.prodigi.com` at go-live |
| `SKY_PREVIEW_UNLOCK` | never | `true` during the test | Lets the staged PDP render on preview deployments |

Without `SKY_SIGNING_SECRET` the PDP still previews but add-to-cart fails
with "Personalisation is not available right now"; the webhook and print
route answer 500 so nothing is silently lost.

Local development: put `SKY_SIGNING_SECRET=dev-secret-…` in `.env`.
Scripts read `.env.shopify-admin.local` (Admin token) and `.env.sky.local`
(`SKY_SIGNING_SECRET`, `PRODIGI_API_KEY`, `PRODIGI_API_BASE`).

## 2. Shopify product (admin UI)

| Field | Value |
|---|---|
| Title | Your Sky — a personalised star map |
| Handle | `your-sky-star-map` (must match `SKY_PRODUCT_HANDLE`) |
| Product type | `Personalised Art` (must match `SKY_PRODUCT_TYPE`) |
| Vendor | Clara Mendes |
| Tags | `Clara Mendes Original`, `personalised`, `gift` |
| Option 1 | Size: `8 × 10 in`, `20 × 24 in` |
| Option 2 | Finish: `Unframed`, `Natural frame`, `Black frame` |
| Status | Active |
| Sales channels | none until go-live (Headless only during the preview test) |

Variants (SKU must match `app/lib/sky/products.ts`):

| Size | Finish | SKU | Price (EUR) |
|---|---|---|---|
| 8 × 10 in | Unframed | `CM-SKY-8X10-UNF` | 39.99 |
| 8 × 10 in | Natural frame | `CM-SKY-8X10-NAT` | 99.99 |
| 8 × 10 in | Black frame | `CM-SKY-8X10-BLK` | 99.99 |
| 20 × 24 in | Unframed | `CM-SKY-20X24-UNF` | 64.99 |
| 20 × 24 in | Natural frame | `CM-SKY-20X24-NAT` | 129.99 |
| 20 × 24 in | Black frame | `CM-SKY-20X24-BLK` | 129.99 |

Inventory: not tracked. Shipping: physical, uses the store's EU profile.
Featured image: an export of the Paris example (`scripts/sky-render-local.mjs`).

**Prodigi Shopify app:** toggle this product **OFF** in the Prodigi channel.
Our webhook creates the Prodigi order; if the app also sees the product it
would raise a duplicate "requires attention" order.

### Prodigi check (sandbox first, live before go-live)

```bash
node scripts/sky-check-prodigi.mjs --country DE
```

Confirms each variant's SKU and `color` attribute against Prodigi's
catalogue, the 300 dpi print-area pixels, EU shipping, and prints a quote
per variant for the landed-cost table in §7. Must pass before the test order.

## 3. Webhook

Done 2026-09-01 via **admin → Settings → Notifications → Webhooks** (Order
payment → `https://shopclaramendes.com/webhooks/orders-paid`, JSON,
2026-07). Admin-created webhooks are signed with the store's notification
signing key shown on that page — that value is what `SHOPIFY_WEBHOOK_SECRET`
holds. The script route below still works as an alternative (it signs with
the custom app's secret instead):

```bash
node scripts/sky-register-webhook.mjs --list
node scripts/sky-register-webhook.mjs
```

Shopify retries non-2xx responses 8× over 4 h.

## 4. End-to-end test (sandbox, no physical item)

1. Production has the code deployed with `PERSONALISED_RELEASE_FLAGS` false.
2. Preview environment: `SKY_PREVIEW_UNLOCK=true`, `SKY_SIGNING_SECRET` set
   to the production value.
3. Publish the product to the **Clara Mendes** channel (the Hydrogen
   storefront's own channel — the storefront API token belongs to it, so
   "Clara Mendes Headless" alone is NOT enough; verified 2026-09-01).
   Production stays safe: the release flag still gates the PDP there.
4. Discount code `SKY-TEST-100`: 100 %, one use, this product only.
5. On the preview URL open `/products/your-sky-star-map`, enter a place,
   date and title, add to cart, check out with the code and a real address.
6. Expect within a minute: Oxygen production log
   `orders/paid: #… → Prodigi sandbox Created <id>`, and the order in
   https://sandbox-beta-dashboard.pwinty.com with the right SKU, frame
   colour, recipient and the asset downloaded.
7. Open the asset URL from the sandbox order: a PDF of the customer's sky.
8. Unpublish the product from the channels; remove `SKY_PREVIEW_UNLOCK`.

First run (2026-09-01, order #1001) caught a real fulfilment bug: Prodigi
rejects empty-string address parts (`recipient.address.line2`
MustNotBeEmptyOrWhitespace), so any recipient without an apartment line
failed. Fixed by omitting blank optional address lines entirely.

If the Prodigi order is missing: `node scripts/sky-replay-order.mjs --order
"#1234" --dry-run` shows exactly what the webhook computed.

## 5. Go-live

1. Confirm prices against Prodigi quotes (`POST /v4.0/quotes`, Standard,
   DE/FR/NL) — table below.
2. Production env: `PRODIGI_API_KEY` = live key,
   `PRODIGI_API_BASE=https://api.prodigi.com`.
3. PR flipping `PERSONALISED_RELEASE_FLAGS['your-sky-star-map']` to `true`
   (adds the "Your Sky" nav entry, grid card, sitemap entry).
4. Publish the product to both **Clara Mendes** and **Clara Mendes
   Headless** (bulk "Include in sales channels" on the products list).
5. Add the six variants to the Merchant Center TSV feed.
6. First paid order = first physical QC; watch the Prodigi dashboard.

## 6. Rollback

Flag back to `false` (PR) and unpublish the product. Orders already placed
still fulfil — the webhook does not depend on the flag.

## 7. Landed costs (sandbox quotes, DE, Standard — 2026-09-01)

`sky-check-prodigi.mjs --country DE`: all six variants ✔. The check also
surfaced that Prodigi requires the full attribute set per SKU (paperType
EMA, substrateWeight 200gsm; framed add frame Classic, glaze
"Acrylic / Perspex", mount "No mount / Mat") — the variant tables now set
them all. Totals below include Prodigi's taxes/fees; margin = price − total.

| Prodigi SKU | Attributes | Item | Ship DE | Landed | Price | Margin |
|---|---|---|---|---|---|---|
| GLOBAL-FAP-8X10 | paper set | 5.00 | 6.50 | 13.69 | 39.99 | 26.30 |
| GLOBAL-FAP-20X24 | paper set | 10.00 | 6.75 | 19.93 | 64.99 | 45.06 |
| GLOBAL-CFP-8X10 | full framed set, natural/black | 26.00 | 9.70 | 42.48 | 99.99 | 57.51 |
| GLOBAL-CFP-20X24 | full framed set, natural/black | 51.34 | 25.14 | 91.00 | 129.99 | 38.99 |

Re-run with the live key at go-live to confirm live pricing matches.

## 8. First Light — the second personalised product

The birth poster (`first-light-birth-poster`) shares this entire pipeline:
same env vars, same webhook, same print-route mechanics
(`/api/natal-print/<token>.pdf`), same Prodigi SKUs. It stays behind
`PERSONALISED_RELEASE_FLAGS['first-light-birth-poster']` and releases only
after Your Sky's first live order proves the chain.

Shopify product (admin UI):

| Field | Value |
|---|---|
| Title | First Light — a personalised birth poster |
| Handle | `first-light-birth-poster` (must match `NATAL_PRODUCT_HANDLE`) |
| Product type | `Personalised Art` |
| Vendor | Clara Mendes |
| Tags | `Clara Mendes Original`, `personalised`, `gift` |
| Option 1 | Size: `8 × 10 in`, `20 × 24 in` |
| Option 2 | Finish: `Unframed`, `Natural frame`, `Black frame` |
| Status | Active; no sales channels until go-live |

Variants (SKU must match `app/lib/natal/products.ts`; prices mirror the
sky's because the Prodigi SKUs are identical):

| Size | Finish | SKU | Price (EUR) |
|---|---|---|---|
| 8 × 10 in | Unframed | `CM-NATAL-8X10-UNF` | 39.99 |
| 8 × 10 in | Natural frame | `CM-NATAL-8X10-NAT` | 99.99 |
| 8 × 10 in | Black frame | `CM-NATAL-8X10-BLK` | 99.99 |
| 20 × 24 in | Unframed | `CM-NATAL-20X24-UNF` | 64.99 |
| 20 × 24 in | Natural frame | `CM-NATAL-20X24-NAT` | 129.99 |
| 20 × 24 in | Black frame | `CM-NATAL-20X24-BLK` | 129.99 |

Toggle the product OFF in the Prodigi Shopify app, exactly like the sky's.
The Prodigi catalogue check needs no separate run: `NATAL_VARIANTS` maps to
the same Prodigi SKUs and attributes as `SKY_VARIANTS`
(asserted by `scripts/natalParams.node-test.mjs`), so §2's
`sky-check-prodigi.mjs` result covers both products.

Sandbox E2E: repeat §4 on `/products/first-light-birth-poster` with a
name, birthplace and date; expect the Prodigi sandbox order's asset URL
under `/api/natal-print/`. Local QA render without any store setup:

```bash
node scripts/natal-render-local.mjs --name "Amélie" --date 2026-05-14 \
  --time 07:32 --lat 52.52 --lon 13.405 --tz Europe/Berlin \
  --place "Berlin, Germany" --details "3.4 kg · 51 cm" --theme linen \
  --size 8x10 --out output/natal/test.pdf
```

Go-live: PR flipping the natal flag (adds the "First Light" nav entry),
publish to both channels, add the six variants to the Merchant Center
feed. Rollback identical to §6 — orders already placed still fulfil.
