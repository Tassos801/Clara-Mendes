import {useEffect} from 'react';

// Shopify's standalone Customer Privacy API (the script Hydrogen loads when
// the privacy banner is off).
export const CUSTOMER_PRIVACY_API =
  'https://cdn.shopify.com/shopifycloud/consent-tracking-api/v0.2/consent-tracking-api.js';
const FALLBACK_DELAY_MS = 2000;

/**
 * With the privacy banner on, Hydrogen waits for storefront-banner.js to set
 * the full `window.Shopify.customerPrivacy`. For a visitor who already made a
 * choice, that script only leaves `{backendConsentEnabled, consentStatus}`
 * (seen on the live site, 2026-10-29), so Hydrogen's `customerPrivacy` stays
 * null, `canTrack()` stays false and no analytics run: not Shopify's, not
 * GTM, not the Meta pixel. Loading the standalone API fills it in; Hydrogen's
 * own setter picks it up and analytics start with the stored consent.
 */
export function CustomerPrivacyApiFallback(): null {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const customerPrivacy = (window as {Shopify?: {customerPrivacy?: object}})
        .Shopify?.customerPrivacy;
      if (customerPrivacy && 'setTrackingConsent' in customerPrivacy) return;
      if (document.querySelector(`script[src="${CUSTOMER_PRIVACY_API}"]`)) {
        return;
      }
      const script = document.createElement('script');
      script.async = true;
      script.src = CUSTOMER_PRIVACY_API;
      document.head.appendChild(script);
    }, FALLBACK_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
