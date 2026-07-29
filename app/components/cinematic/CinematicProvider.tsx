import {useEffect, useRef} from 'react';
import {useLocation} from 'react-router';
import {
  buildPaintFragmentShader,
  DEFAULT_PALETTE,
  PAINT_VERTEX_SHADER,
  PALETTES,
  type PaletteName,
} from './paintedShader';
import {
  createChapterOrchestrator,
  type ChapterOrchestrator,
} from './chapterOrchestrator';

/**
 * Boots the sitewide cinematic experience as a progressive enhancement:
 * a persistent painted WebGL background (cursor + scroll reactive, palette
 * lerped per chapter), Lenis smooth scrolling, and GSAP ScrollTrigger
 * chapter reveals. Everything loads via dynamic import after hydration is
 * idle, and only when the visitor has not requested reduced motion, the
 * device is not memory/data constrained, and WebGL is available — otherwise
 * no cinematic code is downloaded and the site renders on its CSS fallback
 * backgrounds exactly as designed.
 */
export function CinematicProvider({children}: {children: React.ReactNode}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanRef = useRef<ChapterOrchestrator['scan'] | null>(null);
  const location = useLocation();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let destroyed = false;
    let cleanup: (() => void) | null = null;

    const idleId = whenIdle(() => {
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
    });

    return () => {
      destroyed = true;
      cancelIdle(idleId);
      scanRef.current = null;
      cleanup?.();
    };
  }, []);

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

type BootHandle = {
  scan: ChapterOrchestrator['scan'];
  destroy: () => void;
};

/**
 * Gates the ~190 kB gzip (Three.js + GSAP + Lenis) cinematic download.
 * Reduced-motion visitors and constrained devices keep the CSS paper
 * fallback the layouts are designed over — no cinematic code is fetched.
 */
function canBootCinematic(canvas: HTMLCanvasElement) {
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

  // Probe WebGL support before paying for the Three.js chunk
  try {
    const probe = document.createElement('canvas');
    const gl =
      probe.getContext('webgl2') ??
      probe.getContext('webgl') ??
      probe.getContext('experimental-webgl');
    if (!gl) return false;
  } catch {
    return false;
  }

  return Boolean(canvas);
}

async function boot(canvas: HTMLCanvasElement): Promise<BootHandle | null> {
  if (typeof window === 'undefined') return null;
  if (!canBootCinematic(canvas)) return null;

  const [THREE, {gsap}, {ScrollTrigger}, {default: Lenis}] = await Promise.all([
    import('three'),
    import('gsap'),
    import('gsap/ScrollTrigger'),
    import('lenis'),
  ]);

  gsap.registerPlugin(ScrollTrigger);

  // --- Painted background -------------------------------------------------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'low-power',
  });
  // On phones the paint renders at reduced resolution and is CSS-stretched;
  // the marbled texture has no hard edges, so the upscale is invisible while
  // fragment cost drops with the square of the ratio.
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const maxDpr = coarsePointer ? 0.75 : 1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const startColors = PALETTES[DEFAULT_PALETTE].map(
    (hex) => new THREE.Color(hex),
  );
  const targetColors = PALETTES[DEFAULT_PALETTE].map(
    (hex) => new THREE.Color(hex),
  );

  const uniforms = {
    uTime: {value: 0},
    uResolution: {
      value: new THREE.Vector2(window.innerWidth, window.innerHeight),
    },
    uPointer: {value: new THREE.Vector2(0.5, 0.5)},
    uScrollVel: {value: 0},
    uColorA: {value: startColors[0].clone()},
    uColorB: {value: startColors[1].clone()},
    uColorC: {value: startColors[2].clone()},
  };

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: PAINT_VERTEX_SHADER,
    fragmentShader: buildPaintFragmentShader(coarsePointer ? 3 : 4),
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(mesh);
  canvas.classList.add('is-active');

  const setTargetPalette = (palette: PaletteName) => {
    const [a, b, c] = PALETTES[palette];
    targetColors[0].set(a);
    targetColors[1].set(b);
    targetColors[2].set(c);
  };

  // Pointer: spring-damped toward the cursor; slow autonomous drift on touch.
  const pointerTarget = {x: 0.5, y: 0.5};
  const onPointerMove = (event: MouseEvent) => {
    pointerTarget.x = event.clientX / window.innerWidth;
    pointerTarget.y = 1 - event.clientY / window.innerHeight;
  };
  if (!coarsePointer) {
    window.addEventListener('mousemove', onPointerMove, {passive: true});
  }

  const onResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  // --- Smooth scroll --------------------------------------------------------
  let scrollVelTarget = 0;

  const lenis = new Lenis({lerp: 0.1});
  lenis.on('scroll', (instance: {velocity: number}) => {
    ScrollTrigger.update();
    scrollVelTarget = Math.max(-1, Math.min(1, instance.velocity / 60));
  });
  gsap.ticker.lagSmoothing(0);

  // --- Render loop (one ticker drives Lenis + shader) -----------------------
  // On phones the background renders every other frame (~30fps): the drift
  // is slow enough that the halved cadence is imperceptible, and the freed
  // GPU time goes to scroll compositing. Lenis always ticks at full rate so
  // scrolling itself never slows.
  let skipPaintFrame = false;
  const tick = (time: number) => {
    lenis.raf(time * 1000);

    if (coarsePointer) {
      skipPaintFrame = !skipPaintFrame;
      if (skipPaintFrame) return;
    }

    uniforms.uTime.value = time;

    const pointer = uniforms.uPointer.value;
    if (coarsePointer) {
      // Autonomous drift so the paint stays alive without a cursor
      pointerTarget.x = 0.5 + Math.sin(time * 0.13) * 0.3;
      pointerTarget.y = 0.5 + Math.cos(time * 0.09) * 0.3;
    }
    pointer.x += (pointerTarget.x - pointer.x) * 0.045;
    pointer.y += (pointerTarget.y - pointer.y) * 0.045;

    uniforms.uScrollVel.value +=
      (scrollVelTarget - uniforms.uScrollVel.value) * 0.06;
    scrollVelTarget *= 0.94;

    uniforms.uColorA.value.lerp(targetColors[0], 0.035);
    uniforms.uColorB.value.lerp(targetColors[1], 0.035);
    uniforms.uColorC.value.lerp(targetColors[2], 0.035);

    renderer.render(scene, camera);
  };

  gsap.ticker.add(tick);

  // --- Chapters --------------------------------------------------------------
  const orchestrator = createChapterOrchestrator({
    gsap,
    ScrollTrigger,
    setTargetPalette,
    // Reduced-motion visitors never reach boot(), so chapter reveals can
    // always animate here.
    reduceMotion: false,
  });

  return {
    scan: orchestrator.scan,
    destroy: () => {
      orchestrator.destroy();
      gsap.ticker.remove(tick);
      lenis.destroy();
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('resize', onResize);
      mesh.geometry.dispose();
      material.dispose();
      renderer.dispose();
      canvas.classList.remove('is-active');
    },
  };
}

function whenIdle(callback: () => void): number {
  // requestIdleCallback is still missing in Safari
  if (typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(callback, {timeout: 2500});
  }
  return window.setTimeout(callback, 350);
}

function cancelIdle(id: number) {
  if (typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(id);
  } else {
    window.clearTimeout(id);
  }
}
