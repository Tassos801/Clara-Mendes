export const HOME_EDITORIAL_COPY = {
  body: 'A composed room begins with one strong piece. The edit pairs Clara Mendes artwork with linen, timber, and quiet everyday objects so every product enters a world, not just a grid.',
  ctaHref: '/collections/all',
  ctaLabel: 'Explore the collection',
  eyebrow: 'The living edit',
  footer: ['Original art', 'Tactile materials', 'Everyday living'],
  title: 'Original art, made to live with.',
} as const;

export type HomeEditorialItem = {
  alt: string;
  caption: string;
  href: string;
  id: string;
  image: {
    height: number;
    url: string;
    width: number;
  };
};

/**
 * The living edit is a styled story, not a product grid: three in-situ
 * scenes shot for this section (artwork with linen, timber, and quiet
 * objects), each opening its capsule's landing page. Raw print files
 * stay in the shop grids — substituting them here made the section
 * repeat the grid it sits between, with the same capsule three times.
 */
export const HOME_EDITORIAL_ITEMS: HomeEditorialItem[] = [
  {
    alt: 'Quiet Form artwork in a walnut frame above an oat linen sofa',
    caption: 'Quiet Form in situ',
    href: '/collections/quiet-form',
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
    href: '/collections/patina-blue',
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
    href: '/collections/sunlit-mosaic',
    id: 'sunlit-mosaic-table',
    image: {
      height: 1122,
      url: '/images/home-editorial/sunlit-mosaic-table.jpg',
      width: 1402,
    },
  },
];
