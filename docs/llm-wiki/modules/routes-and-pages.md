# Routes And Pages

## Route Model

The repo uses React Router file-based routes wrapped by Hydrogen route helpers.
Customer-facing pages live under `app/routes`.

Source: `app/routes.ts`, `app/routes/*`.

## Main Storefront Routes

| Route | File | Purpose |
| --- | --- | --- |
| `/` | `app/routes/_index.tsx` | Home page, featured products, collection previews, trust band, structured data. |
| `/collections/all` | `app/routes/collections.all.tsx` | Shop-all collection, sorting, pagination, infinite loading, product grid. |
| `/collections/:handle` | `app/routes/collections.$handle.tsx` | Specific collection page, redirects demo/off-theme collections to all. |
| `/products/:handle` | `app/routes/products.$handle.tsx` | Product detail, variant selection, gallery, add to cart, Shop Pay, analytics. |
| `/cart` | `app/routes/cart.tsx` | Cart page loader/action and cart mutation endpoint for `CartForm`. |
| `/search` | `app/routes/search.tsx` | Regular and predictive search for products, pages, articles, and suggestions. |
| `/our-story` | `app/routes/our-story.tsx` | Brand story content. |
| `/contact` | `app/routes/contact.tsx` | Contact/support page. |
| `/policies` and `/policies/:handle` | `app/routes/policies.*.tsx` | Policy listing and policy detail from Shopify. |
| `/pages/:handle` | `app/routes/pages.$handle.tsx` | Shopify pages. |
| `/blogs` and blog/article routes | `app/routes/blogs.*.tsx` | Blog lists and article pages. |
| `/robots.txt`, `/sitemap.xml`, sitemap children | bracketed route files | SEO crawler routes. |

## Home Page

The home page queries products and collections, filters out demo/off-theme
catalog entries, and renders a high-touch commerce landing experience for Clara
Mendes.

Important dependencies:

- `filterDemoProducts`
- `filterDemoCollections`
- `PRODUCT_CARD_FRAGMENT`
- SEO helpers and structured data helpers
- `ClaraProductCard`

Source: `app/routes/_index.tsx`.

## Product Page

The product route:

- Requires a product handle.
- Queries a product by handle and selected variant options.
- Redirects demo/off-theme products to `/collections/all`.
- Renders product schema and breadcrumb schema.
- Tracks product views for Shopify analytics and ad platforms.
- Persists recently viewed entries.
- Supports variant option URLs.
- Supports add-to-cart and Shop Pay when the selected variant is available.

Source: `app/routes/products.$handle.tsx`.

## Collection Pages

Collection pages support:

- Shop-all products with sorting and pagination.
- Specific collections by handle.
- Demo/off-theme collection filtering and redirects.
- Infinite loading with an `IntersectionObserver` helper.

Sources: `app/routes/collections.all.tsx`,
`app/routes/collections.$handle.tsx`, `app/lib/collectionSort.ts`.

## Search

The search route supports both regular and predictive search. Search results are
filtered so demo/off-theme products and collections do not leak into the
customer-facing search experience.

Source: `app/routes/search.tsx`, `app/lib/search.ts`.
