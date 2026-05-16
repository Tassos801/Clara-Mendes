const SWIPE_OPEN_THRESHOLD = 72;
const SWIPE_MAX_OFFSET = 96;
const SWIPE_VERTICAL_TOLERANCE = 16;

type SwipePointInput = {
  currentX: number;
  currentY: number;
  startX: number;
  startY: number;
};

export type SwipeIntent = {
  direction: 'left' | 'right' | 'vertical';
  offset: number;
  shouldOpen: boolean;
};

export function getSwipeIntent({
  currentX,
  currentY,
  startX,
  startY,
}: SwipePointInput): SwipeIntent {
  const deltaX = currentX - startX;
  const deltaY = currentY - startY;

  if (
    Math.abs(deltaY) > SWIPE_VERTICAL_TOLERANCE &&
    Math.abs(deltaY) >= Math.abs(deltaX)
  ) {
    return {direction: 'vertical', offset: 0, shouldOpen: false};
  }

  if (deltaX >= 0) {
    return {direction: 'right', offset: 0, shouldOpen: false};
  }

  const offset = Math.max(-SWIPE_MAX_OFFSET, deltaX);

  return {
    direction: 'left',
    offset,
    shouldOpen: Math.abs(offset) >= SWIPE_OPEN_THRESHOLD,
  };
}
