import {Link} from 'react-router';
import type {Route} from './+types/contact';
import {buildSeoMeta} from '~/lib/seo';
import {
  RETURN_WINDOW_DAYS,
  STOREFRONT_ORIGIN,
  SUPPORT_EMAIL,
} from '~/lib/storefrontBasics';

export const meta: Route.MetaFunction = () => {
  return buildSeoMeta({
    description:
      'Reach Clara Mendes for order questions, product enquiries, returns, or general support. Every message is answered within one business day.',
    title: 'Contact',
    url: `${STOREFRONT_ORIGIN}/contact`,
  });
};

export default function Contact() {
  return (
    <div className="contact-page">
      <header className="page-hero compact-hero">
        <p className="eyebrow">Get in touch</p>
        <h1>
          We&apos;re here to <i>help</i>.
        </h1>
        <p>
          Whether it&apos;s an order question, a product enquiry, or something else
          entirely — we&apos;d love to hear from you.
        </p>
      </header>

      <div className="contact-body">
        <div className="contact-channels">
          <div className="contact-channel">
            <h2>Email</h2>
            <p>
              The quickest way to reach us. We respond to every message within
              one business day.
            </p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="contact-link">
              {SUPPORT_EMAIL}
            </a>
          </div>

          <div className="contact-channel" id="order-help">
            <h2>Where is my order?</h2>
            <p>
              You get a confirmation email when you order and a second email
              with the dispatch details when it ships, with a tracking link
              where the delivery is tracked. Can&apos;t find them, or need a
              change? Email us with your order number and we&apos;ll get back to
              you within one business day.
            </p>
            <div className="contact-links">
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Order%20Support`}
                className="contact-link"
              >
                Email about an order
              </a>
              <Link to="/policies/shipping-policy" className="contact-link">
                Delivery times
              </Link>
            </div>
          </div>

          <div className="contact-channel">
            <h2>Returns &amp; exchanges</h2>
            <p>
              If something isn&apos;t right, let us know within{' '}
              {RETURN_WINDOW_DAYS} days of delivery. We&apos;ll walk you through
              the return or exchange process.
            </p>
            <Link to="/policies/refund-policy" className="contact-link">
              View return policy
            </Link>
          </div>
        </div>

        <aside className="contact-expectations">
          <h3>What to expect</h3>
          <dl className="expectations-list">
            <div>
              <dt>Response time</dt>
              <dd>Within 1 business day</dd>
            </div>
            <div>
              <dt>Replies</dt>
              <dd>Monday – Friday, via email only</dd>
            </div>
            <div>
              <dt>Weekends</dt>
              <dd>Messages received on weekends are answered the following Monday</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
