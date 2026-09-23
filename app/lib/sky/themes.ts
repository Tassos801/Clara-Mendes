import {SKY_THEME_LABELS, type SkyThemeId} from './params.ts';
import type {SkySizeKey} from './products.ts';

export type SkyTheme = {
  id: SkyThemeId;
  label: string;
  /** Flat fallback when the plate is unavailable. */
  background: string;
  /** Optional tint inside the horizon ring. */
  disc: string | null;
  discOpacity: number;
  star: string;
  halo: string;
  line: string;
  lineOpacity: number;
  ring: string;
  ringOpacity: number;
  moonLit: string;
  moonDark: string;
  planet: string;
  /** Richer sky (Your Sky only; First Light still uses moonLit/moonDark). */
  milkyWay: string;
  milkyWayOpacity: number;
  glow: string;
  moonFace: string;
  moonShade: string;
  moonShadeOpacity: number;
  moonEdge: string;
  grid: string;
  gridOpacity: number;
  /**
   * Ink for constellation-name labels. Named `labelColor` (not `label`) to
   * avoid colliding with the pre-existing theme display-name field above.
   */
  labelColor: string;
  labelColorOpacity: number;
  title: string;
  subtitle: string;
  credit: string;
  cardinal: string;
};

export const SKY_THEMES: Record<SkyThemeId, SkyTheme> = {
  linen: {
    id: 'linen',
    label: SKY_THEME_LABELS.linen,
    background: '#efe8dc',
    disc: '#e7dfd1',
    discOpacity: 0.55,
    star: '#26231f',
    halo: '#26231f',
    line: '#3c3831',
    lineOpacity: 0.45,
    ring: '#9c6f5d',
    ringOpacity: 0.8,
    moonLit: '#26231f',
    moonDark: '#efe8dc',
    planet: '#9c6f5d',
    milkyWay: '#8a7d6b',
    milkyWayOpacity: 0.035,
    glow: '#3c3831',
    moonFace: '#f8f3ea',
    moonShade: '#26231f',
    moonShadeOpacity: 0.2,
    moonEdge: '#26231f',
    grid: '#746f65',
    gridOpacity: 0.35,
    labelColor: '#5c564c',
    labelColorOpacity: 0.8,
    title: '#26231f',
    subtitle: '#746f65',
    credit: '#9c6f5d',
    cardinal: '#746f65',
  },
  'midnight-garden': {
    id: 'midnight-garden',
    label: SKY_THEME_LABELS['midnight-garden'],
    background: '#141b2b',
    disc: '#0e1422',
    discOpacity: 0.6,
    star: '#f1e3b8',
    halo: '#f1e3b8',
    line: '#c9b98a',
    lineOpacity: 0.4,
    ring: '#b08d57',
    ringOpacity: 0.85,
    moonLit: '#f1e3b8',
    moonDark: '#141b2b',
    planet: '#d9a066',
    milkyWay: '#e8dcc0',
    milkyWayOpacity: 0.05,
    glow: '#f1e3b8',
    moonFace: '#f4ecd8',
    moonShade: '#f1e3b8',
    moonShadeOpacity: 0.12,
    moonEdge: '#f1e3b8',
    grid: '#b7ad93',
    gridOpacity: 0.3,
    labelColor: '#cbbf9f',
    labelColorOpacity: 0.85,
    title: '#f4ecd8',
    subtitle: '#b7ad93',
    credit: '#b08d57',
    cardinal: '#b7ad93',
  },
  'quiet-form': {
    id: 'quiet-form',
    label: SKY_THEME_LABELS['quiet-form'],
    background: '#f6f2ea',
    disc: '#dfd3c3',
    discOpacity: 1,
    star: '#2b2622',
    halo: '#2b2622',
    line: '#5a4f44',
    lineOpacity: 0.4,
    ring: '#c9a58b',
    ringOpacity: 1,
    moonLit: '#2b2622',
    moonDark: '#dfd3c3',
    planet: '#a2735b',
    milkyWay: '#7a6a5a',
    milkyWayOpacity: 0.03,
    glow: '#2b2622',
    moonFace: '#fbf8f2',
    moonShade: '#2b2622',
    moonShadeOpacity: 0.2,
    moonEdge: '#2b2622',
    grid: '#7b7166',
    gridOpacity: 0.35,
    labelColor: '#5a4f44',
    labelColorOpacity: 0.8,
    title: '#2b2622',
    subtitle: '#7b7166',
    credit: '#a2735b',
    cardinal: '#7b7166',
  },
};

export const DEFAULT_SKY_THEME: SkyThemeId = 'linen';

/** Background plate: per sheet size at 300 dpi, or the browser preview. */
export function platePath(id: SkyThemeId, variant: SkySizeKey | 'preview') {
  return `/sky/plates/${id}-${variant}.jpg`;
}
