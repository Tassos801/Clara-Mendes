/**
 * The homepage hero's sharp spotlight on touch screens. Desktops move it
 * with the mouse (app/routes/_index.tsx); phones and tablets have no hover,
 * so there it drifts slowly over the room on its own and follows a finger
 * on the hero, drifting again a moment after the finger lifts.
 *
 * Positions are percentages of the hero box, as the CSS mask reads them.
 */

/** Spotlight radius on touch screens (desktops use 350 px). */
export const TOUCH_SPOTLIGHT_RADIUS_PX = 170;

/** How long a lifted finger keeps the spotlight in place. */
export const TOUCH_RESUME_DELAY_MS = 2000;

/** Share of the remaining distance covered per frame (smooth follow). */
export const SPOTLIGHT_EASE = 0.06;

const X_PERIOD_MS = 19000;
const Y_PERIOD_MS = 13000;

/**
 * The drift path at `elapsedMs`: a slow Lissajous loop over the middle of
 * the room (the armchair and the tree on a phone's crop), never at the
 * edges and never repeating a straight line.
 */
export function spotlightDriftPoint(elapsedMs: number): {x: number; y: number} {
  const x = 52 + 24 * Math.sin((2 * Math.PI * elapsedMs) / X_PERIOD_MS);
  const y = 52 + 16 * Math.sin((2 * Math.PI * elapsedMs) / Y_PERIOD_MS + 1);
  return {x, y};
}

/** A touch point as hero percentages, clamped to the hero. */
export function touchPointInHero(
  clientX: number,
  clientY: number,
  hero: {left: number; top: number; width: number; height: number},
): {x: number; y: number} {
  const clamp = (value: number) => Math.min(100, Math.max(0, value));
  return {
    x: clamp(((clientX - hero.left) / hero.width) * 100),
    y: clamp(((clientY - hero.top) / hero.height) * 100),
  };
}
