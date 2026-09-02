const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * Opacity for an element that fades in over `fade` frames at the start of a
 * span of `duration` frames and fades out over `fade` frames at its end.
 */
export const fadeInOut = (frame: number, duration: number, fade: number): number =>
  Math.min(clamp01(frame / fade), clamp01((duration - frame) / fade));
