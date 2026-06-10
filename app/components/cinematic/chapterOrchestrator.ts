/**
 * Scroll orchestration for the cinematic experience.
 *
 * Scans the DOM for `[data-chapter]` sections and wires GSAP ScrollTriggers
 * that (a) retarget the painted background palette as chapters cross the
 * viewport midpoint and (b) reveal `[data-reveal]` children with a staggered
 * rise/fade, once per page visit. Framework-free so it can be re-run on
 * every client-side navigation and fully reverted in between.
 */
import {DEFAULT_PALETTE, isPaletteName, type PaletteName} from './paintedShader';

type Gsap = typeof import('gsap').gsap;
type ScrollTriggerStatic = typeof import('gsap/ScrollTrigger').ScrollTrigger;

type OrchestratorOptions = {
  gsap: Gsap;
  ScrollTrigger: ScrollTriggerStatic;
  setTargetPalette: (palette: PaletteName) => void;
  reduceMotion: boolean;
};

export type ChapterOrchestrator = {
  /** Rebuild triggers for the current DOM. Call after each navigation. */
  scan: () => void;
  destroy: () => void;
};

export function createChapterOrchestrator({
  gsap,
  ScrollTrigger,
  setTargetPalette,
  reduceMotion,
}: OrchestratorOptions): ChapterOrchestrator {
  let ctx: ReturnType<typeof gsap.context> | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  // Infinite scroll appends products and changes the page height; keep
  // trigger positions honest without rebuilding anything.
  const observer = new MutationObserver(() => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 300);
  });

  const scan = () => {
    ctx?.revert();
    setTargetPalette(DEFAULT_PALETTE);

    ctx = gsap.context(() => {
      const chapters = Array.from(
        document.querySelectorAll<HTMLElement>('[data-chapter]'),
      );

      for (const chapter of chapters) {
        const palette = chapter.dataset.chapter;
        if (isPaletteName(palette)) {
          ScrollTrigger.create({
            trigger: chapter,
            start: 'top 55%',
            end: 'bottom 45%',
            onEnter: () => setTargetPalette(palette),
            onEnterBack: () => setTargetPalette(palette),
          });
        }

        if (reduceMotion) continue;

        const reveals = chapter.querySelectorAll<HTMLElement>('[data-reveal]');
        if (reveals.length > 0) {
          gsap.from(reveals, {
            y: 28,
            autoAlpha: 0,
            duration: 1.1,
            ease: 'power3.out',
            stagger: 0.1,
            scrollTrigger: {
              trigger: chapter,
              start: 'top 78%',
              once: true,
            },
          });
        }
      }
    });
  };

  observer.observe(document.body, {childList: true, subtree: true});

  return {
    scan,
    destroy: () => {
      observer.disconnect();
      if (refreshTimer) clearTimeout(refreshTimer);
      ctx?.revert();
    },
  };
}
