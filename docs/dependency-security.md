# Dependency security triage

Updated: 2026-07-28

## Production tree (`npm audit --omit=dev`)

Baseline before remediation: **1 high + 4 moderate** (react-router ≤7.16.0 via
`react-router`, `react-router-dom`, `@react-router/node`, `@react-router/dev`,
`@shopify/hydrogen`).

Action taken: upgraded the React Router family `7.16.0 → 7.18.1`
(`react-router`, `react-router-dom`, `@react-router/dev`,
`@react-router/fs-routes`, with `overrides` so `@shopify/hydrogen@2026.4.4`'s
`~7.16.0` peer range resolves to the patched build). This fixes:

- GHSA-wrjc-x8rr-h8h6 (high) — open redirect via backslash in `<Link>`/`useNavigate`
- GHSA-h8fp-f39c-q6mh — RSCErrorHandler missing protocol validation (XSS)
- GHSA-337j-9hxr-rhxg — arbitrary constructor injection via `deserializeErrors()`
- GHSA-chx6-hx7r-mcp5 — DoS via inefficient route matching

### Accepted, documented finding

- **Advisory:** GHSA-qwww-vcr4-c8h2 — "RSC Mode CSRF Bypass Allows Action
  Execution Before 400 Response" (high, CVSS 7.1)
- **Affected package:** `react-router` 7.12.0 – 8.2.x; fixed only in 8.3.0.
- **Why the path is not reachable:** the advisory states it "only affects your
  application if you are using the unstable RSC APIs." This storefront runs
  React Router framework mode on React 18 with standard
  `entry.server`/`entry.client` rendering — no `@react-router/rsc`, no
  unstable RSC entry points, no React Server Components anywhere in the app
  or config (verified by search). The vulnerable code path is never invoked.
- **Planned upgrade path:** move to react-router 8.x as soon as a
  `@shopify/hydrogen` release supports it (no Hydrogen release does today —
  every current release peer-pins react-router 7). Revisit at each Hydrogen
  quarterly release.
- npm's suggested `npm audit fix --force` (downgrade to `@shopify/hydrogen`
  2026.4.1 or force react-router 8.3.0) was rejected: both break the
  supported Hydrogen + React Router pairing without changing the practical
  risk above.

## Dev-only tree (not shipped to production)

`npm audit` without `--omit=dev` additionally reports issues inside local
tooling (`@shopify/mini-oxygen` → `miniflare` → `ws`/`undici`, etc.). These
run only on developer machines/CI as the local dev server and are not part of
the deployed worker bundle. `@shopify/mini-oxygen` 4.2.0 and `vite` 6.4.3 are
the latest releases; no fixed upstream versions exist yet. Re-check on each
Hydrogen/mini-oxygen release.
