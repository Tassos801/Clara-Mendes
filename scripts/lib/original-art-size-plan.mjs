import path from 'node:path';

export const BASE_SIZE = Object.freeze({
  key: '8x10',
  label: '8 × 10 in',
  legacyPrice: '29.00',
  price: '29.99',
  skuSuffix: '8X10',
});

export const LARGE_SIZE = Object.freeze({
  assetHeight: 6000,
  assetWidth: 4800,
  key: '16x20',
  label: '16 × 20 in',
  price: '39.99',
  prodigiSku: 'ART-FAP-EMA-16X20',
  skuSuffix: '16X20',
});

export const BIGGER_SIZE = Object.freeze({
  assetHeight: 7200,
  assetWidth: 6000,
  key: '20x24',
  label: '20 × 24 in',
  price: '49.99',
  prodigiSku: 'GLOBAL-FAP-20X24',
  skuSuffix: '20X24',
});

export const EXPANSION_SIZES = Object.freeze([LARGE_SIZE, BIGGER_SIZE]);
export const ALL_SIZES = Object.freeze([BASE_SIZE, ...EXPANSION_SIZES]);

const CURRENT_SIZE_COPY = 'Unframed 8 × 10 inch portrait print';
const TWO_SIZE_COPY =
  'Unframed portrait print in 8 × 10 and 16 × 20 inch sizes';
const MULTI_SIZE_COPY =
  'Unframed portrait print in 8 × 10, 16 × 20, and 20 × 24 inch sizes';

export function normalizePrice(value) {
  const text = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw new Error(`Invalid price: ${text || 'missing'}`);
  }

  const amount = Number(text);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Price must be greater than zero: ${text}`);
  }

  return amount.toFixed(2);
}

export function expectedSku(item, size = LARGE_SIZE) {
  return `${item.skuPrefix}-${size.skuSuffix}`;
}

export function assetFileName(item, size) {
  const sourceStem = path.basename(item.image, path.extname(item.image));
  return `${sourceStem}-${size.key}-300dpi.jpg`;
}

export function largeAssetFileName(item) {
  return assetFileName(item, LARGE_SIZE);
}

export function expansionSizeForKey(key) {
  return EXPANSION_SIZES.find((size) => size.key === key);
}

export function variantForSize(product, label) {
  return (product?.variants?.nodes ?? []).find((variant) =>
    (variant.selectedOptions ?? []).some(
      (option) => option.name === 'Size' && option.value === label,
    ),
  );
}

export function inspectOriginalArtProduct(
  product,
  item,
  {
    allowLegacyBasePrice = false,
    requiredActiveExpansionSizes = [],
    requiredExpansionSizes = [],
  } = {},
) {
  const issues = [];
  const baseVariant = variantForSize(product, BASE_SIZE.label);
  const largeVariant = variantForSize(product, LARGE_SIZE.label);
  const biggerVariant = variantForSize(product, BIGGER_SIZE.label);
  const sizeOption = (product?.options ?? []).find(
    (option) => option.name === 'Size',
  );

  if (!product) {
    return {
      baseVariant,
      biggerVariant,
      issues: ['missing from Shopify'],
      largeVariant,
    };
  }
  if (product.status !== 'ACTIVE') {
    issues.push(`status is ${product.status}, expected ACTIVE`);
  }
  if (!sizeOption) {
    issues.push('Size option is missing');
  }
  if (!baseVariant) {
    issues.push(`${BASE_SIZE.label} variant is missing`);
  } else {
    if (baseVariant.sku !== expectedSku(item, BASE_SIZE)) {
      issues.push(
        `${BASE_SIZE.label} SKU is ${baseVariant.sku || 'missing'}, expected ${expectedSku(item, BASE_SIZE)}`,
      );
    }
    const basePriceIsApproved = baseVariant.price === BASE_SIZE.price;
    const basePriceIsAllowedLegacy =
      allowLegacyBasePrice && baseVariant.price === BASE_SIZE.legacyPrice;
    if (!basePriceIsApproved && !basePriceIsAllowedLegacy) {
      issues.push(
        `${BASE_SIZE.label} price is ${baseVariant.price}, expected ${BASE_SIZE.price}`,
      );
    }
    if (baseVariant.inventoryItem?.tracked !== false) {
      issues.push(`${BASE_SIZE.label} inventory tracking changed`);
    }
    if (baseVariant.inventoryItem?.requiresShipping !== true) {
      issues.push(`${BASE_SIZE.label} no longer requires shipping`);
    }
  }

  for (const [size, variant] of [
    [LARGE_SIZE, largeVariant],
    [BIGGER_SIZE, biggerVariant],
  ]) {
    const isRequired = [
      ...requiredExpansionSizes,
      ...requiredActiveExpansionSizes,
    ].some((required) => required.key === size.key);
    if (!variant) {
      if (isRequired) {
        issues.push(`${size.label} variant is missing`);
      }
      continue;
    }
    if (variant.sku !== expectedSku(item, size)) {
      issues.push(
        `${size.label} SKU is ${variant.sku || 'missing'}, expected ${expectedSku(item, size)}`,
      );
    }
    if (variant.price !== size.price) {
      issues.push(
        `${size.label} price is ${variant.price}, expected ${size.price}`,
      );
    }
    if (variant.inventoryPolicy !== 'DENY') {
      issues.push(`${size.label} inventory policy is not DENY`);
    }
    if (variant.inventoryItem?.requiresShipping !== true) {
      issues.push(`${size.label} does not require shipping`);
    }
    if (
      requiredActiveExpansionSizes.some(
        (required) => required.key === size.key,
      ) &&
      releaseState(variant) !== 'ACTIVE'
    ) {
      issues.push(`${size.label} must be ACTIVE`);
    }
  }

  return {baseVariant, biggerVariant, issues, largeVariant};
}

export function expectedOriginalArtMediaCount(sizes = ALL_SIZES) {
  // Flat artwork + one clean sofa scene and two sage-wall scenes per size.
  return 1 + sizes.length * 3;
}

export function sizesThrough(targetSize) {
  const targetIndex = ALL_SIZES.findIndex(
    (size) => size.key === targetSize.key,
  );
  if (targetIndex < 0) {
    throw new Error(`Unknown target size: ${targetSize.key}`);
  }
  return ALL_SIZES.slice(0, targetIndex + 1);
}

export function releaseState(largeVariant) {
  if (!largeVariant) return 'MISSING';
  if (
    largeVariant.inventoryItem?.tracked === true &&
    largeVariant.inventoryQuantity === 0 &&
    largeVariant.availableForSale === false
  ) {
    return 'STAGED';
  }
  if (
    largeVariant.inventoryItem?.tracked === false &&
    largeVariant.availableForSale === true
  ) {
    return 'ACTIVE';
  }
  return 'INVALID';
}

export function multiSizeDescription(
  descriptionHtml,
  targetSize = BIGGER_SIZE,
) {
  const html = String(descriptionHtml ?? '');
  if (html.includes(MULTI_SIZE_COPY)) {
    return {changed: false, html};
  }
  const targetCopy =
    targetSize.key === LARGE_SIZE.key
      ? TWO_SIZE_COPY
      : targetSize.key === BIGGER_SIZE.key
        ? MULTI_SIZE_COPY
        : null;
  if (!targetCopy) {
    throw new Error(`Unsupported description size: ${targetSize.key}`);
  }
  if (html.includes(targetCopy)) {
    return {changed: false, html};
  }
  const existingCopy =
    targetSize.key === BIGGER_SIZE.key && html.includes(TWO_SIZE_COPY)
      ? TWO_SIZE_COPY
      : html.includes(CURRENT_SIZE_COPY)
        ? CURRENT_SIZE_COPY
        : null;
  if (!existingCopy) {
    throw new Error(
      'Product description does not contain the expected current size copy.',
    );
  }

  return {
    changed: true,
    html: html.replace(existingCopy, targetCopy),
  };
}
