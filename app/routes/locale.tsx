import {data, redirect} from 'react-router';
import type {Route} from './+types/locale';
import {processMarketSelectionRequest} from '~/lib/markets.server';
import {
  AVAILABLE_MARKET_COUNTRIES_QUERY,
  normalizeMarketCountry,
  type MarketCountryCode,
} from '~/lib/markets';

export async function loader() {
  return redirect('/');
}

export async function action({request, context}: Route.ActionArgs) {
  const availableCountries = await context.storefront
    .query(AVAILABLE_MARKET_COUNTRIES_QUERY)
    .then(({localization}) =>
      localization.availableCountries
        .map(({isoCode}: {isoCode: string}) => normalizeMarketCountry(isoCode))
        .filter(
          (country: MarketCountryCode | null): country is MarketCountryCode =>
            Boolean(country),
        ),
    )
    .catch(() => [context.storefront.i18n.country as MarketCountryCode]);
  const selection = await processMarketSelectionRequest({
    availableCountries,
    cart: context.cart,
    request,
    session: context.session,
  });

  if (!selection.ok) {
    return data({error: selection.error}, {status: selection.status});
  }

  return redirect(selection.destination, {
    status: selection.status,
    headers: selection.headers,
  });
}
