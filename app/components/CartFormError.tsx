import {getCartFormErrorMessages} from '~/lib/cartFormErrors';

/**
 * The first customer-facing message from a cart action response, or nothing.
 * Every cart form (add, quantity, remove, discount, gift card) renders one of
 * these beside its control so a refused change never looks like a success.
 */
export function CartFormError({data}: {data: unknown}) {
  const [message] = getCartFormErrorMessages(data);
  if (!message) return null;

  return (
    <p className="cart-form-error" role="alert">
      {message}
    </p>
  );
}
