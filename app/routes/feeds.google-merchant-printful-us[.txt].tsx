import type {Route} from './+types/feeds.google-merchant-printful-us[.txt]';
import {merchantFeedResponse} from '~/lib/merchantFeed.server';

// Merchant Center product feed for the United States: the Printful lines
// (mugs, cushions, blankets, clothing) at US-market (USD) prices and US
// checkout rates. Answers 503 until the US market sells in USD.
export async function loader({request, context}: Route.LoaderArgs) {
  return merchantFeedResponse(request, context.storefront, 'printful', 'US');
}
