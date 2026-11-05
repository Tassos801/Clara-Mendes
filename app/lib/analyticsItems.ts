import {
  normalizeGoogleCommerceItem,
  type GoogleCommerceItem,
} from './googleCommerce.ts';

// Hydrogen analytics payloads -> commerce items, shared by the Google Tag
// Manager (GoogleCommerceAnalytics) and Meta pixel (MetaPixelAnalytics)
// integrations. `item_id` is the variant SKU, the id the Merchant Center and
// Meta catalogs use, so ad events match catalog products.

export function normalizeAnalyticsProducts(products: unknown) {
  if (!Array.isArray(products)) return [];

  return products
    .map((product) =>
      normalizeGoogleCommerceItem({
        brand: (product as {vendor?: unknown}).vendor,
        category: (product as {productType?: unknown}).productType,
        name: (product as {title?: unknown}).title,
        price: (product as {price?: unknown}).price,
        productGid: (product as {id?: unknown}).id,
        quantity: (product as {quantity?: unknown}).quantity,
        sku: (product as {sku?: unknown}).sku,
        variantGid: (product as {variantId?: unknown}).variantId,
        variantName: (product as {variantTitle?: unknown}).variantTitle,
      }),
    )
    .filter((item): item is GoogleCommerceItem => Boolean(item));
}

export function normalizeCartItems(cart: unknown) {
  const nodes =
    (cart as {lines?: {nodes?: unknown[]}} | null)?.lines?.nodes ?? [];

  return nodes
    .map((line) => normalizeCartLine(line))
    .filter((item): item is GoogleCommerceItem => Boolean(item));
}

export function normalizeCartLine(line: unknown, quantityOverride?: number) {
  if (!line || typeof line !== 'object') return null;

  const typedLine = line as {
    merchandise?: {
      id?: string;
      price?: {amount?: string; currencyCode?: string};
      product?: {
        id?: string;
        productType?: string;
        title?: string;
        vendor?: string;
      };
      sku?: string;
      title?: string;
    };
    quantity?: number;
  };
  const merchandise = typedLine.merchandise;
  if (!merchandise) return null;

  return normalizeGoogleCommerceItem({
    brand: merchandise.product?.vendor,
    category: merchandise.product?.productType,
    name: merchandise.product?.title ?? merchandise.title,
    price: merchandise.price,
    productGid: merchandise.product?.id,
    quantity: quantityOverride ?? typedLine.quantity,
    sku: merchandise.sku,
    variantGid: merchandise.id,
    variantName: merchandise.title,
  });
}

export function cartCurrency(cart: unknown, shopCurrency?: string) {
  const currency = (
    cart as {
      cost?: {totalAmount?: {currencyCode?: string}};
    } | null
  )?.cost?.totalAmount?.currencyCode;

  return String(currency ?? shopCurrency ?? 'EUR');
}
