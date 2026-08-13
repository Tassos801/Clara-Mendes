import {useAnalytics, type VisitorConsentCollected} from '@shopify/hydrogen';
import {useEffect, useState} from 'react';
import {
  marketingConsentStateFromCustomerPrivacy,
  type MarketingConsentState,
} from '~/lib/marketingConsent';

export function useMarketingConsent() {
  const {customerPrivacy} = useAnalytics();
  const [marketingConsent, setMarketingConsent] =
    useState<MarketingConsentState>(() =>
      marketingConsentStateFromCustomerPrivacy(customerPrivacy),
    );

  useEffect(() => {
    setMarketingConsent(
      marketingConsentStateFromCustomerPrivacy(customerPrivacy),
    );

    const onConsent = (event: Event) => {
      const detail = (event as CustomEvent<VisitorConsentCollected>).detail;
      if (!detail) return;
      setMarketingConsent(detail.marketingAllowed ? 'granted' : 'denied');
    };

    document.addEventListener('visitorConsentCollected', onConsent);
    return () => {
      document.removeEventListener('visitorConsentCollected', onConsent);
    };
  }, [customerPrivacy]);

  return marketingConsent;
}
