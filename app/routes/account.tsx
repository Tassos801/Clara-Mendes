import {
  data as routerData,
  Form,
  Link,
  Outlet,
  useLoaderData,
} from 'react-router';
import type {Route} from './+types/account';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Account | Clara Mendes'}];
};

export function shouldRevalidate() {
  return true;
}

export async function loader({context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const {data, errors} = await customerAccount.query(CUSTOMER_DETAILS_QUERY, {
    variables: {
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw new Response('Customer account not found', {status: 404});
  }

  return routerData(
    {customer: data.customer},
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  );
}

export default function Account() {
  const {customer} = useLoaderData<typeof loader>();
  const name = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(' ');
  const addresses = customer.addresses.nodes;

  return (
    <div className="account-page">
      <header className="page-hero compact-hero">
        <p className="eyebrow">Account</p>
        <h1>{name ? `Welcome, ${name}` : 'Your account'}</h1>
        <p>Review customer details and return to your current edit.</p>
      </header>

      <section className="account-summary" aria-label="Account summary">
        <div>
          <h2>Saved addresses</h2>
          {addresses.length > 0 ? (
            <div className="account-addresses">
              {addresses.map((address) => (
                <address key={address.id}>
                  {address.formatted.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </address>
              ))}
            </div>
          ) : (
            <p className="small-muted">
              Saved delivery addresses will appear after Shopify records them.
            </p>
          )}
        </div>

        <div className="account-actions">
          <Link className="primary-button" to="/collections/all">
            Continue shopping
          </Link>
          <Form method="post" action="/account/logout">
            <button className="text-button" type="submit">
              Sign out
            </button>
          </Form>
        </div>
      </section>

      <Outlet />
    </div>
  );
}
