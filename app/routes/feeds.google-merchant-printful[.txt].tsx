import type {Route} from './+types/feeds.google-merchant-printful[.txt]';
import {merchantFeedResponse} from '~/lib/merchantFeed.server';

// Merchant Center product feed: the Printful mugs, cushions and blankets,
// listed in the EU with that day's checkout delivery rate. Merchant Center
// fetches it daily (see app/lib/merchantFeed.ts).
export async function loader({request, context}: Route.LoaderArgs) {
  return merchantFeedResponse(request, context.storefront, 'printful');
}
