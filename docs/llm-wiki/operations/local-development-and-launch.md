# Local Development And Launch

## Local Development

Install dependencies:

```powershell
npm install
```

Start Hydrogen development:

```powershell
npm run dev
```

Sources: [README](../../../README.md), `package.json`.

Local Mini Oxygen sends `oxygen-buyer-country: US`, so a local session
browses as a US buyer until a country is chosen (`/locale`, or the
delivery-country picker under an out-of-reach product). US buyers cannot be
sent cards, postcards, framed museum prints or pots, so those read "Doesn't
ship to the United States" locally; choose Cyprus to see them on sale.

## Validation Commands

Run these before pushing or deploying:

```powershell
npm run typecheck
npm run lint
npm run build
npx shopify hydrogen check routes
```

The README records that typecheck, lint, build, and standard Shopify route
checks passed at the time of the documented baseline.

## Environment Variables

The repo expects Shopify Storefront, Customer Account, webhook, and Admin
environment variables. Do not commit `.env`; it is ignored by git.

Important categories:

- session secret
- public store and checkout domains
- public/private Storefront API tokens
- Customer Account API variables
- Shopify webhook secret
- Shopify Admin token/API version/webhook callback URL

Source: [README](../../../README.md).

### Admin API auth on the server

The storefront's own Admin calls (reviews, newsletter sign-up) get their token
from `app/lib/adminToken.server.ts`. In production set `SHOPIFY_CLIENT_ID` and
`SHOPIFY_CLIENT_SECRET` (the Dev Dashboard app's credentials): the server
exchanges them with Shopify's client-credentials grant for a 24-hour token,
caches it per isolate until five minutes before expiry, and mints a new one
after that. `SHOPIFY_ADMIN_ACCESS_TOKEN` still works as an override for a
static token; a pasted Dev Dashboard token expires within a day, so do not use
one in production. With neither set, reviews return 503 and sign-up reports
"disabled"; a failed exchange is an error (sign-up returns 502).

## Launch Readiness

Before paid traffic:

- Configure all production environment variables.
- Verify Shopify analytics and privacy behavior.
- Test canonical tags, social previews, robots, sitemap, and structured data.
- Test mobile and desktop purchase flows.
- Enable production payments, Shop Pay, taxes, duties, fraud controls, order
  emails, checkout branding, policies, and support ownership in Shopify Admin.
- Confirm product catalog quality, margin, images, shipping expectations, and
  supplier fulfillment mapping.

Source: `docs/launch-readiness.md`.

## Deployment Notes

The README says the project can run as a Hydrogen storefront, but Shopify Oxygen
deployment depends on Shopify Admin channel availability. It also records that
the Hydrogen sales channel was not available through CLI, while the Headless
channel can provide Storefront API credentials.

Source: [README](../../../README.md).
