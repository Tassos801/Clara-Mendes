import {Easing, interpolate} from 'remotion';

/** The site's "crisp entrance" curve — strong ease-out, no overshoot. */
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export const eased = (
  frame: number,
  fromFrame: number,
  toFrame: number,
  fromValue: number,
  toValue: number,
): number =>
  interpolate(frame, [fromFrame, toFrame], [fromValue, toValue], {
    easing: EASE,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
