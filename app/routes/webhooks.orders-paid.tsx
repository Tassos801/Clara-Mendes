import type {Route} from './+types/webhooks.orders-paid';
import {maybeSubmitCjOrder, type CjEnv} from '~/lib/fulfillment/cj';
import {
  createFulfillmentIntake,
  type FulfillmentEnv,
  jsonResponse,
  parseVerifiedShopifyWebhook,
} from '~/lib/fulfillment/shopifyWebhook';

export async function loader() {
  return jsonResponse({error: 'Not found'}, 404);
}

export async function action({context, request}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return jsonResponse({error: 'Method not allowed'}, 405);
  }

  const fulfillmentEnv = context.env as unknown as FulfillmentEnv & CjEnv;
  const verified = await parseVerifiedShopifyWebhook({
    env: fulfillmentEnv,
    request,
  });

  if (verified.error) return verified.error;

  const intake = createFulfillmentIntake({
    env: fulfillmentEnv,
    headers: verified.headers,
    order: verified.payload,
  });
  const result = await maybeSubmitCjOrder({env: fulfillmentEnv, intake});

  console.warn(
    JSON.stringify({
      fulfillment: {
        eventId: intake.eventId,
        lineCount: intake.lines.length,
        missingMappings: intake.missingMappings.map((line) => ({
          lineItemId: line.lineItemId,
          title: line.title,
          variantId: line.variantId,
        })),
        mode: intake.mode,
        orderId: intake.orderId,
        orderName: intake.orderName,
        result,
      },
    }),
  );

  return jsonResponse({
    ok: true,
    lineCount: intake.lines.length,
    missingMappingCount: intake.missingMappings.length,
    mode: intake.mode,
    orderName: intake.orderName,
    result,
  });
}
