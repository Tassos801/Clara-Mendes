import type {CartApiQueryFragment} from 'storefrontapi.generated';

type CartReader = {
  get: () => Promise<CartApiQueryFragment | null>;
};

export async function getCartOrNull(cart: CartReader) {
  try {
    return await cart.get();
  } catch (error) {
    console.warn('Unable to load cart; rendering an empty cart instead.', error);
    return null;
  }
}
