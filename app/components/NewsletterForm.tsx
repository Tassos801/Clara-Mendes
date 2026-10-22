import {useEffect, useRef} from 'react';
import {Link, useFetcher, useLocation, useRouteLoaderData} from 'react-router';
import type {loader as rootLoader} from '~/root';
import {BRAND} from '~/content/brand';
import {NEWSLETTER_ACTION, NEWSLETTER_HONEYPOT_FIELD} from '~/lib/newsletter';

type Reply = {ok: boolean; status?: string; error?: string};

const COPY = BRAND.newsletter;

function message(reply: Reply | undefined, code: string | null) {
  if (!reply) return null;
  if (reply.ok) return reply.status === 'already' ? COPY.already : COPY.success(code);
  switch (reply.error) {
    case 'invalid': return COPY.invalid;
    case 'slow-down': return COPY.slowDown;
    case 'disabled': return COPY.disabled;
    default: return COPY.failed;
  }
}

/**
 * Email sign-up, posted to /api/subscribe through a fetcher (JSON reply) or,
 * without JavaScript, as a plain form whose redirect carries ?subscribed=.
 * `footer` is the one-line version on every page; `feature` is the fuller
 * homepage block. Copy lives in BRAND.newsletter.
 */
export function NewsletterForm({variant}: {variant: 'footer' | 'feature'}) {
  const fetcher = useFetcher<Reply>();
  const root = useRouteLoaderData<typeof rootLoader>('root');
  const location = useLocation();
  const code = root?.newsletter.welcomeCode ?? null;
  const params = new URLSearchParams(location.search);
  const fromRedirect: Reply | undefined =
    params.get('subscribed') === '1'
      ? {ok: true, status: params.get('status') ?? 'subscribed'}
      : params.get('subscribed') === '0'
        ? {ok: false, error: params.get('reason') ?? 'failed'}
        : undefined;
  const reply = fetcher.data ?? fromRedirect;
  const text = message(reply, code);
  const busy = fetcher.state !== 'idle';
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (fetcher.data?.ok) formRef.current?.reset();
  }, [fetcher.data]);

  const id = `newsletter-${variant}`;
  return (
    <div className={`newsletter newsletter--${variant}`}>
      {variant === 'footer' ? (
        <p className="newsletter__line">{COPY.footerLine(code)}</p>
      ) : null}
      <fetcher.Form ref={formRef} method="post" action={NEWSLETTER_ACTION} className="newsletter__form">
        <input type="hidden" name="_fetcher" value="1" />
        <input type="hidden" name="redirectTo" value={location.pathname} />
        <div className="newsletter__trap" aria-hidden="true">
          <label htmlFor={`${id}-${NEWSLETTER_HONEYPOT_FIELD}`}>Website</label>
          <input id={`${id}-${NEWSLETTER_HONEYPOT_FIELD}`} name={NEWSLETTER_HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
        </div>
        <label className="newsletter__label" htmlFor={`${id}-email`}>{COPY.label}</label>
        <div className="newsletter__row">
          <input
            id={`${id}-email`}
            className="newsletter__input"
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            placeholder={COPY.placeholder}
            required
          />
          <button className="newsletter__button" type="submit" disabled={busy}>
            {busy ? COPY.submitting : COPY.button}
          </button>
        </div>
      </fetcher.Form>
      {text ? (
        <p className={`newsletter__message${reply?.ok ? '' : ' is-error'}`} role={reply?.ok ? 'status' : 'alert'}>
          {text}
        </p>
      ) : null}
      <p className="newsletter__consent">
        {COPY.consent}{' '}
        <Link to="/policies/privacy-policy">{COPY.privacyLabel}</Link>
      </p>
    </div>
  );
}
