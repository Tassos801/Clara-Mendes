import type {Route} from './+types/account_.authorize';

export async function loader({context}: Route.LoaderArgs) {
  const response = await context.customerAccount.authorize();

  try {
    const customerAccessToken = await context.customerAccount.getAccessToken();
    if (customerAccessToken) {
      const result = await context.cart.updateBuyerIdentity({
        customerAccessToken,
      });
      const cartId = result?.cart?.id;
      if (cartId) {
        const cartHeaders = context.cart.setCartId(cartId);
        cartHeaders.forEach((value, key) => {
          response.headers.append(key, value);
        });
      }
    }
  } catch (error) {
    console.warn('Failed to attach customer to cart on authorize.', error);
  }

  return response;
}
