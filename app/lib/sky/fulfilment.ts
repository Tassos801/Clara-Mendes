/**
 * Shopify `orders/paid` payload → Prodigi order payload for every signed
 * personalised line (star map or birth poster, told apart by `_kind`).
 * Pure apart from HMAC verification; the webhook route and the replay
 * script both call this.
 */
import {
  canonicalNatalParams,
  fromNatalCartAttributes,
  NATAL_KIND,
} from '../natal/params.ts';
import {natalVariantForSku} from '../natal/products.ts';
import type {ProdigiOrderPayload} from '../prodigi.server.ts';
import {
  giftNoteCanonical,
  giftNoteFromAttributes,
  giftSlipUrl,
  slipCanonical,
} from './gift.ts';
import {canonicalSkyParams, fromCartAttributes} from './params.ts';
import {skyVariantForSku} from './products.ts';
import {
  encodeCanonicalToken,
  encodeSkyToken,
  verifyCanonical,
} from './sign.server.ts';

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

export function natalPrintUrl(origin: string, token: string, size: string) {
  return `${origin}/api/natal-print/${token}.pdf?size=${size}`;
}

export async function buildProdigiOrderFromShopify(
  order: ShopifyOrderWebhook,
  {secret, origin}: {secret: string; origin: string},
): Promise<FulfilmentBuild> {
  const personalisedLines = order.line_items.filter((l) =>
    l.properties?.some((p) => p.name === '_v'),
  );
  if (personalisedLines.length === 0)
    return {kind: 'skip', reason: 'No personalised lines.'};

  const items: ProdigiOrderPayload['items'] = [];
  const giftNotes: string[] = [];
  for (const line of personalisedLines) {
    const attrs = (line.properties ?? []).map((p) => ({
      key: p.name,
      value: p.value,
    }));
    const isNatal = attrs.some(
      (a) => a.key === '_kind' && (a.value ?? '') === NATAL_KIND,
    );

    const gift = giftNoteFromAttributes(attrs);
    if (gift.note) {
      if (
        !gift.sig ||
        !(await verifyCanonical(giftNoteCanonical(gift.note), gift.sig, secret))
      ) {
        return {kind: 'problem', reason: `Line ${line.id}: bad gift note signature.`};
      }
      if (!giftNotes.includes(gift.note)) giftNotes.push(gift.note);
    }

    if (isNatal) {
      const decoded = fromNatalCartAttributes(attrs);
      if (!decoded.ok)
        return {kind: 'problem', reason: `Line ${line.id}: ${decoded.error}`};
      const canonical = canonicalNatalParams(decoded.params);
      if (
        !decoded.sig ||
        !(await verifyCanonical(canonical, decoded.sig, secret))
      ) {
        return {kind: 'problem', reason: `Line ${line.id}: bad signature.`};
      }
      const variant = natalVariantForSku(line.sku);
      if (!variant) {
        return {kind: 'problem', reason: `Line ${line.id}: unknown SKU ${line.sku ?? '(none)'}.`};
      }
      const token = await encodeCanonicalToken(canonical, secret);
      items.push({
        merchantReference: `line:${line.id}`,
        sku: variant.prodigiSku,
        copies: Math.max(1, line.quantity),
        sizing: 'fillPrintArea',
        attributes: variant.attributes,
        assets: [
          {printArea: 'default', url: natalPrintUrl(origin, token, variant.size)},
        ],
      });
      continue;
    }

    const decoded = fromCartAttributes(attrs);
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

  // Prodigi rejects empty-string address parts (MustNotBeEmptyOrWhitespace),
  // so optional lines are omitted entirely when blank — caught by the first
  // sandbox order, whose recipient had no second address line.
  const line2 = a.address2?.trim();

  // A gift note becomes Prodigi's packing slip: a signed token URL the lab
  // fetches at print time, so the note is never stored on our side.
  const packingSlip =
    giftNotes.length > 0
      ? {
          url: giftSlipUrl(
            origin,
            await encodeCanonicalToken(
              slipCanonical({orderName: order.name, note: giftNotes.join('\n')}),
              secret,
            ),
          ),
        }
      : null;

  return {
    kind: 'order',
    payload: {
      idempotencyKey: `shopify:${order.id}`,
      merchantReference: order.name,
      shippingMethod: 'Standard',
      ...(packingSlip ? {packingSlip} : {}),
      recipient: {
        name,
        email: order.email ?? undefined,
        phoneNumber: a.phone ?? order.phone ?? undefined,
        address: {
          line1: a.address1,
          ...(line2 ? {line2} : {}),
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
