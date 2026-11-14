# Google Shopping ads: start here on every PC

**Repository:** https://github.com/Tassos801/Clara-Mendes  
**Owner:** Tassos  
**State on 2026-11-14** — The owner approved starting `Shopping EU home`
that day. Google Ads shows the campaign as **Enabled** and **Eligible**
with a start date of 14 November. Its automated stop rule is **enabled**.
The campaign's Products view, filtered to the museum families, listed
**85 items** out of **168** in the EUR Printful feed. The rows inspected
showed **Pending initial review**.

This repository is public. Budget, bids, margins, sales and traffic figures
are **not** in this file. The owner has them; ask in chat. The full working
notes with those figures are on the office PC:
`Desktop\Mine\shopify\google-ads-2026-11\` (`status.md`, `campaign-build.md`,
`product-group-ids.md`, `products.csv`, `screens\`).

## Goal

Run one Standard Shopping campaign for museum-art blankets, cushions
and mugs. Monitor product eligibility and campaign delivery, then review
orders attributed to Shopping clicks with the owner.

## Decisions (owner, 2026-11-13; do not re-open)

| Decision | Detail |
|---|---|
| Channel | Google Shopping, Standard Shopping. Not Performance Max: ads show our products as they are, never generated creative. |
| Products | Museum blankets, cushions, mugs only. No clothing, prints, cards, postcards or pots in the first test. |
| Market | **EU campaign only** for now: Germany, Netherlands, Ireland, Austria, Belgium. The US campaign is postponed. |
| Budget | Set by the owner (one daily figure for the EU campaign). Ask the owner; never raise it without them. |
| Bidding | Manual CPC. Bids per product group: ask the owner. |
| Goal | Purchases. |

## Done

- **Feed titles name the artist** (PR #196, merged): "Irises Throw Blanket by
  Van Gogh — 50 × 60 in". The artist comes from the art registry by product
  handle (`artistShortName()` in `app/lib/artistShops.ts`).
- **Product page titles name the artist** (PR #197, merged): `<title>`,
  `og:title` and the JSON-LD name.
- All four live feeds scanned: no row with a known artist lacks the name.
- **Merchant Center 5837804292:** all 168 items (blankets, mugs, cushions) are
  Approved for free listings in the EU feed (label `CLARA-PRINTS-EUR`) and
  the US feed (label `CLARA-PRINTS-USD`). Item titles show the artist.
- **Google Ads account** opened by the owner (the Google login that owns
  Merchant Center; it is the only Ads account there). Billing country Cyprus,
  time zone Nicosia, currency EUR. Payment and verification done by the owner.
- Merchant Center is **linked** to the Ads account. "Shopping ads" is on, and
  both Printful feed sources carry "Free listings, Shopping ads".
- In Google Ads: auto-tagging on, auto-apply off, account-level final URL
  suffix
  `utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={product_id}`.
- Google Ads shows campaign-level negative keywords and an enabled
  automated rule to pause `Shopping EU home`.

## Product review

Check Campaigns → `Shopping EU home` → Products after the next feed sync.
Compare the listed item IDs with
[/feeds/google-merchant-printful.txt](https://shopclaramendes.com/feeds/google-merchant-printful.txt).
Use the Status and Issues columns to track which products clear initial
review. Check impressions to confirm the campaign has started serving.

## Campaign setup and follow-up

1. **Review the existing campaign settings** against the build plan.

   | Setting | Value |
   |---|---|
   | Name | `Shopping EU home` |
   | Merchant Center | 5837804292, feed label `CLARA-PRINTS-EUR` |
   | Type | Standard Shopping |
   | Bidding | Manual CPC, Enhanced CPC off |
   | Budget | the owner's figure |
   | Priority | Low |
   | Networks | Search Network only (no Search partners, Display, YouTube) |
   | Locations | Germany, Netherlands, Ireland, Austria, Belgium; option **Presence** |
   | Languages | All |
   | Ad group | `EU museum home` |

2. **Check product groups.** The build plan subdivides All products by
   category and then Item ID, with "Everything else" excluded at both levels.
   - Categories: `Blankets`, `Throw Pillows`, `Mugs` (the Google categories in
     `app/lib/merchantFeed.ts`, `MUSEUM`).
   - Our items are the feed rows of those categories; ids start with `CM-`.
     The 168 ids: read `/feeds/google-merchant-printful.txt` and keep the
     three categories.
   - **Tier A** (higher bid): ids that start with `CM-FW-01` (The Great Wave),
     `CM-MM-01` (Irises), `CM-MM-02` (Wheat Field with Cypresses), `CM-MM-05`
     (The Milkmaid), `CM-MM-06` (Strawberry Thief), `CM-MM-07` (The Night
     Café), `CM-LC-06` (Mondrian, no mug). **Tier B:** all the others.
   - Why Item ID and not category alone: Merchant Center holds about 19 items
     that Google crawled by itself (ids like `16163650961742_cm-lc-10-…`),
     some of them cushions. They must not serve.
3. **Review campaign-level negative keywords.** Google Ads shows 31 entries
   using broad and phrase match.
4. **Check.** The ad group's Products tab lists only our ids. Take
   screenshots: settings, product group tree with bids, locations, three ad
   previews (a blanket, a cushion, a mug).
5. **Authorization.** The owner approved starting `Shopping EU home` on
   14 November. Refer Meta campaign decisions to the owner.
6. **After launch.** Check impressions, clicks and landing pages once
   products clear review. Use search terms and product results to evaluate
   negative keywords and item tiers.

## Purchase tracking (decided approach, not set up yet)

Upload purchases to Google Ads from the click id on each order. The
storefront already saves `gclid`, `gbraid`, `wbraid` and the UTM values as
cart attributes (`app/lib/marketingAttribution.ts`), so every order shows its
ad click with no Google tag. To set up, with the owner's OK: one conversion
action "Purchase" of type import-from-clicks, Primary, and a weekly upload
(time zone Europe/Nicosia; within 90 days of the click). Rejected for now:
the Google & YouTube app's purchase event (no Google tag runs on the
storefront, so it would most likely carry no click id) and a GTM container
plus a Shopify custom pixel (Google does not support its tags inside custom
pixels).

Until then: an order from an ad shows `utm_source=google`, the campaign id in
`utm_campaign` and the product id in `utm_content`.

## Ground rules

1. **Owner gates.** Only the owner sets or raises a budget, says "publish",
   enters payment details, accepts terms, merges pull requests, and decides
   on the Meta campaign. A go-ahead must come from the owner in chat.
2. **Do not turn on** the Google & YouTube app's product sync (it links to the
   unused Online Store domain), and do not click "Allow ads" for the products
   "found by Google" in Merchant Center.
3. **Do not change** Merchant Center account-level shipping (the Shopify app
   rewrites it) or the Meta ads.
4. **Stop rule.** The owner sets the limits. Read the current thresholds in
   Google Ads → Tools → Bulk actions → Rules.
5. **Public repository:** no budget, bid, margin, sales or traffic figures in
   branch names, commits, pull requests or files.
6. Proof for every step: a screenshot. No step is "done" without one.

## Storefront

[PR #200](https://github.com/Tassos801/Clara-Mendes/pull/200) went live on
14 November in [the production Oxygen deployment](https://github.com/Tassos801/Clara-Mendes/actions/runs/43592324123).
The EUR feed uses `?country=CY`. On 12 exact feed links, production showed
the saved delivery destination for Germany, the Netherlands, Ireland,
Austria and Belgium. The Cyprus page appeared for a saved US shopper on
the same links. The checked prices and structured offers matched the
feeds, including both cushion sizes with inserts and the USD links.
The 18 × 18 in Great Wave cushion with insert reached checkout at €64.99.
The browser's test cart showed `Cart 0` after removal and reload.
