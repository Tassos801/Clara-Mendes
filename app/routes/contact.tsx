import {Link} from 'react-router';
import type {Route} from './+types/contact';

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'Contact | Clara Mendes'},
    {
      name: 'description',
      content:
        'Reach Clara Mendes for order questions, product inquiries, or general support.',
    },
  ];
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
          Whether it&apos;s an order question, a product inquiry, or something else
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
            <a href="mailto:hello@claramendes.com" className="contact-link">
              hello@claramendes.com
            </a>
          </div>

          <div className="contact-channel">
            <h2>Order support</h2>
            <p>
              For questions about an existing order — tracking, delivery timing,
              or changes — include your order number and we&apos;ll get back to you
              within 24 hours.
            </p>
            <a href="mailto:hello@claramendes.com?subject=Order%20Support" className="contact-link">
              Email about an order
            </a>
          </div>

          <div className="contact-channel">
            <h2>Returns &amp; exchanges</h2>
            <p>
              If something isn&apos;t right, let us know within 14 days of delivery.
              We&apos;ll walk you through the return or exchange process.
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
