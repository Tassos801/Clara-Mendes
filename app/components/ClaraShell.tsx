import {Suspense} from 'react';
import {Await, Link, NavLink, useAsyncValue} from 'react-router';
import {useOptimisticCart} from '@shopify/hydrogen';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {Aside, useAside} from './Aside';
import {CartMain} from './CartMain';

const NAV_LINKS = [
  {to: '/collections/all', label: 'Shop'},
  {to: '/our-story', label: 'Our Story'},
  {to: '/contact', label: 'Contact'},
  {to: '/search', label: 'Search'},
] as const;

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
      <ClaraMobileNav />
    </Aside.Provider>
  );
}

function ClaraHeader({cart}: {cart: Promise<CartApiQueryFragment | null>}) {
  const {open} = useAside();

  return (
    <header className="site-header">
      <div className="header-left">
        <button
          className="mobile-menu-button"
          type="button"
          onClick={() => open('mobile')}
          aria-label="Open menu"
        >
          <svg width="22" height="14" viewBox="0 0 22 14" fill="none" aria-hidden="true">
            <line x1="0" y1="1" x2="22" y2="1" stroke="currentColor" strokeWidth="1.4" />
            <line x1="0" y1="7" x2="22" y2="7" stroke="currentColor" strokeWidth="1.4" />
            <line x1="0" y1="13" x2="22" y2="13" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
        <Link className="brand-mark" to="/" aria-label="Clara Mendes home">
          Clara Mendes
        </Link>
      </div>
      <nav className="site-nav" aria-label="Primary navigation">
        {NAV_LINKS.map(({to, label}) => (
          <NavLink key={to} to={to} prefetch="intent">
            {label}
          </NavLink>
        ))}
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
        <Link to="/our-story">Our Story</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/policies">Policies</Link>
      </nav>
    </footer>
  );
}

function ClaraMobileNav() {
  const {type, close} = useAside();
  const isOpen = type === 'mobile';

  return (
    <div
      className={`mobile-nav-backdrop ${isOpen ? 'is-open' : ''}`}
      aria-hidden={!isOpen}
    >
      <button
        className="mobile-nav-scrim"
        type="button"
        onClick={close}
        aria-label="Close menu"
      />
      <nav
        className="mobile-nav-drawer"
        aria-label="Mobile navigation"
        aria-modal={isOpen}
        role="dialog"
      >
        <header className="mobile-nav-header">
          <Link className="brand-mark" to="/" onClick={close}>
            Clara Mendes
          </Link>
          <button type="button" onClick={close} aria-label="Close menu">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <line x1="1" y1="1" x2="17" y2="17" stroke="currentColor" strokeWidth="1.4" />
              <line x1="17" y1="1" x2="1" y2="17" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
        </header>
        <div className="mobile-nav-links">
          {NAV_LINKS.map(({to, label}) => (
            <NavLink key={to} to={to} prefetch="intent" onClick={close}>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
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
