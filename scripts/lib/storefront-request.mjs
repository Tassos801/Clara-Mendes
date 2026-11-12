/**
 * One Storefront API request for scripts that quote checkout
 * (scripts/build-shipping-fees.mjs), sent again after a network failure
 * when sending it twice cannot change the store twice.
 *
 * A quote run creates a cart per country and swaps its line through every
 * product; Shopify analytics counts each cart as a visit that added to cart.
 * Without a retry, one DNS failure halfway ends the run and throws away
 * every cart already quoted (2026-11-12: five carts, no result).
 *
 * - A failure before the request reached Shopify (DNS, refused or timed-out
 *   connection) is always sent again: nothing happened on the store.
 * - A `repeatable` request (a read, or a line swap, which leaves the cart as
 *   one swap does) is also sent again after a failure mid-request or a 5xx.
 * - A cart create is not: if Shopify received it, a second one would be a
 *   second cart. That failure ends the run, as before.
 * - GraphQL errors and other HTTP answers (a 429 or 430 throttle among
 *   them: sending more only prolongs it) are never sent again.
 */

// Codes undici reports when the request never reached the server.
export const NOT_SENT_CODES = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'UND_ERR_CONNECT_TIMEOUT',
]);

export const RETRIES = 4;
/** Wait before retry n: n × this (15, 30, 45, 60 s; 150 s in all). */
export const RETRY_WAIT_MS = 15_000;

const pause = (ms) => new Promise((done) => setTimeout(done, ms));

/** True when this failure may be sent again (see the rules above). */
export function canResend(error, repeatable) {
  if (NOT_SENT_CODES.has(error?.cause?.code)) return true;
  if (!repeatable) return false;
  // fetch() rejects with a TypeError for a network failure; a 5xx is ours.
  return (
    (error instanceof TypeError && error.cause != null) || error?.serverError
  );
}

/**
 * POST one GraphQL request and return its `data`. Tests pass their own
 * fetch, pause and log as the second argument.
 */
export async function storefrontRequest(
  {endpoint, token, query, variables, repeatable = false, label = 'request'},
  {fetch = globalThis.fetch, sleep = pause, log = console.error} = {},
) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': token,
        },
        body: JSON.stringify({query, variables}),
      });
      if (!response.ok)
        throw Object.assign(
          new Error(`Storefront API answered ${response.status}`),
          {serverError: response.status >= 500},
        );
      const body = await response.json();
      if (body.errors)
        throw new Error(JSON.stringify(body.errors).slice(0, 400));
      return body.data;
    } catch (error) {
      if (attempt > RETRIES || !canResend(error, repeatable)) throw error;
      const wait = attempt * RETRY_WAIT_MS;
      const reason = error?.cause?.code ?? error.message;
      log(
        `${label}: ${reason}; sending it again in ${wait / 1000} s (retry ${attempt} of ${RETRIES})`,
      );
      await sleep(wait);
    }
  }
}
