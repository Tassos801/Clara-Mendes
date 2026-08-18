/**
 * Content-Security-Policy source lists served by entry.server.tsx.
 *
 * Hydrogen's createContentSecurityPolicy ships no img-src default, so this
 * array fully defines the image policy. scripts/csp.node-test.mjs scans app/
 * for scheme usage and fails when a scheme in use is missing from this list.
 */
export const CSP_IMG_SRC = [
  "'self'",
  'data:',
  // blob: object-URL previews (URL.createObjectURL).
  'blob:',
  'https://cdn.shopify.com',
  'https://www.google-analytics.com',
  'https://region1.google-analytics.com',
  'https://www.googletagmanager.com',
  'https://www.google.com',
  'https://www.googleadservices.com',
  'https://googleads.g.doubleclick.net',
];

/**
 * script-src. Unlike connectSrc/styleSrc/defaultSrc, Hydrogen's
 * createContentSecurityPolicy has NO default scriptSrc to merge a custom
 * value into — whatever is listed here is the entire allowlist (plus the
 * per-request nonce Hydrogen appends). 'self' and the Shopify CDN must
 * therefore stay listed explicitly: Oxygen serves the app's own lazy
 * route/vendor chunks from cdn.shopify.com, and the consent
 * privacy-banner scripts (withPrivacyBanner in root.tsx) load from there
 * too. Dropping them silently kills the cookie banner — and with it every
 * analytics consent — plus intermittently blocks lazy route modules.
 */
export const CSP_SCRIPT_SRC = [
  "'self'",
  'https://cdn.shopify.com',
  'https://www.googletagmanager.com',
];

export const CSP_GOOGLE_CONNECT_SRC = [
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
  'https://region1.google-analytics.com',
  'https://www.google.com',
  'https://www.googleadservices.com',
  'https://googleads.g.doubleclick.net',
];
