# Clara Mendes Storefront

Production Shopify Hydrogen storefront for [shopclaramendes.com](https://shopclaramendes.com) — original art for calm, collected spaces.

**Stack:** Shopify Hydrogen (2026.4) · React Router 7 · Vite · Shopify Oxygen · Storefront API.

## Catalog state

- **Live:** 15 original art prints across 5 capsules (Quiet Form, Patina Blue, Neo Deco, Midnight Garden, Sunlit Mosaic), each available in 8 × 10, 16 × 20, and 20 × 24 in. The mistaken complete framed-print product was returned to Draft and unpublished on 2026-08-24; the intended replacement is a frame-only offer in those same three sizes. Source of truth: `data/original-art-catalog.json` and `data/art-product-extensions.json`.
- **Draft / unpublished:** all 12 extension records (`data/art-product-extensions.json`, `docs/art-product-extensions.md`). The retired complete framed-print record remains Draft because it does not match the frame-only requirement; the other 11 families stay off every sales channel until their release gates pass and storefront flags flip. The Art Premium Fleece Blanket candidate remains Draft because its live EUR 49 variant prices do not match the approved EUR 79 manifest price; its 2026-07-31 storefront flag was rolled back on 2026-08-10. The allowlist in `app/lib/catalogFilters.ts` keeps unreleased products out of search, collections, recommendations, direct product routes, navigation, and the sitemap even if they are published by mistake. Notebook, tote, cushion, and phone case additionally wait on Prodigi template assets held outside this repo.
- **Staged for release:** the Art Snap Phone Case's storefront experience (PDP copy, print-page cross-sell) is built and dormant behind its flag. Two personalised products are likewise built and dormant behind `PERSONALISED_RELEASE_FLAGS`: the Your Sky star map and the First Light birth poster (both configurator, cart signing, webhook fulfilment and on-demand print routes; `docs/your-sky-release.md` is the go-live runbook for both). Releasing any family is a one-line flip plus Shopify publication — both required — per `docs/phone-case-release.md` (phone-case specifics; the flag mechanics generalise).

Operational warning (updated 2026-08-21): the 15 prints and released frame are
available through the production Storefront API. Shopify can create a cart, calculates delivery
rates, and advertises card and wallet payment methods. The owner reports an
accepted Prodigi billing card and has approved the current prices, Standard
shipping, no physical samples, and a 24-hour automatic-release window. On
2026-07-28, the owner reported changing the live Prodigi preference from an
indefinite hold to 24-hour automatic release. Independent dashboard readback was
unavailable, so monitor the first order carefully; it will also be the first
physical-quality check. See `docs/original-art-launch.md`.

## Local development

```sh
npm ci
npm run dev
```

Requires Node `^22 || ^24` and a `.env` file (never committed) with:

```text
SESSION_SECRET
PUBLIC_STORE_DOMAIN
PUBLIC_CHECKOUT_DOMAIN
PUBLIC_STOREFRONT_API_TOKEN
PUBLIC_STOREFRONT_ID
PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID
PUBLIC_CUSTOMER_ACCOUNT_API_URL
PRIVATE_STOREFRONT_API_TOKEN
SHOP_ID
SHOPIFY_STOREFRONT_API_VERSION
SHOPIFY_ADMIN_ACCESS_TOKEN   # server-side only; powers reviews + catalog scripts
```

Values live in the Oxygen environment for deployments. If a private token leaks outside a secret store, revoke and reissue it in Shopify Admin.

## Validation

All four must pass before merging; CI enforces them.

```sh
npm run lint
npm run typecheck
npm test          # node --test over scripts/*.node-test.mjs
npm run build
```

Dependency-audit status and accepted findings: `docs/dependency-security.md`.

## Catalog scripts

Read-only (safe anytime):

- `npm run catalog:art:audit` — verify the 15 Active prints and extension
  catalog against Shopify.
- `npm run catalog:extensions:audit` — verify the released frame is Active and
  the other 11 extension products are Draft.
- `npm run catalog:art:dry-run` / `catalog:extensions:dry-run` / `catalog:legacy:dry-run` — print planned changes without applying.
- `npm run catalog:art:mockups` — regenerate all 8 × 10, 16 × 20, and 20 × 24 room mockups from the flat art and owned backdrop; `catalog:art:mockups:large` and `catalog:art:mockups:bigger` generate one expansion size only, and `catalog:art:mockups:dry-run` previews the media append.

**Mutating — writes to the live Shopify store. Run only with explicit sign-off:**

- `npm run catalog:art:sync` — creates/updates the 15 print products.
- `npm run catalog:art:mockups:sync` — appends missing size-specific room mockups to each live print's media (productCreateMedia only; never touches status, variants, or prices).
- `npm run catalog:extensions:sync` — creates/updates Draft extension products.
- `npm run catalog:legacy:draft` / `catalog:legacy:restore` — unpublish or restore legacy products.
- `node scripts/setup-reviews.mjs` — one-time metaobject/metafield definitions (idempotent; `--dry-run` available).

## Deployment

`.github/workflows/oxygen-deployment-1000130920.yml`: every push and PR runs lint → typecheck → test → build; deploys run only after validation, from push events. `main` deploys production; other branches get isolated Oxygen previews. Deployments queue per branch so an older run can never overwrite a newer one. The only secret used is `OXYGEN_DEPLOYMENT_TOKEN_1000130920`.

## Product reviews

Customers submit star-rated reviews with photos; entries are stored as Shopify metaobjects, created as Draft, and appear only after being set Active in **Admin → Content → Metaobjects → Product review**. Requires `SHOPIFY_ADMIN_ACCESS_TOKEN` with product, metaobject, and file read/write scopes; without it the form degrades gracefully.

## SEO & sitemap

- Every indexable route sets a unique title, meta description, canonical on `https://shopclaramendes.com`, Open Graph/Twitter tags, and JSON-LD where relevant (`app/lib/seo.ts`).
- `/sitemap.xml` is Shopify's index plus a custom child (`/sitemap/custom/1.xml`) covering `/`, `/collections/all`, the five capsule landing pages, `/our-story`, `/contact`, `/policies`. Off-theme products/collections, the obsolete `/pages/contact` (301 → `/contact`), and the empty `/blogs/news` are excluded; empty content resources are noindexed until they have content.
- The five capsule landing pages (`/collections/<capsule-slug>`) are storefront-rendered from the sync-guaranteed capsule tags — no Shopify collection required. Their editorial copy lives in `app/lib/capsulePages.ts`; capsule filtering on `/collections/all?capsule=<slug>` canonicalizes to the matching landing page.
- No third-party image hosts: product imagery is Clara Mendes artwork; the ambient backdrop photography (`public/images/backdrops/`) is Unsplash-licensed and self-hosted. The CSP image policy (`app/lib/csp.ts`, asserted by `scripts/csp.node-test.mjs`) allows `'self'`, the Shopify CDN, and the `data:`/`blob:` schemes used for inline CSS backgrounds and client-side upload previews — images hand-pasted into admin-authored blog posts, pages, or policies must be Shopify-hosted or the browser blocks them. The share card (`/images/share/og-default.jpg`) stays owned artwork.

## Operational safeguards

- Never run mutating catalog scripts against production without sign-off; use the dry-run first.
- Unreleased extension products stay Draft and unpublished; release changes require explicit owner approval and full fulfilment verification.
- Checkout testing stops before payment: add to cart, open checkout, verify product/currency, do not place orders.
- No secrets in code, logs, or Git history; `.env`, `.shopify`, and build output are ignored.
