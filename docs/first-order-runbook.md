# First Customer Order — Monitoring Runbook

Updated: 2026-08-11. Applies to the fifteen Active originals in three sizes
fulfilled by Prodigi (`ART-FAP-EMA-8X10`, `ART-FAP-EMA-16X20`,
`GLOBAL-FAP-20X24`; Standard shipping, 24-hour automatic release —
owner-confirmed). No test or sample order exists; the first real order is the
first end-to-end check. Work through this within the first 24 hours of the
order landing.

## 1. Order lands in Shopify

Admin → Orders (https://admin.shopify.com/store/vre00g-8b/orders).

- Financial status **Paid**; no fraud flag (open the order and check the
  Fraud analysis panel before letting it release).
- Line SKU matches one `CM-**-8X10`, `CM-**-16X20`, or `CM-**-20X24`;
  price EUR 29.99 / 39.99 / 49.99 by size (USD varies per market).
- Customer email present; confirmation email shows as sent under Timeline.

## 2. Order reaches Prodigi (within ~15 minutes)

Prodigi dashboard → Orders (https://dashboard.prodigi.com/orders).

- The Shopify order number appears with status **On hold / awaiting release**,
  not "In production" — the 24-hour window is working. Note the shown release
  time: it must be ~24 h after import, not immediate.
- Open the order: product matches the line's size — **ART-FAP-EMA-8X10**
  (8 × 10), **ART-FAP-EMA-16X20** (16 × 20), or **GLOBAL-FAP-20X24** (the
  metric 50 × 60 cm product backing the 20 × 24) — all EMA 200gsm, unframed;
  quantity and address match Shopify exactly.
- Open the artwork preview: the full composition, full bleed, no unexpected
  border, correct artwork for the SKU (compare against
  `docs/original-art-launch.md` mapping table).
- Shipping method is **Standard**.
- If the order is NOT in Prodigi after 30 minutes: check the Prodigi sales
  channel in Shopify Admin → Sales channels for sync errors, then Prodigi
  Settings → "Update store data".

## 3. During the 24-hour hold

- The order stays editable in Prodigi (address, artwork, cancel) until release.
  Use this window to fix any mapping or address problem found in step 2.
- To stop a bad order: cancel it in Prodigi before release; refund in Shopify.
  To stop further sales of an affected product: set that product to Draft in
  Shopify Admin (do not touch the other fourteen).

## 4. Release and production

- At release time the order flips to **In production** without manual action.
  If it does not, check Prodigi billing state first (the accepted card is
  owner-confirmed but has never been charged).
- For an 8 × 10 line the first Prodigi invoice should be ~€18.30 landed
  (CY Standard) or ~€18.32 (US Standard) per the 2026-07-24 quotes. Those
  quotes cover `ART-FAP-EMA-8X10` only — no landed quotes are on file for
  16 × 20 or 20 × 24 lines, so for those pull the current quote for the
  order's exact SKU from the Prodigi dashboard before judging the charge.
  A charge materially different from the applicable quote means the shipping
  method or product mapping changed — pause before the next order.

## 5. Dispatch and tracking

- Prodigi marks the order shipped and pushes tracking to Shopify; the Shopify
  order should show **Fulfilled** with a tracking number, and Shopify sends the
  customer shipping-confirmation email automatically (Timeline shows it).
- Tracking carrier/service must be consistent with Standard (estimates:
  EU 5–10, US 7–15 business days after the 1–3 day production window).
- If tracking does not appear in Shopify within 1 business day of Prodigi
  showing "Shipped", treat it as an integration failure: fulfil manually with
  the tracking number from the Prodigi order page and contact Prodigi support.

## 6. Delivery quality (waived-sample check)

The first delivered order doubles as the physical-quality gate. Apply the
"Waived sample acceptance checklist" in `docs/original-art-launch.md`:
complete uncropped composition, ≤2 mm trim error, clean colour and dark
detail, no pixelation/banding/ink defects/scuffs/creases/corner damage, dry
undamaged white-label packaging, tracking matching the service. Keep the order
record, invoice, tracking dates, and any customer photos. Any failure → set the
affected product to Draft and resolve before taking another order.

## Escalation quick reference

| Problem | Immediate action |
| --- | --- |
| Wrong artwork/SKU in Prodigi | Cancel in Prodigi during hold; fix mapping; refund or re-place |
| Order never reaches Prodigi | Prodigi channel "Update store data"; check channel errors; fulfil manually if urgent |
| Released instantly (no 24 h hold) | Re-check Prodigi order-pause setting; treat window as unverified |
| Billing failure at release | Owner fixes card in Prodigi billing; order retries |
| No tracking back to Shopify | Manual fulfilment with Prodigi tracking; Prodigi support ticket |
| Quality/packaging failure | Product to Draft; document; Prodigi reprint/credit request |
