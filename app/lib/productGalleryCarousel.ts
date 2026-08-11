export function clampCarouselIndex(index: number, total: number) {
  if (!Number.isFinite(index) || total <= 0) return 0;

  return Math.min(total - 1, Math.max(0, Math.round(index)));
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
