export type PrintSizeKey = '8x10' | '16x20' | '20x24';

export type GalleryImage = {
  altText?: string | null;
  url: string;
};

export const PRINT_SIZE_SPECS = Object.freeze({
  '8x10': Object.freeze({
    centimeters: '20.3 × 25.4 cm',
    heightInches: 10,
    key: '8x10' as const,
    label: '8 × 10 in',
    widthInches: 8,
  }),
  '16x20': Object.freeze({
    centimeters: '40.6 × 50.8 cm',
    heightInches: 20,
    key: '16x20' as const,
    label: '16 × 20 in',
    widthInches: 16,
  }),
  '20x24': Object.freeze({
    centimeters: '50.8 × 61 cm',
    heightInches: 24,
    key: '20x24' as const,
    label: '20 × 24 in',
    widthInches: 20,
  }),
});

export function selectedPrintSize(
  selectedOptions: Array<{name: string; value: string}> = [],
) {
  const value = selectedOptions.find(
    (option) => option.name.toLowerCase() === 'size',
  )?.value;
  if (/20\s*[×x]\s*24/i.test(value ?? '')) {
    return PRINT_SIZE_SPECS['20x24'];
  }
  if (/16\s*[×x]\s*20/i.test(value ?? '')) {
    return PRINT_SIZE_SPECS['16x20'];
  }
  return PRINT_SIZE_SPECS['8x10'];
}

function roomMockupSize(image: GalleryImage): PrintSizeKey | null {
  const identity = `${image.url} ${image.altText ?? ''}`.toLowerCase();
  const isRoomMockup =
    identity.includes('-room-') ||
    (identity.includes('unframed') &&
      (identity.includes('sage wall') || identity.includes('sage green wall')));

  if (!isRoomMockup) return null;
  if (/20(?:x|\s*(?:by|×)\s*)24/.test(identity)) return '20x24';
  if (/16(?:x|\s*(?:by|×)\s*)20/.test(identity)) return '16x20';
  return '8x10';
}

export function filterGalleryImagesForSize(
  images: GalleryImage[],
  size: PrintSizeKey,
  isArtPrint: boolean,
) {
  if (!isArtPrint) return images;
  return images.filter((image) => {
    const mockupSize = roomMockupSize(image);
    return mockupSize === null || mockupSize === size;
  });
}

export function printScaleGeometry(size: PrintSizeKey) {
  const spec = PRINT_SIZE_SPECS[size];
  const unitsPerInch = 3.5;
  return {
    ...spec,
    height: spec.heightInches * unitsPerInch,
    width: spec.widthInches * unitsPerInch,
  };
}
