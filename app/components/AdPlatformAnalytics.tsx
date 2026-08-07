import {
  AnalyticsEvent,
  useAnalytics,
  type CartLineUpdatePayload,
  type ProductViewPayload,
} from '@shopify/hydrogen';
import {useEffect, useLayoutEffect, useRef} from 'react';
import {captureMarketingAttribution} from '~/lib/marketingAttribution';

type ProductViewProduct = ProductViewPayload['products'][number];
type CommerceEventName = 'ViewContent' | 'AddToCart';

export type AdPlatformAnalyticsPayload = {
  products?: Array<Record<string, unknown>>;
};

type NormalizedProduct = {
  brand?: string;
  catalogId: string;
  category?: string;
  currency: string;
  name: string;
  price: number;
  productGid?: string;
  productId?: string;
  quantity: number;
  sku?: string;
  value: number;
  variantGid?: string;
  variantId?: string;
  variantName?: string;
};

// fbq/ttq are installed by the Meta/TikTok base pixel snippets, which this
// storefront does not ship. Installing them requires first allowlisting their
// hosts (connect.facebook.net, www.facebook.com, analytics.tiktok.com) in the
// CSP in app/entry.server.tsx; until both happen, the calls below are no-ops.
type PixelWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>;
  fbq?: (
    method: 'track',
    eventName: string,
    parameters: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => void;
  ttq?: {
    track?: (eventName: string, parameters: Record<string, unknown>) => void;
  };
};

const SUBSCRIPTION_FLAG = '__claraAdPlatformAnalyticsSubscribed';
const DEDUPE_STORAGE_KEY = 'clara.adPlatformEventDedupe.v1';
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function AdPlatformProductView({
  analytics,
}: {
  analytics: AdPlatformAnalyticsPayload;
}) {
  const sentKey = useRef('');

  useEffect(() => {
    const nextKey = `${window.location.href}:${JSON.stringify(analytics)}`;
    if (sentKey.current === nextKey) return;

    sentKey.current = nextKey;
    sendAdPlatformCommerceEvent('ViewContent', analytics, {
      sourceEvent: 'product_page_view',
    });
  }, [analytics]);

  return null;
}

export function AdPlatformAnalytics() {
  const {canTrack, subscribe} = useAnalytics();

  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const pixelWindow = window as unknown as PixelWindow &
      Record<string, unknown>;
    if (pixelWindow[SUBSCRIPTION_FLAG]) return;
    pixelWindow[SUBSCRIPTION_FLAG] = true;

    subscribe(AnalyticsEvent.PRODUCT_VIEWED, (payload) => {
      if (!canTrack()) return;

      payload.products.forEach((product) => {
        const normalized = normalizeProductViewProduct(product, payload);
        if (!normalized) return;

        sendCommerceEvent('ViewContent', normalized, {
          dedupeKey: ['ViewContent', normalized.catalogId, payload.url].join(
            ':',
          ),
          sourceEvent: AnalyticsEvent.PRODUCT_VIEWED,
        });
      });
    });

    subscribe(AnalyticsEvent.PRODUCT_ADD_TO_CART, (payload) => {
      if (!canTrack()) return;

      const normalized = normalizeCartLineProduct(payload);
      if (!normalized) return;

      sendCommerceEvent('AddToCart', normalized, {
        dedupeKey: createDefaultDedupeKey('AddToCart', normalized),
        sourceEvent: AnalyticsEvent.PRODUCT_ADD_TO_CART,
      });
    });
  }, [canTrack, subscribe]);

  return null;
}

export function sendAdPlatformCommerceEvent(
  eventName: CommerceEventName,
  analytics: unknown,
  options: {
    dedupeKey?: string;
    sourceEvent?: string;
  } = {},
) {
  if (typeof window === 'undefined') return false;

  const products = normalizeAnalyticsPayload(analytics);
  if (products.length === 0) return false;

  let sent = false;
  products.forEach((product) => {
    sent =
      sendCommerceEvent(eventName, product, {
        dedupeKey:
          options.dedupeKey ?? createDefaultDedupeKey(eventName, product),
        sourceEvent: options.sourceEvent ?? 'direct_storefront',
      }) || sent;
  });

  return sent;
}

function sendCommerceEvent(
  eventName: CommerceEventName,
  product: NormalizedProduct,
  options: {
    dedupeKey: string;
    sourceEvent: string;
  },
) {
  if (wasRecentlySent(options.dedupeKey)) return false;

  const eventId = createEventId(eventName, product.catalogId);
  const attribution = captureMarketingAttribution();
  const metaParameters = {
    content_ids: [product.catalogId],
    content_name: product.name,
    content_type: 'product',
    content_category: product.category,
    contents: [
      {
        id: product.catalogId,
        item_price: product.price,
        quantity: product.quantity,
      },
    ],
    currency: product.currency,
    num_items: product.quantity,
    value: product.value,
  };
  const tiktokParameters = {
    content_ids: [product.catalogId],
    content_type: 'product',
    contents: [
      {
        content_id: product.catalogId,
        content_name: product.name,
        price: product.price,
        quantity: product.quantity,
      },
    ],
    currency: product.currency,
    description: product.name,
    event_id: eventId,
    quantity: product.quantity,
    value: product.value,
  };
  const dataLayerPayload = {
    event: eventName,
    event_id: eventId,
    source_event: options.sourceEvent,
    ecommerce: {
      currency: product.currency,
      value: product.value,
      items: [
        {
          item_id: product.catalogId,
          item_name: product.name,
          item_brand: product.brand,
          item_category: product.category,
          item_variant: product.variantName,
          price: product.price,
          quantity: product.quantity,
          shopify_product_gid: product.productGid,
          shopify_product_id: product.productId,
          shopify_variant_gid: product.variantGid,
          shopify_variant_id: product.variantId,
          sku: product.sku,
        },
      ],
    },
    meta: metaParameters,
    tiktok: tiktokParameters,
    attribution,
  };
  const pixelWindow = window as PixelWindow;

  pixelWindow.dataLayer = pixelWindow.dataLayer || [];
  pixelWindow.dataLayer.push(dataLayerPayload);
  pixelWindow.fbq?.('track', eventName, metaParameters, {eventID: eventId});
  pixelWindow.ttq?.track?.(eventName, tiktokParameters);
  window.dispatchEvent(
    new CustomEvent('clara:ad-platform-event', {detail: dataLayerPayload}),
  );

  return true;
}

function normalizeAnalyticsPayload(analytics: unknown) {
  if (!analytics || typeof analytics !== 'object') return [];

  const products = (analytics as AdPlatformAnalyticsPayload).products;
  if (!Array.isArray(products)) return [];

  return products
    .map((product) =>
      normalizeProduct({
        brand: stringValue(product.brand ?? product.vendor),
        category: stringValue(product.category ?? product.productType),
        currency: stringValue(
          product.currency ??
            product.currencyCode ??
            priceObject(product.price)?.currencyCode,
        ),
        name: stringValue(product.name ?? product.title),
        price: priceValue(product.price),
        productGid: stringValue(product.productGid ?? product.id),
        quantity: numericValue(product.quantity),
        sku: stringValue(product.sku),
        variantGid: stringValue(product.variantGid ?? product.variantId),
        variantName: stringValue(product.variantName ?? product.variantTitle),
      }),
    )
    .filter((product): product is NormalizedProduct => Boolean(product));
}

function normalizeProductViewProduct(
  product: ProductViewProduct,
  payload: ProductViewPayload,
) {
  const currency = String(payload.shop?.currency ?? 'USD');

  return normalizeProduct({
    brand: product.vendor,
    category: product.productType,
    currency,
    name: product.title,
    price: product.price,
    productGid: product.id,
    quantity: product.quantity,
    sku: product.sku,
    variantGid: product.variantId,
    variantName: product.variantTitle,
  });
}

function normalizeCartLineProduct(payload: CartLineUpdatePayload) {
  const currentLine = payload.currentLine;
  if (!currentLine?.merchandise) return null;

  const merchandise = currentLine.merchandise as any;
  const previousQuantity =
    typeof payload.prevLine?.quantity === 'number'
      ? payload.prevLine.quantity
      : 0;
  const addedQuantity = Math.max(1, currentLine.quantity - previousQuantity);

  return normalizeProduct({
    brand: merchandise.product?.vendor,
    category: merchandise.product?.productType,
    currency:
      merchandise.price?.currencyCode ?? payload.shop?.currency ?? 'USD',
    name: merchandise.product?.title ?? merchandise.title,
    price: merchandise.price?.amount,
    productGid: merchandise.product?.id,
    quantity: addedQuantity,
    sku: merchandise.sku,
    variantGid: merchandise.id,
    variantName: merchandise.title,
  });
}

function normalizeProduct({
  brand,
  category,
  currency,
  name,
  price,
  productGid,
  quantity,
  sku,
  variantGid,
  variantName,
}: {
  brand?: string | null;
  category?: string | null;
  currency?: string | null;
  name?: string | null;
  price?: string | number | null;
  productGid?: string | null;
  quantity?: number | null;
  sku?: string | null;
  variantGid?: string | null;
  variantName?: string | null;
}): NormalizedProduct | null {
  const productId = parseShopifyGid(productGid);
  const variantId = parseShopifyGid(variantGid);
  const catalogId = variantId || sku || productId;
  const numericPrice =
    typeof price === 'number' ? price : Number.parseFloat(String(price ?? ''));

  if (!catalogId || !name || !Number.isFinite(numericPrice)) return null;

  const safeQuantity = Math.max(1, Math.floor(quantity || 1));
  const value = Number((numericPrice * safeQuantity).toFixed(2));

  return {
    brand: brand || undefined,
    catalogId,
    category: category || undefined,
    currency: currency || 'USD',
    name,
    price: Number(numericPrice.toFixed(2)),
    productGid: productGid || undefined,
    productId: productId || undefined,
    quantity: safeQuantity,
    sku: sku || undefined,
    value,
    variantGid: variantGid || undefined,
    variantId: variantId || undefined,
    variantName: variantName || undefined,
  };
}

function parseShopifyGid(value?: string | null) {
  if (!value) return '';
  return value.split('/').pop() || '';
}

function createDefaultDedupeKey(
  eventName: CommerceEventName,
  product: NormalizedProduct,
) {
  const eventScope =
    eventName === 'ViewContent'
      ? typeof window === 'undefined'
        ? ''
        : window.location.href
      : 'confirmed_cart_add';

  return [eventName, product.catalogId, product.quantity, eventScope].join(':');
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value ? value : undefined;
}

function numericValue(value: unknown) {
  if (typeof value !== 'number') return undefined;
  return Number.isFinite(value) ? value : undefined;
}

function priceObject(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  return value as {amount?: string | number; currencyCode?: string};
}

function priceValue(value: unknown) {
  const amount = priceObject(value)?.amount;
  if (typeof amount === 'string' || typeof amount === 'number') return amount;
  if (typeof value === 'string' || typeof value === 'number') return value;
  return undefined;
}

function createEventId(eventName: string, catalogId: string) {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(16).slice(2);

  return `cm_${eventName}_${catalogId}_${Date.now()}_${random}`
    .replace(/[^\w-]/g, '_')
    .slice(0, 120);
}

function wasRecentlySent(key: string) {
  const now = Date.now();
  const ttl = 2000;

  try {
    const stored = JSON.parse(
      window.sessionStorage.getItem(DEDUPE_STORAGE_KEY) || '{}',
    ) as Record<string, number>;

    Object.entries(stored).forEach(([storedKey, timestamp]) => {
      if (now - timestamp > ttl) delete stored[storedKey];
    });

    if (stored[key] && now - stored[key] < ttl) return true;

    stored[key] = now;
    window.sessionStorage.setItem(DEDUPE_STORAGE_KEY, JSON.stringify(stored));
    return false;
  } catch {
    return false;
  }
}
