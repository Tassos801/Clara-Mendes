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

export const CSP_GOOGLE_SCRIPT_SRC = ['https://www.googletagmanager.com'];

export const CSP_GOOGLE_CONNECT_SRC = [
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
  'https://region1.google-analytics.com',
  'https://www.google.com',
  'https://www.googleadservices.com',
  'https://googleads.g.doubleclick.net',
];
