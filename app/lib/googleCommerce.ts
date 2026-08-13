export type ConsentModeSignals = {
  ad_personalization: 'denied' | 'granted';
  ad_storage: 'denied' | 'granted';
  ad_user_data: 'denied' | 'granted';
  analytics_storage: 'denied' | 'granted';
  functionality_storage: 'denied' | 'granted';
  personalization_storage: 'denied' | 'granted';
  security_storage: 'granted';
};

export type GoogleCommerceItem = {
  item_brand?: string;
  item_category?: string;
  item_id: string;
  item_name: string;
  item_variant?: string;
  price: number;
  quantity: number;
  shopify_product_gid?: string;
  shopify_product_id?: string;
  shopify_variant_gid?: string;
  shopify_variant_id?: string;
  sku?: string;
};

type GoogleCommerceCustomerPrivacy = {
  analyticsProcessingAllowed?: () => boolean;
  marketingAllowed?: () => boolean;
};

export function createGoogleCommercePrivacyReader() {
  let customerPrivacy: GoogleCommerceCustomerPrivacy | null = null;
  let canTrack = () => false;

  return {
    current() {
      const trackingAllowed = Boolean(canTrack());
      return {
        analyticsAllowed:
          customerPrivacy?.analyticsProcessingAllowed?.() ?? trackingAllowed,
        canTrack: trackingAllowed,
        marketingAllowed: customerPrivacy?.marketingAllowed?.() ?? false,
      };
    },
    update(
      nextCustomerPrivacy: GoogleCommerceCustomerPrivacy | null | undefined,
      nextCanTrack: () => boolean,
    ) {
      customerPrivacy = nextCustomerPrivacy ?? null;
      canTrack = nextCanTrack;
    },
  };
}

export const DENIED_CONSENT_MODE: ConsentModeSignals & {
  wait_for_update: number;
} = {
  ad_personalization: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  analytics_storage: 'denied',
  functionality_storage: 'denied',
  personalization_storage: 'denied',
  security_storage: 'granted',
  wait_for_update: 500,
};

export function consentModeFromShopify({
  analyticsAllowed,
  marketingAllowed,
  preferencesAllowed,
}: {
  analyticsAllowed: boolean;
  marketingAllowed: boolean;
  preferencesAllowed: boolean;
}): ConsentModeSignals {
  return {
    ad_personalization: marketingAllowed ? 'granted' : 'denied',
    ad_storage: marketingAllowed ? 'granted' : 'denied',
    ad_user_data: marketingAllowed ? 'granted' : 'denied',
    analytics_storage: analyticsAllowed ? 'granted' : 'denied',
    functionality_storage: preferencesAllowed ? 'granted' : 'denied',
    personalization_storage: preferencesAllowed ? 'granted' : 'denied',
    security_storage: 'granted',
  };
}

export function shouldEmitGoogleCommerceEvent({
  analyticsAllowed,
  canTrack,
}: {
  analyticsAllowed: boolean;
  canTrack: boolean;
}) {
  return analyticsAllowed && canTrack;
}

export function normalizeGtmContainerId(value: unknown) {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toUpperCase();
  return /^GTM-[A-Z0-9]+$/.test(normalized) ? normalized : null;
}

export function normalizeGoogleCommerceItem(input: {
  brand?: unknown;
  category?: unknown;
  name?: unknown;
  price?: unknown;
  productGid?: unknown;
  quantity?: unknown;
  sku?: unknown;
  variantGid?: unknown;
  variantName?: unknown;
}): GoogleCommerceItem | null {
  const productGid = stringValue(input.productGid);
  const variantGid = stringValue(input.variantGid);
  const productId = parseShopifyGid(productGid);
  const variantId = parseShopifyGid(variantGid);
  const sku = stringValue(input.sku);
  const itemId = sku || variantId || productId;
  const itemName = stringValue(input.name);
  const numericPrice = moneyValue(input.price);

  if (!itemId || !itemName || numericPrice === null) return null;

  const rawQuantity = numericValue(input.quantity) ?? 1;
  const quantity = Math.max(1, Math.floor(rawQuantity));

  return {
    item_brand: stringValue(input.brand),
    item_category: stringValue(input.category),
    item_id: itemId,
    item_name: itemName,
    item_variant: stringValue(input.variantName),
    price: Number(numericPrice.toFixed(2)),
    quantity,
    shopify_product_gid: productGid,
    shopify_product_id: productId,
    shopify_variant_gid: variantGid,
    shopify_variant_id: variantId,
    sku,
  };
}

export function ecommerceValue(items: GoogleCommerceItem[]) {
  return Number(
    items
      .reduce((total, item) => total + item.price * item.quantity, 0)
      .toFixed(2),
  );
}

export function pruneAndRecordDedupeEntries(
  entries: Record<string, number>,
  key: string,
  now: number,
  ttl = 2000,
) {
  const nextEntries = Object.fromEntries(
    Object.entries(entries).filter(([, timestamp]) => now - timestamp <= ttl),
  );
  const duplicate =
    typeof nextEntries[key] === 'number' && now - nextEntries[key] < ttl;

  if (!duplicate) nextEntries[key] = now;

  return {duplicate, entries: nextEntries};
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numericValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function moneyValue(value: unknown) {
  if (value && typeof value === 'object' && 'amount' in value) {
    return numericValue((value as {amount?: unknown}).amount);
  }

  return numericValue(value);
}

function parseShopifyGid(value?: string) {
  return value?.split('/').pop() || undefined;
}
