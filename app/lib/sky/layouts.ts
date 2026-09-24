/**
 * Page geometry for each print layout. Every value is in points for the
 * given sheet and already multiplied by `scale` (sheet width / 576), so
 * both print sizes share the same proportions.
 */
import {maxTextWidth} from './fit.ts';
import type {SkyLayoutId} from './params.ts';
import type {Disc, SkyLayout} from './projection.ts';
import {TITLE_LINE_HEIGHT} from './style.ts';

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
   * Classic reproduces the old 9/16/12; E/W baseline moves 0.01·scale
   * (cardinalSize × 0.43 = 3.01·scale vs. the old fixed 3·scale).
   */
  cardinalOffset: number;
  /**
   * Largest size a two-line title may take so it stays in the band between
   * the S cardinal letter and the subtitle (fitTitle's maxTwoLineSize).
   */
  titleTwoLineMaxSize: number;
};

/**
 * EB Garamond's vertical reach in em, measured with fontkit from the glyph
 * bounding boxes in public/fonts: italic ascenders top out at 0.709 (b d h
 * k l; italic capitals at 0.676), italic descenders at 0.290 (f g j y), and
 * regular capitals at 0.694 (T; the rest 0.653–0.686).
 */
const TITLE_ASCENT = 0.72;
const TITLE_DESCENT = 0.29;
const SUBTITLE_CAP_HEIGHT = 0.7;
/** Air between a title line and the S letter or the subtitle, × scale. */
const TITLE_CLEARANCE = 3;

/** Baseline of the S cardinal letter (scene.ts draws it here). */
export function southCardinalY(disc: Disc, cardinalOffset: number, scale: number) {
  return disc.cy + disc.r + cardinalOffset + 5 * scale;
}

/**
 * Two title lines straddle titleY, so the size is capped twice: the top
 * line's ascenders must stay below the S letter's baseline, and the bottom
 * line's descenders above the subtitle's capitals, each with a clearance.
 * The subtitle only ever shrinks (and its second line goes below), so its
 * design size is the worst case.
 */
function titleTwoLineMaxSize({
  titleY,
  subtitleY,
  subtitleSize,
  southY,
  scale,
}: {
  titleY: number;
  subtitleY: number;
  subtitleSize: number;
  southY: number;
  scale: number;
}) {
  const half = TITLE_LINE_HEIGHT / 2;
  const above = titleY - (southY + TITLE_CLEARANCE * scale);
  const below =
    subtitleY - SUBTITLE_CAP_HEIGHT * subtitleSize - TITLE_CLEARANCE * scale - titleY;
  return Math.min(above / (half + TITLE_ASCENT), below / (half + TITLE_DESCENT));
}

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
  const disc = {cx: width / 2, cy: height * p.cy, r: p.radius(width, height)};
  const cardinalOffset = p.cardinalOffset * scale;
  const titleY = height * p.titleY;
  const subtitleY = height * p.subtitleY;
  const subtitleSize = p.subtitleSize * scale;
  return {
    id,
    width,
    height,
    scale,
    maxTextWidth: maxTextWidth(width),
    disc,
    titleY,
    subtitleY,
    creditY: height * p.creditY,
    titleSize: p.titleSize * scale,
    subtitleSize,
    creditSize: p.creditSize * scale,
    ring: p.ring,
    cardinalSize: p.cardinalSize * scale,
    cardinalOffset,
    titleTwoLineMaxSize: titleTwoLineMaxSize({
      titleY,
      subtitleY,
      subtitleSize,
      southY: southCardinalY(disc, cardinalOffset, scale),
      scale,
    }),
  };
}
