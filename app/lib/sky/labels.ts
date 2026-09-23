/**
 * Greedy constellation-label placement: brightest-rank constellations
 * first, each label kept only if its box stays inside the disc and clears
 * every label (and avoided box, e.g. the Moon or a planet) placed before
 * it. Widths are estimated (tracked capitals ≈ 0.66 em each) — good enough
 * for spacing; the renderers draw the real glyphs horizontally centred on
 * x, with y as the text baseline.
 */
import type {Disc} from './projection.ts';

/** x is the horizontal centre; y is the text baseline. */
export type SceneLabel = {x: number; y: number; text: string};
export type LabelBox = {x0: number; y0: number; x1: number; y1: number};
export type LabelCandidate = SceneLabel & {rank: number};

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
  for (const c of ordered) {
    const width = c.text.length * size * 0.66 + tracking * (c.text.length - 1);
    const box: LabelBox = {
      x0: c.x - width / 2,
      x1: c.x + width / 2,
      y0: c.y - size * 0.9,
      y1: c.y + size * 0.3,
    };
    const corners = [
      [box.x0, box.y0],
      [box.x1, box.y0],
      [box.x0, box.y1],
      [box.x1, box.y1],
    ];
    const inside = corners.every(
      ([x, y]) => Math.hypot(x - disc.cx, y - disc.cy) <= disc.r * 0.97,
    );
    if (!inside || taken.some((t) => overlaps(t, box))) continue;
    taken.push(box);
    placed.push({x: c.x, y: c.y, text: c.text});
  }
  return placed;
}
