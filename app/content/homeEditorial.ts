import type {ClaraCardProduct} from '~/components/ClaraProductCard';

export const HOME_EDITORIAL_COLLECTION_HANDLE = 'homepage-editorial';

export const HOME_EDITORIAL_COPY = {
  body: 'A composed room begins with one strong piece. The edit pairs Clara Mendes artwork with linen, timber, and quiet everyday objects so every product enters a world, not just a grid.',
  ctaHref: '/collections/all',
  ctaLabel: 'Explore the collection',
  eyebrow: 'The living edit',
  footer: ['Original art', 'Tactile materials', 'Everyday living'],
  title: 'Original art, made to live with.',
} as const;

type EditorialImage = {
  altText?: string | null;
  height?: number;
  url: string;
  width?: number;
};

type EditorialFallback = {
  alt: string;
  caption: string;
  id: string;
  image: EditorialImage;
};

export type HomeEditorialItem =
  | (EditorialFallback & {
      href: typeof HOME_EDITORIAL_COPY.ctaHref;
      kind: 'fallback';
    })
  | {
      alt: string;
      caption: string;
      href: string;
      id: string;
      image: EditorialImage;
      kind: 'product';
    };

const HOME_EDITORIAL_FALLBACKS: EditorialFallback[] = [
  {
    alt: 'Quiet Form artwork in a walnut frame above an oat linen sofa',
    caption: 'Quiet Form in situ',
    id: 'quiet-form-living',
    image: {
      height: 1619,
      url: '/images/home-editorial/quiet-form-living.jpg',
      width: 971,
    },
  },
  {
    alt: 'Patina Blue artwork styled with natural linen and a stoneware bowl',
    caption: 'Patina Blue detail',
    id: 'patina-blue-detail',
    image: {
      height: 1619,
      url: '/images/home-editorial/patina-blue-detail.jpg',
      width: 971,
    },
  },
  {
    alt: 'Sunlit Mosaic artwork above a pale timber table with quiet ceramic objects',
    caption: 'Sunlit Mosaic at table',
    id: 'sunlit-mosaic-table',
    image: {
      height: 1122,
      url: '/images/home-editorial/sunlit-mosaic-table.jpg',
      width: 1402,
    },
  },
];

export function buildHomeEditorialItems(
  products: ClaraCardProduct[],
): HomeEditorialItem[] {
  const productsWithImages = products
    .filter(
      (
        product,
      ): product is ClaraCardProduct & {featuredImage: EditorialImage} =>
        Boolean(product.featuredImage?.url),
    )
    .slice(0, HOME_EDITORIAL_FALLBACKS.length);

  return HOME_EDITORIAL_FALLBACKS.map((fallback, index) => {
    const product = productsWithImages[index];

    if (!product) {
      return {
        ...fallback,
        href: HOME_EDITORIAL_COPY.ctaHref,
        kind: 'fallback',
      };
    }

    return {
      alt: product.featuredImage.altText || product.title,
      caption: product.title.replace(/\s+art print$/i, ''),
      href: `/products/${product.handle}`,
      id: product.id,
      image: product.featuredImage,
      kind: 'product',
    };
  });
}
