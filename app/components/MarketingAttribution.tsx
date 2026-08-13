import {useEffect} from 'react';
import {useLocation} from 'react-router';
import {useAnalytics} from '@shopify/hydrogen';
import {useMarketingCartCleanup} from '~/hooks/useMarketingCartCleanup';
import {useMarketingConsent} from '~/hooks/useMarketingConsent';
import {
  captureMarketingAttribution,
  clearMarketingAttribution,
} from '~/lib/marketingAttribution';

export function MarketingAttributionCapture() {
  const location = useLocation();
  const {cart} = useAnalytics();
  const marketingConsent = useMarketingConsent();

  useEffect(() => {
    if (marketingConsent === 'granted') {
      captureMarketingAttribution(true);
    } else if (marketingConsent === 'denied') {
      clearMarketingAttribution();
    }
  }, [location.pathname, location.search, marketingConsent]);

  const currentCart = cart as {
    attributes?: Array<{key?: string | null; value?: string | null}>;
  } | null;
  const currentAttributes = currentCart?.attributes ?? [];
  useMarketingCartCleanup({
    attributes: currentAttributes,
    consent: marketingConsent,
  });

  return null;
}
