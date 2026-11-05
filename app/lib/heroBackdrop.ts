/**
 * The interior photograph behind the homepage and shop heroes.
 *
 * Oxygen serves files from public/ through its image service, which passes
 * plain sRGB JPEGs through untouched but re-encodes WebP (and ICC-tagged
 * JPEGs) into larger full-size JPEGs. So the backdrop ships as three
 * compressed JPEGs: phones get the 1700 px file, desktops 1920 px, and
 * screens that need more pixels (high density or very wide) 2560 px.
 */
export const HERO_BACKDROP = {
  mobile: '/images/backdrops/hero-interior-mobile.jpg',
  desktop: '/images/backdrops/hero-interior-1920.jpg',
  large: '/images/backdrops/hero-interior.jpg',
} as const;

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
