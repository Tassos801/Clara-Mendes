export type FulfillmentEnv = {
  CJ_ACCESS_TOKEN?: string;
  CJ_DEFAULT_LOGISTIC_NAME?: string;
  CJ_FROM_COUNTRY_CODE?: string;
  CJ_LINE_ITEM_MAP?: string;
  CJ_PLATFORM_TOKEN?: string;
  CJ_SHOP_LOGISTICS_TYPE?: string;
  CJ_STORAGE_ID?: string;
  CJ_STORE_NAME?: string;
  FULFILLMENT_AUTO_SUBMIT?: string;
  SHOPIFY_WEBHOOK_SECRET?: string;
};

type ShopifyWebhookHeaders = {
  apiVersion: string | null;
  eventId: string | null;
  hmac: string | null;
  shopDomain: string | null;
  topic: string | null;
  triggeredAt: string | null;
  webhookId: string | null;
};

type ShopifyAddress = {
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  country?: string | null;
  country_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  phone?: string | null;
  province?: string | null;
  zip?: string | null;
};

type ShopifyLineItem = {
  fulfillable_quantity?: number | null;
  fulfillment_status?: string | null;
  id: number | string;
  price?: string | null;
  product_id?: number | string | null;
  quantity?: number | null;
  requires_shipping?: boolean | null;
  sku?: string | null;
  title?: string | null;
  variant_id?: number | string | null;
  variant_title?: string | null;
  vendor?: string | null;
};

export type ShopifyOrderWebhookPayload = {
  admin_graphql_api_id?: string | null;
  created_at?: string | null;
  currency?: string | null;
  email?: string | null;
  financial_status?: string | null;
  id: number | string;
  line_items?: ShopifyLineItem[] | null;
  name?: string | null;
  order_number?: number | string | null;
  shipping_address?: ShopifyAddress | null;
  total_price?: string | null;
};

type SupplierMapping = {
  cjSku?: string;
  cjVid?: string;
};

export type FulfillmentIntakeLine = {
  cjSku?: string;
  cjVid?: string;
  lineItemId: string;
  missingMapping: boolean;
  productId?: string;
  quantity: number;
  shopifySku?: string;
  title: string;
  variantId?: string;
  variantTitle?: string;
};

export type FulfillmentIntake = {
  autoSubmit: boolean;
  createdAt?: string;
  currency?: string;
  email?: string;
  eventId?: string;
  lines: FulfillmentIntakeLine[];
  missingMappings: FulfillmentIntakeLine[];
  mode: 'dry-run' | 'cj';
  orderId: string;
  orderName: string;
  shopDomain?: string;
  shippingAddress?: ShopifyAddress;
  totalPrice?: string;
  webhookId?: string;
};

export async function parseVerifiedShopifyWebhook({
  env,
  request,
}: {
  env: FulfillmentEnv;
  request: Request;
}) {
  const secret = env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    return {
      error: jsonResponse(
        {error: 'SHOPIFY_WEBHOOK_SECRET is not configured'},
        503,
      ),
    };
  }

  const rawBody = await request.text();
  const headers = getShopifyWebhookHeaders(request.headers);
  const hmacValid = await verifyShopifyWebhookHmac({
    hmacHeader: headers.hmac,
    rawBody,
    secret,
  });

  if (!hmacValid) {
    return {error: jsonResponse({error: 'Invalid Shopify webhook HMAC'}, 401)};
  }

  if (headers.topic !== 'orders/paid') {
    return {
      error: jsonResponse(
        {error: `Unsupported Shopify webhook topic: ${headers.topic ?? 'missing'}`},
        400,
      ),
    };
  }

  try {
    return {
      headers,
      payload: JSON.parse(rawBody) as ShopifyOrderWebhookPayload,
      rawBody,
    };
  } catch {
    return {error: jsonResponse({error: 'Invalid Shopify webhook JSON'}, 400)};
  }
}

export function createFulfillmentIntake({
  env,
  headers,
  order,
}: {
  env: FulfillmentEnv;
  headers: ShopifyWebhookHeaders;
  order: ShopifyOrderWebhookPayload;
}): FulfillmentIntake {
  const mappings = parseLineItemMappings(env.CJ_LINE_ITEM_MAP);
  const lines = (order.line_items ?? [])
    .filter((line) => line.requires_shipping !== false)
    .map((line) => normalizeFulfillmentLine(line, mappings))
    .filter((line) => line.quantity > 0);
  const missingMappings = lines.filter((line) => line.missingMapping);
  const autoSubmit = env.FULFILLMENT_AUTO_SUBMIT?.toLowerCase() === 'true';

  return {
    autoSubmit,
    createdAt: order.created_at ?? undefined,
    currency: order.currency ?? undefined,
    email: order.email ?? undefined,
    eventId: headers.eventId ?? undefined,
    lines,
    missingMappings,
    mode: autoSubmit && env.CJ_ACCESS_TOKEN ? 'cj' : 'dry-run',
    orderId: String(order.id),
    orderName: order.name || String(order.order_number || order.id),
    shopDomain: headers.shopDomain ?? undefined,
    shippingAddress: order.shipping_address ?? undefined,
    totalPrice: order.total_price ?? undefined,
    webhookId: headers.webhookId ?? undefined,
  };
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {'Content-Type': 'application/json'},
    status,
  });
}

export async function verifyShopifyWebhookHmac({
  hmacHeader,
  rawBody,
  secret,
}: {
  hmacHeader: string | null;
  rawBody: string;
  secret: string;
}) {
  if (!hmacHeader) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {hash: 'SHA-256', name: 'HMAC'},
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(rawBody),
  );

  return timingSafeEqual(base64Encode(digest), hmacHeader.trim());
}

function getShopifyWebhookHeaders(headers: Headers): ShopifyWebhookHeaders {
  return {
    apiVersion: headers.get('x-shopify-api-version'),
    eventId: headers.get('x-shopify-event-id'),
    hmac: headers.get('x-shopify-hmac-sha256'),
    shopDomain: headers.get('x-shopify-shop-domain'),
    topic: headers.get('x-shopify-topic'),
    triggeredAt: headers.get('x-shopify-triggered-at'),
    webhookId: headers.get('x-shopify-webhook-id'),
  };
}

function normalizeFulfillmentLine(
  line: ShopifyLineItem,
  mappings: Record<string, SupplierMapping>,
): FulfillmentIntakeLine {
  const mapping = resolveSupplierMapping(line, mappings);
  const fulfillableQuantity = Number(line.fulfillable_quantity ?? 0);
  const orderedQuantity = Number(line.quantity ?? 0);
  const quantity = fulfillableQuantity > 0 ? fulfillableQuantity : orderedQuantity;

  return {
    cjSku: mapping?.cjSku,
    cjVid: mapping?.cjVid,
    lineItemId: String(line.id),
    missingMapping: !mapping?.cjSku && !mapping?.cjVid,
    productId: line.product_id ? String(line.product_id) : undefined,
    quantity,
    shopifySku: line.sku ?? undefined,
    title: line.title || 'Untitled product',
    variantId: line.variant_id ? String(line.variant_id) : undefined,
    variantTitle: line.variant_title ?? undefined,
  };
}

function resolveSupplierMapping(
  line: ShopifyLineItem,
  mappings: Record<string, SupplierMapping>,
) {
  const keys = [
    line.variant_id ? `variant:${line.variant_id}` : null,
    line.variant_id ? String(line.variant_id) : null,
    line.product_id ? `product:${line.product_id}` : null,
    line.product_id ? String(line.product_id) : null,
    line.sku ? `sku:${line.sku}` : null,
    line.sku,
    line.id ? `line:${line.id}` : null,
  ].filter(Boolean) as string[];

  for (const key of keys) {
    if (mappings[key]) return mappings[key];
  }

  return null;
}

function parseLineItemMappings(value?: string) {
  if (!value) return {};

  try {
    return JSON.parse(value) as Record<string, SupplierMapping>;
  } catch {
    console.warn('Invalid CJ_LINE_ITEM_MAP JSON; supplier submission will be skipped.');
    return {};
  }
}

function base64Encode(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }

  return btoa(binary);
}

function timingSafeEqual(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let diff = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);

  if (leftBytes.length === 0 || rightBytes.length === 0) return false;

  for (let index = 0; index < length; index += 1) {
    diff |= leftBytes[index % leftBytes.length] ^ rightBytes[index % rightBytes.length];
  }

  return diff === 0;
}
