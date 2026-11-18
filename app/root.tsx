import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
  useRouteLoaderData,
} from 'react-router';
import {
  Analytics,
  getShopAnalytics,
  useNonce,
  type CartReturn,
} from '@shopify/hydrogen';
import type {Route} from './+types/root';
import favicon from '~/assets/favicon.svg';
import {ClaraShell} from '~/components/ClaraShell';
import {CustomerPrivacyApiFallback} from '~/components/CustomerPrivacyApiFallback';
import {GoogleCommerceAnalytics} from '~/components/GoogleCommerceAnalytics';
import {MetaPixelAnalytics} from '~/components/MetaPixelAnalytics';
import {MarketingAttributionCapture} from '~/components/MarketingAttribution';
import {getCartOrNull} from '~/lib/cart';
import {normalizeGtmContainerId} from '~/lib/googleCommerce';
import {normalizeMetaPixelIds} from '~/lib/metaPixel';
import {MARKET_SESSION_KEY, visitorMarketCountry} from '~/lib/markets';
import {NEWSLETTER_WELCOME_SESSION_KEY} from '~/lib/newsletter';
import {requestToday} from '~/lib/christmasDelivery';
import {blackFridayNow, isBlackFridayWeek} from '~/lib/blackFriday';
import {heroBackdropFor, heroBackdropVars} from '~/lib/heroBackdrop';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';
import clothingStyles from '~/styles/clothing.css?url';
import {
  APP_NAME,
  APP_THEME_COLOR,
  APPLE_TOUCH_ICON,
  FAVICON_ICO,
  MANIFEST_PATH,
} from '~/lib/webManifest';

export function links() {
  return [
    // ICO for browsers without SVG favicons; sizes keeps Chrome on the SVG.
    {rel: 'icon', href: FAVICON_ICO, sizes: '32x32'},
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
    // "Add to Home Screen": manifest for Android/Chrome, touch icon for iOS.
    {rel: 'manifest', href: MANIFEST_PATH},
    {rel: 'apple-touch-icon', href: APPLE_TOUCH_ICON},
  ];
}

// Pages set their own titles; this only names error pages, which have none.
export const meta: Route.MetaFunction = ({error}) =>
  error
    ? [
        {
          title: `${
            isRouteErrorResponse(error) && error.status === 404
              ? 'Page not found'
              : 'Something went wrong'
          } | ${APP_NAME}`,
        },
      ]
    : [];

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="theme-color" content={APP_THEME_COLOR} />
        <meta name="application-name" content={APP_NAME} />
        <meta name="apple-mobile-web-app-title" content={APP_NAME} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={appStyles}></link>
        <link rel="stylesheet" href={clothingStyles}></link>
        <Meta />
        <Links nonce="" />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

function takeNewsletterWelcomeCode(session: Route.LoaderArgs['context']['session']) {
  const code = session.get(NEWSLETTER_WELCOME_SESSION_KEY);
  if (code === undefined) return null;
  session.unset(NEWSLETTER_WELCOME_SESSION_KEY);
  return typeof code === 'string' && code ? code : null;
}

export async function loader({context, request}: Route.LoaderArgs) {
  const {env, storefront} = context;

  return {
    // The hero backdrop for today's date (Christmas 1 Nov to 6 Jan), read
    // per request: on Oxygen a module's top level has no usable clock.
    heroBackdrop: heroBackdropFor(requestToday(request)),
    // Black Friday week (17 Nov to 30 Nov 2026, Nicosia time), judged at
    // this request's time: the sitewide line shows only inside the window.
    // No document response is cached (no Cache-Control on pages), so it
    // switches off with the first request after the end.
    blackFridayWeek: isBlackFridayWeek(blackFridayNow(request)),
    cart: getCartOrNull(context.cart),
    shop: getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID ?? '0',
    }).catch((error) => {
      console.warn(
        'Unable to load Shopify analytics configuration; continuing without it.',
        error,
      );
      return null;
    }),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN ?? env.PUBLIC_STORE_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      withPrivacyBanner: true,
      // The visitor's own country, not a `?country=` pin, so the banner's
      // region rules follow the person (app/lib/markets.ts).
      country: visitorMarketCountry(
        request,
        context.session.get(MARKET_SESSION_KEY),
      ),
      language: storefront.i18n.language,
    },
    gtmContainerId: normalizeGtmContainerId(env.PUBLIC_GTM_CONTAINER_ID),
    metaPixelIds: normalizeMetaPixelIds(env.PUBLIC_META_PIXEL_ID),
    newsletter: {
      // Whether an offer exists, never the code itself: this loader's data
      // is serialised into every page for every visitor.
      welcomeOffer: Boolean(env.NEWSLETTER_WELCOME_CODE?.trim()),
      // Set only by a no-JS sign-up on the page it redirects to; read once.
      welcomeCode: takeNewsletterWelcomeCode(context.session),
    },
  };
}

export default function App() {
  const data = useLoaderData<typeof loader>();
  // The generated fragment selects the fields analytics uses, while the
  // provider exposes the broader Storefront API cart type.
  const analyticsCart = data.cart as unknown as Promise<CartReturn | null>;

  return (
    <Analytics.Provider
      cart={analyticsCart}
      consent={data.consent}
      shop={data.shop}
    >
      <CustomerPrivacyApiFallback />
      <MarketingAttributionCapture />
      <GoogleCommerceAnalytics containerId={data.gtmContainerId} />
      <MetaPixelAnalytics pixelIds={data.metaPixelIds} />
      <style suppressHydrationWarning>
        {heroBackdropVars(data.heroBackdrop)}
      </style>
      <ClaraShell blackFridayWeek={data.blackFridayWeek} cart={data.cart}>
        <Outlet />
      </ClaraShell>
    </Analytics.Provider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  // Buyers never see raw error text (a loader message or a stack line);
  // the dev server still shows it to whoever is building the page.
  const devDetail = import.meta.env.DEV
    ? isRouteErrorResponse(error)
      ? `${error.status} ${typeof error.data === 'string' ? error.data : ''}`
      : error instanceof Error
        ? error.message
        : null
    : null;

  const page = (
    <div className="error-page">
      <p className="eyebrow">Clara Mendes</p>
      <h1>{notFound ? 'Page not found' : 'Something shifted out of place'}</h1>
      <p>
        {notFound
          ? 'The link may be out of date, or the item is no longer available. Everything on sale now is in the shop.'
          : 'This page did not load. Please try again in a moment, or carry on from the shop.'}
      </p>
      {devDetail ? <p className="small-muted">{devDetail}</p> : null}
      <div className="error-page__links">
        <a className="text-link" href="/collections/all">
          Back to the shop
        </a>
        {notFound ? (
          <a className="text-link" href="/search">
            Search
          </a>
        ) : null}
        <a className="text-link" href="/contact">
          Contact us
        </a>
      </div>
    </div>
  );

  // A 404 from a child route still has the root data, so it gets the
  // normal header, footer and menus instead of a dead end. When the root
  // loader itself failed there is no cart to hand the shell, so the bare
  // page stands alone.
  const rootData = useRouteLoaderData<typeof loader>('root');
  if (!rootData) return <main>{page}</main>;
  return (
    <ClaraShell blackFridayWeek={rootData.blackFridayWeek} cart={rootData.cart}>
      {page}
    </ClaraShell>
  );
}
