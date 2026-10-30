import {Suspense, useEffect, useState} from 'react';
import {Await, Link, NavLink, useAsyncValue} from 'react-router';
import {useOptimisticCart} from '@shopify/hydrogen';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {Aside, useAside} from './Aside';
import {BrandLogo} from './BrandLogo';
import {CartConnectionGuard} from './CartConnectionGuard';
import {CartMain} from './CartMain';
import {CinematicProvider} from './cinematic/CinematicProvider';
import {NewsletterForm} from './NewsletterForm';
import {isReleasedProductHandle} from '~/lib/catalogFilters';
import {TOUGH_CASE_HANDLE} from '~/lib/toughCase';
import {BOOK_NOOKS_PATH, releasedBookNooks} from '~/lib/bookNooks';
import {publicArtists} from '~/lib/artistShops';
import {
  NAV_LINKS,
  PRIMARY_LINKS,
  SHOP_LINKS,
  SHOP_PATH,
} from '~/lib/navLinks';
import {cartItemCountLabel} from '~/lib/cartPresentation';
import {BRAND} from '~/content/brand';

const HAS_BOOK_NOOKS = releasedBookNooks().length > 0;
const HAS_ARTISTS = publicArtists().length > 0;
const HAS_PHONE_CASES = isReleasedProductHandle(TOUGH_CASE_HANDLE);

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
          <BrandLogo variant="horizontal" />
        </Link>
      </div>
      <nav className="site-nav" aria-label="Primary navigation">
        {PRIMARY_LINKS.map(({to, label}) =>
          to === SHOP_PATH && SHOP_LINKS.length > 0 ? (
            // The lines open under Shop on hover or keyboard focus; the
            // Shop link itself still goes to everything.
            <div className="site-nav-shop" key={to}>
              <NavLink to={to} prefetch="intent">
                {label}
              </NavLink>
              <div className="site-nav-shop-menu">
                {SHOP_LINKS.map((line) => (
                  <NavLink key={line.to} to={line.to} prefetch="intent">
                    {line.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ) : (
            <NavLink key={to} to={to} prefetch="intent">
              {label}
            </NavLink>
          ),
        )}
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
      <div className="footer-brand">
        <Link className="brand-mark" to="/" aria-label="Clara Mendes home">
          <BrandLogo variant="stacked" />
        </Link>
        <p>{BRAND.footer.blurb}</p>
        <NewsletterForm variant="footer" />
      </div>
      <div className="footer-columns">
        <nav className="footer-column" aria-label="Shop">
          <h2 className="footer-heading">Shop</h2>
          <ul>
            <li>
              <Link to="/collections/all">Shop all</Link>
            </li>
            {HAS_ARTISTS ? (
              <li>
                <Link to="/artists">Artists</Link>
              </li>
            ) : null}
            <li>
              <Link to="/clothing">Clothing</Link>
            </li>
            {HAS_BOOK_NOOKS ? (
              <li>
                <Link to={BOOK_NOOKS_PATH}>Book Nooks</Link>
              </li>
            ) : null}
            {HAS_PHONE_CASES ? (
              <li>
                <Link to="/collections/all?type=Phone+Cases">Phone Cases</Link>
              </li>
            ) : null}
            <li>
              <Link to="/pastel-forms">Pastel Forms</Link>
            </li>
          </ul>
        </nav>
        <nav className="footer-column" aria-label="Clara Mendes">
          <h2 className="footer-heading">Clara Mendes</h2>
          <ul>
            <li>
              <Link to="/our-story">Our Story</Link>
            </li>
            <li>
              <Link to="/blogs/karina-of-time">Karina of Time</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
          </ul>
        </nav>
        <nav className="footer-column" aria-label="Help">
          <h2 className="footer-heading">Help</h2>
          <ul>
            <li>
              <Link to="/policies/shipping-policy">Shipping</Link>
            </li>
            <li>
              <Link to="/policies/refund-policy">Returns</Link>
            </li>
            <li>
              <Link to="/policies/privacy-policy">Privacy</Link>
            </li>
            <li>
              <Link to="/policies/terms-of-service">Terms</Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="footer-bottom">
        <p className="footer-copyright">
          © {new Date().getFullYear()} Clara Mendes · Nicosia, Cyprus
        </p>
        <nav className="footer-social" aria-label="Social">
          <ul>
            <li>
              <a
                href="https://www.instagram.com/shopclaramendes/"
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>
            </li>
            <li>
              <a
                href="https://www.pinterest.com/shopclaramendes/"
                target="_blank"
                rel="noreferrer"
              >
                Pinterest
              </a>
            </li>
            <li>
              <a
                href="https://www.facebook.com/shopclaramendes"
                target="_blank"
                rel="noreferrer"
              >
                Facebook
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

function ClaraMobileNav() {
  const {type, close} = useAside();
  const isOpen = type === 'mobile';
  // The stacked logo is ~12 KB of path data, so the closed drawer leaves it
  // out of every page's HTML. Once drawn it stays, so it does not vanish
  // while the drawer slides shut.
  const [logoDrawn, setLogoDrawn] = useState(false);
  useEffect(() => {
    if (isOpen) setLogoDrawn(true);
  }, [isOpen]);

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
          <Link
            className="brand-mark"
            to="/"
            aria-label="Clara Mendes home"
            onClick={close}
          >
            {isOpen || logoDrawn ? <BrandLogo variant="stacked" /> : null}
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
