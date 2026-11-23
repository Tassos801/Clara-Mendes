/**
 * What the `orders/paid` webhook does with one verified order: decide, log
 * and answer. The route keeps the HTTP part (method, HMAC, topic, JSON);
 * this part has no Request in it so the tests can run it.
 */
import {
  createProdigiClient,
  isProdigiSandbox,
  ProdigiNotConfiguredError,
  ProdigiRequestError,
  summarizeProdigiError,
} from '../prodigi.server.ts';
import {STOREFRONT_ORIGIN} from '../storefrontBasics.ts';
import {
  buildProdigiOrderFromShopify,
  isTestOrderForLiveLab,
  orderHasProdigiApiLines,
  type ShopifyOrderWebhook,
} from './fulfilment.ts';

/** Prodigi statuses that mean the payload itself is wrong. */
const PRODIGI_REJECTED_PAYLOAD = new Set([400, 409, 422]);

/**
 * Shopify abandons a delivery after 5 s, so Prodigi gets ~4 s; a timeout
 * answers 502 and Shopify retries (the idempotency key makes that safe).
 */
const PRODIGI_TIMEOUT_MS = 4_000;

export type PaidOrderEnv = {
  SKY_SIGNING_SECRET?: string;
  PRODIGI_API_KEY?: string;
  PRODIGI_API_BASE?: string;
};

export type PaidOrderAnswer = {status: number; body: string};

type Log = Pick<Console, 'error' | 'warn'>;

/**
 * One greppable line per paid order that did not reach the lab, for the
 * replay script (scripts/sky-replay-order.mjs). Order id and name only: no
 * customer data.
 */
function logNeedsAttention(
  log: Log,
  order: ShopifyOrderWebhook,
  detail: string,
) {
  log.error(
    `orders/paid NEEDS ATTENTION order ${order.id} (${order.name}): ${detail}`,
  );
}

/**
 * Shopify sends no attempt number, so the age of the event is the only hint
 * of how far into its retries a failed delivery is.
 */
function attemptNote(triggeredAt: string | null | undefined, now: number) {
  const at = Date.parse(triggeredAt ?? '');
  if (!Number.isFinite(at)) return 'event time unknown';
  const minutes = Math.max(0, Math.round((now - at) / 60_000));
  return `attempt ${minutes} min after the event`;
}

/**
 * One Prodigi order per Shopify order covering every signed personalised
 * line and every phone case line. A 2xx tells Shopify we are done; any other
 * answer makes it retry 8 times over the next 4 hours, which is safe because
 * the Prodigi idempotency key is derived from the Shopify order id. Only
 * failures a retry can cure answer 5xx.
 *
 * Shopify does not say which attempt is the last, so every attempt that
 * leaves a paid order unsent writes the NEEDS ATTENTION line. A later
 * "→ Prodigi" line for the same order means a retry delivered it; no such
 * line means the order needs the replay script.
 */
export async function handlePaidOrder(
  order: ShopifyOrderWebhook,
  {
    env,
    triggeredAt,
    now = Date.now(),
    log = console,
  }: {
    env: PaidOrderEnv;
    /** The delivery's X-Shopify-Triggered-At header. */
    triggeredAt?: string | null;
    now?: number;
    log?: Log;
  },
): Promise<PaidOrderAnswer> {
  if (!orderHasProdigiApiLines(order)) {
    return {status: 200, body: 'No lines for the Prodigi API'};
  }

  // Before any configuration is read: a test order is never a lost order.
  if (isTestOrderForLiveLab(order, {isSandbox: isProdigiSandbox(env)})) {
    log.warn(
      `orders/paid: order ${order.id} (${order.name}) is a Shopify test order; not sent to the live Prodigi API.`,
    );
    return {status: 200, body: 'Test order: not sent to the lab'};
  }

  const attempt = attemptNote(triggeredAt, now);
  const signingSecret = env.SKY_SIGNING_SECRET;
  if (!signingSecret) {
    logNeedsAttention(
      log,
      order,
      `not sent, SKY_SIGNING_SECRET is not set in the Oxygen environment (${attempt})`,
    );
    return {status: 500, body: 'Not configured'};
  }

  try {
    const build = await buildProdigiOrderFromShopify(order, {
      secret: signingSecret,
      origin: STOREFRONT_ORIGIN,
    });
    if (build.kind === 'skip') {
      return {status: 200, body: 'No lines for the Prodigi API'};
    }
    if (build.kind === 'problem') {
      // Retrying cannot fix a bad signature or an unmapped SKU; log for the
      // replay script and acknowledge.
      logNeedsAttention(log, order, build.reason);
      return {status: 200, body: 'Needs attention'};
    }

    const prodigi = createProdigiClient(env, {timeoutMs: PRODIGI_TIMEOUT_MS});
    const response = await prodigi.createOrder(build.payload);
    log.warn(
      `orders/paid: ${order.name} → Prodigi${prodigi.isSandbox ? ' sandbox' : ''} ${response.outcome} ${response.order?.id ?? ''}`,
    );
    return {status: 200, body: response.outcome};
  } catch (error) {
    if (error instanceof ProdigiNotConfiguredError) {
      logNeedsAttention(
        log,
        order,
        `not sent, PRODIGI_API_KEY is not set in the Oxygen environment (${attempt})`,
      );
      return {status: 500, body: 'Not configured'};
    }
    if (
      error instanceof ProdigiRequestError &&
      PRODIGI_REJECTED_PAYLOAD.has(error.status)
    ) {
      // Prodigi rejected the payload itself (400 validation, 409 idempotency
      // conflict, 422); a retry would send the same bytes and fail the same
      // way, so acknowledge and log for the replay script instead of
      // exhausting Shopify's retries. The body can echo the recipient, so
      // only its codes and fields.
      logNeedsAttention(
        log,
        order,
        `Prodigi rejected the order: ${summarizeProdigiError(error.status, error.body)}`,
      );
      return {status: 200, body: 'Needs attention'};
    }
    // Retryable (auth, rate limit, network, timeout, 5xx, anything
    // unforeseen): Shopify retries, so a rotated key or an outage gets them.
    const detail =
      error instanceof ProdigiRequestError
        ? summarizeProdigiError(error.status, error.body)
        : error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error);
    logNeedsAttention(
      log,
      order,
      `not sent, Shopify will retry (${attempt}): ${detail}`,
    );
    return {status: 502, body: 'Prodigi error'};
  }
}
