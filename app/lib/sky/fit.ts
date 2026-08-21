/**
 * Text fitting shared by the SVG preview and the PDF renderer. Each caller
 * supplies its own measurer (canvas measureText in the browser, fontkit
 * metrics in the PDF); the rules are identical, so a title that fits on
 * screen fits on paper.
 */
export type MeasureText = (text: string, size: number) => number;

/** Smallest size we shrink to, as a fraction of the design size. */
export const SKY_TEXT_MIN_SCALE = 0.4;

/** Below this scale a one-line subtitle is split into two lines instead. */
export const SKY_SUBTITLE_SPLIT_SCALE = 0.8;

/** Horizontal room for text: the sheet minus 8 % margins each side. */
export function maxTextWidth(sheetWidth: number) {
  return sheetWidth * 0.84;
}

/**
 * Canvas and PDF metrics differ from the final rasteriser by a percent or
 * two (kerning, hinting), so fitting aims 3 % inside the allowed width.
 */
export const FIT_SAFETY = 0.97;

export function fitTextSize(
  text: string,
  baseSize: number,
  maxWidth: number,
  measure: MeasureText,
  minScale = SKY_TEXT_MIN_SCALE,
) {
  if (!text) return baseSize;
  const target = maxWidth * FIT_SAFETY;
  const width = measure(text, baseSize);
  if (!Number.isFinite(width) || width <= target) return baseSize;
  return Math.max(baseSize * minScale, (baseSize * target) / width);
}

/** Width of tracked text: glyph advances plus tracking between glyphs. */
export function trackedWidth(
  text: string,
  size: number,
  tracking: number,
  measure: MeasureText,
) {
  const chars = [...text];
  return measure(text, size) + tracking * Math.max(0, chars.length - 1);
}

export type FittedSubtitle = {lines: string[]; size: number};

/**
 * The subtitle is "PLACE · DATE · COORDS". Short ones stay on one line and
 * shrink a little if needed; long place names move to their own line so the
 * type never becomes unreadably small.
 */
export function fitSubtitle(
  parts: {place: string; rest: string},
  baseSize: number,
  maxWidth: number,
  measure: MeasureText,
): FittedSubtitle {
  const joined = `${parts.place} · ${parts.rest}`;
  const single = fitTextSize(joined, baseSize, maxWidth, measure, SKY_SUBTITLE_SPLIT_SCALE);
  if (measure(joined, single) <= maxWidth * FIT_SAFETY) return {lines: [joined], size: single};
  const size = Math.min(
    fitTextSize(parts.place, baseSize, maxWidth, measure),
    fitTextSize(parts.rest, baseSize, maxWidth, measure),
  );
  return {lines: [parts.place, parts.rest], size};
}

export type FittedTitle = {lines: string[]; size: number};

/** Below this scale a title is broken at the space nearest its middle. */
export const SKY_TITLE_SPLIT_SCALE = 0.6;

/** Absolute floor for a title line that cannot be split (no spaces). */
export const SKY_TITLE_FLOOR_SCALE = 0.3;

function splitNearMiddle(text: string): [string, string] | null {
  const middle = text.length / 2;
  let bestIndex = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ' && (bestIndex < 0 || Math.abs(i - middle) < Math.abs(bestIndex - middle))) {
      bestIndex = i;
    }
  }
  if (bestIndex <= 0 || bestIndex >= text.length - 1) return null;
  return [text.slice(0, bestIndex).trim(), text.slice(bestIndex + 1).trim()];
}

/**
 * Titles keep one line while that needs no more than a 40 % shrink; longer
 * ones break into two lines at the middle. A single unbreakable word may
 * shrink to 30 % so nothing ever runs off the sheet.
 */
export function fitTitle(
  text: string,
  baseSize: number,
  maxWidth: number,
  measure: MeasureText,
): FittedTitle {
  if (!text) return {lines: [], size: baseSize};
  const single = fitTextSize(text, baseSize, maxWidth, measure, SKY_TITLE_SPLIT_SCALE);
  if (measure(text, single) <= maxWidth * FIT_SAFETY) return {lines: [text], size: single};
  const halves = splitNearMiddle(text);
  if (!halves) {
    return {lines: [text], size: fitTextSize(text, baseSize, maxWidth, measure, SKY_TITLE_FLOOR_SCALE)};
  }
  const size = Math.min(
    fitTextSize(halves[0], baseSize, maxWidth, measure, SKY_TITLE_FLOOR_SCALE),
    fitTextSize(halves[1], baseSize, maxWidth, measure, SKY_TITLE_FLOOR_SCALE),
  );
  return {lines: halves, size};
}
