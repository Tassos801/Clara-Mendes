import {curatedImageSrcForWidth, hasCuratedImageCopies} from './curatedProducts.ts';

type ImageLoaderParams = {
  src?: string;
  width?: number;
  height?: number;
  crop?: string;
};

const PLACEHOLDER_ORIGIN = 'https://placeholder.shopify.com';

/**
 * The loader for Hydrogen's <Image> wherever a branded curated photo can
 * stand in for a Shopify image. Shopify CDN images keep the default
 * behaviour (width/height/crop query parameters the CDN resizes by);
 * curated images under /images/curated/ have no resizing CDN, so each
 * srcset width maps to the nearest pre-written copy instead.
 */
export function storefrontImageLoader({
  src,
  width,
  height,
  crop,
}: ImageLoaderParams) {
  if (!src) return '';
  if (hasCuratedImageCopies(src)) return curatedImageSrcForWidth(src, width);

  const url = new URL(src, PLACEHOLDER_ORIGIN);
  if (width) url.searchParams.append('width', Math.round(width).toString());
  if (height) url.searchParams.append('height', Math.round(height).toString());
  if (crop) url.searchParams.append('crop', crop);
  return url.href.replace(PLACEHOLDER_ORIGIN, '');
}
