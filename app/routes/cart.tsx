import {CartForm} from '@shopify/hydrogen';
import {data, useLoaderData} from 'react-router';
import type {Route} from './+types/cart';
import {CartMain} from '~/components/CartMain';
import {getCartOrNull} from '~/lib/cart';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Clara Mendes | Cart'}];
};

export async function loader({context}: Route.LoaderArgs) {
  return {
    cart: await getCartOrNull(context.cart),
  };
}

export async function action({request, context}: Route.ActionArgs) {
  const {cart} = context;
  const formData = await request.formData();
  const {action, inputs} = CartForm.getFormInput(formData);

  if (!action) {
    throw new Error('No cart action was submitted.');
  }

  let status = 200;
  let result;

  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate:
      result = await cart.updateDiscountCodes(inputs.discountCodes);
      break;
    case CartForm.ACTIONS.GiftCardCodesAdd:
      result = await cart.addGiftCardCodes(inputs.giftCardCodes);
      break;
    case CartForm.ACTIONS.GiftCardCodesRemove:
      result = await cart.removeGiftCardCodes(inputs.giftCardCodes);
      break;
    case CartForm.ACTIONS.BuyerIdentityUpdate:
      result = await cart.updateBuyerIdentity(inputs.buyerIdentity);
      break;
    default:
      throw new Error(`${action} is not a supported cart action.`);
  }

  const cartResult = result?.cart;
  const headers = cartResult?.id ? cart.setCartId(cartResult.id) : new Headers();
  const redirectTo = formData.get('redirectTo');

  if (typeof redirectTo === 'string') {
    status = 303;
    headers.set('Location', redirectTo);
  }

  return data(
    {
      cart: cartResult,
      errors: result?.errors,
      warnings: result?.warnings,
    },
    {status, headers},
  );
}

export default function Cart() {
  const {cart} = useLoaderData<typeof loader>();

  return (
    <div className="cart-page">
      <header className="page-hero compact-hero">
        <p className="eyebrow">Cart</p>
        <h1>Your current edit</h1>
        <p>
          Review your pieces, apply codes, and continue to secure checkout.
        </p>
      </header>

      <CartMain cart={cart} layout="page" />
    </div>
  );
}
