import Lenis from 'lenis';
import {
  createChapterOrchestrator,
  type ChapterOrchestrator,
} from './chapterOrchestrator';
import {DEFAULT_PALETTE, PALETTES, type PaletteName} from './paintedShader';
import {
  createPaintRenderer,
  hexToLinear,
  type LinearColor,
} from './paintRenderer';

export type CinematicHandle = {
  scan: ChapterOrchestrator['scan'];
  destroy: () => void;
};

const lerp = (from: number, to: number, amount: number) =>
  from + (to - from) * amount;

const lerpColor = (color: LinearColor, target: LinearColor, amount: number) => {
  color[0] = lerp(color[0], target[0], amount);
  color[1] = lerp(color[1], target[1], amount);
  color[2] = lerp(color[2], target[2], amount);
};

const paletteColors = (palette: PaletteName) =>
  PALETTES[palette].map(hexToLinear) as [LinearColor, LinearColor, LinearColor];

/**
 * The sitewide cinematic layer: a painted WebGL background (cursor and
 * scroll reactive, palette lerped per chapter), Lenis smooth scrolling and
 * chapter reveals, all on one requestAnimationFrame loop. Loaded on demand
 * by CinematicProvider once its device gates pass. Returns null when the
 * canvas cannot get a WebGL context.
 */
export function startCinematic(
  canvas: HTMLCanvasElement,
): CinematicHandle | null {
  // On phones the paint renders at reduced resolution and is CSS-stretched;
  // the marbled texture has no hard edges, so the upscale is invisible while
  // fragment cost drops with the square of the ratio.
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const maxDpr = coarsePointer ? 0.75 : 1.5;
  const renderer = createPaintRenderer(canvas, {
    octaves: coarsePointer ? 3 : 4,
    pixelRatio: Math.min(window.devicePixelRatio || 1, maxDpr),
  });
  if (!renderer) return null;
  renderer.setSize(window.innerWidth, window.innerHeight);

  const colors = paletteColors(DEFAULT_PALETTE);
  let targetColors = paletteColors(DEFAULT_PALETTE);
  const resolution: [number, number] = [window.innerWidth, window.innerHeight];
  const pointer: [number, number] = [0.5, 0.5];
  // The canvas fades in on its first painted frame; until the shader has
  // linked it would show as black.
  let paint: 'pending' | 'drawn' | 'failed' = 'pending';

  const setTargetPalette = (palette: PaletteName) => {
    targetColors = paletteColors(palette);
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

  // URL-bar show/hide fires height-only resizes on phones; reallocating
  // the framebuffer for those mid-scroll is a visible hitch. The canvas is
  // a soft background, so a briefly stale height is invisible — real
  // orientation/layout changes always change the width too.
  let lastResizeWidth = window.innerWidth;
  const onResize = () => {
    if (coarsePointer && window.innerWidth === lastResizeWidth) return;
    lastResizeWidth = window.innerWidth;
    renderer.setSize(window.innerWidth, window.innerHeight);
    resolution[0] = window.innerWidth;
    resolution[1] = window.innerHeight;
  };
  window.addEventListener('resize', onResize);

  // --- Smooth scroll --------------------------------------------------------
  let scrollVelTarget = 0;
  let scrollVel = 0;

  const lenis = new Lenis({lerp: 0.1});
  lenis.on('scroll', (instance: {velocity: number}) => {
    scrollVelTarget = Math.max(-1, Math.min(1, instance.velocity / 60));
  });

  // --- Render loop (one frame loop drives Lenis + shader) -------------------
  // On phones the background renders every other frame (~30fps): the drift
  // is slow enough that the halved cadence is imperceptible, and the freed
  // GPU time goes to scroll compositing. Lenis always ticks at full rate so
  // scrolling itself never slows.
  let skipPaintFrame = false;
  let frame = 0;
  const startedAt = performance.now();
  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    lenis.raf(now);
    if (paint === 'failed') return;

    if (coarsePointer) {
      skipPaintFrame = !skipPaintFrame;
      if (skipPaintFrame) return;
    }

    const time = (now - startedAt) / 1000;
    if (coarsePointer) {
      // Autonomous drift so the paint stays alive without a cursor
      pointerTarget.x = 0.5 + Math.sin(time * 0.13) * 0.3;
      pointerTarget.y = 0.5 + Math.cos(time * 0.09) * 0.3;
    }
    pointer[0] = lerp(pointer[0], pointerTarget.x, 0.045);
    pointer[1] = lerp(pointer[1], pointerTarget.y, 0.045);

    scrollVel = lerp(scrollVel, scrollVelTarget, 0.06);
    scrollVelTarget *= 0.94;

    lerpColor(colors[0], targetColors[0], 0.035);
    lerpColor(colors[1], targetColors[1], 0.035);
    lerpColor(colors[2], targetColors[2], 0.035);

    const result = renderer.render({
      time,
      resolution,
      pointer,
      scrollVel,
      colors,
    });
    if (result === 'drawn' && paint === 'pending') {
      canvas.classList.add('is-active');
    }
    if (result !== 'pending') paint = result;
  };
  frame = requestAnimationFrame(tick);

  // --- Chapters --------------------------------------------------------------
  const orchestrator = createChapterOrchestrator({setTargetPalette});

  return {
    scan: orchestrator.scan,
    destroy: () => {
      orchestrator.destroy();
      cancelAnimationFrame(frame);
      lenis.destroy();
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('resize', onResize);
      renderer.destroy();
      canvas.classList.remove('is-active');
    },
  };
}
