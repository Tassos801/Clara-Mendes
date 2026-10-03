import catalog from '../../data/curated-products.json' with {type: 'json'};

export type CuratedProduct = {
  handle: string;
  productType: string;
  released: boolean;
  shopifyProductId: string | null;
  shopifyVariantId: string | null;
  shippingProfileId: string | null;
  fulfillmentVerified: boolean;
  supplier: string;
  supplierSku: string;
  description: string;
  details: string;
  shipping: string;
  verifiedDeliveryCountries: string[];
};

export const CURATED_PRODUCTS: readonly CuratedProduct[] = catalog;

export function getCuratedProduct(
  handle?: string | null,
  products: readonly CuratedProduct[] = CURATED_PRODUCTS,
) {
  const key = handle?.trim().toLowerCase();
  return products.find((product) => product.handle === key) ?? null;
}

/** A supplier import or a release typo alone cannot make a product sellable. */
export function releasedCuratedProducts(
  products: readonly CuratedProduct[] = CURATED_PRODUCTS,
) {
  return products.filter(
    (product) =>
      product.released &&
      product.shopifyProductId?.startsWith('gid://shopify/Product/') &&
      product.shopifyVariantId?.startsWith('gid://shopify/ProductVariant/') &&
      product.shippingProfileId?.startsWith('gid://shopify/DeliveryProfile/') &&
      product.fulfillmentVerified &&
      Boolean(product.supplierSku) &&
      Boolean(product.shipping) &&
      product.verifiedDeliveryCountries.length > 0,
  );
}

export function releasedCuratedProductTypes(
  products: readonly CuratedProduct[] = CURATED_PRODUCTS,
) {
  return [
    ...new Set(releasedCuratedProducts(products).map((p) => p.productType)),
  ];
}

export function isUnreleasedCuratedHandle(handle?: string | null) {
  const product = getCuratedProduct(handle);
  return Boolean(product && !releasedCuratedProducts().includes(product));
}
