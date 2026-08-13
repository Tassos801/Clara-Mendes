import type {CustomerPrivacy} from '@shopify/hydrogen';
import {
  DENIED_CONSENT_MODE,
  normalizeGtmContainerId,
  pruneAndRecordDedupeEntries,
  shouldEmitGoogleCommerceEvent,
} from './googleCommerce.ts';
import type {MarketingAttributionSnapshot} from './marketingAttribution.ts';

export type GoogleCommerceEventName =
  | 'add_to_cart'
  | 'page_view'
  | 'remove_from_cart'
  | 'search'
  | 'view_cart'
  | 'view_item'
  | 'view_item_list';

type RuntimeStorage = Pick<Storage, 'getItem' | 'setItem'>;

type RuntimeScript = {
  async: boolean;
  dataset: {claraGtm?: string};
  src: string;
};

type RuntimeDocument = {
  createElement: (tagName: 'script') => RuntimeScript;
  head: {appendChild: (node: RuntimeScript) => unknown};
};

type RuntimeWindow = {
  __claraGoogleConsentInitialized?: boolean;
  __claraGoogleTagManagerInitialized?: boolean;
  dataLayer?: unknown[];
  sessionStorage?: RuntimeStorage;
};

export type GoogleCommerceRuntime = {
  document: RuntimeDocument;
  now?: () => number;
  randomId?: () => string;
  window: RuntimeWindow;
};

export type EmitGoogleCommerceEventInput = {
  analyticsAllowed: boolean;
  canTrack: boolean;
  captureAttribution?: () => MarketingAttributionSnapshot | null;
  dedupeKey: string;
  event: GoogleCommerceEventName;
  marketingAllowed: boolean;
  parameters?: Record<string, unknown>;
  runtime?: GoogleCommerceRuntime | null;
  sourceEvent: string;
};

const DEDUPE_STORAGE_KEY = 'clara.googleCommerceDedupe.v1';
const GTM_INITIALIZED_FLAG = '__claraGoogleTagManagerInitialized';
const CONSENT_INITIALIZED_FLAG = '__claraGoogleConsentInitialized';

export function getBrowserGoogleCommerceRuntime(): GoogleCommerceRuntime | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  return {
    document: document as unknown as RuntimeDocument,
    window: window as unknown as RuntimeWindow,
  };
}

export function initializeGoogleTagManager(
  containerId: string,
  runtime = getBrowserGoogleCommerceRuntime(),
) {
  const normalizedId = normalizeGtmContainerId(containerId);
  if (!normalizedId || !runtime) return false;

  const runtimeWindow = runtime.window;
  runtimeWindow.dataLayer = runtimeWindow.dataLayer ?? [];

  if (!runtimeWindow[CONSENT_INITIALIZED_FLAG]) {
    runtimeWindow[CONSENT_INITIALIZED_FLAG] = true;
    pushConsentMode('default', DENIED_CONSENT_MODE, runtime);
    pushGtag(
      'set',
      'linker',
      {
        accept_incoming: true,
        decorate_forms: true,
        domains: ['shopclaramendes.com', 'checkout.shopclaramendes.com'],
      },
      runtime,
    );
  }

  if (runtimeWindow[GTM_INITIALIZED_FLAG]) return true;
  runtimeWindow[GTM_INITIALIZED_FLAG] = true;
  runtimeWindow.dataLayer.push({
    'gtm.start': runtime.now?.() ?? Date.now(),
    event: 'gtm.js',
  });

  const script = runtime.document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(
    normalizedId,
  )}`;
  script.dataset.claraGtm = normalizedId;
  runtime.document.head.appendChild(script);
  return true;
}

export function updateConsentFromCustomerPrivacy(
  customerPrivacy: CustomerPrivacy | null,
  runtime = getBrowserGoogleCommerceRuntime(),
) {
  if (!customerPrivacy || !runtime) return false;

  pushConsentMode(
    'update',
    {
      ad_personalization: customerPrivacy.marketingAllowed()
        ? 'granted'
        : 'denied',
      ad_storage: customerPrivacy.marketingAllowed() ? 'granted' : 'denied',
      ad_user_data: customerPrivacy.marketingAllowed() ? 'granted' : 'denied',
      analytics_storage: customerPrivacy.analyticsProcessingAllowed()
        ? 'granted'
        : 'denied',
      functionality_storage: customerPrivacy.preferencesProcessingAllowed()
        ? 'granted'
        : 'denied',
      personalization_storage: customerPrivacy.preferencesProcessingAllowed()
        ? 'granted'
        : 'denied',
      security_storage: 'granted',
    },
    runtime,
  );
  return true;
}

export function pushConsentMode(
  command: 'default' | 'update',
  signals: Record<string, unknown>,
  runtime = getBrowserGoogleCommerceRuntime(),
) {
  if (!runtime) return;
  pushGtag('consent', command, signals, runtime);
}

export function pushGtag(
  ...args: [
    command: string,
    field: string,
    value: unknown,
    runtime?: GoogleCommerceRuntime | null,
  ]
) {
  const possibleRuntime = args[args.length - 1];
  const runtime = isGoogleCommerceRuntime(possibleRuntime)
    ? (args.pop() as GoogleCommerceRuntime)
    : getBrowserGoogleCommerceRuntime();
  if (!runtime) return;

  runtime.window.dataLayer = runtime.window.dataLayer ?? [];
  runtime.window.dataLayer.push(args);
}

export function emitGoogleCommerceEvent({
  analyticsAllowed,
  canTrack,
  captureAttribution,
  dedupeKey,
  event,
  marketingAllowed,
  parameters = {},
  runtime = getBrowserGoogleCommerceRuntime(),
  sourceEvent,
}: EmitGoogleCommerceEventInput) {
  if (
    !runtime ||
    !shouldEmitGoogleCommerceEvent({analyticsAllowed, canTrack}) ||
    wasRecentlySent(dedupeKey, runtime)
  ) {
    return false;
  }

  const runtimeWindow = runtime.window;
  runtimeWindow.dataLayer = runtimeWindow.dataLayer ?? [];
  if ('ecommerce' in parameters) {
    runtimeWindow.dataLayer.push({ecommerce: null});
  }

  const payload: Record<string, unknown> = {
    event,
    event_id: createEventId(event, runtime),
    source_event: sourceEvent,
    ...parameters,
  };
  if (marketingAllowed && captureAttribution) {
    const attribution = captureAttribution();
    if (attribution) payload.attribution = attribution;
  }

  runtimeWindow.dataLayer.push(payload);
  return true;
}

function createEventId(
  event: GoogleCommerceEventName,
  runtime: GoogleCommerceRuntime,
) {
  const random =
    runtime.randomId?.() ??
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(16).slice(2));

  return `cm_${event}_${runtime.now?.() ?? Date.now()}_${random}`
    .replace(/[^\w-]/g, '_')
    .slice(0, 120);
}

function wasRecentlySent(key: string, runtime: GoogleCommerceRuntime) {
  const storage = runtime.window.sessionStorage;
  if (!storage) return false;

  const now = runtime.now?.() ?? Date.now();

  try {
    const stored = JSON.parse(
      storage.getItem(DEDUPE_STORAGE_KEY) || '{}',
    ) as Record<string, number>;
    const result = pruneAndRecordDedupeEntries(stored, key, now);

    storage.setItem(DEDUPE_STORAGE_KEY, JSON.stringify(result.entries));
    return result.duplicate;
  } catch {
    return false;
  }
}

function isGoogleCommerceRuntime(
  value: unknown,
): value is GoogleCommerceRuntime {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'window' in value &&
      'document' in value,
  );
}
