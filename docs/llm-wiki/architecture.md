# Architecture

Clara Mendes is a Hydrogen storefront with file-based React Router routes,
Hydrogen Storefront API context, cart handling, analytics, and customer account
routes.

## Runtime Flow

1. Shopify/Oxygen-compatible worker entry receives the request in `server.ts`.
2. `createHydrogenRouterContext` builds Hydrogen context from request, env,
   cache, session, i18n, and cart fragment configuration.
3. `createRequestHandler` delegates routing/rendering to React Router.
4. If the response is 404, `storefrontRedirect` checks Shopify redirects before
   returning the final 404.
5. If session data changed, the response commits the session cookie.

Sources: `server.ts`, `app/lib/context.ts`, `app/lib/session.ts`.

## Application Shell

`app/root.tsx` defines the root document, stylesheet links, cart loading, Shopify
analytics provider, marketing attribution capture, ad platform analytics, the
Clara shell, and the error boundary.

`ClaraShell` composes:

- `Aside.Provider`
- `CinematicProvider`
- site header
- route outlet
- footer
- cart drawer
- mobile nav

Sources: `app/root.tsx`, `app/components/ClaraShell.tsx`,
`app/components/Aside.tsx`, `app/components/cinematic/CinematicProvider.tsx`.

## Data Sources

| Area | Data source | Main files |
| --- | --- | --- |
| Storefront products/collections | Shopify Storefront API | `app/routes/_index.tsx`, `app/routes/collections.all.tsx`, `app/routes/products.$handle.tsx` |
| Cart | Hydrogen cart handler | `app/routes/cart.tsx`, `app/components/CartMain.tsx`, `app/lib/fragments.ts` |
| Customer account | Customer Account API | `app/routes/account.tsx`, `app/routes/account.orders.$orderId.tsx`, `app/graphql/customer-account/*` |
| Policies/pages/blogs | Shopify Storefront API | `app/routes/policies.*.tsx`, `app/routes/pages.$handle.tsx`, `app/routes/blogs.*.tsx` |

## Key Boundaries

- Customer-facing rendering is in `app/routes` and `app/components`.
- Shopify/Hydrogen request context is in `server.ts` and `app/lib/context.ts`.
- Storefront fragments and shared GraphQL are in `app/lib/fragments.ts` and
  related route files.
- Catalog filtering is centralized in `app/lib/catalogFilters.ts`.

## Deployment And Environment

The repo is designed for a Hydrogen storefront. README notes that Oxygen
deployment depends on Shopify Admin channel availability and that Headless
channel credentials have been configured locally.

Do not document actual `.env` values. The wiki only records environment
variable names and behavior.

Sources: [README](../../README.md), `server.ts`, `app/lib/context.ts`.
