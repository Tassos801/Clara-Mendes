import {Suspense} from 'react';
import {Await, Link, NavLink, useAsyncValue} from 'react-router';
import {useOptimisticCart} from '@shopify/hydrogen';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {Aside, useAside} from './Aside';
import {CartConnectionGuard} from './CartConnectionGuard';
import {CartMain} from './CartMain';
import {CinematicProvider} from './cinematic/CinematicProvider';
import {
  NATAL_PRODUCT_HANDLE,
  PERSONALISED_RELEASE_FLAGS,
  SKY_PRODUCT_HANDLE,
} from '~/lib/catalogFilters';
import {YOUR_SKY_PAGE} from '~/lib/featurePages';
import {BOOK_NOOKS_PATH, releasedBookNooks} from '~/lib/bookNooks';
import {cartItemCountLabel} from '~/lib/cartPresentation';

const HAS_BOOK_NOOKS = releasedBookNooks().length > 0;

const NAV_LINKS = [
  {to: '/collections/all', label: 'Shop'},
  ...(HAS_BOOK_NOOKS ? [{to: BOOK_NOOKS_PATH, label: 'Book Nooks'}] : []),
  // Each personalised product gets its own entry once its flag flips.
  // Your Sky is a feature page, not a product URL.
  ...(PERSONALISED_RELEASE_FLAGS[SKY_PRODUCT_HANDLE]
    ? [{to: YOUR_SKY_PAGE.path, label: YOUR_SKY_PAGE.navLabel}]
    : []),
  ...(PERSONALISED_RELEASE_FLAGS[NATAL_PRODUCT_HANDLE]
    ? [{to: `/products/${NATAL_PRODUCT_HANDLE}`, label: 'First Light'}]
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
        <CartConnectionGuard />
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
          <svg
            width="22"
            height="14"
            viewBox="0 0 22 14"
            fill="none"
            aria-hidden="true"
          >
            <line
              x1="0"
              y1="1"
              x2="22"
              y2="1"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <line
              x1="0"
              y1="7"
              x2="22"
              y2="7"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <line
              x1="0"
              y1="13"
              x2="22"
              y2="13"
              stroke="currentColor"
              strokeWidth="1.4"
            />
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
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="9"
              cy="9"
              r="6.5"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <line
              x1="13.5"
              y1="13.5"
              x2="18"
              y2="18"
              stroke="currentColor"
              strokeWidth="1.4"
            />
          </svg>
        </Link>
        <button
          aria-expanded={type === 'cart'}
          aria-haspopup="dialog"
          className="cart-button"
          type="button"
          onClick={() => open('cart')}
        >
          {/* Narrow phones swap the word for a bag; the name stays "Cart". */}
          <svg
            className="cart-button-icon"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 6.5h12l-1 11H5l-1-11Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M7 8V5.5a3 3 0 0 1 6 0V8"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <span className="cart-button-label">Cart</span>{' '}
          <span className="cart-button-count">
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

function CartItemCount() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  const count = cart?.totalQuantity ?? 0;
  return count > 0 ? <> · {cartItemCountLabel(count)}</> : null;
}

function ClaraFooter() {
  return (
    <footer className="site-footer">
      <div>
        <Link className="brand-mark" to="/">
          Clara Mendes
        </Link>
        <p>
          Original art and considered products with secure checkout. Wall art
          ships tracked worldwide; cards and postcards travel by letter post
          within the EU.
        </p>
      </div>
      <nav className="footer-style-nav" aria-label="Shop by style">
        <Link to="/collections/all?type=Art+Prints">Unframed Art Prints</Link>
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
        {HAS_BOOK_NOOKS ? <Link to={BOOK_NOOKS_PATH}>Book Nooks</Link> : null}
        <Link to="/pastel-forms">Pastel Forms</Link>
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
      data-lenis-prevent
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
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
            >
              <line
                x1="1"
                y1="1"
                x2="17"
                y2="17"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <line
                x1="17"
                y1="1"
                x2="1"
                y2="17"
                stroke="currentColor"
                strokeWidth="1.4"
              />
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
      data-lenis-prevent
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
        aria-labelledby="cart-drawer-title"
        aria-modal={isOpen}
        role="dialog"
        data-lenis-prevent
        tabIndex={-1}
      >
        <header className="cart-drawer-header">
          <h2 className="cart-drawer-title" id="cart-drawer-title">
            Your cart
            <span className="cart-drawer-count">
              <Suspense fallback={null}>
                <Await resolve={cart}>
                  <CartItemCount />
                </Await>
              </Suspense>
            </span>
          </h2>
          <button
            className="drawer-close"
            type="button"
            onClick={close}
            aria-label="Close cart"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2 2l14 14M16 2 2 16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        <Suspense
          fallback={<p className="cart-drawer-loading">Loading your cart…</p>}
        >
          <Await resolve={cart}>
            {(cart) => <CartMain cart={cart} layout="aside" />}
          </Await>
        </Suspense>
      </aside>
    </div>
  );
}
