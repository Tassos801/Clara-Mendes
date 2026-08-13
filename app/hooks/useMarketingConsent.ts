import {useAnalytics, type VisitorConsentCollected} from '@shopify/hydrogen';
import {useEffect, useState} from 'react';

export function useMarketingConsent() {
  const {customerPrivacy} = useAnalytics();
  const [marketingAllowed, setMarketingAllowed] = useState(false);

  useEffect(() => {
    setMarketingAllowed(customerPrivacy?.marketingAllowed() ?? false);

    const onConsent = (event: Event) => {
      const detail = (event as CustomEvent<VisitorConsentCollected>).detail;
      setMarketingAllowed(Boolean(detail?.marketingAllowed));
    };

    document.addEventListener('visitorConsentCollected', onConsent);
    return () => {
      document.removeEventListener('visitorConsentCollected', onConsent);
    };
  }, [customerPrivacy]);

  return marketingAllowed;
}
