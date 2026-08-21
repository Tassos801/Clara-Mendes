import type {Route} from './+types/webhooks.orders-paid';
import {
  createProdigiClient,
  ProdigiNotConfiguredError,
} from '~/lib/prodigi.server';
import {verifyShopifyWebhook} from '~/lib/shopifyWebhook.server';
import {
  buildProdigiOrderFromShopify,
  type ShopifyOrderWebhook,
} from '~/lib/sky/fulfilment';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';

export async function loader() {
  return new Response('Method Not Allowed', {status: 405});
}

/**
 * Shopify `orders/paid` → one Prodigi order per Shopify order for every
 * signed star-map line. A 2xx tells Shopify we are done; a 5xx makes it
 * retry (8× over 4 h), which is safe because the Prodigi idempotency key is
 * derived from the Shopify order id.
 */
export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {status: 405});
  }
  const {env} = context;
  const rawBody = await request.text();
  const secret = env.SHOPIFY_WEBHOOK_SECRET;
  if (
    !secret ||
    !(await verifyShopifyWebhook(
      rawBody,
      request.headers.get('X-Shopify-Hmac-Sha256'),
      secret,
    ))
  ) {
    return new Response('Unauthorized', {status: 401});
  }
  const topic = request.headers.get('X-Shopify-Topic');
  if (topic !== 'orders/paid') {
    return new Response(`Ignored topic ${topic ?? ''}`, {status: 200});
  }

  let order: ShopifyOrderWebhook;
  try {
    order = JSON.parse(rawBody) as ShopifyOrderWebhook;
  } catch {
    return new Response('Bad JSON', {status: 400});
  }

  const signingSecret = env.SKY_SIGNING_SECRET;
  if (!signingSecret) {
    console.error('orders/paid: SKY_SIGNING_SECRET missing');
    return new Response('Not configured', {status: 500});
  }

  const build = await buildProdigiOrderFromShopify(order, {
    secret: signingSecret,
    origin: STOREFRONT_ORIGIN,
  });
  if (build.kind === 'skip') {
    return new Response('No personalised lines', {status: 200});
  }
  if (build.kind === 'problem') {
    // Retrying cannot fix a bad signature or an unmapped SKU; log for the
    // replay script (scripts/sky-replay-order.mjs) and acknowledge.
    console.error(
      `orders/paid: order ${order.id} (${order.name}) needs attention: ${build.reason}`,
    );
    return new Response('Needs attention', {status: 200});
  }

  try {
    const prodigi = createProdigiClient(env);
    const response = await prodigi.createOrder(build.payload);
    console.warn(
      `orders/paid: ${order.name} → Prodigi${prodigi.isSandbox ? ' sandbox' : ''} ${response.outcome} ${response.order?.id ?? ''}`,
    );
    return new Response(response.outcome, {status: 200});
  } catch (error) {
    if (error instanceof ProdigiNotConfiguredError) {
      console.error('orders/paid: Prodigi not configured');
      return new Response('Not configured', {status: 500});
    }
    console.error(`orders/paid: Prodigi call failed for ${order.name}`, error);
    return new Response('Prodigi error', {status: 502});
  }
}
