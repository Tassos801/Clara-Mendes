import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CartLayout} from '~/components/CartMain';
import {CartForm, Money, type OptimisticCart} from '@shopify/hydrogen';
import {useEffect, useId, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import {useMarketingCheckoutUrl} from '~/hooks/useMarketingCheckoutUrl';
import {useMarketingConsent} from '~/hooks/useMarketingConsent';
import {CHECKOUT_PENDING_TIMEOUT_MS} from '~/lib/cartPresentation';
import {
  getCartFormErrorMessages,
  getInapplicableDiscountMessages,
} from '~/lib/cartFormErrors';
import {CartFormError} from './CartFormError';

type CartSummaryProps = {
  cart: OptimisticCart<CartApiQueryFragment | null>;
  layout: CartLayout;
};

/**
 * The page summary holds totals, checkout and codes. In the drawer the
 * totals and checkout are pinned in `CartCheckoutBar`, so this renders only
 * the codes, which scroll with the lines.
 */
export function CartSummary({cart, layout}: CartSummaryProps) {
  const summaryId = useId();

  if (layout === 'aside') {
    return (
      <div className="cart-summary-aside">
        <CartCodes cart={cart} />
      </div>
    );
  }

  return (
    <div aria-labelledby={summaryId} className="cart-summary-page">
      <h2 id={summaryId}>Order summary</h2>
      <CartTotals cart={cart} />
      <CartCheckoutActions cart={cart} />
      <CartCodes cart={cart} />
    </div>
  );
}

/** Subtotal and checkout, pinned to the bottom of the cart drawer. */
export function CartCheckoutBar({cart}: CartSummaryProps) {
  return (
    <div className="cart-checkout-bar">
      <CartTotals cart={cart} />
      <CartCheckoutActions cart={cart} />
    </div>
  );
}

function CartTotals({cart}: {cart: CartSummaryProps['cart']}) {
  const updating = Boolean(cart?.isOptimistic);
  const subtotal = cart?.cost?.subtotalAmount;
  const total = cart?.cost?.totalAmount;
  // An order-level code (10% off the order, say) is not part of the
  // subtotal or of any line; without this row the chip shows but the
  // saving does not.
  const discount = cartLevelDiscount(cart?.discountAllocations);
  const showTotal =
    Boolean(subtotal?.amount && total?.amount) &&
    Number(total?.amount) < Number(subtotal?.amount);

  return (
    <div className="cart-totals" aria-busy={updating || undefined}>
      <dl className="cart-subtotal">
        <dt>Subtotal</dt>
        <dd>{subtotal?.amount ? <Money data={subtotal} /> : '-'}</dd>
      </dl>
      {discount ? (
        <dl className="cart-subtotal cart-subtotal--discount">
          <dt>Discount</dt>
          <dd>
            <span aria-hidden="true">−</span>
            <span className="sr-only">minus </span>
            <Money data={discount} />
          </dd>
        </dl>
      ) : null}
      {showTotal && total ? (
        <dl className="cart-subtotal cart-subtotal--total">
          <dt>Estimated total</dt>
          <dd>
            <Money data={total} />
          </dd>
        </dl>
      ) : null}
      <p className="cart-totals-note">
        {updating
          ? 'Updating your cart…'
          : 'Shipping is calculated at checkout.'}
      </p>
    </div>
  );
}

/** The sum of the cart-level discount allocations, or null when none. */
function cartLevelDiscount(
  allocations: CartApiQueryFragment['discountAllocations'] | undefined,
) {
  const amounts = (allocations ?? [])
    .map((allocation) => allocation?.discountedAmount)
    .filter((amount) => amount && Number(amount.amount) > 0);
  if (!amounts.length || !amounts[0]) return null;
  const sum = amounts.reduce(
    (total, amount) => total + Number(amount?.amount ?? 0),
    0,
  );
  return {...amounts[0], amount: sum.toFixed(2)};
}

function CartCheckoutActions({cart}: {cart: CartSummaryProps['cart']}) {
  const checkoutUrl = cart?.checkoutUrl;
  const marketingConsent = useMarketingConsent();
  const attributedCheckoutUrl = useMarketingCheckoutUrl({
    checkoutUrl,
    consent: marketingConsent,
  });
  const [opening, setOpening] = useState(false);
  // A pending quantity or remove must reach Shopify before checkout reads
  // the cart, or checkout could open with the previous quantities.
  const updating = Boolean(cart?.isOptimistic);
  const busy = opening || updating;

  useEffect(() => {
    if (!opening) return;
    // Returning from checkout with the back button can restore this page
    // from the back/forward cache with the action still busy.
    const reset = () => setOpening(false);
    const timer = window.setTimeout(reset, CHECKOUT_PENDING_TIMEOUT_MS);
    window.addEventListener('pageshow', reset);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pageshow', reset);
    };
  }, [opening]);

  if (!checkoutUrl) return null;

  return (
    <div className="cart-checkout-actions">
      <a
        aria-busy={opening || undefined}
        aria-disabled={busy || undefined}
        className="primary-button full-width cart-checkout-button"
        href={attributedCheckoutUrl || checkoutUrl}
        onClick={(event) => {
          // A second tap while the first is still loading would start a
          // second navigation; a pending cart update must finish first.
          if (busy) {
            event.preventDefault();
            return;
          }
          setOpening(true);
        }}
        target="_self"
      >
        {opening
          ? 'Opening secure checkout…'
          : updating
            ? 'Updating cart…'
            : 'Continue to checkout'}
      </a>
    </div>
  );
}

/**
 * Discount and gift-card codes sit behind one disclosure: most shoppers do
 * not have one, and on a phone two open forms push checkout off-screen. It
 * starts open when a code is applied or was refused, so neither is hidden.
 */
function CartCodes({cart}: {cart: CartSummaryProps['cart']}) {
  const discountsHeadingId = useId();
  const discountCodeInputId = useId();
  const giftCardHeadingId = useId();
  const giftCardInputId = useId();
  const discountCodes = cart?.discountCodes;
  const giftCards = cart?.appliedGiftCards;
  const hasCodes = Boolean(discountCodes?.length || giftCards?.length);

  return (
    <details className="cart-codes" open={hasCodes || undefined}>
      <summary>
        <span>Discount or gift card</span>
        <svg aria-hidden="true" viewBox="0 0 12 12">
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </summary>
      <div className="cart-codes-body">
        <CartDiscounts
          discountCodes={discountCodes}
          discountsHeadingId={discountsHeadingId}
          discountCodeInputId={discountCodeInputId}
        />
        <CartGiftCard
          giftCardCodes={giftCards}
          giftCardHeadingId={giftCardHeadingId}
          giftCardInputId={giftCardInputId}
        />
      </div>
    </details>
  );
}

function CartDiscounts({
  discountCodes,
  discountsHeadingId,
  discountCodeInputId,
}: {
  discountCodes?: CartApiQueryFragment['discountCodes'];
  discountsHeadingId: string;
  discountCodeInputId: string;
}) {
  const discountCodeInput = useRef<HTMLInputElement>(null);
  const applyFetcher = useFetcher({key: DISCOUNT_APPLY_FETCHER_KEY});
  const allCodes = discountCodes?.map(({code}) => code) ?? [];
  const codes: string[] =
    discountCodes
      ?.filter((discount) => discount.applicable)
      ?.map(({code}) => code) || [];
  // Shopify keeps an unknown or unmet code on the cart with
  // `applicable: false` and reports no error, so the cart itself is the
  // only place the refusal shows up. Each one gets its own Remove, which
  // resubmits every other code, so a stale code never gets stuck.
  const inapplicable =
    discountCodes?.filter((discount) => discount.applicable === false) ?? [];

  useEffect(() => {
    // Clear the code only once Shopify accepted the request; a refused one
    // stays in the field beside its message so the customer can correct it.
    if (
      applyFetcher.data &&
      getCartFormErrorMessages(applyFetcher.data).length === 0 &&
      discountCodeInput.current
    ) {
      discountCodeInput.current.value = '';
    }
  }, [applyFetcher.data]);

  return (
    <section aria-label="Discounts" className="cart-code-section">
      {/* Have existing discount, display it with a remove option */}
      <dl hidden={!codes.length}>
        <div>
          <dt id={discountsHeadingId}>Discounts</dt>
          <UpdateDiscountForm>
            <div
              className="cart-discount"
              role="group"
              aria-labelledby={discountsHeadingId}
            >
              <code>{codes?.join(', ')}</code>
              <button type="submit" aria-label="Remove discount">
                Remove
              </button>
            </div>
          </UpdateDiscountForm>
        </div>
      </dl>

      {inapplicable.map((discount) => {
        const [message] = getInapplicableDiscountMessages([discount]);
        return (
          <UpdateDiscountForm
            discountCodes={allCodes.filter((code) => code !== discount.code)}
            key={discount.code}
          >
            <div className="cart-discount cart-discount--inapplicable">
              <p className="cart-form-error" role="alert">
                {message}
              </p>
              <button
                type="submit"
                aria-label={`Remove discount code ${discount.code.toUpperCase()}`}
              >
                Remove
              </button>
            </div>
          </UpdateDiscountForm>
        );
      })}

      {/* Show an input to apply a discount */}
      <UpdateDiscountForm
        discountCodes={codes}
        fetcherKey={DISCOUNT_APPLY_FETCHER_KEY}
      >
        <div className="cart-code-row">
          <label htmlFor={discountCodeInputId} className="sr-only">
            Discount code
          </label>
          <input
            autoCapitalize="characters"
            autoComplete="off"
            enterKeyHint="go"
            id={discountCodeInputId}
            type="text"
            name="discountCode"
            placeholder="Discount code"
            ref={discountCodeInput}
            spellCheck={false}
          />
          <button type="submit" aria-label="Apply discount code">
            Apply
          </button>
        </div>
      </UpdateDiscountForm>
    </section>
  );
}

const DISCOUNT_APPLY_FETCHER_KEY = 'discount-code-apply';

function UpdateDiscountForm({
  discountCodes,
  fetcherKey,
  children,
}: {
  discountCodes?: string[];
  fetcherKey?: string;
  children: React.ReactNode;
}) {
  return (
    <CartForm
      fetcherKey={fetcherKey}
      route="/cart"
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{
        discountCodes: discountCodes || [],
      }}
    >
      {(fetcher) => (
        <>
          {children}
          <CartFormError data={fetcher.data} />
        </>
      )}
    </CartForm>
  );
}

function CartGiftCard({
  giftCardCodes,
  giftCardHeadingId,
  giftCardInputId,
}: {
  giftCardCodes: CartApiQueryFragment['appliedGiftCards'] | undefined;
  giftCardHeadingId: string;
  giftCardInputId: string;
}) {
  const giftCardCodeInput = useRef<HTMLInputElement>(null);
  const removeButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const previousCardIdsRef = useRef<string[]>([]);
  const giftCardAddFetcher = useFetcher({key: 'gift-card-add'});
  const [removedCardIndex, setRemovedCardIndex] = useState<number | null>(null);

  useEffect(() => {
    // Clear the code only once Shopify accepted it; a refused code stays in
    // the field beside its message so the customer can correct it.
    if (
      giftCardAddFetcher.data &&
      getCartFormErrorMessages(giftCardAddFetcher.data).length === 0
    ) {
      if (giftCardCodeInput.current !== null) {
        giftCardCodeInput.current.value = '';
      }
    }
  }, [giftCardAddFetcher.data]);

  useEffect(() => {
    const currentCardIds = giftCardCodes?.map((card) => card.id) || [];

    if (removedCardIndex !== null && giftCardCodes) {
      const focusTargetIndex = Math.min(
        removedCardIndex,
        giftCardCodes.length - 1,
      );
      const focusTargetCard = giftCardCodes[focusTargetIndex];
      const focusButton = focusTargetCard
        ? removeButtonRefs.current.get(focusTargetCard.id)
        : null;

      if (focusButton) {
        focusButton.focus();
      } else if (giftCardCodeInput.current) {
        giftCardCodeInput.current.focus();
      }

      setRemovedCardIndex(null);
    }

    previousCardIdsRef.current = currentCardIds;
  }, [giftCardCodes, removedCardIndex]);

  const handleRemoveClick = (cardId: string) => {
    const index = previousCardIdsRef.current.indexOf(cardId);
    if (index !== -1) {
      setRemovedCardIndex(index);
    }
  };

  return (
    <section aria-label="Gift cards" className="cart-code-section">
      {giftCardCodes && giftCardCodes.length > 0 && (
        <dl>
          <dt id={giftCardHeadingId}>Applied gift cards</dt>
          {giftCardCodes.map((giftCard) => (
            <dd key={giftCard.id} className="cart-discount">
              <RemoveGiftCardForm
                giftCardId={giftCard.id}
                lastCharacters={giftCard.lastCharacters}
                onRemoveClick={() => handleRemoveClick(giftCard.id)}
                buttonRef={(el: HTMLButtonElement | null) => {
                  if (el) {
                    removeButtonRefs.current.set(giftCard.id, el);
                  } else {
                    removeButtonRefs.current.delete(giftCard.id);
                  }
                }}
              >
                <code>***{giftCard.lastCharacters}</code>
                <Money data={giftCard.amountUsed} />
              </RemoveGiftCardForm>
            </dd>
          ))}
        </dl>
      )}

      <AddGiftCardForm fetcherKey="gift-card-add">
        <div className="cart-code-row">
          <label htmlFor={giftCardInputId} className="sr-only">
            Gift card code
          </label>
          <input
            autoCapitalize="characters"
            autoComplete="off"
            enterKeyHint="go"
            id={giftCardInputId}
            type="text"
            name="giftCardCode"
            placeholder="Gift card code"
            ref={giftCardCodeInput}
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={giftCardAddFetcher.state !== 'idle'}
            aria-label="Apply gift card code"
          >
            {giftCardAddFetcher.state !== 'idle' ? 'Applying…' : 'Apply'}
          </button>
        </div>
        <CartFormError data={giftCardAddFetcher.data} />
      </AddGiftCardForm>
    </section>
  );
}

function AddGiftCardForm({
  fetcherKey,
  children,
}: {
  fetcherKey?: string;
  children: React.ReactNode;
}) {
  return (
    <CartForm
      fetcherKey={fetcherKey}
      route="/cart"
      action={CartForm.ACTIONS.GiftCardCodesAdd}
    >
      {children}
    </CartForm>
  );
}

function RemoveGiftCardForm({
  giftCardId,
  lastCharacters,
  children,
  onRemoveClick,
  buttonRef,
}: {
  giftCardId: string;
  lastCharacters: string;
  children: React.ReactNode;
  onRemoveClick?: () => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.GiftCardCodesRemove}
      inputs={{
        giftCardCodes: [giftCardId],
      }}
    >
      {children}
      <button
        type="submit"
        aria-label={`Remove gift card ending in ${lastCharacters}`}
        onClick={onRemoveClick}
        ref={buttonRef}
      >
        Remove
      </button>
    </CartForm>
  );
}
