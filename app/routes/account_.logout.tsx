import type {Route} from './+types/account_.logout';

export async function action({context}: Route.ActionArgs) {
  return context.customerAccount.logout();
}
