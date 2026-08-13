import {
  AnalyticsEvent,
  useAnalytics,
  type CartLineUpdatePayload,
  type CustomerPrivacy,
  type ProductViewPayload,
  type VisitorConsentCollected,
} from '@shopify/hydrogen';
import {useEffect, useLayoutEffect} from 'react';
import {
  consentModeFromShopify,
  DENIED_CONSENT_MODE,
  ecommerceValue,
  normalizeGoogleCommerceItem,
  normalizeGtmContainerId,
  pruneAndRecordDedupeEntries,
  shouldEmitGoogleCommerceEvent,
  type GoogleCommerceItem,
} from '~/lib/googleCommerce';
import {captureMarketingAttribution} from '~/lib/marketingAttribution';

type GoogleCommerceEventName =
  | 'add_to_cart'
  | 'page_view'
  | 'remove_from_cart'
  | 'search'
  | 'view_cart'
  | 'view_item'
  | 'view_item_list';

type DataLayerWindow = Window & {
  __claraGoogleCommerceSubscribed?: boolean;
  __claraGoogleConsentInitialized?: boolean;
  __claraGoogleTagManagerInitialized?: boolean;
  dataLayer?: unknown[];
};

const SUBSCRIPTION_FLAG = '__claraGoogleCommerceSubscribed';
const GTM_INITIALIZED_FLAG = '__claraGoogleTagManagerInitialized';
const CONSENT_INITIALIZED_FLAG = '__claraGoogleConsentInitialized';
const DEDUPE_STORAGE_KEY = 'clara.googleCommerceDedupe.v1';
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function GoogleCommerceAnalytics({
  containerId,
}: {
  containerId: string | null;
}): null {
  const {canTrack, customerPrivacy, register, subscribe} = useAnalytics();
  const {ready} = register('GoogleCommerceAnalytics');

  useEffect(() => {
    if (!containerId) return;

    initializeGoogleTagManager(containerId);
    updateConsentFromCustomerPrivacy(customerPrivacy);

    const onConsent = (event: Event) => {
      const detail = (event as CustomEvent<VisitorConsentCollected>).detail;
      if (!detail) return;

      pushConsentMode(
        'update',
        consentModeFromShopify({
          analyticsAllowed: detail.analyticsAllowed,
          marketingAllowed: detail.marketingAllowed,
          preferencesAllowed: detail.preferencesAllowed,
        }),
      );
    };

    document.addEventListener('visitorConsentCollected', onConsent);
    return () => {
      document.removeEventListener('visitorConsentCollected', onConsent);
    };
  }, [containerId, customerPrivacy]);

  useIsomorphicLayoutEffect(() => {
    if (!containerId || typeof window === 'undefined') {
      ready();
      return;
    }

    const dataLayerWindow = window as DataLayerWindow;
    if (dataLayerWindow[SUBSCRIPTION_FLAG]) {
      ready();
      return;
    }
    dataLayerWindow[SUBSCRIPTION_FLAG] = true;

    const trackingAllowed = () =>
      shouldEmitGoogleCommerceEvent({
        analyticsAllowed:
          customerPrivacy?.analyticsProcessingAllowed() ?? canTrack(),
        canTrack: canTrack(),
      });

    subscribe(AnalyticsEvent.PAGE_VIEWED, (payload) => {
      if (!trackingAllowed()) return;

      pushGoogleCommerceEvent({
        dedupeKey: `page_view:${payload.url}`,
        event: 'page_view',
        parameters: {page_location: payload.url},
        sourceEvent: AnalyticsEvent.PAGE_VIEWED,
      });
    });

    subscribe(AnalyticsEvent.PRODUCT_VIEWED, (payload) => {
      if (!trackingAllowed()) return;

      const items = normalizeProductViewItems(payload);
      if (!items.length) return;

      pushEcommerceEvent({
        currency: String(payload.shop?.currency ?? 'EUR'),
        dedupeKey: `view_item:${payload.url}:${itemKey(items)}`,
        event: 'view_item',
        items,
        sourceEvent: AnalyticsEvent.PRODUCT_VIEWED,
      });
    });

    subscribe(AnalyticsEvent.COLLECTION_VIEWED, (payload) => {
      if (!trackingAllowed()) return;

      pushGoogleCommerceEvent({
        dedupeKey: `view_item_list:${payload.url}:${payload.collection.id}`,
        event: 'view_item_list',
        parameters: {
          item_list_id: payload.collection.id,
          item_list_name: payload.collection.handle,
        },
        sourceEvent: AnalyticsEvent.COLLECTION_VIEWED,
      });
    });

    subscribe(AnalyticsEvent.SEARCH_VIEWED, (payload) => {
      if (!trackingAllowed()) return;

      pushGoogleCommerceEvent({
        dedupeKey: `search:${payload.url}:${payload.searchTerm}`,
        event: 'search',
        parameters: {search_term: payload.searchTerm},
        sourceEvent: AnalyticsEvent.SEARCH_VIEWED,
      });
    });

    subscribe(AnalyticsEvent.CART_VIEWED, (payload) => {
      if (!trackingAllowed()) return;

      const items = normalizeCartItems(payload.cart);
      if (!items.length) return;

      pushEcommerceEvent({
        currency: cartCurrency(payload.cart, payload.shop?.currency),
        dedupeKey: `view_cart:${payload.url}:${itemKey(items)}`,
        event: 'view_cart',
        items,
        sourceEvent: AnalyticsEvent.CART_VIEWED,
      });
    });

    subscribe(AnalyticsEvent.PRODUCT_ADD_TO_CART, (payload) => {
      if (!trackingAllowed()) return;
      pushCartLineEvent('add_to_cart', payload);
    });

    subscribe(AnalyticsEvent.PRODUCT_REMOVED_FROM_CART, (payload) => {
      if (!trackingAllowed()) return;
      pushCartLineEvent('remove_from_cart', payload);
    });

    ready();
  }, [canTrack, containerId, customerPrivacy, ready, subscribe]);

  return null;
}

function initializeGoogleTagManager(containerId: string) {
  const normalizedId = normalizeGtmContainerId(containerId);
  if (!normalizedId || typeof window === 'undefined') return;

  const dataLayerWindow = window as DataLayerWindow;
  dataLayerWindow.dataLayer = dataLayerWindow.dataLayer ?? [];

  if (!dataLayerWindow[CONSENT_INITIALIZED_FLAG]) {
    dataLayerWindow[CONSENT_INITIALIZED_FLAG] = true;
    pushConsentMode('default', DENIED_CONSENT_MODE);
    pushGtag('set', 'linker', {
      accept_incoming: true,
      decorate_forms: true,
      domains: ['shopclaramendes.com', 'checkout.shopclaramendes.com'],
    });
  }

  if (dataLayerWindow[GTM_INITIALIZED_FLAG]) return;
  dataLayerWindow[GTM_INITIALIZED_FLAG] = true;
  dataLayerWindow.dataLayer.push({'gtm.start': Date.now(), event: 'gtm.js'});

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(
    normalizedId,
  )}`;
  script.dataset.claraGtm = normalizedId;
  document.head.appendChild(script);
}

function updateConsentFromCustomerPrivacy(
  customerPrivacy: CustomerPrivacy | null,
) {
  if (!customerPrivacy) return;

  pushConsentMode(
    'update',
    consentModeFromShopify({
      analyticsAllowed: customerPrivacy.analyticsProcessingAllowed(),
      marketingAllowed: customerPrivacy.marketingAllowed(),
      preferencesAllowed: customerPrivacy.preferencesProcessingAllowed(),
    }),
  );
}

function pushConsentMode(
  command: 'default' | 'update',
  signals: Record<string, unknown>,
) {
  pushGtag('consent', command, signals);
}

function pushGtag(...args: unknown[]) {
  if (typeof window === 'undefined') return;

  const dataLayerWindow = window as DataLayerWindow;
  dataLayerWindow.dataLayer = dataLayerWindow.dataLayer ?? [];
  dataLayerWindow.dataLayer.push(args);
}

function normalizeProductViewItems(payload: ProductViewPayload) {
  return payload.products
    .map((product) =>
      normalizeGoogleCommerceItem({
        brand: product.vendor,
        category: product.productType,
        name: product.title,
        price: product.price,
        productGid: product.id,
        quantity: product.quantity,
        sku: product.sku,
        variantGid: product.variantId,
        variantName: product.variantTitle,
      }),
    )
    .filter((item): item is GoogleCommerceItem => Boolean(item));
}

function normalizeCartItems(cart: unknown) {
  const nodes =
    (cart as {lines?: {nodes?: unknown[]}} | null)?.lines?.nodes ?? [];

  return nodes
    .map((line) => normalizeCartLine(line))
    .filter((item): item is GoogleCommerceItem => Boolean(item));
}

function normalizeCartLine(line: unknown, quantityOverride?: number) {
  if (!line || typeof line !== 'object') return null;

  const typedLine = line as {
    merchandise?: {
      id?: string;
      price?: {amount?: string; currencyCode?: string};
      product?: {
        id?: string;
        productType?: string;
        title?: string;
        vendor?: string;
      };
      sku?: string;
      title?: string;
    };
    quantity?: number;
  };
  const merchandise = typedLine.merchandise;
  if (!merchandise) return null;

  return normalizeGoogleCommerceItem({
    brand: merchandise.product?.vendor,
    category: merchandise.product?.productType,
    name: merchandise.product?.title ?? merchandise.title,
    price: merchandise.price,
    productGid: merchandise.product?.id,
    quantity: quantityOverride ?? typedLine.quantity,
    sku: merchandise.sku,
    variantGid: merchandise.id,
    variantName: merchandise.title,
  });
}

function pushCartLineEvent(
  event: 'add_to_cart' | 'remove_from_cart',
  payload: CartLineUpdatePayload,
) {
  const currentQuantity = payload.currentLine?.quantity ?? 0;
  const previousQuantity = payload.prevLine?.quantity ?? 0;
  const quantity =
    event === 'add_to_cart'
      ? currentQuantity - previousQuantity
      : previousQuantity - currentQuantity;
  const line = payload.currentLine ?? payload.prevLine;
  const item = normalizeCartLine(line, Math.max(1, quantity));
  if (!item) return;

  pushEcommerceEvent({
    currency: cartCurrency(payload.cart, payload.shop?.currency),
    dedupeKey: `${event}:${item.item_id}:${item.quantity}`,
    event,
    items: [item],
    sourceEvent:
      event === 'add_to_cart'
        ? AnalyticsEvent.PRODUCT_ADD_TO_CART
        : AnalyticsEvent.PRODUCT_REMOVED_FROM_CART,
  });
}

function pushEcommerceEvent({
  currency,
  dedupeKey,
  event,
  items,
  sourceEvent,
}: {
  currency: string;
  dedupeKey: string;
  event: Exclude<
    GoogleCommerceEventName,
    'page_view' | 'search' | 'view_item_list'
  >;
  items: GoogleCommerceItem[];
  sourceEvent: string;
}) {
  pushGoogleCommerceEvent({
    dedupeKey,
    event,
    parameters: {
      ecommerce: {
        currency,
        items,
        value: ecommerceValue(items),
      },
    },
    sourceEvent,
  });
}

function pushGoogleCommerceEvent({
  dedupeKey,
  event,
  parameters = {},
  sourceEvent,
}: {
  dedupeKey: string;
  event: GoogleCommerceEventName;
  parameters?: Record<string, unknown>;
  sourceEvent: string;
}) {
  if (wasRecentlySent(dedupeKey)) return false;

  const dataLayerWindow = window as DataLayerWindow;
  dataLayerWindow.dataLayer = dataLayerWindow.dataLayer ?? [];
  if ('ecommerce' in parameters) {
    dataLayerWindow.dataLayer.push({ecommerce: null});
  }

  dataLayerWindow.dataLayer.push({
    event,
    event_id: createEventId(event),
    source_event: sourceEvent,
    attribution: captureMarketingAttribution(),
    ...parameters,
  });

  return true;
}

function cartCurrency(cart: unknown, shopCurrency?: string) {
  const currency = (
    cart as {
      cost?: {totalAmount?: {currencyCode?: string}};
    } | null
  )?.cost?.totalAmount?.currencyCode;

  return String(currency ?? shopCurrency ?? 'EUR');
}

function itemKey(items: GoogleCommerceItem[]) {
  return items.map((item) => `${item.item_id}:${item.quantity}`).join('|');
}

function createEventId(event: GoogleCommerceEventName) {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(16).slice(2);

  return `cm_${event}_${Date.now()}_${random}`
    .replace(/[^\w-]/g, '_')
    .slice(0, 120);
}

function wasRecentlySent(key: string) {
  const now = Date.now();

  try {
    const stored = JSON.parse(
      window.sessionStorage.getItem(DEDUPE_STORAGE_KEY) || '{}',
    ) as Record<string, number>;
    const result = pruneAndRecordDedupeEntries(stored, key, now);

    window.sessionStorage.setItem(
      DEDUPE_STORAGE_KEY,
      JSON.stringify(result.entries),
    );
    return result.duplicate;
  } catch {
    return false;
  }
}
