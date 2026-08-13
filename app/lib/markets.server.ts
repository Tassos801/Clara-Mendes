import type {MarketCountryCode} from './markets.ts';
import {MARKET_SESSION_KEY, normalizeMarketCountry} from './markets.ts';
import {isLocalPath} from './redirect.ts';

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
  const requestedCountry = normalizeMarketCountry(formData.get('country'));
  if (!requestedCountry) {
    return {
      ok: false as const,
      status: 400,
      error: 'Choose a supported delivery country.',
    };
  }
  if (!availableCountries.includes(requestedCountry)) {
    return {
      ok: false as const,
      status: 422,
      error: 'That delivery country is not currently available at checkout.',
    };
  }

  const selection = await applyMarketSelection({
    cart,
    country: requestedCountry,
    session,
  });

  if (!selection.ok) return selection;

  const cartId = selection.result.cart?.id;
  const headers = cartId ? cart.setCartId(cartId) : new Headers();
  headers.append('Set-Cookie', await session.commit());

  const redirectTo = formData.get('redirectTo');
  const destination =
    typeof redirectTo === 'string' && isLocalPath(redirectTo)
      ? redirectTo
      : '/';

  return {
    ok: true as const,
    country: selection.country,
    destination,
    headers,
    status: 303,
  };
}
