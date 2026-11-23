import type {Route} from './+types/webhooks.orders-paid';
import {verifyShopifyWebhook} from '~/lib/shopifyWebhook.server';
import type {ShopifyOrderWebhook} from '~/lib/sky/fulfilment';
import {handlePaidOrder} from '~/lib/sky/paidOrder.server';

export async function loader() {
  return new Response('Method Not Allowed', {status: 405});
}

/**
 * Shopify `orders/paid` → one Prodigi order per Shopify order covering every
 * signed personalised line and every Art Tough Phone Case line. This route
 * checks that the delivery is Shopify's; `handlePaidOrder` decides what to
 * do with the order, logs and answers. A 2xx tells Shopify we are done; any
 * other answer makes it retry 8 times over the next 4 hours.
 */
export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {status: 405});
  }
  const {env} = context;
  const rawBody = await request.text();
  const secret = env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    // Every delivery fails until this is set, and no order can be named
    // before the delivery is verified, so say so loudly.
    console.error(
      'orders/paid: SHOPIFY_WEBHOOK_SECRET is not set; rejecting the delivery with 401. Set it in the Oxygen environment, or paid orders never reach Prodigi.',
    );
    return new Response('Unauthorized', {status: 401});
  }
  if (
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
  if (!order || !Array.isArray(order.line_items)) {
    return new Response('Not an order', {status: 400});
  }

  const answer = await handlePaidOrder(order, {
    env,
    triggeredAt: request.headers.get('X-Shopify-Triggered-At'),
  });
  return new Response(answer.body, {status: answer.status});
}
