import type {Route} from './+types/feeds.meta-country-us[.txt]';
import {merchantFeedResponse} from '~/lib/merchantFeed.server';

// Meta catalog country feed for the United States: id, override (US), USD
// price, `?country=US` link and availability for every item of the two EUR
// feeds. Answers 503 until the US market sells in USD.
export async function loader({request, context}: Route.LoaderArgs) {
  return merchantFeedResponse(
    request,
    context.storefront,
    'meta-country',
    'US',
  );
}
