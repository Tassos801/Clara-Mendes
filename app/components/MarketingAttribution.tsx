import {useEffect, useRef} from 'react';
import {useLocation} from 'react-router';
import {CartForm, useAnalytics} from '@shopify/hydrogen';
import {useMarketingConsent} from '~/hooks/useMarketingConsent';
import {
  captureMarketingAttribution,
  clearMarketingAttribution,
  removeMarketingCartAttributes,
} from '~/lib/marketingAttribution';

export function MarketingAttributionCapture() {
  const location = useLocation();
  const {cart} = useAnalytics();
  const marketingAllowed = useMarketingConsent();
  const submittedAttributes = useRef<string | null>(null);

  useEffect(() => {
    if (marketingAllowed) {
      captureMarketingAttribution(true);
    } else {
      clearMarketingAttribution();
    }
  }, [location.pathname, location.search, marketingAllowed]);

  const currentCart = cart as {
    attributes?: Array<{key?: string | null; value?: string | null}>;
  } | null;
  const currentAttributes = currentCart?.attributes ?? [];
  const clearedAttributes = removeMarketingCartAttributes(currentAttributes);
  const clearedAttributesKey = JSON.stringify(clearedAttributes);

  useEffect(() => {
    if (
      marketingAllowed ||
      !currentAttributes.length ||
      clearedAttributes.length === currentAttributes.length ||
      submittedAttributes.current === clearedAttributesKey
    ) {
      return;
    }

    const controller = new AbortController();
    const formData = new FormData();
    formData.set(
      CartForm.INPUT_NAME,
      JSON.stringify({
        action: CartForm.ACTIONS.AttributesUpdateInput,
        inputs: {attributes: clearedAttributes},
      }),
    );
    submittedAttributes.current = clearedAttributesKey;

    void fetch('/cart', {
      body: formData,
      credentials: 'same-origin',
      headers: {Accept: 'application/json'},
      method: 'POST',
      signal: controller.signal,
    }).then((response) => {
      if (!response.ok) submittedAttributes.current = null;
    });

    return () => controller.abort();
  }, [
    clearedAttributes,
    clearedAttributesKey,
    currentAttributes.length,
    marketingAllowed,
  ]);

  return null;
}
