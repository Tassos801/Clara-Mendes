import type {MarketCountryCode} from './markets.ts';
import {MARKET_SESSION_KEY, normalizeMarketCountry} from './markets.ts';

type MarketCartResult = {
  cart?: {
    buyerIdentity?: {countryCode?: string | null} | null;
    id?: string | null;
  } | null;
  errors?: unknown[];
  warnings?: unknown[];
};

type MarketCart = {
  updateBuyerIdentity: (input: {
    countryCode: MarketCountryCode;
  }) => Promise<MarketCartResult>;
};

type MarketSession = {
  set: (key: string, value: unknown) => void;
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

  if (result.errors?.length) {
    return {
      ok: false as const,
      status: 422,
      error: 'The delivery country could not be applied to the cart.',
      result,
    };
  }

  if (result.cart?.buyerIdentity?.countryCode !== normalizedCountry) {
    return {
      ok: false as const,
      status: 422,
      error: 'The delivery country was not applied to the cart.',
      result,
    };
  }

  session.set(MARKET_SESSION_KEY, normalizedCountry);

  return {
    ok: true as const,
    country: normalizedCountry,
    result,
  };
}
