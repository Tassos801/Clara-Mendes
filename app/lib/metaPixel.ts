import {ecommerceValue, type GoogleCommerceItem} from './googleCommerce.ts';

// Meta pixel (MetaPixelAnalytics): loads only after the visitor allows
// marketing cookies, and reports PageView, ViewContent and AddToCart. The
// `content_ids` are variant SKUs, the ids of the Meta catalog "Clara Mendes"
// (fed daily from /feeds/google-merchant*.txt), so catalog ads can match the
// products people viewed. More than one dataset can be listed: Shopify's own
// pixel reports checkout and Purchase to a second dataset, and sending the
// storefront's events there too gives that dataset the whole journey.

/** A Meta pixel (dataset) id is a long run of digits. */
export function normalizeMetaPixelId(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return /^\d{10,20}$/.test(normalized) ? normalized : null;
}

/**
 * `PUBLIC_META_PIXEL_ID` holds one id, or several separated by commas or
 * spaces: every listed dataset receives the same events. Entries that are
 * not pixel ids and repeats are dropped; none left = no Meta pixel.
 */
export function normalizeMetaPixelIds(value: unknown) {
  if (typeof value !== 'string') return [];
  const ids = value
    .split(/[\s,]+/)
    .map(normalizeMetaPixelId)
    .filter((id): id is string => id !== null);
  return [...new Set(ids)];
}

export function metaPixelAllowed({
  canTrack,
  marketingAllowed,
}: {
  canTrack: boolean;
  marketingAllowed: boolean;
}) {
  return canTrack && marketingAllowed;
}

/** ViewContent / AddToCart parameters for the given items. */
export function metaCommerceParameters(
  items: GoogleCommerceItem[],
  currency: string,
) {
  return {
    content_ids: items.map((item) => item.item_id),
    content_type: 'product',
    contents: items.map((item) => ({
      id: item.item_id,
      item_price: item.price,
      quantity: item.quantity,
    })),
    currency,
    value: ecommerceValue(items),
  };
}
