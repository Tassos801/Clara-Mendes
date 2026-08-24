export const CLASSIC_FRAME_HANDLE = 'classic-framed-art-print-16x20';
export const CLASSIC_FRAME_PRODUCT_TYPE = 'Frames';
export const CLASSIC_FRAME_IMAGE_PATH =
  '/images/art-product-extensions/classic-frame/frame-only-natural.png';
export const CLASSIC_FRAME_SIZE_LABELS = [
  '8 × 10 in',
  '16 × 20 in',
  '20 × 24 in',
] as const;
export const UNFRAMED_PRESENTATION_LABEL = 'Unframed';
export const UNFRAMED_PRINT_SIZE_LABELS = CLASSIC_FRAME_SIZE_LABELS;

export type ClassicFrameSizeLabel = (typeof CLASSIC_FRAME_SIZE_LABELS)[number];

type ClassicFrameImage = {
  altText?: string | null;
  url: string;
};

type SelectedOption = {name: string; value: string};

export function isClassicFrameSizeLabel(
  value?: string | null,
): value is ClassicFrameSizeLabel {
  const normalized = value?.trim().toLowerCase();
  return CLASSIC_FRAME_SIZE_LABELS.some(
    (size) => size.toLowerCase() === normalized,
  );
}

export function buildClassicFrameUrl(size?: string | null) {
  if (!isClassicFrameSizeLabel(size)) {
    return `/products/${CLASSIC_FRAME_HANDLE}`;
  }

  const params = new URLSearchParams({Size: size});
  return `/products/${CLASSIC_FRAME_HANDLE}?${params.toString()}`;
}

export function selectedClassicFrameSize(
  selectedOptions: SelectedOption[] = [],
): ClassicFrameSizeLabel | null {
  const size = selectedOptions.find(
    (option) => option.name.trim().toLowerCase() === 'size',
  )?.value;
  return isClassicFrameSizeLabel(size) ? size : null;
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

/**
 * Frame imagery must show the empty supplier frame and state that the product
 * is frame-only. This prevents the retired artwork-in-frame mockups from ever
 * returning to cards, recommendations, or the product gallery.
 */
export function isAccurateClassicFrameImage(image?: ClassicFrameImage | null) {
  const identity = `${image?.url ?? ''} ${image?.altText ?? ''}`.toLowerCase();
  const isNaturalClassicFrame =
    identity.includes('natural classic frame') ||
    identity.includes('frame-only-natural');
  const isFrameOnly =
    identity.includes('frame only') ||
    identity.includes('frame-only') ||
    identity.includes('artwork not included');
  return isNaturalClassicFrame && isFrameOnly;
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
