import type {Route} from './+types/webhooks.orders-paid';
import {
  createProdigiClient,
  ProdigiNotConfiguredError,
  ProdigiRequestError,
  summarizeProdigiError,
} from '~/lib/prodigi.server';
import {verifyShopifyWebhook} from '~/lib/shopifyWebhook.server';
import {
  buildProdigiOrderFromShopify,
  type ShopifyOrderWebhook,
} from '~/lib/sky/fulfilment';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';

/** Prodigi statuses that mean the payload itself is wrong. */
const PRODIGI_REJECTED_PAYLOAD = new Set([400, 409, 422]);

/**
 * Shopify abandons a delivery after ~5 s, so Prodigi gets ~4 s; a timeout
 * answers 502 and Shopify retries (the idempotency key makes that safe).
 */
const PRODIGI_TIMEOUT_MS = 4_000;

/**
 * One greppable line per order that was acknowledged but not sent to the
 * lab, for the replay script (scripts/sky-replay-order.mjs). Order id and
 * name only: no customer data.
 */
function logNeedsAttention(order: ShopifyOrderWebhook, detail: string) {
  console.error(
    `orders/paid NEEDS ATTENTION order ${order.id} (${order.name}): ${detail}`,
  );
}

export async function loader() {
  return new Response('Method Not Allowed', {status: 405});
}

/**
 * Shopify `orders/paid` → one Prodigi order per Shopify order covering every
 * signed personalised line and every Art Tough Phone Case line. A 2xx tells
 * Shopify we are done; a 5xx makes it retry (19 times over 48 hours), which
 * is safe because the Prodigi
 * idempotency key is derived from the Shopify order id. Only transient
 * failures may answer 5xx: Shopify removes a subscription that keeps
 * failing, after which no later order would reach the lab at all.
 */
export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {status: 405});
  }
  const {env} = context;
  const rawBody = await request.text();
  const secret = env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    // Every delivery fails until this is set, and Shopify drops a
    // subscription that keeps failing, so say so loudly.
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
    return new Response('No lines for the Prodigi API', {status: 200});
  }
  if (build.kind === 'problem') {
    // Retrying cannot fix a bad signature or an unmapped SKU; log for the
    // replay script (scripts/sky-replay-order.mjs) and acknowledge.
    logNeedsAttention(order, build.reason);
    return new Response('Needs attention', {status: 200});
  }

  try {
    const prodigi = createProdigiClient(env, {timeoutMs: PRODIGI_TIMEOUT_MS});
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
    if (
      error instanceof ProdigiRequestError &&
      PRODIGI_REJECTED_PAYLOAD.has(error.status)
    ) {
      // Prodigi rejected the payload itself (400 validation, 409 idempotency
      // conflict, 422); a retry would send the same bytes and fail the same
      // way, so acknowledge and log for the replay script instead of
      // exhausting Shopify's retries. Auth, rate-limit, network and server
      // failures still answer 502 so a rotated key or an outage gets them.
      // The body can echo the recipient, so only its codes and fields.
      logNeedsAttention(
        order,
        `Prodigi rejected the order: ${summarizeProdigiError(error.status, error.body)}`,
      );
      return new Response('Needs attention', {status: 200});
    }
    // Retryable (auth, rate limit, network, timeout, 5xx): Shopify retries.
    const detail =
      error instanceof ProdigiRequestError
        ? summarizeProdigiError(error.status, error.body)
        : error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error);
    console.error(
      `orders/paid: Prodigi call failed for order ${order.id} (${order.name}), Shopify will retry: ${detail}`,
    );
    return new Response('Prodigi error', {status: 502});
  }
}
