import type {MarketCountryCode} from './markets.ts';
import {
  MARKET_SESSION_KEY,
  MARKET_URL_PARAM,
  normalizeMarketCountry,
} from './markets.ts';
import {toLocalPath, withSearchParams} from './redirect.ts';

/**
 * Set on the page a failed country choice returns to (a plain form post has
 * no component to render the error on), so the form can say so.
 */
export const MARKET_ERROR_PARAM = 'country-error';

/** A local path without the `?country=` pin: the buyer's choice must win. */
function withoutMarketPin(path: string) {
  const url = new URL(path, 'http://local.invalid');
  url.searchParams.delete(MARKET_URL_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}

type MarketCartResult = {
  cart?: {
    buyerIdentity?: {countryCode?: string | null} | null;
    id?: string | null;
  } | null;
  errors?: unknown[];
  userErrors?: unknown[];
  warnings?: unknown[];
};

type MarketCart = {
  get: () => Promise<MarketCartResult['cart']>;
  updateBuyerIdentity: (input: {
    countryCode: MarketCountryCode;
  }) => Promise<MarketCartResult>;
};

type MarketSession = {
  set: (key: string, value: unknown) => void;
};

type MarketActionCart = MarketCart & {
  setCartId: (cartId: string) => Headers;
};

type MarketActionSession = MarketSession & {
  commit: () => Promise<string>;
};

export async function applyMarketSelection({
  cart,
  country,
  session,
}: {
  cart: MarketCart;
  country: unknown;
  session: MarketSession;
}) {
  const normalizedCountry = normalizeMarketCountry(country);
  if (!normalizedCountry) {
    return {
      ok: false as const,
      status: 400,
      error: 'Choose a supported delivery country.',
    };
  }

  const result = await cart.updateBuyerIdentity({
    countryCode: normalizedCountry,
  });

  if (result.errors?.length || result.userErrors?.length) {
    return {
      ok: false as const,
      status: 422,
      error: 'The delivery country could not be applied to the cart.',
      result,
    };
  }

  // Hydrogen mutations use a minimal cart fragment unless one is configured,
  // so buyerIdentity may be absent even when the update succeeded. Read the
  // cart back with the full query fragment before persisting the market.
  const verifiedCart = result.cart?.buyerIdentity?.countryCode
    ? result.cart
    : await cart.get();
  const verifiedResult = {...result, cart: verifiedCart};

  if (verifiedCart?.buyerIdentity?.countryCode !== normalizedCountry) {
    return {
      ok: false as const,
      status: 422,
      error: 'The delivery country was not applied to the cart.',
      result: verifiedResult,
    };
  }

  session.set(MARKET_SESSION_KEY, normalizedCountry);

  return {
    ok: true as const,
    country: normalizedCountry,
    result: verifiedResult,
  };
}

export async function processMarketSelectionRequest({
  availableCountries,
  cart,
  request,
  session,
}: {
  availableCountries: readonly MarketCountryCode[];
  cart: MarketActionCart;
  request: Request;
  session: MarketActionSession;
}) {
  const formData = await request.formData();
  const returnTo = toLocalPath(formData.get('redirectTo')) ?? '/';
  // A failure goes back to the page as it was, flagged.
  const failed = <T extends {status: number; error: string}>(failure: T) => ({
    ...failure,
    ok: false as const,
    destination: withSearchParams(
      returnTo,
      new URLSearchParams([[MARKET_ERROR_PARAM, '1']]),
    ),
  });
  const requestedCountry = normalizeMarketCountry(formData.get('country'));
  if (!requestedCountry) {
    return failed({
      status: 400,
      error: 'Choose a supported delivery country.',
    });
  }
  if (!availableCountries.includes(requestedCountry)) {
    return failed({
      status: 422,
      error: 'That delivery country is not currently available at checkout.',
    });
  }

  const selection = await applyMarketSelection({
    cart,
    country: requestedCountry,
    session,
  });

  if (!selection.ok) return failed(selection);

  const cartId = selection.result.cart?.id;
  const headers = cartId ? cart.setCartId(cartId) : new Headers();
  headers.append('Set-Cookie', await session.commit());

  return {
    ok: true as const,
    country: selection.country,
    // A `?country=` pin in the page URL outranks the saved choice
    // (markets.ts), so it is dropped, or the old country would win again.
    destination: withoutMarketPin(returnTo),
    headers,
    status: 303,
  };
}
