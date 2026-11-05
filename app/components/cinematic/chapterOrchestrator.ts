/**
 * Scroll orchestration for the cinematic experience.
 *
 * Scans the DOM for `[data-chapter]` sections and (a) retargets the painted
 * background palette while a chapter crosses the viewport's middle band and
 * (b) reveals its `[data-reveal]` children with a staggered rise/fade, once
 * per page visit. Built on IntersectionObserver and the Web Animations API,
 * so it needs no scroll library and no layout reads while scrolling.
 * Framework-free so it can be re-run on every client-side navigation and
 * fully reverted in between.
 */
import {DEFAULT_PALETTE, isPaletteName, type PaletteName} from './paintedShader';

type OrchestratorOptions = {
  setTargetPalette: (palette: PaletteName) => void;
};

export type ScanOptions = {
  /**
   * False when booting partway through a visit: chapters the visitor has
   * already reached keep their content as it is instead of hiding it and
   * rising it in again. Navigations scan with the default (true).
   */
  revealOnScreen?: boolean;
};

export type ChapterOrchestrator = {
  /** Rebuild observers for the current DOM. Call after each navigation. */
  scan: (options?: ScanOptions) => void;
  destroy: () => void;
};

/** A chapter's palette applies while it crosses the 45%–55% band. */
const PALETTE_BAND = '-45% 0px -45% 0px';

/**
 * Reveals start when a chapter's top passes 78% of the viewport height.
 * The root reaches far above the viewport so a chapter skipped past (an
 * anchor jump, a fast fling) still counts as entered and is revealed.
 */
const REVEAL_LINE = '100000px 0px -22% 0px';
/** The same line as a fraction of the viewport height, for the boot check. */
const REVEAL_LINE_FRACTION = 0.78;

const REVEAL_KEYFRAMES: Keyframe[] = [
  {opacity: 0, visibility: 'hidden', translate: '0 28px'},
  {opacity: 1, visibility: 'visible', translate: '0 0'},
];
/** GSAP's power3.out, the curve the reveals were tuned with. */
const REVEAL_EASING = 'cubic-bezier(0.25, 1, 0.5, 1)';
const REVEAL_DURATION_MS = 1100;
const REVEAL_STAGGER_MS = 100;

export function createChapterOrchestrator({
  setTargetPalette,
}: OrchestratorOptions): ChapterOrchestrator {
  let paletteObserver: IntersectionObserver | null = null;
  let revealObserver: IntersectionObserver | null = null;
  let animations: Animation[] = [];

  const revert = () => {
    paletteObserver?.disconnect();
    revealObserver?.disconnect();
    paletteObserver = null;
    revealObserver = null;
    for (const animation of animations) animation.cancel();
    animations = [];
  };

  const scan = ({revealOnScreen = true}: ScanOptions = {}) => {
    revert();
    setTargetPalette(DEFAULT_PALETTE);

    const chapters = Array.from(
      document.querySelectorAll<HTMLElement>('[data-chapter]'),
    );
    if (chapters.length === 0) return;

    const pending = new Map<Element, Animation[]>();

    paletteObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const palette = (entry.target as HTMLElement).dataset.chapter;
          if (entry.isIntersecting && isPaletteName(palette)) {
            setTargetPalette(palette);
          }
        }
      },
      {rootMargin: PALETTE_BAND},
    );

    revealObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          for (const animation of pending.get(entry.target) ?? []) {
            animation.play();
          }
          pending.delete(entry.target);
        }
      },
      {rootMargin: REVEAL_LINE},
    );

    for (const chapter of chapters) {
      if (isPaletteName(chapter.dataset.chapter)) {
        paletteObserver.observe(chapter);
      }

      const reveals = chapter.querySelectorAll<HTMLElement>('[data-reveal]');
      if (reveals.length === 0) continue;
      if (
        !revealOnScreen &&
        chapter.getBoundingClientRect().top <
          window.innerHeight * REVEAL_LINE_FRACTION
      ) {
        continue;
      }

      // Paused at time zero, the backwards fill holds each child hidden and
      // lowered until its chapter enters; finished, nothing stays inline.
      const chapterAnimations = Array.from(reveals, (element, index) => {
        const animation = element.animate(REVEAL_KEYFRAMES, {
          delay: index * REVEAL_STAGGER_MS,
          duration: REVEAL_DURATION_MS,
          easing: REVEAL_EASING,
          fill: 'backwards',
        });
        animation.pause();
        return animation;
      });
      animations.push(...chapterAnimations);
      pending.set(chapter, chapterAnimations);
      revealObserver.observe(chapter);
    }
  };

  return {
    scan,
    destroy: revert,
  };
}
