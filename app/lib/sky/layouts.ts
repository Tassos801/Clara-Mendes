/**
 * Page geometry for each print layout. Every value is in points for the
 * given sheet and already multiplied by `scale` (sheet width / 576), so
 * both print sizes share the same proportions.
 */
import {maxTextWidth} from './fit.ts';
import type {SkyLayoutId} from './params.ts';
import type {SkyLayout} from './projection.ts';

export type SkyRingStyle = 'plain' | 'compass';

export type SkyPageLayout = SkyLayout & {
  id: SkyLayoutId;
  /** 'plain' = double horizon ring only; 'compass' = adds the tick/numeral ring. */
  ring: SkyRingStyle;
  /** Font size of the N/E/S/W letters. */
  cardinalSize: number;
  /**
   * How far the cardinal letters sit outside the disc. scene.ts places the
   * baselines from this: N at r + offset − 2·scale above the centre, S at
   * r + offset + 5·scale below, E/W at r + offset + scale to the side.
   * Classic (offset 11, scale 1) reproduces the old fixed 9 / 16 / 12.
   */
  cardinalOffset: number;
};

type Proportions = {
  radius: (width: number, height: number) => number;
  cy: number;
  titleY: number;
  subtitleY: number;
  creditY: number;
  titleSize: number;
  subtitleSize: number;
  creditSize: number;
  ring: SkyRingStyle;
  cardinalSize: number;
  cardinalOffset: number;
};

const PROPORTIONS: Record<SkyLayoutId, Proportions> = {
  classic: {
    radius: (w, h) => Math.min(w * 0.4, h * 0.32),
    cy: 0.4,
    titleY: 0.79,
    subtitleY: 0.835,
    creditY: 0.95,
    titleSize: 30,
    subtitleSize: 9.5,
    creditSize: 7,
    ring: 'plain',
    cardinalSize: 7,
    cardinalOffset: 11,
  },
  compass: {
    radius: (w, h) => Math.min(w * 0.36, h * 0.288),
    cy: 0.4,
    titleY: 0.79,
    subtitleY: 0.835,
    creditY: 0.95,
    titleSize: 30,
    subtitleSize: 9.5,
    creditSize: 7,
    ring: 'compass',
    cardinalSize: 10,
    cardinalOffset: 30,
  },
  full: {
    radius: (w, h) => Math.min(w * 0.46, h * 0.368),
    cy: 0.415,
    titleY: 0.855,
    subtitleY: 0.895,
    creditY: 0.962,
    titleSize: 26,
    subtitleSize: 9,
    creditSize: 6.5,
    ring: 'plain',
    cardinalSize: 7,
    cardinalOffset: 11,
  },
  minimal: {
    radius: (w, h) => Math.min(w * 0.3, h * 0.24),
    cy: 0.39,
    titleY: 0.72,
    subtitleY: 0.76,
    creditY: 0.95,
    titleSize: 24,
    subtitleSize: 8.5,
    creditSize: 6.5,
    ring: 'plain',
    cardinalSize: 6.5,
    cardinalOffset: 10,
  },
};

export function skyPageLayout(
  id: SkyLayoutId,
  width: number,
  height: number,
): SkyPageLayout {
  const p = PROPORTIONS[id];
  const scale = width / 576;
  return {
    id,
    width,
    height,
    scale,
    maxTextWidth: maxTextWidth(width),
    disc: {cx: width / 2, cy: height * p.cy, r: p.radius(width, height)},
    titleY: height * p.titleY,
    subtitleY: height * p.subtitleY,
    creditY: height * p.creditY,
    titleSize: p.titleSize * scale,
    subtitleSize: p.subtitleSize * scale,
    creditSize: p.creditSize * scale,
    ring: p.ring,
    cardinalSize: p.cardinalSize * scale,
    cardinalOffset: p.cardinalOffset * scale,
  };
}
