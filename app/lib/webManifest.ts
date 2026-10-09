/**
 * Web app manifest for "Add to Home Screen". The site opens full-screen from
 * the home screen icon; no service worker, so nothing is cached offline and
 * prices, stock and the cart always come live from Shopify. Checkout opens on
 * the Shopify checkout domain, which the phone shows in its own browser sheet.
 * Icons (and /favicon.ico): node scripts/build-app-icons.mjs
 */

/** Warm ivory, the page background, so the launch screen matches the site. */
export const APP_BACKGROUND_COLOR = '#FBFAF6';
export const APP_THEME_COLOR = '#FBFAF6';
export const APP_NAME = 'Clara Mendes';
export const APPLE_TOUCH_ICON = '/icons/apple-touch-icon.png';
export const FAVICON_ICO = '/favicon.ico';
export const MANIFEST_PATH = '/manifest.webmanifest';

export function webManifest() {
  return {
    id: '/',
    name: APP_NAME,
    short_name: APP_NAME,
    description:
      'Original art prints, considered objects and Clara Mendes Clothing.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: APP_BACKGROUND_COLOR,
    theme_color: APP_THEME_COLOR,
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  } as const;
}
