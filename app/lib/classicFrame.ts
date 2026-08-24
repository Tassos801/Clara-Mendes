import artCatalog from '../../data/original-art-catalog.json' with {type: 'json'};

export const CLASSIC_FRAME_HANDLE = 'classic-framed-art-print-16x20';
export const CLASSIC_FRAME_PRODUCT_TYPE = 'Framed Art';
export const CLASSIC_FRAME_SIZE_LABEL = '16 × 20 in';
export const UNFRAMED_PRINT_SIZE_LABELS = [
  '8 × 10 in',
  '16 × 20 in',
  '20 × 24 in',
] as const;

export type ClassicFrameArtwork = {
  artworkTitle: string;
  image: string;
  printHandle: string;
  printTitle: string;
};

type ClassicFrameImage = {
  altText?: string | null;
  url: string;
};

/**
 * Prodigi's framed family currently uses artwork number I from each capsule.
 * Keeping this mapping catalog-derived prevents a same-capsule but different
 * artwork from being presented as the framed version of a print.
 */
export const CLASSIC_FRAME_ARTWORKS: ClassicFrameArtwork[] = artCatalog
  .filter((item) => item.sequence === 1)
  .map((item) => ({
    artworkTitle: item.capsule,
    image: item.image,
    printHandle: item.handle,
    printTitle: item.shortTitle,
  }));

export function buildClassicFrameUrl(artworkTitle: string) {
  const params = new URLSearchParams({Artwork: artworkTitle});
  return `/products/${CLASSIC_FRAME_HANDLE}?${params.toString()}`;
}

export function getClassicFrameArtworkForPrint(
  handle?: string | null,
): ClassicFrameArtwork | null {
  const normalized = handle?.trim().toLowerCase();
  if (!normalized) return null;
  return (
    CLASSIC_FRAME_ARTWORKS.find(
      (artwork) => artwork.printHandle === normalized,
    ) ?? null
  );
}

export function getClassicFrameArtworkByTitle(
  artworkTitle?: string | null,
): ClassicFrameArtwork | null {
  const normalized = artworkTitle?.trim().toLowerCase();
  if (!normalized) return null;
  return (
    CLASSIC_FRAME_ARTWORKS.find(
      (artwork) => artwork.artworkTitle.toLowerCase() === normalized,
    ) ?? null
  );
}

export function selectedClassicFrameArtwork(
  selectedOptions: Array<{name: string; value: string}> = [],
) {
  return getClassicFrameArtworkByTitle(
    selectedOptions.find(
      (option) => option.name.trim().toLowerCase() === 'artwork',
    )?.value,
  );
}

export function isAccurateClassicFrameImage(image?: ClassicFrameImage | null) {
  const identity = `${image?.url ?? ''} ${image?.altText ?? ''}`.toLowerCase();
  return (
    identity.includes('prodigi natural classic frame') &&
    identity.includes('no mat')
  );
}

export function filterAccurateClassicFrameImages<T extends ClassicFrameImage>(
  images: T[],
) {
  return images.filter(isAccurateClassicFrameImage);
}
