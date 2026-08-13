import {
  cartAttributesSignature,
  hasMarketingCartAttributes,
  isMarketingCartCleanupResponseSuccessful,
  removeMarketingCartAttributes,
  type CartAttributeInput,
} from './marketingAttribution.ts';

type CartSnapshot = {
  attributes?: Array<{key?: string | null; value?: string | null}>;
  id?: string;
};

type CartCleanupResult = {
  cart?: CartSnapshot | null;
  errors?: unknown[];
  userErrors?: unknown[];
  warnings?: unknown[];
};

type CartCleanupClient = {
  get: () => Promise<CartSnapshot | null>;
  updateAttributes: (
    attributes: CartAttributeInput[],
  ) => Promise<CartCleanupResult>;
};

export async function cleanMarketingCartAttributes({
  cart,
  expectedSourceSignature,
}: {
  cart: CartCleanupClient;
  expectedSourceSignature: string;
}) {
  const currentCart = await cart.get();
  const currentAttributes = currentCart?.attributes;

  if (!currentCart || !Array.isArray(currentAttributes)) {
    return {
      payload: {cart: currentCart, reason: 'cart_unavailable' as const},
      status: 409,
    };
  }

  if (cartAttributesSignature(currentAttributes) !== expectedSourceSignature) {
    return {
      payload: {cart: currentCart, reason: 'stale_cart' as const},
      status: 409,
    };
  }

  if (!hasMarketingCartAttributes(currentAttributes)) {
    return {payload: {cart: currentCart}, status: 200};
  }

  const result = await cart.updateAttributes(
    removeMarketingCartAttributes(currentAttributes),
  );
  const payload = {
    cart: result?.cart ?? currentCart,
    errors: result?.errors,
    userErrors: result?.userErrors,
    warnings: result?.warnings,
  };

  return {
    payload,
    status: isMarketingCartCleanupResponseSuccessful(true, payload) ? 200 : 422,
  };
}
