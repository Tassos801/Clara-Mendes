// Relative imports keep this module loadable by the plain-Node test runner.
import {christmasSeason, storeToday} from './christmasDelivery.ts';

/**
 * The interior photograph behind the homepage and shop heroes.
 *
 * Oxygen serves files from public/ through its image service, which passes
 * plain sRGB JPEGs through untouched but re-encodes WebP (and ICC-tagged
 * JPEGs) into larger full-size JPEGs. So the backdrop ships as three
 * compressed JPEGs: phones get the 1700 px file, desktops 1920 px, and
 * screens that need more pixels (high density or very wide) 2560 px.
 *
 * Christmas: the same room dressed for the season (fir tree, gifts,
 * garland, knit throw), an AI edit of the interior photo made with Codex,
 * kept to the original's neutral grey-white walls (the hero filters add
 * sepia, so a warm photo turns amber). Browsers keep public/ files for a
 * year, so a new picture always gets a new file name. It shows while
 * christmasSeason (1 November to 25 December, the store's date) is open,
 * and the interior photo the rest of the year.
 */
const INTERIOR_BACKDROP = {
  mobile: '/images/backdrops/hero-interior-mobile.jpg',
  desktop: '/images/backdrops/hero-interior-1920.jpg',
  large: '/images/backdrops/hero-interior.jpg',
} as const;

const CHRISTMAS_BACKDROP = {
  mobile: '/images/backdrops/hero-christmas-neutral-mobile.jpg',
  desktop: '/images/backdrops/hero-christmas-neutral-1920.jpg',
  large: '/images/backdrops/hero-christmas-neutral.jpg',
} as const;

export type HeroBackdrop = Record<'mobile' | 'desktop' | 'large', string>;

/** The backdrop files for a store date (YYYY-MM-DD). */
export function heroBackdropFor(today: string): HeroBackdrop {
  return christmasSeason(today) === 'open'
    ? CHRISTMAS_BACKDROP
    : INTERIOR_BACKDROP;
}

/**
 * The backdrop for the date this module loads on. The route stylesheets and
 * preload links read it at module scope, so it changes season when the
 * server's module is next loaded (a deploy or a fresh worker), not mid-run.
 */
export const HERO_BACKDROP: HeroBackdrop = heroBackdropFor(storeToday());

/**
 * One query per file, shared by the route stylesheets and the preload
 * links so the browser preloads exactly the file the CSS paints. The three
 * never match together.
 */
export const HERO_BACKDROP_MEDIA = {
  mobile: '(max-width: 720px)',
  desktop:
    '(min-width: 721px) and (max-width: 1999px) and (max-resolution: 1.39dppx)',
  large: '(min-width: 721px) and (min-resolution: 1.4dppx), (min-width: 2000px)',
} as const;

/**
 * The hero is a CSS background, which browsers find only after the route's
 * stylesheet parses; preloading the matching file moves LCP earlier. High
 * priority, because Chrome otherwise holds an image preload back until the
 * render-blocking stylesheets have arrived. (Lowercase: React 18 does not
 * know `fetchPriority`.)
 */
export function heroBackdropPreloads() {
  return (['mobile', 'desktop', 'large'] as const).map((size) => ({
    as: 'image',
    fetchpriority: 'high',
    href: HERO_BACKDROP[size],
    media: HERO_BACKDROP_MEDIA[size],
    rel: 'preload',
    type: 'image/jpeg',
  }));
}
