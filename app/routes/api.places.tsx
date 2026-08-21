import {data} from 'react-router';
import type {Route} from './+types/api.places';
import {searchPlaces} from '~/lib/sky/places.server';

/** Typeahead backing the star-map place field. GET /api/places?q=par */
export async function loader({request}: Route.LoaderArgs) {
  const q = new URL(request.url).searchParams.get('q') ?? '';
  return data(
    {results: searchPlaces(q)},
    {headers: {'Cache-Control': 'public, max-age=3600, s-maxage=86400'}},
  );
}
