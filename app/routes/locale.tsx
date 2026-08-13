import {data, redirect} from 'react-router';
import type {Route} from './+types/locale';
import {applyMarketSelection} from '~/lib/markets.server';
import {isLocalPath} from '~/lib/redirect';

export async function loader() {
  return redirect('/');
}

export async function action({request, context}: Route.ActionArgs) {
  const formData = await request.formData();
  const selection = await applyMarketSelection({
    cart: context.cart,
    country: formData.get('country'),
    session: context.session,
  });

  if (!selection.ok) {
    return data({error: selection.error}, {status: selection.status});
  }

  const cartId = selection.result.cart?.id;
  const headers = cartId ? context.cart.setCartId(cartId) : new Headers();
  headers.append('Set-Cookie', await context.session.commit());

  const redirectTo = formData.get('redirectTo');
  const destination =
    typeof redirectTo === 'string' && isLocalPath(redirectTo)
      ? redirectTo
      : '/';

  return redirect(destination, {status: 303, headers});
}
