import {normalizeMetaPixelId} from './metaPixel.ts';

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  loaded?: boolean;
  push?: Fbq;
  queue: unknown[];
  version?: string;
};

type RuntimeScript = {async: boolean; src: string};

export type MetaPixelRuntime = {
  document: {
    createElement: (tagName: 'script') => RuntimeScript;
    head: {appendChild: (node: RuntimeScript) => unknown};
  };
  window: {_fbq?: Fbq; fbq?: Fbq; __claraMetaPixelId?: string};
};

export const META_PIXEL_SCRIPT =
  'https://connect.facebook.net/en_US/fbevents.js';

export function getBrowserMetaPixelRuntime(): MetaPixelRuntime | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  return {
    document: document as unknown as MetaPixelRuntime['document'],
    window: window as unknown as MetaPixelRuntime['window'],
  };
}

/**
 * Meta's base code: a queueing `fbq` stub, the fbevents.js script, then
 * `init`. Runs once per page load; returns false without a valid id.
 */
export function initializeMetaPixel(
  pixelId: string,
  runtime = getBrowserMetaPixelRuntime(),
) {
  const id = normalizeMetaPixelId(pixelId);
  if (!id || !runtime) return false;
  const win = runtime.window;
  if (win.__claraMetaPixelId) return true;
  win.__claraMetaPixelId = id;

  if (!win.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    } as Fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    win.fbq = fbq;
    win._fbq = win._fbq ?? fbq;

    const script = runtime.document.createElement('script');
    script.async = true;
    script.src = META_PIXEL_SCRIPT;
    runtime.document.head.appendChild(script);
  }

  win.fbq('init', id);
  return true;
}

export function trackMetaEvent(
  event: 'AddToCart' | 'PageView' | 'ViewContent',
  parameters?: Record<string, unknown>,
  runtime = getBrowserMetaPixelRuntime(),
) {
  const fbq = runtime?.window.__claraMetaPixelId ? runtime.window.fbq : null;
  if (!fbq) return false;
  if (parameters) fbq('track', event, parameters);
  else fbq('track', event);
  return true;
}

/** The visitor changed marketing consent after the pixel loaded. */
export function setMetaConsent(
  granted: boolean,
  runtime = getBrowserMetaPixelRuntime(),
) {
  const fbq = runtime?.window.__claraMetaPixelId ? runtime.window.fbq : null;
  fbq?.('consent', granted ? 'grant' : 'revoke');
  return Boolean(fbq);
}
