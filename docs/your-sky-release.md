# Your Sky — release runbook

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
| 8 × 10 in | Natural frame | `CM-SKY-8X10-NAT` | 89.99 |
| 8 × 10 in | Black frame | `CM-SKY-8X10-BLK` | 89.99 |
| 20 × 24 in | Unframed | `CM-SKY-20X24-UNF` | 64.99 |
| 20 × 24 in | Natural frame | `CM-SKY-20X24-NAT` | 139.99 |
| 20 × 24 in | Black frame | `CM-SKY-20X24-BLK` | 139.99 |

Inventory: not tracked. Shipping: physical, uses the store's EU profile.
Featured image: an export of the Paris example (`scripts/sky-render-local.mjs`).

**Prodigi Shopify app:** toggle this product **OFF** in the Prodigi channel.
Our webhook creates the Prodigi order; if the app also sees the product it
would raise a duplicate "requires attention" order.

## 3. Webhook

```bash
node scripts/sky-register-webhook.mjs --list
node scripts/sky-register-webhook.mjs
```

Requires the custom app to have `read_orders`. The subscription points at
`https://shopclaramendes.com/webhooks/orders-paid`; Shopify retries
non-2xx responses 8× over 4 h and deletes the subscription after 8
consecutive failures — re-run the script if `--list` ever shows it missing.

## 4. End-to-end test (sandbox, no physical item)

1. Production has the code deployed with `PERSONALISED_RELEASE_FLAGS` false.
2. Preview environment: `SKY_PREVIEW_UNLOCK=true`, `SKY_SIGNING_SECRET` set
   to the production value.
3. Publish the product to the **Clara Mendes Headless** channel only.
4. Discount code `SKY-TEST-100`: 100 %, one use, this product only.
5. On the preview URL open `/products/your-sky-star-map`, enter a place,
   date and title, add to cart, check out with the code and a real address.
6. Expect within a minute: Oxygen production log
   `orders/paid: #… → Prodigi sandbox Created <id>`, and the order in
   https://sandbox-beta-dashboard.pwinty.com with the right SKU, frame
   colour, recipient and the asset downloaded.
7. Open the asset URL from the sandbox order: a PDF of the customer's sky.
8. Unpublish the product from Headless; remove `SKY_PREVIEW_UNLOCK`.

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

## 7. Landed costs (fill from quotes before go-live)

| Prodigi SKU | Attributes | Item | Standard shipping DE | Price | Margin |
|---|---|---|---|---|---|
| GLOBAL-FAP-8X10 | — | | | 39.99 | |
| GLOBAL-FAP-20X24 | — | | | 64.99 | |
| GLOBAL-CFP-8X10 | color natural/black | | | 89.99 | |
| GLOBAL-CFP-20X24 | color natural/black | | | 139.99 | |
