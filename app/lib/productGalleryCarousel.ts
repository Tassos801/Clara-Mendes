export function clampCarouselIndex(index: number, total: number) {
  if (!Number.isFinite(index) || total <= 0) return 0;

  return Math.min(total - 1, Math.max(0, Math.round(index)));
}

const ZOOM_SWIPE_THRESHOLD = 56;

export function cycleCarouselIndex(index: number, delta: number, total: number) {
  if (total <= 0) return 0;

  const base = clampCarouselIndex(index, total);
  const step = Number.isFinite(delta) ? Math.trunc(delta) : 0;
  return (((base + step) % total) + total) % total;
}

export function resolveZoomSwipe({
  deltaX,
  deltaY,
}: {
  deltaX: number;
  deltaY: number;
}): -1 | 0 | 1 {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return 0;
  if (Math.abs(deltaX) < ZOOM_SWIPE_THRESHOLD) return 0;
  if (Math.abs(deltaX) <= Math.abs(deltaY)) return 0;

  return deltaX < 0 ? 1 : -1;
}

export function nearestCarouselIndex(
  slideOffsets: number[],
  scrollLeft: number,
) {
  if (slideOffsets.length === 0) return 0;

  const target = Number.isFinite(scrollLeft) ? scrollLeft : 0;
  return slideOffsets.reduce((nearest, offset, index) => {
    const nearestDistance = Math.abs(slideOffsets[nearest] - target);
    const distance = Math.abs(offset - target);
    return distance < nearestDistance ? index : nearest;
  }, 0);
}
