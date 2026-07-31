# Social Media Kit — Clara Mendes

Updated: 2026-07-31. Applies to the claimed profiles — Instagram
`@shopclaramendes`, Pinterest `pinterest.com/shopclaramendes`, Facebook
`facebook.com/shopclaramendes` — linked from the storefront footer and the
Organization schema (`app/lib/socialProfiles.ts`; add or remove a profile
there and both update together). TikTok is intentionally unclaimed for now
(§8). All accounts are new and empty; this kit takes them to a working
presence without adding more than ~2 hours of work per week.

## 1. Voice

Social speaks exactly like the site: calm, precise, unhurried. The store
sells permanence — the feed must never feel like a discount rack.

- Sentence case, full sentences, no exclamation marks, emoji rarely and
  never decorative strings.
- Never: countdowns, "last chance", "tag a friend", discount-led hooks,
  stock or AI lifestyle imagery. Owned renders and real photos only (the
  same rule PR #17 enforced on the site).
- CTAs are quiet and singular: "The full capsule is at the link in bio." /
  "See the pair together at shopclaramendes.com."
- Vocabulary from the site: capsule, companion, considered, printed to
  order, calm/collected spaces, "one print carries a room".

## 2. Profile setup (one-time, ~1 hour)

Same avatar, name, and bio family everywhere so the three profiles read as
one brand.

- **Avatar**: the italic serif "Clara Mendes" wordmark on the paper
  background (`#fbfaf6`), or a tight crop of Quiet Form I. Same file on all
  three.
- **Cover/banner (Facebook)**: reuse the owned share card
  `public/images/share/og-default.jpg` (1200×630 Quiet Form I crop).
- **Instagram bio** (≤150 chars):
  > Original art for calm, collected spaces.
  > Five capsules, fifteen works — printed to order as 8×10 giclée prints.
- **Pinterest bio**: "Original art prints for calm, collected interiors.
  Five coordinated capsules: Quiet Form, Patina Blue, Neo Deco, Midnight
  Garden, Sunlit Mosaic."
- **Facebook intro**: "Original art for calm, collected spaces. Printed to
  order, shipped tracked."
- **Bio link** (all platforms):
  `https://shopclaramendes.com/collections/all?utm_source=<platform>&utm_medium=bio`
- **Pinterest**: convert to a free Business account and claim the
  `shopclaramendes.com` domain (Settings → Claimed accounts; verification
  is a DNS TXT record). Claiming attributes every pin of a site image to
  the account and unlocks analytics. Product OG tags are already in place,
  so claimed product pins render with live title/description.
- **Facebook ↔ Instagram**: link the page and the IG account in Meta
  Business Suite. Costs nothing now; it is the prerequisite for Meta ads
  and lets one post publish to both.

## 3. Content pillars

| Pillar | Share | What it is |
| --- | --- | --- |
| The work | ~40% | One print or one capsule per post: full view, detail crop, the capsule note as caption raw material |
| The room | ~25% | Prints in place — singles, pairs, trios; the companion logic ("designed to keep belonging together") |
| The practice | ~20% | Print-to-order, 200gsm Enhanced Matte, giclée detail, packing — the "made to keep" story |
| The point of view | ~15% | Short taste essays in caption form; what "considered" means; drop announcements when there is one |

Fifteen works × (full view + detail + in-room) is a 45-asset library before
anything new is shot. The five capsule notes in `app/lib/catalogFilters.ts`
and the per-print descriptions in `data/original-art-catalog.json` are
pre-written caption material — reuse them.

## 4. Cadence (solo-operator budget)

- **Instagram**: 2–3 feed posts/week, Stories on posting days (reshare the
  post + one behind-the-scenes frame). Batch caption-writing weekly.
- **Pinterest**: one 30–45 min batch/week, 5–8 pins. Pinterest is search,
  not a feed — pins compound for months, so consistency beats volume.
- **Facebook**: cross-post the IG feed 1–2×/week via Business Suite. The
  page's job is anchoring the vanity URL and enabling ads later, not
  original content.
- **Engagement**: 10 min/day — reply to every comment, follow/comment on
  interior-design and art accounts in the same palette family.

## 5. Launch fortnight

| Day | Platform | Post |
| --- | --- | --- |
| 1 | IG + FB | Brand intro carousel — one work per capsule, 5 slides (caption A) |
| 1 | Pinterest | Create 5 capsule boards, pin all 15 product images with product links |
| 3 | IG | Quiet Form capsule feature — 3 works + detail crop (caption B) |
| 5 | IG + FB | The practice — paper/print detail (caption C) |
| 6 | Pinterest | Batch 2: detail crops pinned to capsule boards |
| 8 | IG | Patina Blue capsule feature (caption B pattern) |
| 10 | IG + FB | The room — a pair hung together; companion logic caption |
| 12 | IG | Neo Deco capsule feature |
| 13 | Pinterest | Batch 3: in-room shots to a "Calm rooms" board |

Midnight Garden and Sunlit Mosaic features follow the same pattern in week
3, then the rotation continues pillar-weighted. Post between 18:00–20:00
local for the EU/US evening overlap; adjust once per-post reach data
exists.

**Caption A — intro (day 1):**
> Clara Mendes begins with a belief: the art we live with should bring
> character, calm, and a point of view to everyday spaces.
>
> Fifteen original works, five capsules — each printed to order as an
> 8×10 giclée on matte art paper, and composed so a single print carries
> a room while a pair reads as one intentional arrangement.
>
> The collection is at the link in bio.

**Caption B — capsule feature (adapt per capsule):**
> Quiet Form: warm architectural forms in ivory, oat, terracotta, and
> charcoal.
>
> Three works, composed to hold their own alone and to sit comfortably
> side by side. Begin with one; its companions will still belong next
> year.
>
> The full capsule is at the link in bio.

**Caption C — the practice:**
> Nothing sits in a warehouse. Each print is made when it is ordered —
> giclée on 200gsm Enhanced Matte Art paper, chosen for its flat,
> painterly surface and faithful colour — then shipped tracked.
>
> Printed to order, made to keep.

## 6. Pinterest structure

Boards: one per capsule (board description = the capsule note), plus
"Calm rooms" (in-room shots across capsules) and later "Pairs & trios".

Each product pin: image from `public/images/product-art/<capsule>/`, link
to the product page with UTM (§7), title keyword-first ("Warm neutral
abstract art print — Quiet Form I, 8×10 giclée"), description = the
catalog `description` plus room/palette keywords from the `alt` text.

## 7. Links and measurement

The storefront already captures attribution end-to-end
(`app/lib/marketingAttribution.ts`): `utm_*` parameters, plus `fbclid` /
`ttclid` / `gclid` click IDs, survive navigation and land on the order.
Nothing to build — only tag the links:

| Link | Convention |
| --- | --- |
| Bio links | `?utm_source=instagram\|pinterest\|facebook&utm_medium=bio` |
| Post/pin links | `?utm_source=<platform>&utm_medium=social&utm_campaign=<capsule-slug>` |

Lowercase everything. Weekly 15-minute review: Shopify Analytics sessions
by UTM source, orders' attribution data, IG saves and profile visits,
Pinterest outbound clicks. Saves and outbound clicks are the two numbers
that predict sales; follower count is not.

## 8. Deliberately deferred

- **TikTok**: skip until there is appetite for video; the storefront's
  pixel plumbing (`AdPlatformAnalytics.tsx`) already supports it if paid
  TikTok ever starts. If squatting is a concern, register
  `@shopclaramendes` once and leave it private — do not link it anywhere
  while empty.
- **Meta/Pinterest ads**: not before organic posting has run a few weeks
  and the pixel decision is made consciously (consent banner is live;
  pixels activate per `AdPlatformAnalytics` config).
- **Shop tabs** (IG Shopping / Facebook Shop): revisit after a steady
  posting month; requires the Meta link from §2 and catalog sync.

## 9. Ready-made content moments

- **Phone cases** (staged behind `EXTENSION_RELEASE_FLAGS`, PR #15): when
  the flag flips, run a three-post arc — teaser detail ("the first
  considered object"), the artwork-to-case story, then the release post
  with the capsule it belongs to.
- **New capsule or original work**: same arc; the capsule system is the
  recurring franchise format.
- **First customer photo**: ask permission, reshare to Stories, pin the
  photo to "Calm rooms" — the reviews feature on product pages sets the
  expectation that customer photos are part of the brand.
