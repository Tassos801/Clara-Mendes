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

export function createProdigiClient(env: {
  PRODIGI_API_KEY?: string;
  PRODIGI_API_BASE?: string;
}) {
  const apiKey = env.PRODIGI_API_KEY;
  const base = (env.PRODIGI_API_BASE || PRODIGI_SANDBOX_BASE).replace(/\/$/, '');
  if (!apiKey) throw new ProdigiNotConfiguredError('PRODIGI_API_KEY is not set.');

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${base}/v4.0${path}`, {
      method,
      headers: {'X-API-Key': apiKey!, 'Content-Type': 'application/json'},
      body: body === undefined ? undefined : JSON.stringify(body),
    });
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
