import type {SkyThemeId} from './params.ts';
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
  title: string;
  subtitle: string;
  credit: string;
  cardinal: string;
};

export const SKY_THEMES: Record<SkyThemeId, SkyTheme> = {
  linen: {
    id: 'linen',
    label: 'Linen',
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
    title: '#26231f',
    subtitle: '#746f65',
    credit: '#9c6f5d',
    cardinal: '#746f65',
  },
  'midnight-garden': {
    id: 'midnight-garden',
    label: 'Midnight Garden',
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
    title: '#f4ecd8',
    subtitle: '#b7ad93',
    credit: '#b08d57',
    cardinal: '#b7ad93',
  },
  'quiet-form': {
    id: 'quiet-form',
    label: 'Quiet Form',
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
