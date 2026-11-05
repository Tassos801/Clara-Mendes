/**
 * Oxygen serves files from public/ through Shopify's image service at full
 * size: plain sRGB JPEGs and PNGs pass through as they are, but WebP and
 * ICC-tagged JPEGs are re-encoded into larger files (transparent WebP into
 * PNG) and `?width=` is ignored. So the storefront shows hand-sized copies
 * that scripts/write-storefront-images.mjs writes beside each source
 * (`name.w460.jpg`); the sources stay for the scripts, feeds and social
 * posts that use them.
 */
export function publicImageCopy(
  src: string,
  width: number,
  format: 'jpg' | 'png' = 'jpg',
) {
  return src.replace(/\.(webp|jpe?g|png)$/, `.w${width}.${format}`);
}
