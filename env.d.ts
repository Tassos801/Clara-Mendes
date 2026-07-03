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
    SHOPIFY_ADMIN_ACCESS_TOKEN?: string;
  }
}
