import {data} from 'react-router';
import type {Route} from './+types/api.cart-attribution-cleanup';
import {cleanMarketingCartAttributes} from '~/lib/marketingCartCleanup.server';

const MAX_SIGNATURE_LENGTH = 20_000;

export async function loader() {
  return data({ok: false, error: 'Method Not Allowed'}, {status: 405});
}

export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return data({ok: false, error: 'Method Not Allowed'}, {status: 405});
  }

  const formData = await request.formData();
  const sourceSignature = formData.get('sourceSignature');
  if (
    typeof sourceSignature !== 'string' ||
    !sourceSignature ||
    sourceSignature.length > MAX_SIGNATURE_LENGTH
  ) {
    return data({ok: false, error: 'Invalid cart signature.'}, {status: 400});
  }

  try {
    const result = await cleanMarketingCartAttributes({
      cart: context.cart,
      expectedSourceSignature: sourceSignature,
    });
    const cartId = result.payload.cart?.id;
    const headers = cartId ? context.cart.setCartId(cartId) : new Headers();

    return data(result.payload, {headers, status: result.status});
  } catch (error) {
    console.error('Unable to remove declined marketing attribution.', error);
    return data(
      {ok: false, error: 'Unable to update cart privacy attributes.'},
      {status: 500},
    );
  }
}
