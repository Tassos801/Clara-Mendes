# US launch bundle: Admin runbook

This file covers steps B2, B3, C2 and C3 from [status.md](status.md), in the
order they must run. **Each numbered step needs the owner's go-ahead in
chat** before anything is written. Nothing here has been done yet.

Rules: [HANDOFF.md](HANDOFF.md). Don't erase anything: only the US moves,
and every Cyprus, EU and other-country zone, rate, market and feed stays as
it is. Shopify Admin and Merchant Center are signed in only in Claude in
Chrome. After each step, record the readback in status.md.

Approved inputs (owner, 2026-10-18): USD by Shopify's automatic conversion
with .99 rounding (D2). US rates: prints and unframed Your Sky €11.99,
canvas €23.99, phone cases €7.99 (D3). Framed and cards stay out of the US
(D5). Book nooks unchanged (D4). Feed links get a market pin (D7).

## 0. Ship the code first ✓

Merge PR #140 into `main` so Oxygen deploys A1 (the `?country=` pin), A2
(US delivery wording) and A2b (no import duties on US-lab lines). These are
harmless before the US market exists.

*Check:* on shopclaramendes.com, `/products/quiet-form-i-art-print?country=CY`
shows the EU wording. A US visitor without the pin sees "delivery within the
US is estimated at 7–15 business days".

**Done 2026-10-18:** merged as `e348c69`; Oxygen run 39156549472 succeeded.
Live readback (from the owner's Mac, an EU location):
- `?country=US` on a print, the phone case, `/collections/abstract-wall-art`
  and `/your-sky` showed the US wording. Print and case also showed "US
  orders ship from within the US, so no import duties apply."
- `?country=CY` and the unpinned print showed the unchanged EU wording.
- The framed print with `?country=US` kept the generic wording (out of US
  reach).
- Canonicals carry no query, prices are still EUR, and `llms.txt` has the
  US line.

## 1. Studio Classic Framed 16×20 (before US rates drop)

The studio "Classic Framed Art Print — 16 × 20 in" sits in the **General**
profile. Prodigi charges €23.05 to ship a framed 16×20 to the US (B1), so
step 2's €11.99 General rate would undercharge it by about €11. Owner
picks one:

- **a. (recommended, additive)** Create a profile "Framed 16×20". Copy the
  zones and rates of "Framed Your Sky", add a "United States" zone at
  €23.99, and move the 10 museum framed 16×20 products plus the studio
  Classic Framed into it. "Framed Your Sky" keeps the 20×24 and 8×10 framed
  Your Sky variants (20×24 ships from GB at €67.74, so no US). This also
  opens framed 16×20 to the US, which the owner deferred under D5, so ask
  explicitly.
- **b.** Move only the studio Classic Framed into "Framed Your Sky". This
  ends its US reach (today €17.99, under cost).
- **c.** Leave it in General and accept the loss on US framed orders.

## 2. US shipping zones (B3), still in EUR

Admin → Settings → Shipping and delivery. In each profile below, remove
**United States** from the zone that holds it today, then add a new zone
"United States" with one Standard rate. A country can sit in only one zone
per profile, so every other country in the old zone keeps its rate.

| Profile | Today (US) | New US zone |
| --- | --- | --- |
| General (prints, unframed Your Sky) | €17.99 in "International" | €11.99 |
| Canvas 16x20 | €29.99 | €23.99 |
| Phone cases | €12.99 | €7.99 |
| Quiet Current activewear | €4.95 (own US zone) | no change |
| Book nooks, Framed Your Sky, Letter post, Pastel Forms | – | no change |

*Check:* run
`node scripts/audit-customer-purchase-path.mjs --handle=<h> --country-code=US --country="United States" --city="New York" --postal-code=10001`
for `quiet-form-i-art-print`, `stretched-canvas-art-16x20` and
`art-tough-phone-case`. Expect 11.99, 23.99 and 7.99. The Cyprus default
run must still return 3.99. Shipping sync to Merchant Center is on, so the
US shipping service updates there by itself; confirm it the next day.

## 3. Dollars and Google, in one session (B2 + C2 + C3)

The EUR file feeds already target the US (C1). Once the US sees USD, Google
would compare EUR feed prices with USD pages and disapprove. So do all of
3a–3c together, or not at all.

- **3a. United States market (B2).** Settings → Markets → Create market →
  United States. This moves the US out of "International", which keeps
  its other 177 countries.
  - Currency USD with automatic conversion and .99 rounding; no price
    adjustment.
  - Catalog: all products.
  - Customer privacy matching International (cookie banner, data-sharing
    opt-out, as US state privacy laws expect).
  - *Check:* the Storefront readback (status.md, Evidence) shows US
    `currency: USD`, and a US product page shows `$`.
- **3b. USD feed for the US (C2).** Pick one:
  - **Recommended:** build A5 first (code). It's a route such as
    `/feeds/google/us.tsv` that lists live products at US prices with
    `?country=US` links. Merge it, then add it in Merchant Center as a
    scheduled-fetch primary source: label `CLARA-PRINTS-USD`, country
    United States, English, free listings. It stays in sync by itself.
  - Or copy the hand-kept TSV files (`clara-mendes-google-feed.txt`,
    `clara-mendes-sky-feed.txt`; not on the Mac, probably on the Windows
    PC) with USD prices and `?country=US` links, and upload them as new
    sources.
- **3c. Pin the EUR feeds (C3).** Append `?country=CY` to every link in the
  two EUR files and re-upload them. When the USD source shows approved
  items, remove United States from the EUR sources' country list (the
  listings have moved, not gone). Confirm that removal with the owner
  first.
- *Check over 1–3 days:* Merchant Center → Needs attention shows no new
  price-mismatch or currency issues.

## 4. After the market is live

- **A3:** show USD figures in the fixed wording (Your Sky price line,
  activewear rate table US row), using what checkout shows for the
  converted rates.
- **A4:** structured data follows the page's market (D6).
- **B5:** fill in the placeholders in
  [shipping-policy-us.md](shipping-policy-us.md) with step 2's rates,
  merge it into the policy draft and paste it into Admin.
