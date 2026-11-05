import type {Route} from './+types/feeds.google-merchant[.txt]';
import {merchantFeedResponse} from '~/lib/merchantFeed.server';

// Merchant Center product feed: every line with a fixed EUR delivery rate.
// Merchant Center fetches it daily (see app/lib/merchantFeed.ts).
export async function loader({request, context}: Route.LoaderArgs) {
  return merchantFeedResponse(request, context.storefront, 'fixed');
}
