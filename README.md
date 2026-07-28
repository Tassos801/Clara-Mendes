# Clara Mendes Storefront

Production Shopify Hydrogen storefront for [shopclaramendes.com](https://shopclaramendes.com) — original art for calm, collected spaces.

**Stack:** Shopify Hydrogen (2026.4) · React Router 7 · Vite · Shopify Oxygen · Storefront API.

## Catalog state

- **Live:** 15 original art prints across 5 capsules (Quiet Form, Patina Blue, Neo Deco, Midnight Garden, Sunlit Mosaic). Unframed 8 × 10 in giclée prints on 200gsm Enhanced Matte Art paper, printed to order. Source of truth: `data/original-art-catalog.json`.
- **Draft / unpublished:** 12 extension product families, 71 variants (`data/art-product-extensions.json`, `docs/art-product-extensions.md`). These must stay Draft and off every sales channel until pricing, Prodigi mapping verification, billing, and samples are signed off (`docs/launch-readiness.md`). The storefront allowlist in `app/lib/catalogFilters.ts` keeps unreleased products out of search, collections, recommendations, and the sitemap even if they are published by mistake.

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

- `npm run catalog:art:audit` — verify the 15 live prints against Shopify.
- `npm run catalog:extensions:audit` — verify Draft extension products.
- `npm run catalog:art:dry-run` / `catalog:extensions:dry-run` / `catalog:legacy:dry-run` — print planned changes without applying.

**Mutating — writes to the live Shopify store. Run only with explicit sign-off:**

- `npm run catalog:art:sync` — creates/updates the 15 print products.
- `npm run catalog:extensions:sync` — creates/updates Draft extension products.
- `npm run catalog:legacy:draft` / `catalog:legacy:restore` — unpublish or restore legacy products.
- `node scripts/setup-reviews.mjs` — one-time metaobject/metafield definitions (idempotent; `--dry-run` available).

## Deployment

`.github/workflows/oxygen-deployment-1000130920.yml`: every push and PR runs lint → typecheck → test → build; deploys run only after validation, from push events. `main` deploys production; other branches get isolated Oxygen previews. Deployments queue per branch so an older run can never overwrite a newer one. The only secret used is `OXYGEN_DEPLOYMENT_TOKEN_1000130920`.

## Product reviews

Customers submit star-rated reviews with photos; entries are stored as Shopify metaobjects, created as Draft, and appear only after being set Active in **Admin → Content → Metaobjects → Product review**. Requires `SHOPIFY_ADMIN_ACCESS_TOKEN` with product, metaobject, and file read/write scopes; without it the form degrades gracefully.

## SEO & sitemap

- Every indexable route sets a unique title, meta description, canonical on `https://shopclaramendes.com`, Open Graph/Twitter tags, and JSON-LD where relevant (`app/lib/seo.ts`).
- `/sitemap.xml` is Shopify's index plus a custom child (`/sitemap/custom/1.xml`) covering `/`, `/collections/all`, `/our-story`, `/contact`, `/policies`. Off-theme products/collections, the obsolete `/pages/contact` (301 → `/contact`), and the empty `/blogs/news` are excluded; empty content resources are noindexed until they have content.
- Capsule filtering on `/collections/all?capsule=<slug>` canonicalizes to `/collections/all`.

## Operational safeguards

- Never run mutating catalog scripts against production without sign-off; use the dry-run first.
- Draft extension products stay unpublished — publishing, price, SKU, inventory, fulfillment, and billing changes are out of scope for storefront work.
- Checkout testing stops before payment: add to cart, open checkout, verify product/currency, do not place orders.
- No secrets in code, logs, or Git history; `.env`, `.shopify`, and build output are ignored.
