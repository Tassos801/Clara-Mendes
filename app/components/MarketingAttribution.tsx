import {useEffect} from 'react';
import {useLocation} from 'react-router';
import {useAnalytics} from '@shopify/hydrogen';
import {captureMarketingAttribution} from '~/lib/marketingAttribution';

export function MarketingAttributionCapture() {
  const location = useLocation();
  const {canTrack} = useAnalytics();

  useEffect(() => {
    if (canTrack()) captureMarketingAttribution();
  }, [canTrack, location.pathname, location.search]);

  return null;
}
