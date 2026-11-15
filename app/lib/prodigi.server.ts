/**
 * Minimal Prodigi Print API v4 client. Base URL defaults to the sandbox so a
 * misconfigured environment can never place a paid order by accident.
 */
export class ProdigiNotConfiguredError extends Error {}

export class ProdigiRequestError extends Error {
  // Plain field assignments (not TS parameter properties) so the plain-Node
  // operator scripts can import this module under strip-only type stripping.
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export type ProdigiShippingMethod =
  | 'Budget'
  | 'Standard'
  | 'StandardPlus'
  | 'Express'
  | 'Overnight';

export type ProdigiOrderPayload = {
  idempotencyKey: string;
  merchantReference: string;
  shippingMethod: ProdigiShippingMethod;
  /** Custom PDF the lab prints and encloses in place of its default slip. */
  packingSlip?: {url: string};
  recipient: {
    name: string;
    email?: string;
    phoneNumber?: string;
    address: {
      line1: string;
      line2?: string;
      townOrCity: string;
      stateOrCounty?: string | null;
      postalOrZipCode: string;
      countryCode: string;
    };
  };
  items: Array<{
    merchantReference: string;
    sku: string;
    copies: number;
    sizing: 'fillPrintArea' | 'fitPrintArea' | 'stretchToPrintArea';
    attributes: Record<string, string>;
    assets: Array<{printArea: 'default'; url: string}>;
  }>;
};

export type ProdigiOrderResponse = {
  outcome: 'Created' | 'CreatedWithIssues' | 'AlreadyExists' | 'OnHold' | string;
  order?: {
    id: string;
    status?: {stage: string; issues?: unknown[]; details?: Record<string, string>};
  };
  traceParent?: string;
};

export const PRODIGI_SANDBOX_BASE = 'https://api.sandbox.prodigi.com';
export const PRODIGI_LIVE_BASE = 'https://api.prodigi.com';

/**
 * Status, outcome and failing field names/codes from a Prodigi error body,
 * for logs. Never the values: a validation failure can echo the recipient's
 * name, address or email.
 */
export function summarizeProdigiError(status: number, body: unknown) {
  const parts = [`status ${status}`];
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  if (typeof record?.outcome === 'string') parts.push(`outcome ${record.outcome}`);
  const failures = record?.failures;
  if (failures && typeof failures === 'object' && !Array.isArray(failures)) {
    const fields = Object.entries(failures as Record<string, unknown>).map(([field, list]) => {
      const codes = Array.isArray(list)
        ? list
            .map((item) =>
              item && typeof item === 'object' ? (item as {code?: unknown}).code : null,
            )
            .filter((code): code is string => typeof code === 'string')
        : [];
      return codes.length ? `${field} (${codes.join(', ')})` : field;
    });
    if (fields.length) parts.push(`failures ${fields.join('; ')}`);
  }
  return parts.join(', ');
}

/** Status given to a request that timed out before Prodigi answered (retryable). */
export const PRODIGI_TIMEOUT_STATUS = 504;

export function createProdigiClient(
  env: {
    PRODIGI_API_KEY?: string;
    PRODIGI_API_BASE?: string;
  },
  /**
   * Abort each request after this long. The orders/paid webhook passes ~4 s
   * because Shopify abandons a delivery after ~5 s; operator scripts wait.
   */
  {timeoutMs}: {timeoutMs?: number} = {},
) {
  const apiKey = env.PRODIGI_API_KEY;
  const base = (env.PRODIGI_API_BASE || PRODIGI_SANDBOX_BASE).replace(/\/$/, '');
  if (!apiKey) throw new ProdigiNotConfiguredError('PRODIGI_API_KEY is not set.');

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${base}/v4.0${path}`, {
        method,
        headers: {'X-API-Key': apiKey!, 'Content-Type': 'application/json'},
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
      });
    } catch (error) {
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new ProdigiRequestError(
          `Prodigi ${method} ${path} timed out after ${timeoutMs} ms`,
          PRODIGI_TIMEOUT_STATUS,
          null,
        );
      }
      throw error;
    }
    const json = (await res.json().catch(() => null)) as T;
    if (!res.ok) {
      throw new ProdigiRequestError(`Prodigi ${method} ${path} → ${res.status}`, res.status, json);
    }
    return json;
  }

  return {
    base,
    isSandbox: base === PRODIGI_SANDBOX_BASE,
    createOrder: (payload: ProdigiOrderPayload) =>
      request<ProdigiOrderResponse>('POST', '/orders', payload),
    getOrder: (id: string) => request<{order: unknown}>('GET', `/orders/${encodeURIComponent(id)}`),
    getProduct: (sku: string) =>
      request<{product: unknown}>('GET', `/products/${encodeURIComponent(sku)}`),
    quote: (payload: unknown) => request<unknown>('POST', '/quotes', payload),
  };
}
