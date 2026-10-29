import {
  AnalyticsEvent,
  useAnalytics,
  type VisitorConsentCollected,
} from '@shopify/hydrogen';
import {useEffect, useLayoutEffect, useRef} from 'react';
import {
  cartCurrency,
  normalizeAnalyticsProducts,
  normalizeCartLine,
} from '~/lib/analyticsItems';
import {
  createGoogleCommercePrivacyReader,
  isRepeatedView,
} from '~/lib/googleCommerce';
import {metaCommerceParameters, metaPixelAllowed} from '~/lib/metaPixel';
import {
  initializeMetaPixel,
  setMetaConsent,
  trackMetaEvent,
} from '~/lib/metaPixel.client';

type SubscriptionWindow = Window & {__claraMetaPixelSubscribed?: boolean};

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// One per page load, like the subscription. After Accept, Hydrogen re-sends
// the current page's views, and the consent listener may already have sent
// its PageView: both check here so the page counts once.
const lastViews = new Map<string, string>();

/**
 * Meta pixel for catalog ads (app/lib/metaPixel.ts). Nothing loads until the
 * visitor allows marketing cookies; accepting later loads the pixel and
 * records the current page.
 */
export function MetaPixelAnalytics({pixelId}: {pixelId: string | null}): null {
  const {canTrack, customerPrivacy, register, subscribe} = useAnalytics();
  const {ready} = register('MetaPixelAnalytics');
  const privacyReaderRef = useRef<ReturnType<
    typeof createGoogleCommercePrivacyReader
  > | null>(null);
  if (!privacyReaderRef.current) {
    privacyReaderRef.current = createGoogleCommercePrivacyReader();
  }
  const privacyReader = privacyReaderRef.current;
  privacyReader.update(customerPrivacy, canTrack);

  useEffect(() => {
    if (!pixelId) return;
    const onConsent = (event: Event) => {
      const detail = (event as CustomEvent<VisitorConsentCollected>).detail;
      if (!detail) return;
      if (!detail.marketingAllowed) {
        setMetaConsent(false);
        return;
      }
      const loadedBefore = setMetaConsent(true);
      if (
        !loadedBefore &&
        initializeMetaPixel(pixelId) &&
        !isRepeatedView(lastViews, 'PageView', window.location.href)
      ) {
        trackMetaEvent('PageView');
      }
    };
    document.addEventListener('visitorConsentCollected', onConsent);
    return () => {
      document.removeEventListener('visitorConsentCollected', onConsent);
    };
  }, [pixelId]);

  useIsomorphicLayoutEffect(() => {
    const subscribedWindow =
      typeof window === 'undefined' ? null : (window as SubscriptionWindow);
    if (
      !pixelId ||
      !subscribedWindow ||
      subscribedWindow.__claraMetaPixelSubscribed
    ) {
      ready();
      return;
    }
    subscribedWindow.__claraMetaPixelSubscribed = true;

    // Loads the pixel on the first event the visitor's consent allows.
    const allowed = () =>
      metaPixelAllowed(privacyReader.current()) && initializeMetaPixel(pixelId);

    subscribe(AnalyticsEvent.PAGE_VIEWED, (payload) => {
      if (!allowed() || isRepeatedView(lastViews, 'PageView', payload.url))
        return;
      trackMetaEvent('PageView');
    });

    subscribe(AnalyticsEvent.PRODUCT_VIEWED, (payload) => {
      if (!allowed()) return;
      const items = normalizeAnalyticsProducts(payload.products);
      if (
        !items.length ||
        isRepeatedView(lastViews, 'ViewContent', payload.url)
      )
        return;
      trackMetaEvent(
        'ViewContent',
        metaCommerceParameters(items, String(payload.shop?.currency ?? 'EUR')),
      );
    });

    subscribe(AnalyticsEvent.PRODUCT_ADD_TO_CART, (payload) => {
      if (!allowed()) return;
      const added =
        (payload.currentLine?.quantity ?? 0) -
        (payload.prevLine?.quantity ?? 0);
      const item = normalizeCartLine(payload.currentLine, Math.max(1, added));
      if (!item) return;
      trackMetaEvent(
        'AddToCart',
        metaCommerceParameters(
          [item],
          cartCurrency(payload.cart, payload.shop?.currency),
        ),
      );
    });

    ready();
  }, [pixelId, privacyReader, ready, subscribe]);

  return null;
}
