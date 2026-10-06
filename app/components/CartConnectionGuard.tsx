import {useEffect, useRef, useState} from 'react';
import {
  CART_OFFLINE_MESSAGE,
  shouldHoldCartSubmission,
} from '~/lib/cartFormErrors';

type ManifestRoute = {imports?: string[]; module?: string};
type RouterWindow = Window & {
  __reactRouterManifest?: {routes?: Record<string, ManifestRoute>};
};

const CART_ROUTE_ID = 'routes/cart';
const NOTICE_MS = 6000;

/**
 * Keeps a weak or lost phone connection from costing the shopper their page.
 *
 * - Every cart form posts to `/cart`. With no connection, React Router would
 *   reload the page to fetch the route's code, or replace it with the error
 *   page when revalidation fails. Offline submissions and checkout taps are
 *   held in the capture phase, before React sees them, and a notice says
 *   why; nothing reaches Shopify, so the cart is unchanged.
 * - Once the page is idle, the cart route's code is preloaded, so the first
 *   add to cart does not wait on a module download (and still works if the
 *   signal drops afterwards).
 */
export function CartConnectionGuard() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const hold = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      setMessage(CART_OFFLINE_MESSAGE);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setMessage(null), NOTICE_MS);
    };
    const onSubmit = (event: Event) => {
      const form =
        event.target instanceof HTMLFormElement ? event.target : null;
      if (
        form &&
        shouldHoldCartSubmission({
          action: form.getAttribute('action'),
          online: navigator.onLine,
        })
      ) {
        hold(event);
      }
    };
    const onClick = (event: MouseEvent) => {
      if (navigator.onLine) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('a.cart-checkout-button')) hold(event);
    };
    const onOnline = () => setMessage(null);

    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('click', onClick, true);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('submit', onSubmit, true);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('online', onOnline);
      window.clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    let attempts = 0;
    let handle: number | undefined;
    const warm = () => {
      const route = (window as RouterWindow).__reactRouterManifest?.routes?.[
        CART_ROUTE_ID
      ];
      // Lazy route discovery may not have listed the route yet.
      if (!route?.module) {
        attempts += 1;
        if (attempts < 4) handle = window.setTimeout(warm, 3000);
        return;
      }
      for (const href of [route.module, ...(route.imports ?? [])]) {
        const known = Array.from(
          document.querySelectorAll<HTMLLinkElement>(
            'link[rel="modulepreload"]',
          ),
        ).some((link) => link.getAttribute('href') === href);
        if (known) continue;
        const link = document.createElement('link');
        link.rel = 'modulepreload';
        link.href = href;
        document.head.appendChild(link);
      }
    };
    // After hydration and the largest paint, never competing with them.
    handle = window.setTimeout(warm, 2500);
    return () => window.clearTimeout(handle);
  }, []);

  return (
    <div className="cart-connection-notice" role="status" aria-live="polite">
      {message ? <p>{message}</p> : null}
    </div>
  );
}
