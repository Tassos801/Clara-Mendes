# Cart And Checkout

## Current Picture

Cart behavior uses Hydrogen `CartForm`, Hydrogen cart context, optimistic cart
UI, a page cart route, and a cart drawer inside the Clara shell.

Sources: `app/routes/cart.tsx`, `app/components/AddToCartButton.tsx`,
`app/components/CartMain.tsx`, `app/components/ClaraShell.tsx`,
`app/lib/fragments.ts`.

## Cart Loading

`app/root.tsx` loads the cart through `getCartOrNull(context.cart)`. The helper
returns `null` instead of breaking rendering if cart loading fails.

Source: `app/root.tsx`, `app/lib/cart.ts`.

## Cart Mutations

`app/routes/cart.tsx` handles cart actions submitted by `CartForm`. Supported
actions include:

- Add lines.
- Update lines.
- Remove lines.
- Update discount codes.
- Add gift card codes.
- Remove gift card codes.
- Update buyer identity.

After adding lines, the route attempts to merge marketing attribution data into
cart attributes.

## Add To Cart

`AddToCartButton` wraps Hydrogen `CartForm` and submits line additions to
`/cart`. It also:

- Captures serialized marketing attribution in a hidden input.
- Sends ad-platform add-to-cart events after successful cart submission.
- Opens the cart drawer through caller-provided `onSuccess`.
- Shows cart form errors when configured.

Source: `app/components/AddToCartButton.tsx`.

## Cart UI

`CartMain` renders both the cart page and cart drawer. It uses
`useOptimisticCart` so pending updates appear immediately in the UI.

The cart can render:

- Empty state.
- Root line items.
- Nested/child cart lines.
- Cart recommendations.
- Cart summary.

Sources: `app/components/CartMain.tsx`,
`app/components/CartLineItem.tsx`, `app/components/CartRecommendations.tsx`,
`app/components/CartSummary.tsx`.

## Checkout Handoff

Checkout is still Shopify checkout. Launch readiness requires production
payments, Shop Pay, taxes, duties, fraud controls, order emails, checkout
branding, policies, and end-to-end test orders to be verified in Shopify Admin.

Source: [Launch readiness](../operations/local-development-and-launch.md).

