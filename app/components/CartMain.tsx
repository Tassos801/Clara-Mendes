import {useOptimisticCart} from '@shopify/hydrogen';
import {Link} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {CartLineItem, type CartLine} from '~/components/CartLineItem';
import {CartRecommendations} from '~/components/CartRecommendations';
import {
  PERSONALISED_RELEASE_FLAGS,
  SKY_PRODUCT_HANDLE,
} from '~/lib/catalogFilters';
import {YOUR_SKY_PAGE} from '~/lib/featurePages';
import {CartCheckoutBar, CartSummary} from './CartSummary';

export type CartLayout = 'page' | 'aside';

export type CartMainProps = {
  cart: CartApiQueryFragment | null;
  layout: CartLayout;
};

export type LineItemChildrenMap = {[parentId: string]: CartLine[]};
/** Returns a map of all line items and their children. */
function getLineItemChildrenMap(lines: CartLine[]): LineItemChildrenMap {
  const children: LineItemChildrenMap = {};
  for (const line of lines) {
    if ('parentRelationship' in line && line.parentRelationship?.parent) {
      const parentId = line.parentRelationship.parent.id;
      if (!children[parentId]) children[parentId] = [];
      children[parentId].push(line);
    }
    if ('lineComponents' in line) {
      const nestedChildren = getLineItemChildrenMap(line.lineComponents);
      for (const [parentId, childIds] of Object.entries(nestedChildren)) {
        if (!children[parentId]) children[parentId] = [];
        children[parentId].push(...childIds);
      }
    }
  }
  return children;
}
/**
 * The main cart component that displays the cart items and summary.
 * It is used by both the /cart route and the cart aside dialog.
 *
 * In the drawer the lines, suggestions and codes scroll while subtotal and
 * checkout stay pinned to the bottom, so the next step is always in reach on
 * a phone. On the page the summary follows the lines on narrow screens and
 * sits beside them on wide ones.
 */
export function CartMain({layout, cart: originalCart}: CartMainProps) {
  // The useOptimisticCart hook applies pending actions to the cart
  // so the user immediately sees feedback when they modify the cart.
  const cart = useOptimisticCart(originalCart);

  const linesCount = Boolean(cart?.lines?.nodes?.length || 0);
  const withDiscount =
    cart &&
    Boolean(cart?.discountCodes?.filter((code) => code.applicable)?.length);
  const className = `cart-main cart-main--${layout} ${
    withDiscount ? 'with-discount' : ''
  }`;
  const cartHasItems = cart?.totalQuantity ? cart.totalQuantity > 0 : false;
  const childrenMap = getLineItemChildrenMap(cart?.lines?.nodes ?? []);

  return (
    <section
      className={className}
      aria-label={layout === 'page' ? 'Cart page' : 'Cart drawer'}
    >
      <CartEmpty hidden={linesCount} layout={layout} />
      <div className="cart-details" hidden={!linesCount} data-lenis-prevent>
        <div className="cart-lines">
          <p id={`cart-lines-${layout}`} className="sr-only">
            Line items
          </p>
          <ul aria-labelledby={`cart-lines-${layout}`}>
            {(cart?.lines?.nodes ?? []).map((line) => {
              // we do not render non-parent lines at the root of the cart
              if (
                'parentRelationship' in line &&
                line.parentRelationship?.parent
              ) {
                return null;
              }
              return (
                <CartLineItem
                  key={line.id}
                  line={line}
                  layout={layout}
                  childrenMap={childrenMap}
                />
              );
            })}
          </ul>
        </div>
        {cartHasItems && <CartSummary cart={cart} layout={layout} />}
        {cartHasItems && (
          <div className="cart-recs-slot">
            <CartRecommendations cart={cart} layout={layout} />
          </div>
        )}
      </div>
      {cartHasItems && layout === 'aside' ? (
        <CartCheckoutBar cart={cart} layout={layout} />
      ) : null}
    </section>
  );
}

function CartEmpty({
  hidden = false,
  layout,
}: {
  hidden: boolean;
  layout?: CartMainProps['layout'];
}) {
  const {close} = useAside();
  const onNavigate = layout === 'aside' ? close : undefined;
  const hasYourSky = PERSONALISED_RELEASE_FLAGS[SKY_PRODUCT_HANDLE];

  return (
    <div className="cart-empty" hidden={hidden}>
      <p className="eyebrow">Your cart is empty</p>
      <p className="cart-empty-title">Nothing here yet.</p>
      <p className="cart-empty-copy">
        Start with original art prints, considered objects or a star map of your
        own.
      </p>
      <div className="cart-empty-actions">
        <Link
          className="primary-button"
          onClick={onNavigate}
          prefetch="viewport"
          to="/collections/all"
        >
          Browse the shop
        </Link>
        {hasYourSky ? (
          <Link
            className="text-link"
            onClick={onNavigate}
            prefetch="intent"
            to={YOUR_SKY_PAGE.path}
          >
            Design your sky
          </Link>
        ) : null}
      </div>
    </div>
  );
}
