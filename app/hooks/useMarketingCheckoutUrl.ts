import {useEffect, useMemo, useState} from 'react';
import {
  buildCheckoutUrlWithAttributionSnapshot,
  getStoredMarketingAttribution,
  type MarketingAttributionSnapshot,
} from '../lib/marketingAttribution.ts';
import type {MarketingConsentState} from '../lib/marketingConsent.ts';

export function useMarketingCheckoutUrl({
  checkoutUrl,
  consent,
  readSnapshot = getStoredMarketingAttribution,
}: {
  checkoutUrl?: string;
  consent: MarketingConsentState;
  readSnapshot?: () => MarketingAttributionSnapshot | null;
}) {
  const [snapshot, setSnapshot] = useState<MarketingAttributionSnapshot | null>(
    null,
  );

  useEffect(() => {
    setSnapshot(consent === 'granted' ? readSnapshot() : null);
  }, [consent, readSnapshot]);

  return useMemo(() => {
    if (!checkoutUrl || consent !== 'granted' || !snapshot) {
      return checkoutUrl;
    }
    return buildCheckoutUrlWithAttributionSnapshot(checkoutUrl, snapshot);
  }, [checkoutUrl, consent, snapshot]);
}
