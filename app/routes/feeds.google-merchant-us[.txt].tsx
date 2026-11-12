import type {Route} from './+types/feeds.google-merchant-us[.txt]';
import {merchantFeedResponse} from '~/lib/merchantFeed.server';

// Merchant Center product feed for the United States: the fixed-rate lines
// that ship there, at US-market (USD) prices and the fee table's US rates,
// linking to `?country=US` pages. Answers 503 until the US market sells in USD.
export async function loader({request, context}: Route.LoaderArgs) {
  return merchantFeedResponse(request, context.storefront, 'fixed', 'US');
}
