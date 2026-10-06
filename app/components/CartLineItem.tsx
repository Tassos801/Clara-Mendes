import type {CartLineUpdateInput} from '@shopify/hydrogen/storefront-api-types';
import type {CartLayout, LineItemChildrenMap} from '~/components/CartMain';
import {CartForm, Image, type OptimisticCartLine} from '@shopify/hydrogen';
import {useEffect, useRef, useState} from 'react';
import {useVariantUrl} from '~/lib/variants';
import {getSwipeIntent} from '~/lib/cartSwipe';
import {formatMoney} from '~/lib/money';
import {
  cartLineThumbnail,
  cartQuantitySteps,
  isCartLineUnavailable,
  visibleCartOptions,
} from '~/lib/cartPresentation';
import {Link, useFetcher} from 'react-router';
import {CartFormError} from './CartFormError';
import {ProductPrice} from './ProductPrice';
import {useAside} from './Aside';
import {GIFT_NOTE_KEY} from '~/lib/sky/gift';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {
  curatedDisplayTitle,
  curatedImages,
  getCuratedProduct,
} from '~/lib/curatedProducts';

export type CartLine = OptimisticCartLine<CartApiQueryFragment>;

const SWIPE_ACTION_WIDTH = 96;
const SWIPE_REVEAL_THRESHOLD = 8;

/**
 * A single line item in the cart. It displays the product image, title, price.
 * It also provides controls to update the quantity or remove the line item.
 * If the line is a parent line that has child components (like warranties or gift wrapping), they are
 * rendered nested below the parent line.
 */
export function CartLineItem({
  layout,
  line,
  childrenMap,
}: {
  layout: CartLayout;
  line: CartLine;
  childrenMap: LineItemChildrenMap;
}) {
  const {id, merchandise} = line;
  const {product, selectedOptions} = merchandise;
  // Curated kits keep their branded image and short name in the cart too;
  // art prints show the flat artwork rather than their size's room scene.
  const image = cartLineThumbnail({
    curatedImage: curatedImages(product.handle)[0],
    featuredImage:
      'featuredImage' in product ? product.featuredImage : undefined,
    productType: 'productType' in product ? product.productType : undefined,
    variantImage: merchandise.image,
  });
  const productTitle = curatedDisplayTitle(product);
  // Curated kits are single-variant (one registry variant id); the option
  // left by the supplier import (e.g. "Style: Glimmer Book Pavilion") only
  // contradicts the kit's name.
  const visibleOptions = getCuratedProduct(product.handle)
    ? []
    : visibleCartOptions(selectedOptions);
  const unavailable = isCartLineUnavailable(line);
  const unitPrice =
    line.quantity > 1 && line.cost?.amountPerQuantity
      ? formatMoney(line.cost.amountPerQuantity)
      : null;
  const giftNote = line.attributes?.find(
    (attribute) => attribute.key === GIFT_NOTE_KEY,
  )?.value;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
  const {close} = useAside();
  const lineItemChildren = childrenMap[id];
  const childrenLabelId = `cart-line-children-${id}`;
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStart = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const swipeFrame = useRef<number | null>(null);
  const canSwipeRemove = !line.isOptimistic;
  const isSwipeRevealed = swipeOffset <= -SWIPE_REVEAL_THRESHOLD;
  const isSwipeOpen = swipeOffset <= -SWIPE_ACTION_WIDTH;

  useEffect(() => {
    return () => {
      if (swipeFrame.current !== null) {
        window.cancelAnimationFrame(swipeFrame.current);
      }
    };
  }, []);

  function setSwipeOffsetNow(offset: number) {
    if (swipeFrame.current !== null) {
      window.cancelAnimationFrame(swipeFrame.current);
      swipeFrame.current = null;
    }

    setSwipeOffset(offset);
  }

  function scheduleSwipeOffset(offset: number) {
    if (typeof window === 'undefined') {
      setSwipeOffset(offset);
      return;
    }

    if (swipeFrame.current !== null) {
      window.cancelAnimationFrame(swipeFrame.current);
    }

    swipeFrame.current = window.requestAnimationFrame(() => {
      swipeFrame.current = null;
      setSwipeOffset(offset);
    });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (
      !canSwipeRemove ||
      (typeof window !== 'undefined' &&
        !window.matchMedia('(max-width: 720px)').matches)
    ) {
      return;
    }

    if (
      event.target instanceof HTMLElement &&
      event.target.closest('a, button, input, select, textarea')
    ) {
      return;
    }

    pointerStart.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    if (!start) return;

    const intent = getSwipeIntent({
      currentX: event.clientX,
      currentY: event.clientY,
      startX: start.startX,
      startY: start.startY,
    });

    if (intent.direction === 'vertical') return;
    if (event.cancelable) event.preventDefault();

    scheduleSwipeOffset(intent.offset);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    if (!start) return;

    const intent = getSwipeIntent({
      currentX: event.clientX,
      currentY: event.clientY,
      startX: start.startX,
      startY: start.startY,
    });

    setSwipeOffsetNow(intent.shouldOpen ? -SWIPE_ACTION_WIDTH : 0);
    setIsDragging(false);
    pointerStart.current = null;

    if (event.currentTarget.hasPointerCapture(start.pointerId)) {
      event.currentTarget.releasePointerCapture(start.pointerId);
    }
  }

  function handlePointerCancel() {
    setSwipeOffsetNow(0);
    setIsDragging(false);
    pointerStart.current = null;
  }

  return (
    <li
      key={id}
      className={`cart-line ${isSwipeRevealed ? 'is-swipe-revealed' : ''} ${
        isSwipeOpen ? 'is-swipe-open' : ''
      } ${isDragging ? 'is-dragging' : ''} ${
        unavailable ? 'is-unavailable' : ''
      }`}
    >
      {canSwipeRemove ? (
        <div className="cart-line-swipe-action" aria-hidden={!isSwipeRevealed}>
          <CartLineRemoveButton
            className="cart-line-swipe-remove"
            disabled={!isSwipeOpen}
            lineIds={[id]}
          />
        </div>
      ) : null}

      <div
        className="cart-line-swipe-surface"
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{transform: `translateX(${swipeOffset}px)`}}
      >
        <div className="cart-line-inner">
          {image ? (
            <Image
              alt=""
              aspectRatio="4/5"
              className="cart-line-image"
              data={image}
              loading="lazy"
              sizes="88px"
              width={176}
            />
          ) : (
            <span className="cart-line-image" aria-hidden />
          )}

          <div className="cart-line-body">
            <Link
              className="cart-line-title"
              prefetch="intent"
              to={lineItemUrl}
              onClick={() => {
                if (layout === 'aside') {
                  close();
                }
              }}
            >
              {productTitle}
            </Link>
            {visibleOptions.length > 0 ? (
              <ul className="cart-line-options" aria-label="Selected options">
                {visibleOptions.map((option) => (
                  <li key={option.name}>
                    <span>{option.name}</span> {option.value}
                  </li>
                ))}
              </ul>
            ) : null}
            {line.attributes?.some(
              (attribute) =>
                !attribute.key.startsWith('_') &&
                attribute.key !== GIFT_NOTE_KEY &&
                attribute.value,
            ) ? (
              <p className="sky-cart-attributes">
                {line.attributes
                  .filter(
                    (attribute) =>
                      !attribute.key.startsWith('_') &&
                      attribute.key !== GIFT_NOTE_KEY &&
                      attribute.value,
                  )
                  .map((attribute) => attribute.value)
                  .join(' · ')}
              </p>
            ) : null}
            {giftNote ? (
              <p className="sky-cart-gift">
                <span>Gift note</span> {giftNote}
              </p>
            ) : null}
            <div className="cart-line-price">
              <ProductPrice price={line?.cost?.totalAmount} />
              {unitPrice ? (
                <span className="cart-line-unit">{unitPrice} each</span>
              ) : null}
            </div>
            {unavailable ? (
              <p className="cart-line-unavailable" role="status">
                No longer available. Remove it to continue to checkout.
              </p>
            ) : null}
            <CartLineQuantity line={line} title={productTitle} />
          </div>
        </div>

        {lineItemChildren ? (
          <div>
            <p id={childrenLabelId} className="sr-only">
              Line items with {productTitle}
            </p>
            <ul
              aria-labelledby={childrenLabelId}
              className="cart-line-children"
            >
              {lineItemChildren.map((childLine) => (
                <CartLineItem
                  childrenMap={childrenMap}
                  key={childLine.id}
                  line={childLine}
                  layout={layout}
                />
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Provides the controls to update the quantity of a line item in the cart.
 * These controls are disabled when the line item is new, and the server
 * hasn't yet responded that it was successfully added to the cart.
 */
function CartLineQuantity({line, title}: {line: CartLine; title: string}) {
  const lineId = line?.id ?? '';
  // The quantity and remove forms below submit through keyed fetchers; reading
  // the same keys here surfaces a refused update (for example a quantity above
  // the available stock) that would otherwise silently snap back.
  const updateFetcher = useFetcher({
    key: getLineActionKey(CartForm.ACTIONS.LinesUpdate, [lineId]),
  });
  const removeFetcher = useFetcher({
    key: getLineActionKey(CartForm.ACTIONS.LinesRemove, [lineId]),
  });

  if (!line || typeof line?.quantity === 'undefined') return null;
  const {quantity, isOptimistic} = line;
  const steps = cartQuantitySteps(quantity);
  const unavailable = isCartLineUnavailable(line);

  return (
    <div className="cart-line-quantity">
      <div
        className="cart-line-stepper"
        role="group"
        aria-label={`Quantity of ${title}`}
      >
        <CartLineUpdateButton lines={[{id: lineId, quantity: steps.decrease}]}>
          <button
            aria-label={`Decrease quantity of ${title}`}
            disabled={!steps.canDecrease || !!isOptimistic}
            name="decrease-quantity"
            value={steps.decrease}
          >
            <span aria-hidden>&#8722;</span>
          </button>
        </CartLineUpdateButton>
        <output aria-live="polite" aria-label={`Quantity ${quantity}`}>
          {quantity}
        </output>
        <CartLineUpdateButton lines={[{id: lineId, quantity: steps.increase}]}>
          <button
            aria-label={`Increase quantity of ${title}`}
            name="increase-quantity"
            value={steps.increase}
            disabled={!steps.canIncrease || !!isOptimistic || unavailable}
          >
            <span aria-hidden>&#43;</span>
          </button>
        </CartLineUpdateButton>
      </div>
      <CartLineRemoveButton
        ariaLabel={`Remove ${title}`}
        className="cart-line-remove"
        lineIds={[lineId]}
        disabled={!!isOptimistic}
      />
      <CartFormError data={updateFetcher.data} />
      <CartFormError data={removeFetcher.data} />
    </div>
  );
}

/**
 * A button that removes a line item from the cart. It is disabled
 * when the line item is new, and the server hasn't yet responded
 * that it was successfully added to the cart.
 */
function CartLineRemoveButton({
  ariaLabel,
  className,
  lineIds,
  disabled,
}: {
  ariaLabel?: string;
  className?: string;
  lineIds: string[];
  disabled: boolean;
}) {
  return (
    <CartForm
      fetcherKey={getLineActionKey(CartForm.ACTIONS.LinesRemove, lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      {(fetcher) => (
        <button
          aria-label={ariaLabel}
          className={className}
          disabled={disabled || fetcher.state !== 'idle'}
          type="submit"
        >
          {fetcher.state === 'idle' ? 'Remove' : 'Removing…'}
        </button>
      )}
    </CartForm>
  );
}

function CartLineUpdateButton({
  children,
  lines,
}: {
  children: React.ReactNode;
  lines: CartLineUpdateInput[];
}) {
  const lineIds = lines.map((line) => line.id);

  return (
    <CartForm
      fetcherKey={getLineActionKey(CartForm.ACTIONS.LinesUpdate, lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {children}
    </CartForm>
  );
}

/**
 * Returns a unique key for the update action. This is used to make sure actions modifying the same line
 * items are not run concurrently, but cancel each other. For example, if the user clicks "Increase quantity"
 * and "Decrease quantity" in rapid succession, the actions will cancel each other and only the last one will run.
 * @param lineIds - line ids affected by the update
 * @returns
 */
function getLineActionKey(action: string, lineIds: string[]) {
  return [action, ...lineIds].join('-');
}
