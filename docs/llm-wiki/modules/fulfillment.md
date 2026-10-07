# Fulfillment And Delivery Promises

Snapshot: 2026-10-02

## Pastel Forms Pot Exception

The four pots use saved automatic Prodigi `PLANT-POT` mappings with Standard
shipping from GB by **Royal Mail Airmail Untracked**. Shopify profile
`147873595726` covers exactly these four products and all EU-27 at EUR 6.99
for pot-only orders; mixed profiles may combine charges. The series, PDPs
and Shopify shipping policy disclose untracked delivery and possible
recipient import taxes, duties and handling fees. Do not promise tracking.

Supplier quotes and all 108 one-pot EU-27 carts were checked on 2026-10-02.
The connected account's primary billing method is present and its existing
24-hour edit hold is unchanged; IOSS is blank. The owner waived a physical
sample in favour of reviewing the first paid order and explicitly accepted
uncertain import charges. No order or physical delivery is verified yet.
Use the [pot-specific first-order review](../../pastel-plant-pots.md#first-paid-order-review),
not the wall-art tracking checklist, for these lines.

## Facts

- Fulfilment is Prodigi print-on-demand from UK/EU labs; there is no Cyprus
  facility, so the home market ships the same Standard lanes as the rest of
  the EU (`docs/original-art-launch.md`).
- Orders import to Prodigi and sit in a 24-hour auto-release hold before
  production starts; production runs 1–3 business days, so dispatch lands
  2–4 business days from order (`docs/first-order-runbook.md`).
- A gift note typed in the Your Sky review step travels as a separately
  signed `Gift note` line attribute; the paid-order webhook turns it into
  Prodigi's `packingSlip.url`, an A4 PDF served on demand by
  `/api/sky-slip/<token>.pdf` (`app/lib/sky/gift.ts`,
  `app/lib/sky/slip.server.ts`). Prodigi prints it in place of its default
  slip, so a gift parcel carries the note and no price.
- Prodigi Standard delivery estimates, counted from dispatch: EU 5–10 and
  US 7–15 business days. Only the EU window is promised on the storefront.
- Live Shopify Markets (checked 2026-09-29 via the Storefront API
  `localization.availableCountries` query) enable all 27 EU countries:
  a `Cyprus` market plus a `European Union` market holding the other 26.
  No US, no GB, no non-EU Europe. Code-side allowlist is `MARKET_COUNTRIES`
  (`app/lib/markets.ts`, EU-27 + GB + US); the live intersection governs
  checkout, so re-run the query before widening any copy claims.
- A country needs three admin settings to be sellable, and missing any one
  fails quietly: membership in an active market (without it the Storefront
  API returns `MERCHANDISE_OUT_OF_STOCK` and a €0 cart), plus a zone in the
  General profile (prints, €16 International) and in the `Letter post -
cards & postcards` profile (€2.90). Shopify only lets a zone include a
  country after it is in a market. Until 2026-09-29, 12 EU members (BG EE
  GR HR HU LT LU LV MT RO SI SK) failed the first two checks.

## Where The Promises Render

- Constants: `app/lib/storefrontBasics.ts` — PRODUCTION_WINDOW_BUSINESS_DAYS,
  DISPATCH_WINDOW_BUSINESS_DAYS, DELIVERY_EU_BUSINESS_DAYS,
  DELIVERY_INTERNATIONAL_BUSINESS_DAYS (7–20, every non-EU country).
- PDP: the availability chip and the Shipping details row in
  `app/routes/products.$handle.tsx` interpolate those constants;
  `ProductShippingText` takes a `reach` (`worldwide` / `selected` for canvas
  and framed Your Sky / `eu` for cards) that mirrors the shipping profiles.
- Shipping policy: `docs/shopify-policies-drafts.md` is the paste source for
  Shopify Admin > Settings > Policies; the site footer links
  `/policies/shipping-policy`, which renders the admin-hosted content.
- Ops QC: `docs/first-order-runbook.md` step 5 validates tracking against the
  same windows.

## Changing A Window

Update the constants, mirror the change in the shipping-policy draft and
re-paste it into Shopify Admin, and re-check runbook step 5. The live policy
page and the Merchant Center shipping settings live in Shopify admin and do
not update from code.

## Corrections (2026-09-11)

- Print and slip tokens are signed over a purpose (`print` / `slip`) as well
  as the canonical string (`encodeCanonicalToken(canonical, secret, purpose)`
  in `app/lib/sky/sign.server.ts`). The cart attribute `_sig` is a bare HMAC
  over the canonical and is returned to the browser in every cart response;
  before this it verified as a print token, so anyone with a sky in their cart
  could download the print-ready PDF without buying. Tokens minted before the
  change no longer verify (no real orders existed).
- The webhook answers Prodigi's own 400/409/422 rejections (validation,
  idempotency conflict) with 200 and a "needs attention" log line (replay
  with `scripts/sky-replay-order.mjs`). Everything else, including 401/403,
  rate limits, network and 5xx failures, answers 502: Shopify retries a failing
  subscription 19 times over 48 hours and then removes it, which would strand
  every later personalised order.
- Recipient fields (`email`, `phoneNumber`, `line2`) are omitted when blank
  and `stateOrCounty` is `null` when blank; Prodigi rejects empty strings.
- `parseCoordinate` (`app/lib/sky/params.ts`) rejects blank or malformed
  `_lat`/`_lon` values instead of reading them as 0°, 0°.

## 2026-10-03 - Book nook fulfilment

The CJ book nook uses a separate profile with delivery included only to Cyprus
and Germany. It ships from China separately from prints, with 1–3 day estimated
processing and longer destination-specific estimates; the print constants do
not apply. CJ IOSS and store-order-value declarations are configured. Supplier
payment is still required for each imported paid order. See the
[CJ launch record](../../book-nooks-launch.md) for cost and VAT limitations.

A fresh Storefront API localization readback on this date lists all 27 EU
countries; the older 15-country observation above is historical. A product's
dedicated delivery profile can restrict checkout to fewer destinations.

## 2026-10-06 - Worldwide except the UK

Owner decisions (2026-10-06): sell worldwide minus the UK (a non-UK seller
must register for UK VAT before the first UK sale), a region rate card per
product line, canvas and framed Your Sky only where Prodigi's shipping cost
is at most EUR 30, and book nooks worldwide with delivery included before
per-country CJ quotes (CJ has no API key; the owner accepted the risk).

Costs come from a read-only Prodigi quote sweep (`POST /v4.0/quotes`,
Standard, EUR, never an order) over every Shopify country for
ART-FAP-EMA-8X10, GLOBAL-FAP-20X24, GLOBAL-CAN-16X20 (MirrorWrap),
GLOBAL-CFP-20X24 (natural), the iPhone 16 Pro tough case and PLANT-POT.
Prodigi routes to its nearest lab: US orders ship USPS from the US lab,
AU/NZ and parts of Asia from the AU lab, most others Royal Mail
International Tracked from GB. It publishes no non-EU window, so the
storefront promises 7–20 business days after dispatch.

Excluded everywhere: GB and IM (UK VAT area); sanctioned RU BY IR KP SY CU;
conflict zones on hold AF IQ LY SD SS SO YE VE MM HT CF ML PS; and countries
Prodigi cannot quote prints to. The Shopify market "International" (EUR, no
local currencies) holds the remaining 178 countries, mirrored by
`INTERNATIONAL_MARKET_COUNTRIES` in `app/lib/markets.ts`.

Rate card, applied as zones in each Shopify shipping profile (EU zones are
unchanged: Cyprus EUR 3.99, other EU EUR 16, cases EUR 4.95, pots EUR 6.99,
cards EUR 2.90):

- Prints and unframed Your Sky (General profile): non-EU Europe EUR 9.99
  where Prodigi charges at most ~EUR 11 (AD AL AX BA CH GG IS JE MD ME MK NO TR VA);
  EUR 17.99 where it charges at most EUR 20 (161 countries); EUR 39.99
  up to EUR 40 (ID IL MY).
- Stretched canvas 16 × 20 (own profile): EUR 29.99 where the canvas costs at
  most EUR 30 (AU AX CA CH CN HK IN JP MC NO NZ PH SG TH TW US VA VN).
- Framed Your Sky variants (own profile): EUR 29.99 where GLOBAL-CFP-20X24
  costs at most EUR 30 (AU CN HK IN JP MC NZ PH SG TH TW VN); US framed costs about EUR 67.
- Phone cases: EUR 6.99 (CH FO GG JE NO RS TR); EUR 12.99 where the case costs
  at most EUR 21 (118 countries, including JP and SG at EUR 20.32).
- Plant pots: EUR 11.99 where the pot costs at most EUR 21 (173
  countries), never the US (Prodigi cannot quote it).
- Cards and postcards: EU only (letter post).
- Book nooks: delivery included in every market country
  (`deliversWorldwide` in `data/curated-products.json`; the CY/DE
  `verifiedDeliveryCountries` stay the verified lanes).

Outside the EU, import taxes and duties are payable by the recipient (DDU);
the shipping policy, PDP shipping text and llms.txt say so. Structured data
keeps `SHIPPING_COUNTRY_CODES` to the EU-27: repeating ~180 regions on every
variant offer would bloat each product page. The paid-order webhook needs a
postcode (`app/lib/sky/fulfilment.ts`), so a Your Sky or phone-case order to
a country without postcodes (for example Hong Kong or the UAE) lands as
"needs attention" for a manual Prodigi order.

## 2026-10-08 - Quiet Current on Printful

The Quiet Current activewear is the store's first Printful line. Printful's
Shopify app imports the orders, manual order confirmation is on, and the
account's primary billing method is set (2026-10-07). All 40 variants now use
`Quiet Current activewear`, a custom EUR shipping profile with nine Standard
zones and no transit times: Cyprus 3.99, other EU 4.95, non-EU Europe 6.99,
EFTA 9.99, US/Japan 4.95, Canada/Australia/New Zealand 6.99, and the remaining
158 enabled market countries (including Brazil) 12.99. The app-created USD
profile `#PF-FRG42` remains with 0 products. The saved rates were checked
after reload; the existing Shopify Markets exclusions remain in effect.

All four Shopify descriptions now disclose the heavier US shell (78%
polyester, 22% elastane; 290 g/m²); the bra also discloses its US mesh lining
(92% polyester, 8% elastane). Automated checkout delivery dates were on,
with a Next business day fallback, and the Oct 13 rate preview could conflict
with the activewear dispatch promise. Live Cyprus checkout initially said
"Ships next business day", with no predicted arrival date.

On 8 October 2026, the owner separately approved switching the store-wide
delivery estimates Off. Admin saved Off and confirmed "Delivery date settings
updated". A fresh Germany checkout kept Standard EUR 4.95 while removing
"Ships next business day". Shipping rates and the product dispatch windows
remain unchanged.

The four-item browser cart (EUR 262.00 subtotal) verified one flat Standard
rate in each zone: CY 3.99, DE 4.95, RS 6.99, CH 9.99, US 4.95, JP 4.95,
CA 6.99, AU 6.99 and BR 12.99. No extra per-item shipping was added for
these same-profile lines. The tests stopped before payment; the test cart
was emptied and Cart 0 persisted after reload. The first paid order remains
the first physical QC and requires manual Printful confirmation.

Printful makes these garments on its own clock: 2–5 business days in-house,
3–7 at partner facilities, plus the manual confirmation. `fulfilmentWindows`
(`app/lib/storefrontBasics.ts`) gives the four product types (Yoga Leggings,
Sports Bra, Biker Shorts, Studio Top) production 2–7 and dispatch 3–8 on the
PDP and in the Offer `handlingTime`. Printful's transit (EU 3–7 business
days) fits the shared delivery windows. See
[Quiet Current launch record](../../quiet-current-release.md#timings-and-fabric).
