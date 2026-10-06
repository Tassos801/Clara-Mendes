import type {I18nBase} from '@shopify/hydrogen';

export const DEFAULT_MARKET_COUNTRY = 'CY' as const;
export const MARKET_SESSION_KEY = 'marketCountry';
export const AVAILABLE_MARKET_COUNTRIES_QUERY = `#graphql
  query AvailableMarketCountries(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    localization {
      availableCountries {
        isoCode
      }
    }
  }
` as const;

// Countries in Shopify's "International" market (2026-10-06, EUR, no local
// currencies): every country Prodigi quotes prints to, except the UK (UK VAT
// registration comes first), UK-VAT Isle of Man, sanctioned destinations
// (RU BY IR KP SY CU) and conflict zones on hold (AF IQ LY SD SS SO YE VE MM
// HT CF ML). Canvas, framed pieces, cases and pots reach subsets of these
// through their shipping profiles — docs/llm-wiki/modules/fulfillment.md.
const INTERNATIONAL_MARKET_COUNTRIES = [
  {code: 'AD', currency: 'EUR', name: 'Andorra'},
  {code: 'AE', currency: 'EUR', name: 'United Arab Emirates'},
  {code: 'AG', currency: 'EUR', name: 'Antigua & Barbuda'},
  {code: 'AI', currency: 'EUR', name: 'Anguilla'},
  {code: 'AL', currency: 'EUR', name: 'Albania'},
  {code: 'AM', currency: 'EUR', name: 'Armenia'},
  {code: 'AO', currency: 'EUR', name: 'Angola'},
  {code: 'AR', currency: 'EUR', name: 'Argentina'},
  {code: 'AU', currency: 'EUR', name: 'Australia'},
  {code: 'AW', currency: 'EUR', name: 'Aruba'},
  {code: 'AX', currency: 'EUR', name: 'Åland Islands'},
  {code: 'AZ', currency: 'EUR', name: 'Azerbaijan'},
  {code: 'BA', currency: 'EUR', name: 'Bosnia & Herzegovina'},
  {code: 'BB', currency: 'EUR', name: 'Barbados'},
  {code: 'BD', currency: 'EUR', name: 'Bangladesh'},
  {code: 'BF', currency: 'EUR', name: 'Burkina Faso'},
  {code: 'BH', currency: 'EUR', name: 'Bahrain'},
  {code: 'BI', currency: 'EUR', name: 'Burundi'},
  {code: 'BJ', currency: 'EUR', name: 'Benin'},
  {code: 'BL', currency: 'EUR', name: 'St. Barthélemy'},
  {code: 'BM', currency: 'EUR', name: 'Bermuda'},
  {code: 'BN', currency: 'EUR', name: 'Brunei'},
  {code: 'BO', currency: 'EUR', name: 'Bolivia'},
  {code: 'BR', currency: 'EUR', name: 'Brazil'},
  {code: 'BS', currency: 'EUR', name: 'Bahamas'},
  {code: 'BT', currency: 'EUR', name: 'Bhutan'},
  {code: 'BW', currency: 'EUR', name: 'Botswana'},
  {code: 'BZ', currency: 'EUR', name: 'Belize'},
  {code: 'CA', currency: 'EUR', name: 'Canada'},
  {code: 'CG', currency: 'EUR', name: 'Congo - Brazzaville'},
  {code: 'CH', currency: 'EUR', name: 'Switzerland'},
  {code: 'CI', currency: 'EUR', name: 'Côte d’Ivoire'},
  {code: 'CK', currency: 'EUR', name: 'Cook Islands'},
  {code: 'CL', currency: 'EUR', name: 'Chile'},
  {code: 'CM', currency: 'EUR', name: 'Cameroon'},
  {code: 'CN', currency: 'EUR', name: 'China'},
  {code: 'CO', currency: 'EUR', name: 'Colombia'},
  {code: 'CR', currency: 'EUR', name: 'Costa Rica'},
  {code: 'CV', currency: 'EUR', name: 'Cape Verde'},
  {code: 'CW', currency: 'EUR', name: 'Curaçao'},
  {code: 'CX', currency: 'EUR', name: 'Christmas Island'},
  {code: 'DJ', currency: 'EUR', name: 'Djibouti'},
  {code: 'DM', currency: 'EUR', name: 'Dominica'},
  {code: 'DO', currency: 'EUR', name: 'Dominican Republic'},
  {code: 'DZ', currency: 'EUR', name: 'Algeria'},
  {code: 'EC', currency: 'EUR', name: 'Ecuador'},
  {code: 'EG', currency: 'EUR', name: 'Egypt'},
  {code: 'ER', currency: 'EUR', name: 'Eritrea'},
  {code: 'ET', currency: 'EUR', name: 'Ethiopia'},
  {code: 'FJ', currency: 'EUR', name: 'Fiji'},
  {code: 'FK', currency: 'EUR', name: 'Falkland Islands'},
  {code: 'FO', currency: 'EUR', name: 'Faroe Islands'},
  {code: 'GA', currency: 'EUR', name: 'Gabon'},
  {code: 'GD', currency: 'EUR', name: 'Grenada'},
  {code: 'GE', currency: 'EUR', name: 'Georgia'},
  {code: 'GF', currency: 'EUR', name: 'French Guiana'},
  {code: 'GG', currency: 'EUR', name: 'Guernsey'},
  {code: 'GH', currency: 'EUR', name: 'Ghana'},
  {code: 'GI', currency: 'EUR', name: 'Gibraltar'},
  {code: 'GL', currency: 'EUR', name: 'Greenland'},
  {code: 'GM', currency: 'EUR', name: 'Gambia'},
  {code: 'GN', currency: 'EUR', name: 'Guinea'},
  {code: 'GP', currency: 'EUR', name: 'Guadeloupe'},
  {code: 'GQ', currency: 'EUR', name: 'Equatorial Guinea'},
  {code: 'GT', currency: 'EUR', name: 'Guatemala'},
  {code: 'GW', currency: 'EUR', name: 'Guinea-Bissau'},
  {code: 'GY', currency: 'EUR', name: 'Guyana'},
  {code: 'HK', currency: 'EUR', name: 'Hong Kong SAR'},
  {code: 'HN', currency: 'EUR', name: 'Honduras'},
  {code: 'ID', currency: 'EUR', name: 'Indonesia'},
  {code: 'IL', currency: 'EUR', name: 'Israel'},
  {code: 'IN', currency: 'EUR', name: 'India'},
  {code: 'IS', currency: 'EUR', name: 'Iceland'},
  {code: 'JE', currency: 'EUR', name: 'Jersey'},
  {code: 'JM', currency: 'EUR', name: 'Jamaica'},
  {code: 'JO', currency: 'EUR', name: 'Jordan'},
  {code: 'JP', currency: 'EUR', name: 'Japan'},
  {code: 'KE', currency: 'EUR', name: 'Kenya'},
  {code: 'KG', currency: 'EUR', name: 'Kyrgyzstan'},
  {code: 'KH', currency: 'EUR', name: 'Cambodia'},
  {code: 'KI', currency: 'EUR', name: 'Kiribati'},
  {code: 'KM', currency: 'EUR', name: 'Comoros'},
  {code: 'KN', currency: 'EUR', name: 'St. Kitts & Nevis'},
  {code: 'KR', currency: 'EUR', name: 'South Korea'},
  {code: 'KW', currency: 'EUR', name: 'Kuwait'},
  {code: 'KY', currency: 'EUR', name: 'Cayman Islands'},
  {code: 'KZ', currency: 'EUR', name: 'Kazakhstan'},
  {code: 'LA', currency: 'EUR', name: 'Laos'},
  {code: 'LB', currency: 'EUR', name: 'Lebanon'},
  {code: 'LC', currency: 'EUR', name: 'St. Lucia'},
  {code: 'LI', currency: 'EUR', name: 'Liechtenstein'},
  {code: 'LK', currency: 'EUR', name: 'Sri Lanka'},
  {code: 'LR', currency: 'EUR', name: 'Liberia'},
  {code: 'LS', currency: 'EUR', name: 'Lesotho'},
  {code: 'MA', currency: 'EUR', name: 'Morocco'},
  {code: 'MC', currency: 'EUR', name: 'Monaco'},
  {code: 'MD', currency: 'EUR', name: 'Moldova'},
  {code: 'ME', currency: 'EUR', name: 'Montenegro'},
  {code: 'MF', currency: 'EUR', name: 'St. Martin'},
  {code: 'MG', currency: 'EUR', name: 'Madagascar'},
  {code: 'MK', currency: 'EUR', name: 'North Macedonia'},
  {code: 'MN', currency: 'EUR', name: 'Mongolia'},
  {code: 'MO', currency: 'EUR', name: 'Macao SAR'},
  {code: 'MQ', currency: 'EUR', name: 'Martinique'},
  {code: 'MR', currency: 'EUR', name: 'Mauritania'},
  {code: 'MS', currency: 'EUR', name: 'Montserrat'},
  {code: 'MU', currency: 'EUR', name: 'Mauritius'},
  {code: 'MV', currency: 'EUR', name: 'Maldives'},
  {code: 'MW', currency: 'EUR', name: 'Malawi'},
  {code: 'MX', currency: 'EUR', name: 'Mexico'},
  {code: 'MY', currency: 'EUR', name: 'Malaysia'},
  {code: 'MZ', currency: 'EUR', name: 'Mozambique'},
  {code: 'NA', currency: 'EUR', name: 'Namibia'},
  {code: 'NC', currency: 'EUR', name: 'New Caledonia'},
  {code: 'NE', currency: 'EUR', name: 'Niger'},
  {code: 'NF', currency: 'EUR', name: 'Norfolk Island'},
  {code: 'NG', currency: 'EUR', name: 'Nigeria'},
  {code: 'NI', currency: 'EUR', name: 'Nicaragua'},
  {code: 'NO', currency: 'EUR', name: 'Norway'},
  {code: 'NP', currency: 'EUR', name: 'Nepal'},
  {code: 'NR', currency: 'EUR', name: 'Nauru'},
  {code: 'NU', currency: 'EUR', name: 'Niue'},
  {code: 'NZ', currency: 'EUR', name: 'New Zealand'},
  {code: 'OM', currency: 'EUR', name: 'Oman'},
  {code: 'PA', currency: 'EUR', name: 'Panama'},
  {code: 'PE', currency: 'EUR', name: 'Peru'},
  {code: 'PF', currency: 'EUR', name: 'French Polynesia'},
  {code: 'PG', currency: 'EUR', name: 'Papua New Guinea'},
  {code: 'PH', currency: 'EUR', name: 'Philippines'},
  {code: 'PK', currency: 'EUR', name: 'Pakistan'},
  {code: 'PM', currency: 'EUR', name: 'St. Pierre & Miquelon'},
  {code: 'PS', currency: 'EUR', name: 'Palestinian Territories'},
  {code: 'PY', currency: 'EUR', name: 'Paraguay'},
  {code: 'QA', currency: 'EUR', name: 'Qatar'},
  {code: 'RE', currency: 'EUR', name: 'Réunion'},
  {code: 'RS', currency: 'EUR', name: 'Serbia'},
  {code: 'RW', currency: 'EUR', name: 'Rwanda'},
  {code: 'SA', currency: 'EUR', name: 'Saudi Arabia'},
  {code: 'SB', currency: 'EUR', name: 'Solomon Islands'},
  {code: 'SC', currency: 'EUR', name: 'Seychelles'},
  {code: 'SG', currency: 'EUR', name: 'Singapore'},
  {code: 'SL', currency: 'EUR', name: 'Sierra Leone'},
  {code: 'SM', currency: 'EUR', name: 'San Marino'},
  {code: 'SN', currency: 'EUR', name: 'Senegal'},
  {code: 'SR', currency: 'EUR', name: 'Suriname'},
  {code: 'ST', currency: 'EUR', name: 'São Tomé & Príncipe'},
  {code: 'SV', currency: 'EUR', name: 'El Salvador'},
  {code: 'SZ', currency: 'EUR', name: 'Eswatini'},
  {code: 'TC', currency: 'EUR', name: 'Turks & Caicos Islands'},
  {code: 'TD', currency: 'EUR', name: 'Chad'},
  {code: 'TG', currency: 'EUR', name: 'Togo'},
  {code: 'TH', currency: 'EUR', name: 'Thailand'},
  {code: 'TJ', currency: 'EUR', name: 'Tajikistan'},
  {code: 'TL', currency: 'EUR', name: 'Timor-Leste'},
  {code: 'TM', currency: 'EUR', name: 'Turkmenistan'},
  {code: 'TN', currency: 'EUR', name: 'Tunisia'},
  {code: 'TO', currency: 'EUR', name: 'Tonga'},
  {code: 'TR', currency: 'EUR', name: 'Türkiye'},
  {code: 'TT', currency: 'EUR', name: 'Trinidad & Tobago'},
  {code: 'TV', currency: 'EUR', name: 'Tuvalu'},
  {code: 'TW', currency: 'EUR', name: 'Taiwan'},
  {code: 'TZ', currency: 'EUR', name: 'Tanzania'},
  {code: 'UA', currency: 'EUR', name: 'Ukraine'},
  {code: 'UG', currency: 'EUR', name: 'Uganda'},
  {code: 'US', currency: 'EUR', name: 'United States'},
  {code: 'UY', currency: 'EUR', name: 'Uruguay'},
  {code: 'UZ', currency: 'EUR', name: 'Uzbekistan'},
  {code: 'VA', currency: 'EUR', name: 'Vatican City'},
  {code: 'VC', currency: 'EUR', name: 'St. Vincent & Grenadines'},
  {code: 'VG', currency: 'EUR', name: 'British Virgin Islands'},
  {code: 'VN', currency: 'EUR', name: 'Vietnam'},
  {code: 'VU', currency: 'EUR', name: 'Vanuatu'},
  {code: 'WF', currency: 'EUR', name: 'Wallis & Futuna'},
  {code: 'WS', currency: 'EUR', name: 'Samoa'},
  {code: 'XK', currency: 'EUR', name: 'Kosovo'},
  {code: 'YT', currency: 'EUR', name: 'Mayotte'},
  {code: 'ZA', currency: 'EUR', name: 'South Africa'},
  {code: 'ZM', currency: 'EUR', name: 'Zambia'},
  {code: 'ZW', currency: 'EUR', name: 'Zimbabwe'},
] as const;

// EU-27 (markets "Cyprus" + "European Union"), then the UK, which is in no
// market yet but stays resolvable so a UK visitor's locale is explicit.
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
  ...INTERNATIONAL_MARKET_COUNTRIES,
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
