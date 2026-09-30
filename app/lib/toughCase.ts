/**
 * Art Tough Phone Case: one Shopify product, Artwork × Phone Model
 * (24 × 40 variants). Paid case lines go to Prodigi through the orders/paid
 * webhook rather than Prodigi's Shopify app, so the whole mapping lives in
 * data/art-tough-phone-case.json: variant SKU `<artwork prefix>-TC-<phone
 * code>` → Prodigi SKU + attributes (read back from GET /v4.0/products) +
 * the artwork's print file, which Prodigi centre-crops to each device.
 */
// Relative import keeps this module loadable by the plain-Node scripts.
import manifest from '../../data/art-tough-phone-case.json' with {type: 'json'};

export const TOUGH_CASE_HANDLE = manifest.handle;

/** Artworks the homepage teaser shows, one per temperament, in order. */
export const TOUGH_CASE_TEASER_ARTWORKS = [
  'Midnight Garden II',
  'Sunlit Mosaic II',
  'Neo Deco I',
  'Neon After Rain',
  'Fern in Shadow',
];
export const TOUGH_CASE_ARTWORK_OPTION = 'Artwork';
export const TOUGH_CASE_PHONE_OPTION = 'Phone Model';

export type ToughCaseDesign = {
  title: string;
  skuPrefix: string;
  sourceHandle: string;
  /** Storefront path of the 4:5 print file Prodigi fills each case with. */
  printFilePath: string;
};

export type ToughCasePhone = {
  label: string;
  code: string;
  brand: 'Apple' | 'Google' | 'Samsung';
  prodigiSku: string;
  prodigiAttributes: Record<string, string>;
};

export type ToughCaseVariant = {
  design: ToughCaseDesign;
  phone: ToughCasePhone;
};

/** "midnight-garden-ii-art-print" → "midnight-garden-02". */
export function toughCaseArtworkSlug(sourceHandle: string) {
  const roman: Record<string, string> = {i: '01', ii: '02', iii: '03'};
  return sourceHandle
    .replace(/-art-print$/, '')
    .replace(/-(i|ii|iii)$/, (_, numeral: string) => `-${roman[numeral]}`);
}

export const TOUGH_CASE_DESIGNS: ToughCaseDesign[] = manifest.designs.map(
  (design) => ({
    title: design.title,
    skuPrefix: design.skuPrefix,
    sourceHandle: design.sourceHandle,
    printFilePath: `/print-files/tough-case/${toughCaseArtworkSlug(design.sourceHandle)}.jpg`,
  }),
);

export const TOUGH_CASE_PHONES: ToughCasePhone[] = manifest.phones.map(
  (phone) => {
    const attributes = phone.providerAttributes as Record<string, string>;
    return {
      label: phone.label,
      code: phone.code,
      brand: attributes.brand as ToughCasePhone['brand'],
      prodigiSku: phone.providerSku,
      prodigiAttributes: attributes,
    };
  },
);

const VARIANTS_BY_SKU = new Map<string, ToughCaseVariant>(
  TOUGH_CASE_DESIGNS.flatMap((design) =>
    TOUGH_CASE_PHONES.map(
      (phone) =>
        [`${design.skuPrefix}-TC-${phone.code}`, {design, phone}] as const,
    ),
  ),
);

export function toughCaseVariantForSku(
  sku: string | null | undefined,
): ToughCaseVariant | null {
  if (!sku) return null;
  return VARIANTS_BY_SKU.get(sku.trim().toUpperCase()) ?? null;
}

export function toughCasePrintUrl(origin: string, design: ToughCaseDesign) {
  return `${origin}${design.printFilePath}`;
}
