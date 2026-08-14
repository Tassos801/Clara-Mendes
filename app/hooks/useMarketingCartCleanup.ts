import {useEffect, useReducer, useRef} from 'react';
import {
  cartAttributesSignature,
  hasMarketingCartAttributes,
  isMarketingCartCleanupResponseSuccessful,
} from '../lib/marketingAttribution.ts';
import type {MarketingConsentState} from '../lib/marketingConsent.ts';

type CartAttribute = {key?: string | null; value?: string | null};

export type MarketingCartCleanupRequest = {
  signal: AbortSignal;
  sourceSignature: string;
};

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type UseMarketingCartCleanupInput = {
  attributes: CartAttribute[];
  consent: MarketingConsentState;
  maxAttempts?: number;
  requestCleanup?: (request: MarketingCartCleanupRequest) => Promise<boolean>;
  retryDelayMs?: number;
};

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 750;

export async function requestMarketingCartCleanup(
  {signal, sourceSignature}: MarketingCartCleanupRequest,
  fetchImpl: FetchLike = fetch,
) {
  const formData = new FormData();
  formData.set('sourceSignature', sourceSignature);

  try {
    const response = await fetchImpl('/api/cart-attribution-cleanup', {
      body: formData,
      credentials: 'same-origin',
      headers: {Accept: 'application/json'},
      method: 'POST',
      signal,
    });
    const payload = await response.json().catch(() => null);
    return isMarketingCartCleanupResponseSuccessful(response.ok, payload);
  } catch {
    return false;
  }
}

export function useMarketingCartCleanup({
  attributes,
  consent,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  requestCleanup = requestMarketingCartCleanup,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
}: UseMarketingCartCleanupInput) {
  const sourceSignature = cartAttributesSignature(attributes);
  const requiresCleanup = hasMarketingCartAttributes(attributes);
  const attemptsRef = useRef({count: 0, sourceSignature: ''});
  const completedSignatureRef = useRef<string | null>(null);
  const [retryToken, retry] = useReducer((value: number) => value + 1, 0);

  useEffect(() => {
    if (consent === 'granted') {
      attemptsRef.current = {count: 0, sourceSignature: ''};
      completedSignatureRef.current = null;
      return;
    }
    if (consent !== 'denied' || !requiresCleanup) return;

    if (attemptsRef.current.sourceSignature !== sourceSignature) {
      attemptsRef.current = {count: 0, sourceSignature};
      completedSignatureRef.current = null;
    }

    const attemptLimit = Math.max(1, Math.floor(maxAttempts));
    if (
      completedSignatureRef.current === sourceSignature ||
      attemptsRef.current.count >= attemptLimit
    ) {
      return;
    }

    attemptsRef.current.count += 1;
    const controller = new AbortController();
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleRetry = () => {
      if (!active || attemptsRef.current.count >= attemptLimit) return;
      retryTimer = setTimeout(
        () => {
          if (active) retry();
        },
        Math.max(0, retryDelayMs),
      );
    };

    void requestCleanup({signal: controller.signal, sourceSignature})
      .then((succeeded) => {
        if (!active) return;
        if (succeeded) {
          completedSignatureRef.current = sourceSignature;
          return;
        }
        scheduleRetry();
      })
      .catch(scheduleRetry);

    return () => {
      active = false;
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [
    consent,
    maxAttempts,
    requestCleanup,
    requiresCleanup,
    retryDelayMs,
    retryToken,
    sourceSignature,
  ]);
}
