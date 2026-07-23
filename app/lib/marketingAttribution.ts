import {STOREFRONT_ORIGIN} from './storefrontBasics';

export const MARKETING_ATTRIBUTION_INPUT_NAME = 'marketingAttribution';

const ATTRIBUTION_STORAGE_KEY = 'clara.marketingAttribution.v1';
const MAX_ATTRIBUTE_VALUE_LENGTH = 240;
const MAX_STORED_JSON_LENGTH = 3000;

const UTM_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_id',
] as const;

const CLICK_ID_PARAMS = [
  'fbclid',
  'ttclid',
  'gclid',
  'gbraid',
  'wbraid',
  'msclkid',
] as const;

const ATTRIBUTION_PARAMS = [...UTM_PARAMS, ...CLICK_ID_PARAMS] as const;

type AttributionParam = (typeof ATTRIBUTION_PARAMS)[number];

export type MarketingTouch = Partial<Record<AttributionParam, string>> & {
  captured_at: string;
  landing_page: string;
  referrer?: string;
  source: string;
};

export type MarketingAttributionSnapshot = {
  version: 1;
  session_id: string;
  current_page: string;
  first_touch: MarketingTouch;
  last_touch: MarketingTouch;
};

export type CartAttributeInput = {
  key: string;
  value: string;
};

export function captureMarketingAttribution() {
  if (typeof window === 'undefined') return null;

  const stored = readStoredAttribution();
  const currentTouch = createTouchFromWindow();
  const hasPaidSignal = hasAttributionSignal(currentTouch);
  const firstTouch = stored?.first_touch ?? currentTouch;
  const lastTouch = hasPaidSignal
    ? currentTouch
    : (stored?.last_touch ?? currentTouch);
  const snapshot: MarketingAttributionSnapshot = {
    version: 1,
    session_id: stored?.session_id ?? createSessionId(),
    current_page: safePageUrl(window.location.href),
    first_touch: firstTouch,
    last_touch: lastTouch,
  };

  writeStoredAttribution(snapshot);
  return snapshot;
}

export function getSerializedMarketingAttribution() {
  const snapshot = captureMarketingAttribution();
  if (!snapshot) return '';

  return serializeMarketingAttribution(snapshot);
}

export function getSerializedMarketingAttributionFromUrl(
  value: string,
  referrer = '',
) {
  const touch = createTouchFromUrl(value, referrer, '');
  const snapshot: MarketingAttributionSnapshot = {
    version: 1,
    session_id: '',
    current_page: touch.landing_page,
    first_touch: touch,
    last_touch: touch,
  };

  return serializeMarketingAttribution(snapshot);
}

function serializeMarketingAttribution(snapshot: MarketingAttributionSnapshot) {
  const serialized = JSON.stringify(snapshot);
  if (serialized.length <= MAX_STORED_JSON_LENGTH) return serialized;

  return JSON.stringify({
    version: snapshot.version,
    session_id: snapshot.session_id,
    current_page: snapshot.current_page,
    first_touch: compactTouch(snapshot.first_touch),
    last_touch: compactTouch(snapshot.last_touch),
  });
}

export function buildCheckoutUrlWithAttribution(checkoutUrl: string) {
  const snapshot = captureMarketingAttribution();
  if (!snapshot) return checkoutUrl;

  try {
    const url = new URL(checkoutUrl);
    const touch = snapshot.last_touch;

    ATTRIBUTION_PARAMS.forEach((param) => {
      const value = touch[param];
      if (value && !url.searchParams.has(param)) {
        url.searchParams.set(param, value);
      }
    });

    return url.toString();
  } catch {
    return checkoutUrl;
  }
}

export function marketingAttributionToCartAttributes(
  value: FormDataEntryValue | null,
) {
  const snapshot = parseMarketingAttribution(value);
  if (!snapshot) return [];

  const attributes: CartAttributeInput[] = [];
  const addAttribute = (key: string, rawValue?: string) => {
    const sanitizedValue = sanitizeAttributeValue(rawValue);
    if (sanitizedValue) {
      attributes.push({key, value: sanitizedValue});
    }
  };

  UTM_PARAMS.forEach((param) =>
    addAttribute(param, snapshot.last_touch[param]),
  );
  CLICK_ID_PARAMS.forEach((param) =>
    addAttribute(`clara_${param}`, snapshot.last_touch[param]),
  );

  addAttribute('clara_session_id', snapshot.session_id);
  addAttribute('clara_first_landing_page', snapshot.first_touch.landing_page);
  addAttribute('clara_first_referrer', snapshot.first_touch.referrer);
  addAttribute('clara_first_touch_source', snapshot.first_touch.source);
  addAttribute('clara_first_touch_at', snapshot.first_touch.captured_at);
  addAttribute('clara_last_landing_page', snapshot.last_touch.landing_page);
  addAttribute('clara_last_referrer', snapshot.last_touch.referrer);
  addAttribute('clara_last_touch_source', snapshot.last_touch.source);
  addAttribute('clara_last_touch_at', snapshot.last_touch.captured_at);

  return attributes;
}

export function mergeCartAttributes(
  existingAttributes: Array<{key?: string | null; value?: string | null}> = [],
  nextAttributes: CartAttributeInput[],
) {
  const merged = new Map<string, string>();

  existingAttributes.forEach((attribute) => {
    const key = sanitizeAttributeKey(attribute.key);
    const value = sanitizeAttributeValue(attribute.value);
    if (key && value) merged.set(key, value);
  });

  nextAttributes.forEach((attribute) => {
    const key = sanitizeAttributeKey(attribute.key);
    const value = sanitizeAttributeValue(attribute.value);
    if (key && value) merged.set(key, value);
  });

  return Array.from(merged, ([key, value]) => ({key, value}));
}

function parseMarketingAttribution(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const parsed = JSON.parse(value) as Partial<MarketingAttributionSnapshot>;
    if (!parsed.first_touch || !parsed.last_touch) return null;

    return parsed as MarketingAttributionSnapshot;
  } catch {
    return null;
  }
}

function createTouchFromWindow(): MarketingTouch {
  return createTouchFromUrl(
    window.location.href,
    document.referrer,
    new Date().toISOString(),
  );
}

function createTouchFromUrl(
  value: string,
  referrer: string,
  capturedAt: string,
): MarketingTouch {
  const url = safeUrl(value) ?? new URL(value, STOREFRONT_ORIGIN);
  const params = url.searchParams;
  const touch: MarketingTouch = {
    captured_at: capturedAt,
    landing_page: safePageUrl(url.toString()),
    referrer: safeReferrer(referrer),
    source: inferSource(params, referrer),
  };

  ATTRIBUTION_PARAMS.forEach((param) => {
    const value = params.get(param);
    if (value) touch[param] = sanitizeAttributeValue(value);
  });

  return touch;
}

function readStoredAttribution() {
  try {
    const value = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!value) return null;

    return JSON.parse(value) as MarketingAttributionSnapshot;
  } catch {
    return null;
  }
}

function writeStoredAttribution(snapshot: MarketingAttributionSnapshot) {
  try {
    window.localStorage.setItem(
      ATTRIBUTION_STORAGE_KEY,
      JSON.stringify(snapshot),
    );
  } catch {
    // Storage may be unavailable in private browsing or strict privacy modes.
  }
}

function hasAttributionSignal(touch: MarketingTouch) {
  return ATTRIBUTION_PARAMS.some((param) => Boolean(touch[param]));
}

function inferSource(params: URLSearchParams, referrer: string) {
  const utmSource = params.get('utm_source');
  if (utmSource) return sanitizeAttributeValue(utmSource);
  if (params.get('fbclid')) return 'facebook';
  if (params.get('ttclid')) return 'tiktok';
  if (params.get('gclid') || params.get('gbraid') || params.get('wbraid')) {
    return 'google';
  }
  if (params.get('msclkid')) return 'microsoft';

  const referrerUrl = safeUrl(referrer);
  return referrerUrl?.hostname || 'direct';
}

function safePageUrl(value: string) {
  const url = safeUrl(value);
  if (!url) return '';

  const params = new URLSearchParams();
  ATTRIBUTION_PARAMS.forEach((param) => {
    const paramValue = url.searchParams.get(param);
    if (paramValue) params.set(param, sanitizeAttributeValue(paramValue));
  });

  url.search = params.toString();
  url.hash = '';
  return url.toString();
}

function safeReferrer(value: string) {
  const url = safeUrl(value);
  if (!url) return undefined;

  url.search = '';
  url.hash = '';
  return url.toString();
}

function safeUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function compactTouch(touch: MarketingTouch) {
  return {
    ...touch,
    landing_page: touch.landing_page.slice(0, MAX_ATTRIBUTE_VALUE_LENGTH),
    referrer: touch.referrer?.slice(0, MAX_ATTRIBUTE_VALUE_LENGTH),
  };
}

function createSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `cm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sanitizeAttributeKey(value?: string | null) {
  if (!value) return '';
  return value.replace(/[^\w-]/g, '').slice(0, 64);
}

function sanitizeAttributeValue(value?: string | null) {
  if (!value) return '';
  return stripControlCharacters(value)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_ATTRIBUTE_VALUE_LENGTH);
}

function stripControlCharacters(value: string) {
  return Array.from(value)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');
}
