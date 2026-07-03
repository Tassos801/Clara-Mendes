# Source Map

This page lists the main repo sources used by the LLM wiki. The wiki summarizes
these files; it does not replace reading them.

## Repo And Runtime

- `README.md` - setup, environment variables, validation, and hosting notes.
- `package.json` - scripts and Hydrogen/React Router/Vite versions.
- `server.ts` - worker fetch handler, React Router request handler, session
  commit, Shopify redirect fallback.
- `app/lib/context.ts` - Hydrogen context, session, cache, i18n, cart fragment.
- `app/routes.ts` - Hydrogen route wrapper around file-based React Router
  routes.
- `app/root.tsx` - document shell, analytics provider, attribution capture, app
  layout, error boundary.

## Customer-Facing Storefront

- `app/routes/_index.tsx` - home page, collections/products query, hero and
  merchandising sections.
- `app/routes/collections.all.tsx` - shop-all grid, sorting, pagination,
  infinite loading.
- `app/routes/collections.$handle.tsx` - specific collection route and
  off-theme redirect handling.
- `app/routes/products.$handle.tsx` - product page, variants, add-to-cart,
  Shop Pay, product schema, related products.
- `app/routes/search.tsx` - regular and predictive search.
- `app/components/ClaraShell.tsx` - header, footer, mobile nav, cart drawer.

## Catalog And Merchandising

- `app/lib/catalogFilters.ts` - home-goods, off-theme, demo, and unfulfillable
  product/collection filtering.
- `app/components/ClaraProductCard.tsx` - product card component.
- `app/lib/productCardFragment.ts` - shared product card GraphQL fragment.

## Cart, Checkout, Analytics

- `app/routes/cart.tsx` - cart loader/action, cart mutations, attribution merge.
- `app/components/AddToCartButton.tsx` - Hydrogen CartForm wrapper and
  add-to-cart analytics.
- `app/components/CartMain.tsx` - shared cart page/drawer renderer.
- `app/lib/marketingAttribution.ts` - UTM/click ID capture and cart attribute
  transformation.
- `app/components/AdPlatformAnalytics.tsx` - ad-platform commerce events.

## Operations And Existing Docs

- `docs/launch-readiness.md` - launch gates and growth metrics.
- `docs/shopify-admin-cleanup.md` - off-theme Admin cleanup list.
