import {useEffect, useRef} from 'react';
import {useLocation} from 'react-router';
import {useAfterPageLoad} from '~/lib/useAfterPageLoad';
import type {CinematicHandle} from './cinematicExperience';

/**
 * Boots the sitewide cinematic experience as a progressive enhancement:
 * a persistent painted WebGL background (cursor + scroll reactive, palette
 * lerped per chapter), Lenis smooth scrolling, and chapter reveals.
 * Everything loads via dynamic import once the page has loaded and the
 * browser is idle (creating a WebGL context costs the main thread ~200 ms
 * on a cold start, so it waits until the page is usable), and only when the
 * visitor has not requested reduced motion and the device is not
 * memory/data constrained; without WebGL it stops before drawing — either
 * way the site renders on its CSS fallback backgrounds exactly as designed.
 */
export function CinematicProvider({children}: {children: React.ReactNode}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanRef = useRef<CinematicHandle['scan'] | null>(null);
  const location = useLocation();
  const pageLoaded = useAfterPageLoad();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pageLoaded) return;

    let destroyed = false;
    let cleanup: (() => void) | null = null;

    boot(canvas)
      .then((handle) => {
        if (!handle) return;
        if (destroyed) {
          handle.destroy();
          return;
        }
        cleanup = handle.destroy;
        scanRef.current = handle.scan;
        handle.scan();
      })
      .catch((error) => {
        console.warn('Cinematic experience disabled:', error);
      });

    return () => {
      destroyed = true;
      scanRef.current = null;
      cleanup?.();
    };
  }, [pageLoaded]);

  // Rebuild chapter triggers after every client-side navigation, once the
  // new route's DOM has painted.
  useEffect(() => {
    if (!scanRef.current) return;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => scanRef.current?.());
    });
    return () => cancelAnimationFrame(raf);
  }, [location.pathname]);

  return (
    <>
      <canvas ref={canvasRef} className="cinematic-canvas" aria-hidden />
      {children}
    </>
  );
}

/**
 * Gates the cinematic download (~10 kB gzip: Lenis, the WebGL paint and the
 * chapter observers). Reduced-motion visitors and constrained devices keep
 * the CSS paper fallback the layouts are designed over — no cinematic code
 * is fetched. Reduced-motion visitors never boot, so chapter reveals can
 * always animate once it runs.
 */
function canBootCinematic() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }

  const connection = (
    navigator as Navigator & {connection?: {saveData?: boolean}}
  ).connection;
  if (connection?.saveData) return false;

  const deviceMemory = (navigator as Navigator & {deviceMemory?: number})
    .deviceMemory;
  if (deviceMemory != null && deviceMemory < 2) return false;

  return true;
}

async function boot(canvas: HTMLCanvasElement): Promise<CinematicHandle | null> {
  if (typeof window === 'undefined') return null;
  if (!canBootCinematic()) return null;

  const {startCinematic} = await import('./cinematicExperience');
  return startCinematic(canvas);
}
