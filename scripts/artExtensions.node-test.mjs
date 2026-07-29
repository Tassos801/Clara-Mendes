import assert from 'node:assert/strict';
import extensionCatalog from '../data/art-product-extensions.json' with {type: 'json'};
import {
  buildPhoneCaseUrl,
  formatPhoneCaseDeviceList,
  PHONE_CASE_DEVICE_LABELS,
  PHONE_CASE_HANDLE,
  PHONE_CASE_PRICE,
} from '../app/lib/artExtensions.ts';
import {ORIGINAL_ART_COLLECTIONS} from '../app/lib/catalogFilters.ts';

// The staged handle must exist in the extension catalog as the device-option
// family — a typo here would make the release flip silently do nothing.
const phoneCaseFamily = extensionCatalog.families.find(
  (family) => family.handle === PHONE_CASE_HANDLE,
);
assert.ok(phoneCaseFamily, `${PHONE_CASE_HANDLE} missing from extension data`);
assert.equal(phoneCaseFamily.deviceOptions, true);
assert.equal(phoneCaseFamily.productType, 'Phone Cases');
assert.equal(PHONE_CASE_PRICE, phoneCaseFamily.price);

// Device labels mirror the catalog exactly (these are the Shopify "Device"
// option values the sync writes; deep links break if they drift).
assert.deepEqual(
  PHONE_CASE_DEVICE_LABELS,
  extensionCatalog.deviceVariants.map((device) => device.label),
);
assert.equal(PHONE_CASE_DEVICE_LABELS.length, 4);
for (const label of PHONE_CASE_DEVICE_LABELS) {
  assert.ok(
    label.startsWith('iPhone 15'),
    `unexpected device label: ${label}`,
  );
}

// The "Artwork" option values are the capsule titles: the sync builds
// variants from capsuleOrder, and the storefront deep-links with capsule
// titles from ORIGINAL_ART_COLLECTIONS. Both sources must agree.
assert.deepEqual(
  extensionCatalog.capsuleOrder,
  ORIGINAL_ART_COLLECTIONS.map((collection) => collection.title),
);

// Deep links preselect a full Artwork × Device variant —
// selectedOrFirstAvailableVariant ignores partial matches and would fall
// back to the product's first variant, losing the capsule context.
assert.equal(
  buildPhoneCaseUrl('Quiet Form'),
  '/products/art-snap-phone-case?Artwork=Quiet+Form&Device=iPhone+15',
);
assert.equal(
  buildPhoneCaseUrl('Midnight Garden'),
  '/products/art-snap-phone-case?Artwork=Midnight+Garden&Device=iPhone+15',
);

// Fit copy lists every supported device.
assert.equal(
  formatPhoneCaseDeviceList(),
  'iPhone 15, iPhone 15 Pro, iPhone 15 Plus and iPhone 15 Pro Max',
);
