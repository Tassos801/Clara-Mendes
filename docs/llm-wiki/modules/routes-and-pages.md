# Routes And Pages

## Route Model

The repo uses React Router file-based routes wrapped by Hydrogen route helpers.
Customer-facing pages live under `app/routes`.

Source: `app/routes.ts`, `app/routes/*`.

## Visual Material System

The storefront uses a warm liquid-glass layer built from shared tokens in
`app/styles/app.css`. Navigation, commerce controls, product purchase surfaces,
drawers, filters, and mobile actions use translucent paper- and mineral-tinted
surfaces with fine highlights and restrained shadows while product artwork stays
opaque and color-accurate. Route-scoped styles extend the same treatment across
the home hero, collection tools, story page, product cards, and reviews.

Coarse-pointer devices avoid the most expensive fixed-surface blur, and
`prefers-reduced-transparency` plus no-`backdrop-filter` fallbacks retain clear,
near-opaque surfaces. These styles do not change catalog, pricing, or Shopify
data behavior.

Sources: `app/styles/app.css`, `app/routes/_index.tsx`,
`app/routes/collections.all.tsx`, `app/routes/our-story.tsx`,
`app/components/ClaraProductCard.tsx`,
`app/components/reviews/ReviewsSection.tsx`.

## Main Storefront Routes

| Route                                           | File                                 | Purpose                                                                         |
| ----------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| `/`                                             | `app/routes/_index.tsx`              | Home page, featured products, collection previews, trust band, structured data. |
| `/collections/all`                              | `app/routes/collections.all.tsx`     | Shop-all collection, sorting, pagination, infinite loading, product grid.       |
| `/collections/:handle`                          | `app/routes/collections.$handle.tsx` | Specific collection page, redirects demo/off-theme collections to all.          |
| `/products/:handle`                             | `app/routes/products.$handle.tsx`    | Product detail, variant selection, gallery, add to cart, Shop Pay, analytics.   |
| `/cart`                                         | `app/routes/cart.tsx`                | Cart page loader/action and cart mutation endpoint for `CartForm`.              |
| `/search`                                       | `app/routes/search.tsx`              | Regular and predictive search for products, pages, articles, and suggestions.   |
| `/our-story`                                    | `app/routes/our-story.tsx`           | Brand story content.                                                            |
| `/contact`                                      | `app/routes/contact.tsx`             | Contact/support page.                                                           |
| `/policies` and `/policies/:handle`             | `app/routes/policies.*.tsx`          | Policy listing and policy detail from Shopify.                                  |
| `/pages/:handle`                                | `app/routes/pages.$handle.tsx`       | Shopify pages.                                                                  |
| `/blogs` and blog/article routes                | `app/routes/blogs.*.tsx`             | Blog lists and article pages.                                                   |
| `/robots.txt`, `/sitemap.xml`, sitemap children | bracketed route files                | SEO crawler routes.                                                             |

## Home Page

The home page queries products and collections, filters out demo/off-theme
catalog entries, and renders a high-touch commerce landing experience for Clara
Mendes. The original-art preview accepts the handles that are actually
available through the Storefront API; matching cards link to their product
pages, while unavailable Draft works remain non-interactive previews.

The homepage editorial ("the living edit") is static curated content, not
product-aware. It always renders the three styled art-in-room photographs in
`public/images/home-editorial/` (Quiet Form above a linen sofa, Patina Blue
with stoneware, Sunlit Mosaic over a timber table), each linking to its
capsule landing page. The previous `homepage-editorial` Shopify-collection
override and best-selling substitution were removed 2026-08-11: whenever any
products loaded they replaced the styled scenes with raw print files — three
same-capsule images that repeated the adjacent grids and collided in the
layout. Changing this section is a code change to
`app/content/homeEditorial.ts` (items) and the images directory.

The mobile hero keeps its expansive composition on standard phone screens. On
viewports no wider than 768 pixels and no taller than 680 pixels, the UI layer
switches to a compact three-row grid so the glass navigation, hero copy and
actions, and enter-shop control cannot overlap. Focused source regression tests
lock that short-viewport composition.

Important dependencies:

- `filterDemoProducts`
- `filterDemoCollections`
- `PRODUCT_CARD_FRAGMENT`
- SEO helpers and structured data helpers
- `ClaraProductCard`
- `HomepageEditorial`
- `HOME_EDITORIAL_ITEMS`

Sources: `app/routes/_index.tsx`, `app/components/HomepageEditorial.tsx`,
`app/content/homeEditorial.ts`, `scripts/mobileLanding.node-test.mjs`.

## Product Page

The product route:

- Requires a product handle.
- Queries a product by handle and selected variant options.
- Redirects demo/off-theme products to `/collections/all`.
- Renders product schema and breadcrumb schema.
- Tracks product views for Shopify analytics and ad platforms.
- Persists recently viewed product snapshots under the versioned browser key
  `cm:recently-viewed:v2`. Bumping the key intentionally drops older cached
  price snapshots rather than rendering stale catalog prices.
- Supports variant option URLs.
- Supports add-to-cart and Shop Pay when the selected variant is available.

Source: `app/routes/products.$handle.tsx`.

## Collection Pages

Collection pages support:

- Shop-all products with sorting and pagination.
- Specific collections by handle.
- Demo/off-theme collection filtering and redirects.
- Removal of empty legacy categories from the previous catalog.
- Infinite loading with an `IntersectionObserver` helper.

Sources: `app/routes/collections.all.tsx`,
`app/routes/collections.$handle.tsx`, `app/lib/collectionSort.ts`.

## Search

The search route supports both regular and predictive search. Search results are
filtered so demo/off-theme products and collections do not leak into the
customer-facing search experience.

Source: `app/routes/search.tsx`, `app/lib/search.ts`.
