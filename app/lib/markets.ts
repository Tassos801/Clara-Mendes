import type {I18nBase} from '@shopify/hydrogen';

export const DEFAULT_MARKET_COUNTRY = 'CY' as const;
export const MARKET_SESSION_KEY = 'marketCountry';

export const MARKET_COUNTRIES = [
  {code: 'AT', currency: 'EUR', name: 'Austria'},
  {code: 'BE', currency: 'EUR', name: 'Belgium'},
  {code: 'BG', currency: 'EUR', name: 'Bulgaria'},
  {code: 'HR', currency: 'EUR', name: 'Croatia'},
  {code: 'CY', currency: 'EUR', name: 'Cyprus'},
  {code: 'CZ', currency: 'CZK', name: 'Czechia'},
  {code: 'DK', currency: 'DKK', name: 'Denmark'},
  {code: 'EE', currency: 'EUR', name: 'Estonia'},
  {code: 'FI', currency: 'EUR', name: 'Finland'},
  {code: 'FR', currency: 'EUR', name: 'France'},
  {code: 'DE', currency: 'EUR', name: 'Germany'},
  {code: 'GR', currency: 'EUR', name: 'Greece'},
  {code: 'HU', currency: 'HUF', name: 'Hungary'},
  {code: 'IE', currency: 'EUR', name: 'Ireland'},
  {code: 'IT', currency: 'EUR', name: 'Italy'},
  {code: 'LV', currency: 'EUR', name: 'Latvia'},
  {code: 'LT', currency: 'EUR', name: 'Lithuania'},
  {code: 'LU', currency: 'EUR', name: 'Luxembourg'},
  {code: 'MT', currency: 'EUR', name: 'Malta'},
  {code: 'NL', currency: 'EUR', name: 'Netherlands'},
  {code: 'PL', currency: 'PLN', name: 'Poland'},
  {code: 'PT', currency: 'EUR', name: 'Portugal'},
  {code: 'RO', currency: 'RON', name: 'Romania'},
  {code: 'SK', currency: 'EUR', name: 'Slovakia'},
  {code: 'SI', currency: 'EUR', name: 'Slovenia'},
  {code: 'ES', currency: 'EUR', name: 'Spain'},
  {code: 'SE', currency: 'SEK', name: 'Sweden'},
  {code: 'GB', currency: 'GBP', name: 'United Kingdom'},
  {code: 'US', currency: 'USD', name: 'United States'},
] as const;

export type MarketCountryCode = (typeof MARKET_COUNTRIES)[number]['code'];

const MARKET_COUNTRY_CODES = new Set<string>(
  MARKET_COUNTRIES.map(({code}) => code),
);

export function normalizeMarketCountry(
  value: unknown,
): MarketCountryCode | null {
  if (typeof value !== 'string') return null;

  const country = value.trim().toUpperCase();
  return MARKET_COUNTRY_CODES.has(country)
    ? (country as MarketCountryCode)
    : null;
}

export function resolveMarketCountry({
  explicitCountry,
  oxygenCountry,
}: {
  explicitCountry?: unknown;
  oxygenCountry?: unknown;
}): MarketCountryCode {
  return (
    normalizeMarketCountry(explicitCountry) ??
    normalizeMarketCountry(oxygenCountry) ??
    DEFAULT_MARKET_COUNTRY
  );
}

export function getLocaleFromRequest(
  request: Request,
  explicitCountry?: unknown,
): I18nBase {
  return {
    language: 'EN',
    country: resolveMarketCountry({
      explicitCountry,
      oxygenCountry: request.headers.get('oxygen-buyer-country'),
    }) as I18nBase['country'],
  };
}

export function getMarketVaryHeader(existingHeader?: string | null) {
  const values = new Map<string, string>();

  for (const value of (existingHeader ?? '').split(',')) {
    const normalized = value.trim();
    if (normalized) values.set(normalized.toLowerCase(), normalized);
  }

  values.set('cookie', 'Cookie');
  values.set('oxygen-buyer-country', 'oxygen-buyer-country');

  return [...values.values()].join(', ');
}
