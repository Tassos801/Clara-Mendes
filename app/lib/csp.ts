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
];
