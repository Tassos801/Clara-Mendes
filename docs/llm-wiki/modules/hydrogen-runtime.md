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

`script-src` has the same shape of trap, discovered the hard way
(2026-08-18): Hydrogen merges custom values into its defaults for
`connectSrc`/`styleSrc`/`defaultSrc`, but it has NO default `scriptSrc` —
whatever `CSP_SCRIPT_SRC` lists is the entire script allowlist (Hydrogen
only appends the per-request nonce). A past tightening reduced it to just
googletagmanager, which CSP-blocked the Shopify consent privacy banner
(`withPrivacyBanner` in `root.tsx` loads
`cdn.shopify.com/shopifycloud/privacy-banner/storefront-banner.js`) on
every production page — so EU visitors could never grant consent and
analytics stayed silent — and intermittently blocked Oxygen-served lazy
route/vendor chunks (recovered by a jarring full reload). `'self'`,
`https://cdn.shopify.com`, and googletagmanager are now asserted by
`scripts/csp.node-test.mjs` so the regression cannot ship silently again.

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
- Lenis for desktop smooth scrolling; the painted background is plain
  WebGL and the chapter reveals use IntersectionObserver and the Web
  Animations API (`app/components/cinematic/`), so the whole cinematic
  layer is one ~9 kB gzip chunk, loaded once the page has loaded and the
  visitor first scrolls, touches, moves the mouse or presses a key (a cold
  WebGL context costs the main thread ~200 ms)

## Images from public/

Oxygen serves `public/` files through Shopify's image service at full size:
plain sRGB JPEGs pass through as they are, but WebP and ICC-tagged JPEGs are
re-encoded into larger JPEGs, and `?width=` parameters are ignored. So
images we size by hand ship as compressed JPEGs at the size they are shown:
the hero backdrop in three files picked by media query
(`app/lib/heroBackdrop.ts`, preloaded with the same queries), the line-rail
circles at 360 px (`public/images/line-rail/`), and every curated
(book nook) image with `.w360.jpg` / `.w720.jpg` copies that
`storefrontImageLoader` (`app/lib/imageLoader.ts`) picks for Hydrogen's
`<Image>`. `npm run curated:images -- --copies` rewrites the copies;
`scripts/siteSpeed.node-test.mjs` checks them. Shopify CDN images
(`cdn.shopify.com/s/files`) do resize and serve WebP, so product photos
stay there.

## Maintenance Notes

- If cart fields change, update `CART_QUERY_FRAGMENT` and rerun codegen.
- If Shopify/Hydrogen versions change, rerun typecheck, lint, build, and route
  checks.
- If adding third-party services, prefer adding typed clients to
  `additionalContext` rather than importing secrets directly into routes.
- If a component starts loading images from a new scheme or host, add it to
  `CSP_IMG_SRC` in `app/lib/csp.ts`; `scripts/csp.node-test.mjs` enforces the
  schemes it can detect statically.

