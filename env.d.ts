/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';

declare global {
  /**
   * Additional environment variables merged into Hydrogen's `Env`.
   * `SHOPIFY_ADMIN_ACCESS_TOKEN` powers the server-side reviews feature
   * (app/lib/reviews.server.ts). It is optional so the storefront still
   * type-checks and runs before the token is provisioned.
   */
  interface Env {
    PUBLIC_GTM_CONTAINER_ID?: string;
    SHOPIFY_ADMIN_ACCESS_TOKEN?: string;
    /**
     * "Your Sky" personalised star map (docs/your-sky-release.md).
     * All optional so the storefront runs before they are provisioned; the
     * cart action and fulfilment routes degrade to clear errors without them.
     */
    /** Random 32+ byte secret; signs cart line parameters and print tokens. */
    SKY_SIGNING_SECRET?: string;
    /** Custom app API secret key; verifies Shopify webhook HMACs. */
    SHOPIFY_WEBHOOK_SECRET?: string;
    PRODIGI_API_KEY?: string;
    /** https://api.sandbox.prodigi.com (default) or https://api.prodigi.com */
    PRODIGI_API_BASE?: string;
    /** 'true' only on the Oxygen preview environment: lets a staged personalised PDP render for the end-to-end test. */
    SKY_PREVIEW_UNLOCK?: string;
  }
}
