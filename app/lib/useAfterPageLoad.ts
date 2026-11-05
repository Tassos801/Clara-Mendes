import {useEffect, useState} from 'react';

/**
 * False during server render and hydration, true once the window `load`
 * event has fired and the browser is next idle (immediately idle after a
 * client-side navigation). For things worth having but not worth competing
 * with the page's first image and scripts for bandwidth.
 */
export function useAfterPageLoad() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    let idle = 0;
    const markReady = () => {
      idle =
        typeof window.requestIdleCallback === 'function'
          ? window.requestIdleCallback(() => setReady(true), {timeout: 2000})
          : window.setTimeout(() => setReady(true), 200);
    };
    if (document.readyState === 'complete') markReady();
    else window.addEventListener('load', markReady, {once: true});
    return () => {
      window.removeEventListener('load', markReady);
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idle);
      } else {
        window.clearTimeout(idle);
      }
    };
  }, [ready]);

  return ready;
}
