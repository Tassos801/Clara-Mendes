import Lenis from 'lenis';
import {
  createChapterOrchestrator,
  type ChapterOrchestrator,
} from './chapterOrchestrator';

export type CinematicHandle = {
  scan: ChapterOrchestrator['scan'];
  destroy: () => void;
};

/**
 * The sitewide motion layer: Lenis smooth scrolling and chapter reveals.
 * Loaded on demand by CinematicProvider once its device gates pass.
 *
 * It used to paint a WebGL background as well. That canvas sat at
 * `z-index: -1` under the body's opaque page colour, so it never showed
 * while costing a WebGL start (~200 ms of main thread) and a frame loop for
 * the whole visit; it was removed on 2026-11-15 and the pages look the same.
 */
export function startCinematic(): CinematicHandle {
  const lenis = new Lenis({lerp: 0.1});

  let frame = 0;
  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    lenis.raf(now);
  };
  frame = requestAnimationFrame(tick);

  const orchestrator = createChapterOrchestrator();

  return {
    scan: orchestrator.scan,
    destroy: () => {
      orchestrator.destroy();
      cancelAnimationFrame(frame);
      lenis.destroy();
    },
  };
}
