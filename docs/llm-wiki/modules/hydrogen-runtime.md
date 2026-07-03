# Hydrogen Runtime

## Current Picture

The storefront runs as a Hydrogen/React Router app with an Oxygen-compatible
worker entry in `server.ts`. Requests are wrapped in Hydrogen context before
React Router handles route matching and rendering.

Sources: `server.ts`, `app/lib/context.ts`, `app/routes.ts`, `package.json`.

## Request Handling

`server.ts` exports a module-format `fetch` handler. The handler:

1. Builds Hydrogen router context with `createHydrogenRouterContext`.
2. Creates a React Router request handler with `createRequestHandler`.
3. Runs the request through React Router.
4. Commits session cookies when pending session state exists.
5. Uses Shopify `storefrontRedirect` after app-level 404 responses.
6. Returns a generic 500 response on unexpected errors.

## Context Creation

`app/lib/context.ts` creates the Hydrogen context. Important behavior:

- Requires `SESSION_SECRET`.
- Opens the `hydrogen` cache.
- Initializes `AppSession`.
- Sets i18n to English / United States.
- Configures cart with `CART_QUERY_FRAGMENT`.
- Leaves a typed `additionalContext` extension point for future CMS or third
  party SDK clients.

## Routing

`app/routes.ts` combines React Router file-based routes from `flatRoutes()` with
Shopify's `hydrogenRoutes()` wrapper.

## Dependencies

`package.json` declares:

- `@shopify/hydrogen` `2026.4.0`
- `@shopify/cli` `3.91.1`
- React `18.3.1`
- React Router `7.12.0`
- Vite `6.4.2`
- Three.js, GSAP, and Lenis for interactive/visual storefront behavior

## Maintenance Notes

- If cart fields change, update `CART_QUERY_FRAGMENT` and rerun codegen.
- If Shopify/Hydrogen versions change, rerun typecheck, lint, build, and route
  checks.
- If adding third-party services, prefer adding typed clients to
  `additionalContext` rather than importing secrets directly into routes.

