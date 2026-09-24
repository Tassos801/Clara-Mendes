/**
 * Greedy constellation-label placement: brightest-rank constellations
 * first, each label kept only if its box stays inside the disc and clears
 * every label (and avoided box, e.g. the Moon or a planet) placed before
 * it. Widths use EB Garamond Regular's real advance widths (labelMetrics.ts)
 * plus the tracking, exactly as the print draws them glyph by glyph, and
 * each box carries LABEL_PADDING_EM of air on both sides so neighbours never
 * touch. The renderers draw the glyphs horizontally centred on x, with y as
 * the text baseline.
 */
import {LABEL_ADVANCE_EM} from './labelMetrics.ts';
import type {Disc} from './projection.ts';

/** x is the horizontal centre; y is the text baseline. */
export type SceneLabel = {x: number; y: number; text: string};
export type LabelBox = {x0: number; y0: number; x1: number; y1: number};
export type LabelCandidate = SceneLabel & {rank: number};

/** Advance for a character missing from the table: a little over the average capital (0.66 em). */
const UNKNOWN_ADVANCE_EM = 0.7;

/** Air kept on each side of a label, in em of the label size. */
export const LABEL_PADDING_EM = 0.25;

/** Printed width of a tracked label: glyph advances plus tracking between glyphs. */
export function labelWidth(text: string, size: number, tracking: number) {
  const chars = [...text];
  const advances = chars.reduce(
    (w, c) => w + (LABEL_ADVANCE_EM[c] ?? UNKNOWN_ADVANCE_EM) * size,
    0,
  );
  return advances + tracking * Math.max(0, chars.length - 1);
}

const overlaps = (a: LabelBox, b: LabelBox) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

export function placeLabels(
  candidates: LabelCandidate[],
  {
    disc,
    size,
    tracking,
    avoid,
  }: {disc: Disc; size: number; tracking: number; avoid: LabelBox[]},
): SceneLabel[] {
  const taken = [...avoid];
  const placed: SceneLabel[] = [];
  const ordered = [...candidates].sort(
    (a, b) => a.rank - b.rank || a.text.localeCompare(b.text),
  );
  const pad = size * LABEL_PADDING_EM;
  for (const c of ordered) {
    const half = labelWidth(c.text, size, tracking) / 2;
    const y0 = c.y - size * 0.9;
    const y1 = c.y + size * 0.3;
    // The ink must stay inside the disc; the padded box keeps neighbours apart.
    const corners = [
      [c.x - half, y0],
      [c.x + half, y0],
      [c.x - half, y1],
      [c.x + half, y1],
    ];
    const inside = corners.every(
      ([x, y]) => Math.hypot(x - disc.cx, y - disc.cy) <= disc.r * 0.97,
    );
    const box: LabelBox = {x0: c.x - half - pad, x1: c.x + half + pad, y0, y1};
    if (!inside || taken.some((t) => overlaps(t, box))) continue;
    taken.push(box);
    placed.push({x: c.x, y: c.y, text: c.text});
  }
  return placed;
}
