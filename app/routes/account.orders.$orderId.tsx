import {Link, redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/account.orders.$orderId';
import {CUSTOMER_ORDER_QUERY} from '~/graphql/customer-account/CustomerOrderQuery';

export const meta: Route.MetaFunction = ({data}) => {
  return [{title: `${data?.order.name ?? 'Order'} | Clara Mendes`}];
};

export async function loader({context, params}: Route.LoaderArgs) {
  if (!params.orderId) {
    throw redirect('/account');
  }

  const {customerAccount} = context;
  const {data, errors} = await customerAccount.query(CUSTOMER_ORDER_QUERY, {
    variables: {
      language: customerAccount.i18n.language,
      orderId: decodeOrderId(params.orderId),
    },
  });

  if (errors?.length || !data?.order) {
    throw new Response('Order not found', {status: 404});
  }

  return {order: data.order};
}

export default function AccountOrder() {
  const {order} = useLoaderData<typeof loader>();
  const fulfillmentStatus = order.fulfillments.nodes[0]?.status ?? 'Pending';

  return (
    <section className="account-order" aria-labelledby="account-order-title">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/account">Account</Link>
        <span aria-hidden="true">/</span>
        <span>{order.name}</span>
      </nav>

      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Order</p>
          <h2 id="account-order-title">{order.name}</h2>
          {order.processedAt ? (
            <p className="small-muted">
              Placed {new Date(order.processedAt).toDateString()}
            </p>
          ) : null}
        </div>
        {order.statusPageUrl ? (
          <a className="text-link" href={order.statusPageUrl}>
            View order status
          </a>
        ) : null}
      </div>

      <div className="account-order-layout">
        <div className="account-order-lines">
          {order.lineItems.nodes.map((lineItem) => (
            <article className="account-order-line" key={lineItem.id}>
              {lineItem.image ? (
                <img
                  src={lineItem.image.url}
                  alt={lineItem.image.altText || lineItem.title}
                  loading="lazy"
                />
              ) : null}
              <div>
                <h3>{lineItem.title}</h3>
                {lineItem.variantTitle ? <p>{lineItem.variantTitle}</p> : null}
                <p>
                  Quantity {lineItem.quantity} - {formatMoney(lineItem.price)}
                </p>
              </div>
            </article>
          ))}
        </div>

        <aside className="account-order-summary" aria-label="Order summary">
          <p>
            <span>Status</span>
            <strong>{fulfillmentStatus}</strong>
          </p>
          <p>
            <span>Subtotal</span>
            <strong>{formatMoney(order.subtotal)}</strong>
          </p>
          <p>
            <span>Tax</span>
            <strong>{formatMoney(order.totalTax)}</strong>
          </p>
          <p>
            <span>Total</span>
            <strong>{formatMoney(order.totalPrice)}</strong>
          </p>
          {order.confirmationNumber ? (
            <p>
              <span>Confirmation</span>
              <strong>{order.confirmationNumber}</strong>
            </p>
          ) : null}
          {order.shippingAddress ? (
            <address>
              <span>Shipping address</span>
              <strong>{order.shippingAddress.name}</strong>
              {order.shippingAddress.formatted.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </address>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function decodeOrderId(value: string) {
  try {
    return atob(value);
  } catch {
    return value;
  }
}

function formatMoney(money?: {amount: string; currencyCode: string} | null) {
  if (!money) return 'Pending';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currencyCode,
  }).format(Number(money.amount));
}
