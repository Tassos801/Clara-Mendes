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
import {GoogleCommerceAnalytics} from '~/components/GoogleCommerceAnalytics';
import {MarketingAttributionCapture} from '~/components/MarketingAttribution';
import {getCartOrNull} from '~/lib/cart';
import {normalizeGtmContainerId} from '~/lib/googleCommerce';
import {MARKET_SESSION_KEY, visitorMarketCountry} from '~/lib/markets';
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

export async function loader({context, request}: Route.LoaderArgs) {
  const {env, storefront} = context;

  return {
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
    newsletter: {
      enabled: Boolean(env.SHOPIFY_ADMIN_ACCESS_TOKEN),
      welcomeCode: env.NEWSLETTER_WELCOME_CODE?.trim() || null,
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
      <MarketingAttributionCapture />
      <GoogleCommerceAnalytics containerId={data.gtmContainerId} />
      <ClaraShell cart={data.cart}>
        <Outlet />
      </ClaraShell>
    </Analytics.Provider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let title = 'Something shifted out of place';
  let detail = 'Please go back to the shop and try again.';
  let status = 500;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    title = status === 404 ? 'Page not found' : title;
    detail =
      status === 404
        ? 'The link may be out of date, or the item is no longer available. Everything on sale now is in the shop.'
        : typeof error.data === 'string' && error.data
          ? error.data
          : `Error ${status}`;
  } else if (error instanceof Error) {
    detail = error.message;
  }

  const page = (
    <div className="error-page">
      <p className="eyebrow">Clara Mendes</p>
      <h1>{title}</h1>
      <p>{detail}</p>
      <a className="text-link" href="/collections/all">
        Back to the shop
      </a>
    </div>
  );

  // A 404 from a child route still has the root data, so it gets the
  // normal header, footer and menus instead of a dead end. When the root
  // loader itself failed there is no cart to hand the shell, so the bare
  // page stands alone.
  const rootData = useRouteLoaderData<typeof loader>('root');
  if (!rootData) return <main>{page}</main>;
  return <ClaraShell cart={rootData.cart}>{page}</ClaraShell>;
}
