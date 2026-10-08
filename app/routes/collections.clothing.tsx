import {redirect} from 'react-router';
import type {Route} from './+types/collections.clothing';

export function loader({request}: Route.LoaderArgs) {
  return redirect(`/clothing${new URL(request.url).search}`, 301);
}
