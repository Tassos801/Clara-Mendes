/**
 * "Introducing Clara Mendes" — the silent brand film. Rendered from
 * `video/` and hosted on Shopify Files; only the CDN URLs live here.
 * Re-render and re-upload with `node scripts/upload-brand-film.mjs --apply`.
 * While either URL is empty the Our Story section renders nothing.
 */
export const BRAND_FILM = {
  title: 'Introducing Clara Mendes',
  durationSeconds: 45,
  width: 1920,
  height: 1080,
  videoUrl: '',
  posterUrl: '',
};

export const brandFilmIsLive = (): boolean =>
  Boolean(BRAND_FILM.videoUrl && BRAND_FILM.posterUrl);
