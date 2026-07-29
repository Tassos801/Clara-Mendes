import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
} from 'react-router';
import {
  Analytics,
  getShopAnalytics,
  useNonce,
  type CartReturn,
} from '@shopify/hydrogen';
import type {Route} from './+types/root';
import favicon from '~/assets/favicon.svg';
import {AdPlatformAnalytics} from '~/components/AdPlatformAnalytics';
import {ClaraShell} from '~/components/ClaraShell';
import {MarketingAttributionCapture} from '~/components/MarketingAttribution';
import {getCartOrNull} from '~/lib/cart';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';

export function links() {
  return [
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
  ];
}

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={appStyles}></link>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export async function loader({context}: Route.LoaderArgs) {
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
      country: storefront.i18n.country,
      language: storefront.i18n.language,
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
      <AdPlatformAnalytics />
      <ClaraShell cart={data.cart}>
        <Outlet />
      </ClaraShell>
    </Analytics.Provider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let title = 'Something shifted out of place';
  let detail = 'Please return to the collection and try again.';
  let status = 500;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    title = status === 404 ? 'Page not found' : title;
    detail =
      typeof error.data === 'string' && error.data
        ? error.data
        : `Error ${status}`;
  } else if (error instanceof Error) {
    detail = error.message;
  }

  return (
    <main className="error-page">
      <p className="eyebrow">Clara Mendes</p>
      <h1>{title}</h1>
      <p>{detail}</p>
      <a className="text-link" href="/collections/all">
        Return to the collection
      </a>
    </main>
  );
}
