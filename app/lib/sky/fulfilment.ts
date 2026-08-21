/**
 * Shopify `orders/paid` payload → Prodigi order payload for every signed
 * star-map line. Pure apart from HMAC verification; the webhook route and
 * the replay script both call this.
 */
import type {ProdigiOrderPayload} from '../prodigi.server.ts';
import {canonicalSkyParams, fromCartAttributes} from './params.ts';
import {skyVariantForSku} from './products.ts';
import {encodeSkyToken, verifyCanonical} from './sign.server.ts';

/** Subset of Shopify's orders/paid webhook payload that we read. */
export type ShopifyOrderWebhook = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  shipping_address?: {
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    province?: string | null;
    zip?: string | null;
    country_code?: string | null;
    phone?: string | null;
  } | null;
  line_items: Array<{
    id: number;
    sku?: string | null;
    quantity: number;
    properties?: Array<{name: string; value: string | null}> | null;
  }>;
};

export type FulfilmentBuild =
  | {kind: 'skip'; reason: string}
  | {kind: 'problem'; reason: string}
  | {kind: 'order'; payload: ProdigiOrderPayload};

export function skyPrintUrl(origin: string, token: string, size: string) {
  return `${origin}/api/sky-print/${token}.pdf?size=${size}`;
}

export async function buildProdigiOrderFromShopify(
  order: ShopifyOrderWebhook,
  {secret, origin}: {secret: string; origin: string},
): Promise<FulfilmentBuild> {
  const skyLines = order.line_items.filter((l) =>
    l.properties?.some((p) => p.name === '_v'),
  );
  if (skyLines.length === 0) return {kind: 'skip', reason: 'No personalised lines.'};

  const items: ProdigiOrderPayload['items'] = [];
  for (const line of skyLines) {
    const decoded = fromCartAttributes(
      (line.properties ?? []).map((p) => ({key: p.name, value: p.value})),
    );
    if (!decoded.ok) return {kind: 'problem', reason: `Line ${line.id}: ${decoded.error}`};
    if (
      !decoded.sig ||
      !(await verifyCanonical(canonicalSkyParams(decoded.params), decoded.sig, secret))
    ) {
      return {kind: 'problem', reason: `Line ${line.id}: bad signature.`};
    }
    const variant = skyVariantForSku(line.sku);
    if (!variant) {
      return {kind: 'problem', reason: `Line ${line.id}: unknown SKU ${line.sku ?? '(none)'}.`};
    }
    const token = await encodeSkyToken(decoded.params, secret);
    items.push({
      merchantReference: `line:${line.id}`,
      sku: variant.prodigiSku,
      copies: Math.max(1, line.quantity),
      sizing: 'fillPrintArea',
      attributes: variant.attributes,
      assets: [{printArea: 'default', url: skyPrintUrl(origin, token, variant.size)}],
    });
  }

  const a = order.shipping_address;
  if (!a?.address1 || !a.city || !a.zip || !a.country_code) {
    return {kind: 'problem', reason: 'Missing shipping address.'};
  }
  const name =
    a.name || [a.first_name, a.last_name].filter(Boolean).join(' ') || 'Customer';

  return {
    kind: 'order',
    payload: {
      idempotencyKey: `shopify:${order.id}`,
      merchantReference: order.name,
      shippingMethod: 'Standard',
      recipient: {
        name,
        email: order.email ?? undefined,
        phoneNumber: a.phone ?? order.phone ?? undefined,
        address: {
          line1: a.address1,
          line2: a.address2 ?? '',
          townOrCity: a.city,
          stateOrCounty: a.province ?? null,
          postalOrZipCode: a.zip,
          countryCode: a.country_code,
        },
      },
      items,
    },
  };
}
