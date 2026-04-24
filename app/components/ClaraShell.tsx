import {Suspense} from 'react';
import {Await, Link, NavLink, useAsyncValue} from 'react-router';
import {useOptimisticCart} from '@shopify/hydrogen';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {Aside, useAside} from './Aside';
import {CartMain} from './CartMain';

export function ClaraShell({
  cart,
  children,
}: {
  cart: Promise<CartApiQueryFragment | null>;
  children: React.ReactNode;
}) {
  return (
    <Aside.Provider>
      <ClaraHeader cart={cart} />
      <main>{children}</main>
      <ClaraFooter />
      <ClaraCartDrawer cart={cart} />
    </Aside.Provider>
  );
}

function ClaraHeader({cart}: {cart: Promise<CartApiQueryFragment | null>}) {
  const {open} = useAside();

  return (
    <header className="site-header">
      <Link className="brand-mark" to="/" aria-label="Clara Mendes home">
        Clara Mendes
      </Link>
      <nav className="site-nav" aria-label="Primary navigation">
        <NavLink to="/collections/all" prefetch="intent">
          Shop
        </NavLink>
        <NavLink to="/our-story" prefetch="intent">
          Our Story
        </NavLink>
        <NavLink to="/search" prefetch="intent">
          Search
        </NavLink>
        <NavLink to="/policies" prefetch="intent">
          Policies
        </NavLink>
      </nav>
      <button className="cart-button" type="button" onClick={() => open('cart')}>
        Cart{' '}
        <span>
          <Suspense fallback="0">
            <Await resolve={cart}>
              <CartCount />
            </Await>
          </Suspense>
        </span>
      </button>
    </header>
  );
}

function CartCount() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  return <>{cart?.totalQuantity ?? 0}</>;
}

function ClaraFooter() {
  return (
    <footer className="site-footer">
      <div>
        <Link className="brand-mark" to="/">
          Clara Mendes
        </Link>
        <p>
          Curated home objects with secure checkout and tracked delivery.
        </p>
      </div>
      <nav aria-label="Footer navigation">
        <Link to="/collections/all">Shop</Link>
        <Link to="/search">Search</Link>
        <Link to="/account">Account</Link>
        <Link to="/policies">Policies</Link>
        <Link to="/cart">Cart</Link>
      </nav>
    </footer>
  );
}

function ClaraCartDrawer({cart}: {cart: Promise<CartApiQueryFragment | null>}) {
  const {type, close} = useAside();
  const isOpen = type === 'cart';

  return (
    <div
      className={`cart-drawer-backdrop ${isOpen ? 'is-open' : ''}`}
      aria-hidden={!isOpen}
    >
      <button
        className="cart-drawer-scrim"
        type="button"
        onClick={close}
        aria-label="Close cart"
      />
      <aside
        className="cart-drawer"
        aria-label="Shopping cart"
        aria-modal={isOpen}
        role="dialog"
      >
        <header className="cart-drawer-header">
          <p className="eyebrow">Cart</p>
          <button type="button" onClick={close} aria-label="Close cart">
            x
          </button>
        </header>
        <Suspense fallback={<p className="small-muted">Loading cart...</p>}>
          <Await resolve={cart}>
            {(cart) => <CartMain cart={cart} layout="aside" />}
          </Await>
        </Suspense>
      </aside>
    </div>
  );
}
