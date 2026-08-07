# Hydrogen Runtime

## Current Picture

The storefront runs as a Hydrogen/React Router app with an Oxygen-compatible
worker entry in `server.ts`. Requests are wrapped in Hydrogen context before
React Router handles route matching and rendering.

Sources: `server.ts`, `app/entry.server.tsx`, `app/lib/context.ts`,
`app/lib/csp.ts`, `app/routes.ts`, `package.json`.

## Request Handling

`server.ts` exports a module-format `fetch` handler. The handler:

1. Builds Hydrogen router context with `createHydrogenRouterContext`.
2. Creates a React Router request handler with `createRequestHandler`.
3. Runs the request through React Router.
4. Commits session cookies when pending session state exists.
5. Uses Shopify `storefrontRedirect` after app-level 404 responses.
6. Returns a generic 500 response on unexpected errors.

## Security Headers

`app/entry.server.tsx` builds the Content-Security-Policy with Hydrogen's
`createContentSecurityPolicy` and sets it — plus `X-Content-Type-Options` and
`Referrer-Policy` — on every SSR response. Hydrogen ships no `img-src`
default, so the image policy is fully defined by `CSP_IMG_SRC` in
`app/lib/csp.ts`: `'self'`, `data:` (inline CSS backgrounds), `blob:`
(object-URL upload previews, e.g. review photos), and
`https://cdn.shopify.com`. `scripts/csp.node-test.mjs` scans `app/` for
scheme usage and fails `npm test` when a scheme in use is missing from the
list.

Consequences worth knowing:

- Admin-authored HTML (blog articles, pages, policies) renders unsanitized,
  and hand-pasted `<img>` tags pointing at hosts outside the allowlist are
  silently blocked by the browser — images must be Shopify-hosted.
- The Meta/TikTok base pixels are not installed. Installing them requires
  also allowlisting their hosts in the CSP in `app/entry.server.tsx`, or the
  loaders are silently blocked and `AdPlatformAnalytics` events stay no-ops.

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
- If a component starts loading images from a new scheme or host, add it to
  `CSP_IMG_SRC` in `app/lib/csp.ts`; `scripts/csp.node-test.mjs` enforces the
  schemes it can detect statically.

