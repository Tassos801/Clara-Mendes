import {
  AnalyticsEvent,
  useAnalytics,
  type CartLineUpdatePayload,
  type ProductViewPayload,
  type VisitorConsentCollected,
} from '@shopify/hydrogen';
import {useEffect, useLayoutEffect} from 'react';
import {
  emitGoogleCommerceEvent,
  initializeGoogleTagManager,
  pushConsentMode,
  updateConsentFromCustomerPrivacy,
  type EmitGoogleCommerceEventInput,
} from '~/lib/googleCommerce.client';
import {
  consentModeFromShopify,
  ecommerceValue,
  normalizeGoogleCommerceItem,
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

type SubscriptionWindow = Window & {
  __claraGoogleCommerceSubscribed?: boolean;
};

const SUBSCRIPTION_FLAG = '__claraGoogleCommerceSubscribed';
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type StorefrontEventInput = Omit<
  EmitGoogleCommerceEventInput,
  | 'analyticsAllowed'
  | 'canTrack'
  | 'captureAttribution'
  | 'marketingAllowed'
  | 'runtime'
>;

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

    const dataLayerWindow = window as SubscriptionWindow;
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
    const emitEvent = (input: StorefrontEventInput) =>
      emitGoogleCommerceEvent({
        ...input,
        analyticsAllowed:
          customerPrivacy?.analyticsProcessingAllowed() ?? canTrack(),
        canTrack: canTrack(),
        captureAttribution: () => captureMarketingAttribution(true),
        marketingAllowed: customerPrivacy?.marketingAllowed() ?? false,
      });

    subscribe(AnalyticsEvent.PAGE_VIEWED, (payload) => {
      if (!trackingAllowed()) return;

      emitEvent({
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
        emitEvent,
        items,
        sourceEvent: AnalyticsEvent.PRODUCT_VIEWED,
      });
    });

    subscribe(AnalyticsEvent.COLLECTION_VIEWED, (payload) => {
      if (!trackingAllowed()) return;

      const items = normalizeAnalyticsProducts(
        (payload.customData as {products?: unknown} | undefined)?.products,
      );
      if (!items.length) return;

      pushEcommerceEvent({
        currency: String(payload.shop?.currency ?? 'EUR'),
        dedupeKey: `view_item_list:${payload.url}:${payload.collection.id}`,
        event: 'view_item_list',
        emitEvent,
        ecommerceParameters: {
          item_list_id: payload.collection.id,
          item_list_name: payload.collection.handle,
        },
        items,
        sourceEvent: AnalyticsEvent.COLLECTION_VIEWED,
      });
    });

    subscribe(AnalyticsEvent.SEARCH_VIEWED, (payload) => {
      if (!trackingAllowed()) return;

      emitEvent({
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
        emitEvent,
        items,
        sourceEvent: AnalyticsEvent.CART_VIEWED,
      });
    });

    subscribe(AnalyticsEvent.PRODUCT_ADD_TO_CART, (payload) => {
      if (!trackingAllowed()) return;
      pushCartLineEvent('add_to_cart', payload, emitEvent);
    });

    subscribe(AnalyticsEvent.PRODUCT_REMOVED_FROM_CART, (payload) => {
      if (!trackingAllowed()) return;
      pushCartLineEvent('remove_from_cart', payload, emitEvent);
    });

    ready();
  }, [canTrack, containerId, customerPrivacy, ready, subscribe]);

  return null;
}

function normalizeProductViewItems(payload: ProductViewPayload) {
  return normalizeAnalyticsProducts(payload.products);
}

function normalizeAnalyticsProducts(products: unknown) {
  if (!Array.isArray(products)) return [];

  return products
    .map((product) =>
      normalizeGoogleCommerceItem({
        brand: (product as {vendor?: unknown}).vendor,
        category: (product as {productType?: unknown}).productType,
        name: (product as {title?: unknown}).title,
        price: (product as {price?: unknown}).price,
        productGid: (product as {id?: unknown}).id,
        quantity: (product as {quantity?: unknown}).quantity,
        sku: (product as {sku?: unknown}).sku,
        variantGid: (product as {variantId?: unknown}).variantId,
        variantName: (product as {variantTitle?: unknown}).variantTitle,
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
  emitEvent: (input: StorefrontEventInput) => boolean,
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
    dedupeKey: cartLineMutationKey(event, payload),
    event,
    emitEvent,
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
  ecommerceParameters = {},
  event,
  emitEvent,
  items,
  sourceEvent,
}: {
  currency: string;
  dedupeKey: string;
  ecommerceParameters?: Record<string, unknown>;
  event: Exclude<GoogleCommerceEventName, 'page_view' | 'search'>;
  emitEvent: (input: StorefrontEventInput) => boolean;
  items: GoogleCommerceItem[];
  sourceEvent: string;
}) {
  emitEvent({
    dedupeKey,
    event,
    parameters: {
      ecommerce: {
        currency,
        items,
        value: ecommerceValue(items),
        ...ecommerceParameters,
      },
    },
    sourceEvent,
  });
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

function cartLineMutationKey(
  event: 'add_to_cart' | 'remove_from_cart',
  payload: CartLineUpdatePayload,
) {
  const cart = payload.cart as {id?: string; updatedAt?: string} | null;
  const line = (payload.currentLine ?? payload.prevLine) as {id?: string};

  return [
    event,
    cart?.id ?? 'cart',
    cart?.updatedAt ?? 'update',
    line?.id ?? 'line',
    payload.prevLine?.quantity ?? 0,
    payload.currentLine?.quantity ?? 0,
  ].join(':');
}
