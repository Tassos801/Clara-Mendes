# Black Friday week 2026: handoff

**Updated:** 17 November 2026, end of day (office PC).

Costs, margins, the ad budget and account ids are not in this public repository. They are in the office notes (`black-friday-2026-11/STATUS.md`, `PLAN.md`, `AUDIT.md` on the office PC).

## What is live

The sale started on **17 November** (the owner moved it forward from 20 November) and ends at the **end of Monday 30 November**, shop time.

| Part | State |
| --- | --- |
| Shopify automatic discounts | Three, all Active, ending by themselves: "Black Friday 20% off" (blankets, cushions, mugs, phone cases, plant pots, hanger prints, art prints without framed variants); "Black Friday 20% off prints" (unframed variants of the studio prints; Your Sky and First Light except framed 20 × 24); "Black Friday 10% off" (clothing and activewear without premium hoodies, tote bags, canvas, framed art). |
| Storefront | PRs #207, #208, #210 merged and live: sitewide line, `/black-friday` page, product-page line, cart discount rows. Rules in `app/lib/blackFriday.ts`. Everything switches off by itself after the end. |
| Cart check | One real cart passed for every tier and every exclusion on 17 November. |
| Feeds | PR #209 merged and live: every feed image link asks the Shopify CDN for a JPEG (`format=pjpg`). After that Meta accepted the Museum Masterpieces images. |
| Meta ads | Campaign "Black Friday week \| Home and art \| catalog carousel \| EU \| Nov 2026": published, start 17 November, end 1 December 00:00 (ad account time), product set "Black Friday week" (16 products), five EU countries. The old NYC campaign is off. |
| Test discount codes | SHIP-TEST-FREE and SKY-TEST-100 are deactivated (not deleted). |

Not in the sale: hats, premium hoodies, cards, postcards, book nooks, acrylic and metal prints, framed variants of art prints.

## Still to do

1. **18 November:** look at the ad's first delivery in Ads Manager (it showed "Preparing" on the 17th); check Merchant Center for image warnings, because all feed image links changed; check that the remaining Museum Masterpieces items in the Meta catalogue turned Eligible.
2. **1 December:** confirm the three discounts and the campaign ended; delete the two helper collections "Black Friday 20% (discount helper)" and "Black Friday 10% (discount helper)" in Shopify admin. Nothing has to be removed in code.
3. **Owner's call:** Meta advertiser verification (the "Verification may be required soon" banner).
4. **Later, outside the sale:** postcards and cards earn little or nothing at full price; framed 20 × 24 prints lose money to Cyprus, Malta and Greece; the premium hoodie in Black 3XL is thin at full price.

## Good to know

- The admin work was done in the browser (Shopify admin and Meta Ads Manager): the shop's API token has no discount scope.
- To preview any date, add `?today=YYYY-MM-DD` to a storefront URL. It changes the text only; prices and the cart follow the real discounts.
- The discounts select products through the two helper collections plus one variant-level list; if a product is added to the shop during the sale it is not discounted unless it is added there too.
