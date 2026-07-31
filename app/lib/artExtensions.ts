// Relative imports keep this module loadable by the plain-Node test runner,
// which cannot resolve the Vite "~" alias.
import extensionCatalog from '../../data/art-product-extensions.json' with {type: 'json'};
import {PHONE_CASE_HANDLE} from './catalogFilters.ts';

export {PHONE_CASE_HANDLE};

const phoneCaseFamily = extensionCatalog.families.find(
  (family) => family.handle === PHONE_CASE_HANDLE,
);

/**
 * Device labels exactly as the extension sync writes them as Shopify
 * "Device" option values, in catalog order. The first entry is the default
 * device used when deep-linking a full variant preselection.
 */
export const PHONE_CASE_DEVICE_LABELS: string[] =
  extensionCatalog.deviceVariants.map((device) => device.label);

/** Provisional retail price from the extension catalog, e.g. "34.00". */
export const PHONE_CASE_PRICE: string | null = phoneCaseFamily?.price ?? null;

/** "iPhone 15, iPhone 15 Pro, … and iPhone 15 Pro Max" for fit copy. */
export function formatPhoneCaseDeviceList() {
  const labels = PHONE_CASE_DEVICE_LABELS;
  if (labels.length <= 1) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/**
 * Case PDP deep link preselecting a full variant for the given artwork.
 * Both options must be present: `selectedOrFirstAvailableVariant` only
 * honours a complete match and otherwise falls back to the product's first
 * variant, which would silently lose the capsule the buyer came from.
 */
export function buildPhoneCaseUrl(artworkTitle: string) {
  const params = new URLSearchParams({
    Artwork: artworkTitle,
    Device: PHONE_CASE_DEVICE_LABELS[0] ?? '',
  });
  return `/products/${PHONE_CASE_HANDLE}?${params.toString()}`;
}
