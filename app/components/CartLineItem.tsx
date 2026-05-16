import type {CartLineUpdateInput} from '@shopify/hydrogen/storefront-api-types';
import type {CartLayout, LineItemChildrenMap} from '~/components/CartMain';
import {CartForm, Image, type OptimisticCartLine} from '@shopify/hydrogen';
import {useEffect, useRef, useState} from 'react';
import {useVariantUrl} from '~/lib/variants';
import {getSwipeIntent} from '~/lib/cartSwipe';
import {Link} from 'react-router';
import {ProductPrice} from './ProductPrice';
import {useAside} from './Aside';
import type {CartApiQueryFragment} from 'storefrontapi.generated';

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
  const {product, title, image, selectedOptions} = merchandise;
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
      } ${isDragging ? 'is-dragging' : ''}`}
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
          {image && (
            <Image
              alt={title}
              aspectRatio="1/1"
              data={image}
              height={100}
              loading="lazy"
              width={100}
            />
          )}

          <div>
            <Link
              prefetch="intent"
              to={lineItemUrl}
              onClick={() => {
                if (layout === 'aside') {
                  close();
                }
              }}
            >
              <p>
                <strong>{product.title}</strong>
              </p>
            </Link>
            <ProductPrice price={line?.cost?.totalAmount} />
            <ul>
              {selectedOptions.map((option) => (
                <li key={option.name}>
                  <small>
                    {option.name}: {option.value}
                  </small>
                </li>
              ))}
            </ul>
            <CartLineQuantity line={line} />
          </div>
        </div>

        {lineItemChildren ? (
          <div>
            <p id={childrenLabelId} className="sr-only">
              Line items with {product.title}
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
function CartLineQuantity({line}: {line: CartLine}) {
  if (!line || typeof line?.quantity === 'undefined') return null;
  const {id: lineId, quantity, isOptimistic} = line;
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));

  return (
    <div className="cart-line-quantity">
      <small>Quantity: {quantity} &nbsp;&nbsp;</small>
      <CartLineUpdateButton lines={[{id: lineId, quantity: prevQuantity}]}>
        <button
          aria-label="Decrease quantity"
          disabled={quantity <= 1 || !!isOptimistic}
          name="decrease-quantity"
          value={prevQuantity}
        >
          <span>&#8722; </span>
        </button>
      </CartLineUpdateButton>
      &nbsp;
      <CartLineUpdateButton lines={[{id: lineId, quantity: nextQuantity}]}>
        <button
          aria-label="Increase quantity"
          name="increase-quantity"
          value={nextQuantity}
          disabled={!!isOptimistic}
        >
          <span>&#43;</span>
        </button>
      </CartLineUpdateButton>
      &nbsp;
      <CartLineRemoveButton
        className="cart-line-remove"
        lineIds={[lineId]}
        disabled={!!isOptimistic}
      />
    </div>
  );
}

/**
 * A button that removes a line item from the cart. It is disabled
 * when the line item is new, and the server hasn't yet responded
 * that it was successfully added to the cart.
 */
function CartLineRemoveButton({
  className,
  lineIds,
  disabled,
}: {
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
          className={className}
          disabled={disabled || fetcher.state !== 'idle'}
          type="submit"
        >
          {fetcher.state === 'idle' ? 'Remove' : 'Removing...'}
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
