import type {Route} from './+types/feeds.google-merchant-printful[.txt]';
import {merchantFeedResponse} from '~/lib/merchantFeed.server';

// Merchant Center product feed: the Printful mugs, cushions, blankets and
// clothing, listed in the EU at the fee table's delivery rate. Merchant
// Center fetches it daily (see app/lib/merchantFeed.ts).
export async function loader({request, context}: Route.LoaderArgs) {
  return merchantFeedResponse(request, context.storefront, 'printful');
}
