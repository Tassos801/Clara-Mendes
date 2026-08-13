import {Analytics, CartForm} from '@shopify/hydrogen';
import {data, useLoaderData} from 'react-router';
import type {Route} from './+types/cart';
import {CartMain} from '~/components/CartMain';
import {getCartOrNull} from '~/lib/cart';
import {
  marketingAttributionToCartAttributes,
  MARKETING_ATTRIBUTION_INPUT_NAME,
  mergeCartAttributes,
} from '~/lib/marketingAttribution';
import {isLocalPath} from '~/lib/redirect';

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
    case CartForm.ACTIONS.AttributesUpdateInput:
      result = await cart.updateAttributes(inputs.attributes);
      break;
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines);
      result = await updateCartAttribution({
        cart,
        formData,
        result,
      });
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate: {
      const formDiscountCode = formData.get('discountCode');
      const discountCodes = [
        ...(typeof formDiscountCode === 'string' && formDiscountCode
          ? [formDiscountCode]
          : []),
        ...((inputs.discountCodes as string[] | undefined) ?? []),
      ];
      result = await cart.updateDiscountCodes(discountCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesAdd: {
      const formGiftCardCode = formData.get('giftCardCode');
      const giftCardCodes =
        typeof formGiftCardCode === 'string' && formGiftCardCode
          ? [formGiftCardCode]
          : ((inputs.giftCardCodes as string[] | undefined) ?? []);
      result = await cart.addGiftCardCodes(giftCardCodes);
      break;
    }
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
  const headers = cartResult?.id
    ? cart.setCartId(cartResult.id)
    : new Headers();
  const redirectTo = formData.get('redirectTo');

  if (typeof redirectTo === 'string' && isLocalPath(redirectTo)) {
    status = 303;
    headers.set('Location', redirectTo);
  }

  return data(
    {
      cart: cartResult,
      errors: result?.errors,
      userErrors: result?.userErrors,
      warnings: result?.warnings,
    },
    {status, headers},
  );
}

async function updateCartAttribution({
  cart,
  formData,
  result,
}: {
  cart: Route.ActionArgs['context']['cart'];
  formData: FormData;
  result: any;
}) {
  const cartResult = result?.cart;
  const attributionAttributes = marketingAttributionToCartAttributes(
    formData.get(MARKETING_ATTRIBUTION_INPUT_NAME),
  );

  if (!cartResult?.id || attributionAttributes.length === 0) {
    return result;
  }

  const attributes = mergeCartAttributes(
    cartResult.attributes,
    attributionAttributes,
  );

  try {
    const updatedResult = await cart.updateAttributes(attributes, {
      cartId: cartResult.id,
    });

    if (updatedResult?.errors?.length || updatedResult?.userErrors?.length) {
      console.warn('Unable to persist marketing attribution cart attributes.', {
        errors: updatedResult.errors,
        userErrors: updatedResult.userErrors,
      });
      return result;
    }

    return updatedResult?.cart
      ? {
          ...result,
          cart: updatedResult.cart,
          warnings: [
            ...((result?.warnings as unknown[]) ?? []),
            ...((updatedResult?.warnings as unknown[]) ?? []),
          ],
        }
      : result;
  } catch (error) {
    console.warn('Unable to update cart attribution attributes.', error);
    return result;
  }
}

export default function Cart() {
  const {cart} = useLoaderData<typeof loader>();

  return (
    <div className="cart-page">
      <Analytics.CartView />
      <header className="page-hero compact-hero">
        <p className="eyebrow">Cart</p>
        <h1>Your current edit</h1>
        <p>Review your pieces, apply codes, and continue to secure checkout.</p>
      </header>

      <CartMain cart={cart} layout="page" />
    </div>
  );
}
