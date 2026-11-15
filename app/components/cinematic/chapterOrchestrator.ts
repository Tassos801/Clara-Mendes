/**
 * Scroll orchestration for the cinematic experience.
 *
 * Scans the DOM for `[data-chapter]` sections and reveals their
 * `[data-reveal]` children with a staggered rise/fade, once per page visit. Built on IntersectionObserver and the Web Animations API,
 * so it needs no scroll library and no layout reads while scrolling.
 * Framework-free so it can be re-run on every client-side navigation and
 * fully reverted in between.
 */
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

export function createChapterOrchestrator(): ChapterOrchestrator {
  let revealObserver: IntersectionObserver | null = null;
  let animations: Animation[] = [];

  const revert = () => {
    revealObserver?.disconnect();
    revealObserver = null;
    for (const animation of animations) animation.cancel();
    animations = [];
  };

  const scan = ({revealOnScreen = true}: ScanOptions = {}) => {
    revert();

    const chapters = Array.from(
      document.querySelectorAll<HTMLElement>('[data-chapter]'),
    );
    if (chapters.length === 0) return;

    const pending = new Map<Element, Animation[]>();

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
