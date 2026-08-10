import path from 'node:path';

export const BASE_SIZE = Object.freeze({
  label: '8 × 10 in',
  legacyPrice: '29.00',
  price: '29.99',
  skuSuffix: '8X10',
});

export const LARGE_SIZE = Object.freeze({
  label: '16 × 20 in',
  price: '39.99',
  prodigiSku: 'ART-FAP-EMA-16X20',
  skuSuffix: '16X20',
});

const CURRENT_SIZE_COPY = 'Unframed 8 × 10 inch portrait print';
const MULTI_SIZE_COPY =
  'Unframed portrait print in 8 × 10 and 16 × 20 inch sizes';

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

export function largeAssetFileName(item) {
  const sourceStem = path.basename(item.image, path.extname(item.image));
  return `${sourceStem}-16x20-300dpi.jpg`;
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
  {allowLegacyBasePrice = false} = {},
) {
  const issues = [];
  const baseVariant = variantForSize(product, BASE_SIZE.label);
  const largeVariant = variantForSize(product, LARGE_SIZE.label);
  const sizeOption = (product?.options ?? []).find(
    (option) => option.name === 'Size',
  );

  if (!product) {
    return {baseVariant, issues: ['missing from Shopify'], largeVariant};
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

  if (largeVariant) {
    if (largeVariant.sku !== expectedSku(item)) {
      issues.push(
        `${LARGE_SIZE.label} SKU is ${largeVariant.sku || 'missing'}, expected ${expectedSku(item)}`,
      );
    }
    if (largeVariant.price !== LARGE_SIZE.price) {
      issues.push(
        `${LARGE_SIZE.label} price is ${largeVariant.price}, expected ${LARGE_SIZE.price}`,
      );
    }
    if (largeVariant.inventoryPolicy !== 'DENY') {
      issues.push(`${LARGE_SIZE.label} inventory policy is not DENY`);
    }
    if (largeVariant.inventoryItem?.requiresShipping !== true) {
      issues.push(`${LARGE_SIZE.label} does not require shipping`);
    }
  }

  return {baseVariant, issues, largeVariant};
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

export function multiSizeDescription(descriptionHtml) {
  const html = String(descriptionHtml ?? '');
  if (html.includes(MULTI_SIZE_COPY)) {
    return {changed: false, html};
  }
  if (!html.includes(CURRENT_SIZE_COPY)) {
    throw new Error(
      'Product description does not contain the expected 8 × 10 size copy.',
    );
  }

  return {
    changed: true,
    html: html.replace(CURRENT_SIZE_COPY, MULTI_SIZE_COPY),
  };
}
