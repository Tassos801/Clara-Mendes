// Relative imports keep this module loadable by the plain-Node test runner.
import {christmasPicturesSeason} from './christmasDelivery.ts';

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
 * year, so a new picture always gets a new file name.
 */
export type HeroBackdrop = Record<'mobile' | 'desktop' | 'large', string>;

export const INTERIOR_BACKDROP: HeroBackdrop = {
  mobile: '/images/backdrops/hero-interior-mobile.jpg',
  desktop: '/images/backdrops/hero-interior-1920.jpg',
  large: '/images/backdrops/hero-interior.jpg',
};

export const CHRISTMAS_BACKDROP: HeroBackdrop = {
  mobile: '/images/backdrops/hero-christmas-neutral-mobile.jpg',
  desktop: '/images/backdrops/hero-christmas-neutral-1920.jpg',
  large: '/images/backdrops/hero-christmas-neutral.jpg',
};

/**
 * The backdrop for a store date (YYYY-MM-DD): Christmas from 1 November to
 * 6 January (christmasPicturesSeason), the interior the rest of the year.
 * Chosen per request in the root loader (requestToday), never at module
 * scope: on Oxygen a module's top level has no usable clock.
 */
export function heroBackdropFor(today: string): HeroBackdrop {
  return christmasPicturesSeason(today) === 'open'
    ? CHRISTMAS_BACKDROP
    : INTERIOR_BACKDROP;
}

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
 * What the route stylesheets paint. The root sets these variables from the
 * request's backdrop (heroBackdropVars), so the stylesheets themselves stay
 * the same all year.
 */
export const HERO_BACKDROP = {
  mobile: 'var(--hero-backdrop-mobile)',
  desktop: 'var(--hero-backdrop-desktop)',
  large: 'var(--hero-backdrop-large)',
} as const;

export function heroBackdropVars(backdrop: HeroBackdrop) {
  return `:root{--hero-backdrop-mobile:url(${backdrop.mobile});--hero-backdrop-desktop:url(${backdrop.desktop});--hero-backdrop-large:url(${backdrop.large})}`;
}

/**
 * The hero is a CSS background, which browsers find only after the route's
 * stylesheet parses; preloading the matching file moves LCP earlier. High
 * priority, because Chrome otherwise holds an image preload back until the
 * render-blocking stylesheets have arrived. (Lowercase: React 18 does not
 * know `fetchPriority`.)
 */
export function heroBackdropPreloads(backdrop: HeroBackdrop) {
  return (['mobile', 'desktop', 'large'] as const).map((size) => ({
    as: 'image',
    fetchpriority: 'high',
    href: backdrop[size],
    media: HERO_BACKDROP_MEDIA[size],
    rel: 'preload',
    type: 'image/jpeg',
  }));
}

/**
 * The preloads as meta descriptors (a route's `meta` sees loader data,
 * `links` does not), for the backdrop the root loader chose.
 */
export function heroBackdropMeta(
  matches: ReadonlyArray<{id: string; data?: unknown} | undefined>,
) {
  const root = matches.find((match) => match?.id === 'root')?.data as
    | {heroBackdrop?: HeroBackdrop}
    | undefined;
  return heroBackdropPreloads(root?.heroBackdrop ?? INTERIOR_BACKDROP).map(
    (link) => ({tagName: 'link', ...link}),
  );
}
