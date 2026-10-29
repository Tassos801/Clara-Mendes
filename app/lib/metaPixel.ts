import {ecommerceValue, type GoogleCommerceItem} from './googleCommerce.ts';

// Meta pixel (MetaPixelAnalytics): loads only after the visitor allows
// marketing cookies, and reports PageView, ViewContent and AddToCart. The
// `content_ids` are variant SKUs, the ids of the Meta catalog "Clara Mendes"
// (fed daily from /feeds/google-merchant*.txt), so catalog ads can match the
// products people viewed.

/** A Meta pixel (dataset) id is a long run of digits. */
export function normalizeMetaPixelId(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return /^\d{10,20}$/.test(normalized) ? normalized : null;
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
