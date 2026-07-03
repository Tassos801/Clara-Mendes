# Clara Mendes Hydrogen Storefront

Custom Shopify Hydrogen storefront for Clara Mendes, built with React Router,
Hydrogen, Vite, and Shopify Storefront API.

## Current Status

- Local Git repository is initialized on `main`.
- Initial source commit exists: `98f03e6 Initial Hydrogen storefront`.
- Build, lint, typecheck, and standard Shopify route checks pass.
- Headless channel credentials have been added locally in `.env`.
- `.env`, `.shopify`, `node_modules`, `dist`, logs, and generated build state are ignored by git.

## Requirements

- Node.js `^22 || ^24`
- npm
- Git
- Shopify CLI
- GitHub CLI, if creating/pushing the GitHub repository from this machine

GitHub CLI is installed at:

```powershell
C:\Program Files\GitHub CLI\gh.exe
```

If a new terminal does not recognize `gh`, either reopen the terminal or use the
full executable path.

## Local Development

Install dependencies:

```powershell
npm install
```

Start the Hydrogen dev server:

```powershell
npm run dev
```

## Environment Variables

Create a local `.env` file with these variables:

```text
SESSION_SECRET=
PUBLIC_STORE_DOMAIN=
PUBLIC_CHECKOUT_DOMAIN=
PUBLIC_STOREFRONT_API_TOKEN=
PUBLIC_STOREFRONT_ID=
PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID=
PUBLIC_CUSTOMER_ACCOUNT_API_URL=
PRIVATE_STOREFRONT_API_TOKEN=
SHOP_ID=
SHOPIFY_STOREFRONT_API_VERSION=
```

Do not commit `.env`. It is ignored by git.

Important: private Storefront API tokens are secrets. If a private token is
shared outside the hosting provider's secret store, revoke it in Shopify Admin
and generate a fresh token before production deployment.

`PUBLIC_STOREFRONT_ID` lets the Hydrogen analytics provider attribute events to
the deployed storefront. Shopify can provide it in an Oxygen environment; add it
locally when validating analytics against a connected storefront.
Customer account routes also depend on the Customer Account API variables from a
linked Hydrogen or Headless storefront.

## Validation

Run these checks before pushing or deploying:

```powershell
npm run typecheck
npm run lint
npm run build
npx shopify hydrogen check routes
```

Expected current result:

- TypeScript passes.
- ESLint passes.
- Production build passes.
- Shopify route check reports all standard Shopify routes present.

## GitHub Repository Setup

Shopify's storefront creation screen expects a valid GitHub repository name.
Use a repository name with no spaces, for example:

```text
clara-mendes
```

Do not use:

```text
Clara Mendes
```

To authenticate GitHub CLI:

```powershell
& 'C:\Program Files\GitHub CLI\gh.exe' auth login
```

To create a private GitHub repository from this local project and push `main`:

```powershell
& 'C:\Program Files\GitHub CLI\gh.exe' repo create clara-mendes --private --source . --remote origin --push
```

If the repository already exists:

```powershell
git remote add origin https://github.com/Tassos801/clara-mendes.git
git push -u origin main
```

## Shopify Hosting Notes

This project can run as a Hydrogen storefront, but Shopify Oxygen deployment
depends on Shopify Admin channel availability.

Known state:

- The Hydrogen sales channel was not available through the CLI.
- The Headless channel is available in Shopify Admin and can provide Storefront
  API credentials.
- GitHub-backed deployment setup in Shopify requires the code to be pushed to a
  GitHub repository first.

If deploying through Shopify Admin, configure the required environment variables
in the storefront environment instead of relying on local `.env`.

Before launch, work through `docs/launch-readiness.md` alongside the focused
catalog cleanup in `docs/shopify-admin-cleanup.md`.

## Storefront API Credential Check

After updating credentials or permissions in Shopify Admin, verify API access
with a small Storefront API query before deploying. The public token should be
accepted with the `X-Shopify-Storefront-Access-Token` header, and the private
token should only be used server-side.

If a token returns `401` or `403`, check:

- The token belongs to the same `.myshopify.com` store as `PUBLIC_STORE_DOMAIN`.
- Storefront API permissions are enabled in the Headless channel.
- The current public token was copied after saving permissions.
- Products and collections are published to the Headless channel.

## Useful Scripts

```powershell
npm run dev        # local Hydrogen development
npm run build      # production build and codegen
npm run typecheck  # React Router typegen and TypeScript
npm run lint       # ESLint
npm run codegen    # Shopify Hydrogen codegen and route typegen
npm run clean      # remove generated build state
```

## Product reviews

Customers can leave star-rated reviews with photos on product pages. Reviews
are stored as Shopify metaobjects and moderated in the Shopify admin before
they appear on the storefront.

### 1. Provision an Admin API token

The feature writes data through the Admin GraphQL API, so it needs an admin
access token in addition to the Storefront tokens. Create a custom app (or use
the Headless channel's admin credentials) with these access scopes:

- `read_products`, `write_products`
- `read_metaobjects`, `write_metaobjects`
- `read_metaobject_definitions`, `write_metaobject_definitions`
- `read_files`, `write_files`

Add the token to `.env` (server-side only — never expose it to the client):

```
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Until this variable is set, the review form degrades gracefully: the storefront
still renders, and submitting a review returns "Reviews are not enabled yet —
check back soon." instead of erroring.

### 2. Run the one-time setup script

The setup script creates the `product_review` metaobject definition and the
`custom.reviews` product metafield definition. It is idempotent — running it
again reports and skips anything that already exists.

```powershell
node scripts/setup-reviews.mjs            # create/skip against the store
node scripts/setup-reviews.mjs --dry-run  # print the exact definition JSON
                                          # without calling the API (no token
                                          # required)
```

### 3. Moderate submitted reviews

New reviews are created as **Draft** (pending moderation) and are not visible on
the storefront. To approve one:

1. Open the Shopify admin and go to **Content → Metaobjects → Product review**.
2. Open the review entry.
3. Change its status from **Draft** to **Active** and save.

The Storefront API only resolves Active entries, so approved reviews appear on
the product page automatically. Setting an entry back to Draft (or deleting it)
removes it from the storefront.
