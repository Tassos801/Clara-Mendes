import {Suspense} from 'react';
import {Await, Link, NavLink, useAsyncValue} from 'react-router';
import {useOptimisticCart} from '@shopify/hydrogen';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {Aside, useAside} from './Aside';
import {CartMain} from './CartMain';
import {CinematicProvider} from './cinematic/CinematicProvider';
import {
  EXTENSION_COLLECTION_HANDLE,
  hasReleasedExtensions,
} from '~/lib/catalogFilters';

const NAV_LINKS = [
  {to: '/collections/all', label: 'Shop'},
  // Appears only once any extension releases; until then the collection
  // link would dead-end in a redirect to /collections/all.
  ...(hasReleasedExtensions()
    ? [{to: `/collections/${EXTENSION_COLLECTION_HANDLE}`, label: 'Everyday'}]
    : []),
  {to: '/our-story', label: 'Our Story'},
  {to: '/blogs/karina-of-time', label: 'Journal'},
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
      <CinematicProvider>
        <ClaraHeader cart={cart} />
        <main>{children}</main>
        <ClaraFooter />
        <ClaraCartDrawer cart={cart} />
        <ClaraMobileNav />
      </CinematicProvider>
    </Aside.Provider>
  );
}

function ClaraHeader({cart}: {cart: Promise<CartApiQueryFragment | null>}) {
  const {open, type} = useAside();

  return (
    <header className="site-header">
      <div className="header-left">
        <button
          className="mobile-menu-button"
          type="button"
          onClick={() => open('mobile')}
          aria-label="Open menu"
          aria-expanded={type === 'mobile'}
          aria-haspopup="dialog"
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
      <div className="header-right">
        <Link className="mobile-search-button" to="/search" aria-label="Search">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
            <line x1="13.5" y1="13.5" x2="18" y2="18" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        </Link>
        <button
          aria-expanded={type === 'cart'}
          aria-haspopup="dialog"
          className="cart-button"
          type="button"
          onClick={() => open('cart')}
        >
          Cart{' '}
          <span>
            <Suspense fallback="0">
              <Await resolve={cart}>
                <CartCount />
              </Await>
            </Suspense>
          </span>
        </button>
      </div>
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
          Original art and considered products with secure checkout and tracked
          delivery.
        </p>
      </div>
      <nav className="footer-style-nav" aria-label="Shop by style">
        <Link to="/collections/abstract-wall-art">Abstract Wall Art</Link>
        <Link to="/collections/terracotta-wall-art">Terracotta Wall Art</Link>
        <Link to="/collections/blue-abstract-wall-art">Blue Abstract Art</Link>
        <Link to="/collections/geometric-wall-art">Geometric Wall Art</Link>
        <Link to="/collections/dark-botanical-wall-art">Dark Botanicals</Link>
        <Link to="/collections/living-room-wall-art">Living Room Art</Link>
        <Link to="/collections/bedroom-wall-art">Bedroom Art</Link>
        <Link to="/collections/wall-art-sets-of-3">Sets of 3</Link>
      </nav>
      <nav aria-label="Footer navigation">
        <Link to="/collections/all">Shop</Link>
        <Link to="/our-story">Our Story</Link>
        <Link to="/blogs/karina-of-time">Karina of Time</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/policies/shipping-policy">Shipping</Link>
        <Link to="/policies/refund-policy">Returns</Link>
        <Link to="/policies/privacy-policy">Privacy</Link>
        <Link to="/policies/terms-of-service">Terms</Link>
        <a
          href="https://www.instagram.com/shopclaramendes/"
          target="_blank"
          rel="noreferrer"
        >
          Instagram
        </a>
        <a
          href="https://www.pinterest.com/shopclaramendes/"
          target="_blank"
          rel="noreferrer"
        >
          Pinterest
        </a>
        <a
          href="https://www.facebook.com/shopclaramendes"
          target="_blank"
          rel="noreferrer"
        >
          Facebook
        </a>
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
        data-aside-panel="mobile"
        aria-label="Mobile navigation"
        aria-modal={isOpen}
        role="dialog"
        data-lenis-prevent
        tabIndex={-1}
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
        data-aside-panel="cart"
        aria-label="Shopping cart"
        aria-modal={isOpen}
        role="dialog"
        data-lenis-prevent
        tabIndex={-1}
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
