# Your Sky — feature page: design

Date: 2026-09-02 · Status: approved by owner (structure, visual system, buy
flow, safety net all approved in conversation) · Branch: `fable/your-sky-feature-page`

## 1. Goal and definition of done

Move Your Sky from "a product in the grid" to "a feature of the shop": one
dedicated page, `/your-sky`, that is the only front door to the personalised
star map, presented in a night-editorial treatment, built to sell, and built
from parts that already exist. Owner's constraints: keep it simple, keep it
robust ("we don't want them breaking all the time"), make it impressive, the
goal is sales.

**Done means all of the following are true and evidenced:**

1. `https://shopclaramendes.com/your-sky` renders the page described in §3
   on desktop and on a phone; the live map updates as the customer types;
   Size and Finish select the right variant; Add to cart carries the signed
   personalisation attributes exactly as the product page did.
2. `/products/your-sky-star-map` (with or without a query string) answers a
   permanent redirect to `/your-sky` (query string preserved).
3. The star map no longer appears in `/collections/all`, search results,
   recommendations, recently-viewed, or the products sitemap; `/your-sky`
   is in the custom sitemap; the header and mobile menu link "Your Sky" to
   `/your-sky`.
4. Nothing in cart signing, the `orders/paid` webhook, the PDF route,
   Prodigi fulfilment, or the Shopify product record changes.
5. Unit tests cover the feature-handle rule, the redirect, the sitemap
   entries, and the page loader; `npm test`, `npm run typecheck`,
   `npm run lint`, and `npm run build` pass.
6. Screenshot-verified live (desktop + mobile) including an add-to-cart
   whose checkout shows the personalisation lines, then `/adversarial-verify`
   returns PASS on the finished deliverable.

### Non-goals

- A second theme/palette choice for the print; the print stays the linen
  edition as sold (this keeps preview and PDF identical).
- First Light on this page now (the route is config-driven so it can be added
  later by adding an entry — see §6 — but it stays dark until its flag flips).
- CMS-managed copy, animations beyond the site's existing reveal, quantity
  selection in the studio (the cart drawer keeps quantity).
- Any Shopify admin change. Product, variants, prices, publication, and the
  Prodigi channel mapping are untouched.

## 2. Where it lives

| Surface | Before | After |
|---|---|---|
| Page | `/products/your-sky-star-map` (product page, configurator in place of the gallery) | `/your-sky` (new route) |
| Old URL | product page | 301 → `/your-sky` + original query string |
| Header / mobile nav "Your Sky" | `/products/your-sky-star-map` | `/your-sky` |
| Shop grid, search, recommendations, recently-viewed | listed | excluded |
| Products sitemap | listed | excluded; `/your-sky` added to `CUSTOM_SITEMAP_PATHS` |
| Cart line link | product URL | product URL → redirect (works unchanged) |
| Merchant Center items (6) | link to product URL with option params | keep working via the redirect; owner may later re-point the TSV links to `/your-sky?Size=…&Finish=…` |

## 3. Page structure (top to bottom)

1. **Hero** — full-bleed night stage. Eyebrow "A personalised star map";
   headline "The sky above you, the night it mattered."; one line of
   sub-copy; price anchor "From €39.99 · made to order in the EU"; primary
   button "Design yours" (anchor to the studio). Visual: a static image of
   the actual product — the linen star-map print in a natural frame on a
   dark wall — with faint gold constellation lines behind it. Static image,
   so the hero paints instantly and cannot fail.
2. **The studio** (`#design`) — left: the live map (existing
   `SkyConfigurator`, unchanged component, dark stage styling around it);
   right: the buy panel — place/date/time/title come from the configurator;
   then Size (8 × 10 in, 20 × 24 in) and Finish (Unframed, Natural frame,
   Black frame) via the existing option picker; price; Add to cart. On
   phones the map stacks above the form and the existing sticky add-to-cart
   bar is reused.
3. **Occasions** — three cards: "The night you met", "The morning she was
   born", "Where you said yes"; each with a small static example sky; each
   links to `#design`.
4. **How it's made** — three facts: astronomically accurate for the place
   and minute (data-source credit line); giclée on 200gsm Enhanced Matte
   Art paper, optional natural or black frame; printed to order in the EU,
   delivered in 5–10 business days (the store's existing promise copy).
5. **Reassurance + FAQ** — made to order; tracking emailed after dispatch;
   the store's return window; three questions: "Can I set an exact time?",
   "Which finish should I choose?", "Can it be a gift?".
6. **Closing line** — "Begin with a place and a date." → `#design`.

Copy is occasions-led, in the store's editorial voice, no urgency or
scarcity language (same rule as the original Your Sky spec).

## 4. Visual system (nothing new invented)

- **Palette:** hero + studio use the existing Midnight Garden sky theme
  colours from `app/lib/sky/themes.ts` (`#141b2b`/`#0c111c` night,
  `#f1e3b8` star gold, `#b08d57` bronze ring, `#b7ad93` muted,
  `#f4ecd8` title). Sections 3–6 return to the store's linen `#efe8dc`, so
  header and footer stay as they are everywhere else.
- **Honesty rule:** the night is the stage, not the product. The hero and
  the studio both show the real linen print as sold; the live preview keeps
  rendering the linen plate that the PDF prints.
- **Type:** the site's existing serif headline and eyebrow styles; no new
  fonts or icons.
- **Motion:** one soft fade-up of the hero text on load; the site's existing
  cinematic-scroll reveal for the sections below. No star animation, no
  parallax.
- **Imagery:** four static WebP images under `public/images/your-sky/`:
  `hero-print.webp` (framed linen print on a dark wall) and three occasion
  skies. Generated once by a new script, `scripts/generate-your-sky-images.mjs`,
  from the same engine that prints the maps (`computeSky` → `SkySvg`
  markup → `sharp` rasterisation, composited with the existing Natural-frame
  blank the way `scripts/generate-classic-frame-mockups.mjs` does).
  Committed to the repo; no runtime generation.
- **Buy panel:** dark card, light inputs, gold focus ring, the store's ink
  primary button. Styles live in `app/styles/app.css` under a `.your-sky-`
  namespace (one file, no new build step).

## 5. Architecture and components

**New**

- `app/routes/your-sky.tsx` — loader: read the feature config (§6) for
  handle `your-sky-star-map`; 404 unless
  `PERSONALISED_RELEASE_FLAGS[handle]` is true; fetch the product with the
  same Storefront query/fragments the product page uses (moved to a shared
  module, see below); resolve the selected variant from `?Size=&Finish=`
  the way the product page does. Component: the six sections of §3.
  Emits the same Product JSON-LD (`productSchema` from `app/lib/seo.ts`)
  and SEO meta; records nothing to recently-viewed.
- `app/components/SkyStudio.tsx` — the studio block: `SkyConfigurator` +
  buy panel (`VariantOptions`, `ProductPrice`, `AddToCartButton` with
  `toCartAttributes(params)` as line attributes, sticky bar on mobile).
  Owns the `skyParams` state exactly as the product page does today.
- `app/lib/featurePages.ts` — the config: `{handle, path, navLabel, title,
  copy}` for `your-sky-star-map` (First Light is a future second entry).
- `scripts/generate-your-sky-images.mjs` + committed WebPs.
- Tests: `scripts/featurePages.node-test.mjs` (feature-handle rule +
  config), additions to `scripts/catalogFilters.node-test.mjs` and
  `scripts/sitemap.node-test.mjs`, and a redirect/loader test.

**Changed**

- `app/lib/catalogFilters.ts` — add `FEATURE_PAGE_HANDLES` (handles that are
  purchasable but not listed) and `isFeaturePageHandle()`;
  `isStoreThemeProduct` stays true for them (cart, PDP loader) while
  listing surfaces, search, recommendations, recently-viewed and the
  products sitemap exclude them via a new `isListedProduct()` used at those
  call sites.
- `app/routes/products.$handle.tsx` — at the top of the loader: if the
  handle is a feature-page handle whose flag is on, throw a 301 redirect to
  the feature path plus the original search string. Extract
  `VariantOptions`, `ProductPrice`, `formatMoney` into
  `app/components/VariantOptions.tsx` / `app/components/ProductPrice.tsx` /
  `app/lib/money.ts`; extract the product query + fragments into
  `app/lib/productVariantFragment.ts` (the shared variant fragment; the page keeps its own `FEATURE_PRODUCT_QUERY` in the route). The PDP keeps its sky/natal branches (First
  Light still renders there until it moves).
- `app/components/ClaraShell.tsx` — nav entry for Your Sky → `/your-sky`
  (from the feature config).
- `app/lib/sitemap.ts` — add `/your-sky` to `CUSTOM_SITEMAP_PATHS`; strip
  feature-page product URLs from the products sitemap.
- `app/styles/app.css` — `.your-sky-*` styles.
- `docs/your-sky-release.md` — note the new front door and the redirect.

**Unchanged (deliberately):** `SkyConfigurator`, `app/lib/sky/*`, cart
actions, `/webhooks/orders-paid`, `/api/sky-print/*`, Prodigi mapping,
the Shopify product.

## 6. Data flow

```
GET /your-sky?Size=8+×+10+in&Finish=Natural+frame
  → loader: FEATURE_PAGES['your-sky-star-map'] → flag on? → Storefront product query
  → selectedVariant from search params (same helper as the PDP)
  → render hero (static) + SkyStudio(product, selectedVariant)
     SkyConfigurator → onChange(params|null) → SkyStudio state
     AddToCartButton lines=[{merchandiseId, quantity: 1, attributes: toCartAttributes(params)}]
  → cart action signs attributes (unchanged) → checkout → orders/paid webhook (unchanged)
```

Feature config shape (kept tiny on purpose):

```ts
export const FEATURE_PAGES = {
  'your-sky-star-map': {
    path: '/your-sky',
    navLabel: 'Your Sky',
    title: 'Your Sky — a personalised star map',
    // copy blocks for hero / occasions / how / faq
  },
} as const;
```

Adding First Light later = one more entry + its configurator component
in the studio switch; no new route file.

## 7. Error handling

- Flag off or product not found → `404` (never a blank page).
- Star catalogue fails to load → the configurator's existing message; Add
  to cart stays disabled (existing behaviour).
- Signing secret missing → the existing cart error ("Personalisation is not
  available right now").
- Static sections (hero, occasions, how, FAQ) render regardless of the
  above, so the page is never empty.

## 8. Testing

- `catalogFilters.node-test.mjs`: the feature handle is sellable but not
  listed; excluded from listing/search filtering; the nav link target
  comes from the config.
- `sitemap.node-test.mjs`: fixture gains `/products/your-sky-star-map` →
  stripped; `/your-sky` present in the custom paths.
- Redirect test: the extracted guard returns a 301 to `/your-sky` with the
  query string preserved for the feature handle, and nothing for others.
- Loader test with a product fixture: selected variant resolution for
  `?Size=&Finish=`; 404 when the flag is off.
- Existing sky tests unchanged and green.
- Live: screenshots desktop + mobile; add to cart → checkout shows the
  personalisation lines; `/adversarial-verify` PASS.

## 9. Rollback and ship path

- One PR on `fable/your-sky-feature-page`; CI (lint, typecheck, test,
  build) + the Oxygen preview URL for a look before merge.
- Rollback = revert the PR: the product page's sky branch is intact and the
  redirect is gated by the same feature list, so reverting restores the old
  behaviour instantly. No admin steps in either direction.
