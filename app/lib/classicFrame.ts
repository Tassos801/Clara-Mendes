import artCatalog from '../../data/original-art-catalog.json' with {type: 'json'};

export const CLASSIC_FRAME_HANDLE = 'classic-framed-art-print-16x20';
export const CLASSIC_FRAME_PRODUCT_TYPE = 'Framed Art';
export const CLASSIC_FRAME_SIZE_LABEL = '16 × 20 in';
export const UNFRAMED_PRESENTATION_LABEL = 'Unframed';
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

type SelectedOption = {name: string; value: string};

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
  selectedOptions: SelectedOption[] = [],
) {
  return getClassicFrameArtworkByTitle(
    selectedOptions.find(
      (option) => option.name.trim().toLowerCase() === 'artwork',
    )?.value,
  );
}

export function isUnframedPresentation(selectedOptions: SelectedOption[] = []) {
  const presentation = selectedOptions.find(
    (option) => option.name.trim().toLowerCase() === 'presentation',
  );
  return (
    !presentation ||
    presentation.value.trim().toLowerCase() ===
      UNFRAMED_PRESENTATION_LABEL.toLowerCase()
  );
}

export function getUnframedPresentationRedirectPath(requestUrl: string) {
  const url = new URL(requestUrl);
  const presentationEntries = [...url.searchParams.entries()].filter(
    ([name]) => name.trim().toLowerCase() === 'presentation',
  );
  const selectedPresentation = presentationEntries[0]?.[1];

  if (
    !selectedPresentation ||
    selectedPresentation.trim().toLowerCase() ===
      UNFRAMED_PRESENTATION_LABEL.toLowerCase()
  ) {
    return null;
  }

  presentationEntries.forEach(([name]) => url.searchParams.delete(name));
  url.searchParams.set('Presentation', UNFRAMED_PRESENTATION_LABEL);
  return `${url.pathname}${url.search}`;
}

export function getMatchingUnframedHandleForCartLine(
  productHandle?: string | null,
  selectedOptions: SelectedOption[] = [],
) {
  if (productHandle !== CLASSIC_FRAME_HANDLE) return null;
  return selectedClassicFrameArtwork(selectedOptions)?.printHandle ?? null;
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

export function selectAccurateClassicFrameImage<T extends ClassicFrameImage>(
  images: Array<T | null | undefined>,
) {
  return images.find((image): image is T =>
    Boolean(image && isAccurateClassicFrameImage(image)),
  );
}

export function selectAccurateClassicFrameVariant<
  T extends {image?: ClassicFrameImage | null},
>(variants: Array<T | null | undefined>) {
  return variants.find(
    (variant): variant is T =>
      Boolean(variant?.image) && isAccurateClassicFrameImage(variant?.image),
  );
}
