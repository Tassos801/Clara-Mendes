import {useEffect} from 'react';
import {useLocation} from 'react-router';
import {captureMarketingAttribution} from '~/lib/marketingAttribution';

export function MarketingAttributionCapture() {
  const location = useLocation();

  useEffect(() => {
    captureMarketingAttribution();
  }, [location.pathname, location.search]);

  return null;
}
