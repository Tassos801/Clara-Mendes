# Email Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let shoppers subscribe by email from the footer of every page and from a "Letters from Nicosia" section on the homepage; subscribers become Shopify customers with marketing consent; a 10 % welcome code is shown when configured.

**Architecture:** Pure helpers in `app/lib/newsletter.ts` (validation, consent input); server-only `app/lib/newsletter.server.ts` (Admin API via the existing `createAdminClient`); POST route `app/routes/api.subscribe.tsx`; one `NewsletterForm` component (two variants) using a fetcher; root loader exposes `{enabled, welcomeCode}`; copy in `BRAND.newsletter`.

**Tech Stack:** Hydrogen / React Router 7 (`data()` responses, `useFetcher`, `useRouteLoaderData`), TypeScript, Node `node --test` scripts with relative `.ts` imports.

**Spec:** `docs/superpowers/specs/2026-10-22-email-capture-design.md` (read it first; copy and behaviour are normative). **Worktree:** `C:\Users\admin\Desktop\Mine\shopify\clara-wt-brand`, branch `claude/email-capture`.

**Conventions:** `node --test scripts/<name>.node-test.mjs`; `npm run typecheck`; `npm run lint`; commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; files under `app/lib` and `app/content` use relative `.ts` imports; `app/routes/api.reviews.tsx` is the model for the action (uses `data()` from react-router, honeypot `website`, `ReviewsNotConfiguredError` → 503).

---

### Task 1: Helpers, server module, route, tests

**Files:**
- Create: `app/lib/newsletter.ts`, `app/lib/newsletter.server.ts`, `app/routes/api.subscribe.tsx`
- Modify: `env.d.ts` (add `NEWSLETTER_WELCOME_CODE?: string` next to `SHOPIFY_ADMIN_ACCESS_TOKEN`)
- Test: `scripts/newsletter.node-test.mjs`

- [ ] **Step 1: Failing tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildConsentInput,
  isValidEmail,
  NEWSLETTER_HONEYPOT_FIELD,
  normalizeEmail,
} from '../app/lib/newsletter.ts';
import {subscribeEmail} from '../app/lib/newsletter.server.ts';
import {ReviewsNotConfiguredError} from '../app/lib/reviews.server.ts';

test('emails are trimmed and lower-cased, then validated', () => {
  assert.equal(normalizeEmail('  Ana@Example.COM '), 'ana@example.com');
  assert.equal(NEWSLETTER_HONEYPOT_FIELD, 'website');
  for (const ok of ['a@b.co', 'first.last+tag@sub.example.org'])
    assert.equal(isValidEmail(ok), true, ok);
  for (const bad of ['', 'ab.co', 'a@b', 'a b@c.co', 'a@@b.co', `${'x'.repeat(250)}@b.co`])
    assert.equal(isValidEmail(bad), false, bad || '(empty)');
});

test('the consent input subscribes with single opt-in and a timestamp', () => {
  const input = buildConsentInput(new Date('2026-10-22T10:00:00Z'));
  assert.deepEqual(input, {
    marketingState: 'SUBSCRIBED',
    marketingOptInLevel: 'SINGLE_OPT_IN',
    consentUpdatedAt: '2026-10-22T10:00:00.000Z',
  });
});

function fakeClient(script) {
  const calls = [];
  const client = async (query, variables) => {
    calls.push({query, variables});
    const step = script.shift();
    if (!step) throw new Error(`unexpected call: ${query.slice(0, 40)}`);
    if (step instanceof Error) throw step;
    return step;
  };
  return {calls, client};
}

const env = {SHOPIFY_ADMIN_ACCESS_TOKEN: 't', PUBLIC_STORE_DOMAIN: 'x.myshopify.com'};

test('a new address is created as a subscribed customer', async () => {
  const {calls, client} = fakeClient([
    {customerCreate: {customer: {id: 'gid://shopify/Customer/1'}, userErrors: []}},
  ]);
  const result = await subscribeEmail(env, {email: 'New@Example.com'}, {client});
  assert.equal(result.status, 'subscribed');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].variables.input.email, 'new@example.com');
  assert.deepEqual(calls[0].variables.input.tags, ['newsletter', 'source:storefront']);
  assert.equal(calls[0].variables.input.emailMarketingConsent.marketingState, 'SUBSCRIBED');
});

test('an existing address gets its consent updated', async () => {
  const {calls, client} = fakeClient([
    {customerCreate: {customer: null, userErrors: [{field: ['input', 'email'], message: 'Email has already been taken'}]}},
    {customers: {nodes: [{id: 'gid://shopify/Customer/9', emailMarketingConsent: {marketingState: 'NOT_SUBSCRIBED'}}]}},
    {customerEmailMarketingConsentUpdate: {customer: {id: 'gid://shopify/Customer/9'}, userErrors: []}},
  ]);
  const result = await subscribeEmail(env, {email: 'old@example.com'}, {client});
  assert.equal(result.status, 'subscribed');
  assert.equal(calls.length, 3);
  assert.equal(calls[2].variables.input.customerId, 'gid://shopify/Customer/9');
});

test('an address that is already subscribed is reported as such', async () => {
  const {client} = fakeClient([
    {customerCreate: {customer: null, userErrors: [{field: ['input', 'email'], message: 'Email has already been taken'}]}},
    {customers: {nodes: [{id: 'gid://shopify/Customer/9', emailMarketingConsent: {marketingState: 'SUBSCRIBED'}}]}},
  ]);
  const result = await subscribeEmail(env, {email: 'old@example.com'}, {client});
  assert.equal(result.status, 'already');
});

test('other user errors and access problems throw', async () => {
  const denied = fakeClient([new Error('Admin API request failed: ACCESS_DENIED')]);
  await assert.rejects(() => subscribeEmail(env, {email: 'a@b.co'}, {client: denied.client}), /ACCESS_DENIED/);
  const invalid = fakeClient([
    {customerCreate: {customer: null, userErrors: [{field: ['input', 'email'], message: 'Email is invalid'}]}},
  ]);
  await assert.rejects(() => subscribeEmail(env, {email: 'a@b.co'}, {client: invalid.client}), /invalid/);
});

test('without an admin token the feature reports itself disabled', async () => {
  const result = await subscribeEmail({PUBLIC_STORE_DOMAIN: 'x.myshopify.com'}, {email: 'a@b.co'});
  assert.equal(result.status, 'disabled');
  assert.ok(new ReviewsNotConfiguredError() instanceof Error);
});
```

Run: `node --test scripts/newsletter.node-test.mjs` → FAIL (modules missing).

- [ ] **Step 2: `app/lib/newsletter.ts`**

```ts
/** Pure helpers for the email sign-up; the server module and the form share them. */

export const NEWSLETTER_HONEYPOT_FIELD = 'website';
export const NEWSLETTER_ACTION = '/api/subscribe';
export const NEWSLETTER_TAGS = ['newsletter', 'source:storefront'];

export function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

/** RFC-lite: one @, something before it, a dot in the domain, no spaces, ≤ 254. */
export function isValidEmail(email: string) {
  if (!email || email.length > 254 || /\s/.test(email)) return false;
  const at = email.indexOf('@');
  if (at < 1 || at !== email.lastIndexOf('@')) return false;
  const domain = email.slice(at + 1);
  return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.');
}

export type ConsentInput = {
  marketingState: 'SUBSCRIBED';
  marketingOptInLevel: 'SINGLE_OPT_IN';
  consentUpdatedAt: string;
};

export function buildConsentInput(now: Date = new Date()): ConsentInput {
  return {
    marketingState: 'SUBSCRIBED',
    marketingOptInLevel: 'SINGLE_OPT_IN',
    consentUpdatedAt: now.toISOString(),
  };
}

export type SubscribeStatus = 'subscribed' | 'already' | 'disabled';
```

- [ ] **Step 3: `app/lib/newsletter.server.ts`**

```ts
/**
 * Email sign-up → Shopify customer with marketing consent, through the
 * Admin API. Server-only: never import from client code. Reuses the
 * reviews feature's Admin caller, so the same SHOPIFY_ADMIN_ACCESS_TOKEN
 * (now also needing read_customers + write_customers) powers both.
 */
import {
  createAdminClient,
  ReviewsNotConfiguredError,
  type AdminClient,
} from './reviews.server.ts';
import {
  buildConsentInput,
  NEWSLETTER_TAGS,
  normalizeEmail,
  type SubscribeStatus,
} from './newsletter.ts';

type UserError = {field?: string[] | null; message: string};

type CreateResult = {
  customerCreate: {customer: {id: string} | null; userErrors: UserError[]};
};
type LookupResult = {
  customers: {
    nodes: Array<{id: string; emailMarketingConsent?: {marketingState?: string | null} | null}>;
  };
};
type ConsentResult = {
  customerEmailMarketingConsentUpdate: {customer: {id: string} | null; userErrors: UserError[]};
};

const CREATE = `#graphql
  mutation NewsletterCustomerCreate($input: CustomerInput!) {
    customerCreate(input: $input) { customer { id } userErrors { field message } }
  }`;
const LOOKUP = `#graphql
  query NewsletterCustomerByEmail($query: String!) {
    customers(first: 1, query: $query) { nodes { id emailMarketingConsent { marketingState } } }
  }`;
const CONSENT = `#graphql
  mutation NewsletterConsent($input: CustomerEmailMarketingConsentUpdateInput!) {
    customerEmailMarketingConsentUpdate(input: $input) { customer { id } userErrors { field message } }
  }`;

function isTaken(errors: UserError[]) {
  return errors.some(
    (e) => (e.field ?? []).includes('email') && /taken|already/i.test(e.message),
  );
}

function raise(errors: UserError[], label: string): never {
  throw new Error(`${label}: ${errors.map((e) => e.message).join('; ')}`);
}

export async function subscribeEmail(
  env: Pick<Env, 'SHOPIFY_ADMIN_ACCESS_TOKEN' | 'PUBLIC_STORE_DOMAIN'>,
  {email: rawEmail}: {email: string},
  deps: {client?: AdminClient; now?: Date} = {},
): Promise<{status: SubscribeStatus}> {
  let client = deps.client;
  if (!client) {
    try {
      client = createAdminClient(env as Env);
    } catch (error) {
      if (error instanceof ReviewsNotConfiguredError) return {status: 'disabled'};
      throw error;
    }
  }
  const email = normalizeEmail(rawEmail);
  const emailMarketingConsent = buildConsentInput(deps.now);

  const created = await client<CreateResult>(CREATE, {
    input: {email, tags: NEWSLETTER_TAGS, emailMarketingConsent},
  });
  const createErrors = created.customerCreate.userErrors ?? [];
  if (!createErrors.length) return {status: 'subscribed'};
  if (!isTaken(createErrors)) raise(createErrors, 'customerCreate');

  const found = await client<LookupResult>(LOOKUP, {query: `email:${JSON.stringify(email)}`});
  const customer = found.customers.nodes[0];
  if (!customer) raise(createErrors, 'customerCreate (taken but not found)');
  if (customer.emailMarketingConsent?.marketingState === 'SUBSCRIBED') return {status: 'already'};

  const updated = await client<ConsentResult>(CONSENT, {
    input: {customerId: customer.id, emailMarketingConsent},
  });
  const consentErrors = updated.customerEmailMarketingConsentUpdate.userErrors ?? [];
  if (consentErrors.length) raise(consentErrors, 'customerEmailMarketingConsentUpdate');
  return {status: 'subscribed'};
}
```

If `createAdminClient`'s `Env` parameter type rejects the `Pick`, cast as shown; do not change `reviews.server.ts`. The Admin query string for `customers(query:)` must be `email:"a@b.co"` (quoted), which the `JSON.stringify` produces.

- [ ] **Step 4: `app/routes/api.subscribe.tsx`**

```tsx
import {data, redirect} from 'react-router';
import type {Route} from './+types/api.subscribe';
import {
  isValidEmail,
  NEWSLETTER_HONEYPOT_FIELD,
  normalizeEmail,
} from '~/lib/newsletter';
import {subscribeEmail} from '~/lib/newsletter.server';

/** POST only; GET is not a page. */
export async function loader() {
  throw new Response('Method Not Allowed', {status: 405});
}

// Best-effort per-IP throttle; Oxygen isolates are short-lived, so this
// only blunts bursts from one client.
const WINDOW_MS = 5_000;
const lastSubmit = new Map<string, number>();

function clientIp(request: Request) {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

function throttled(ip: string, now = Date.now()) {
  for (const [key, at] of lastSubmit) if (now - at > WINDOW_MS) lastSubmit.delete(key);
  const last = lastSubmit.get(ip);
  lastSubmit.set(ip, now);
  return last !== undefined && now - last < WINDOW_MS;
}

function safeRedirect(target: FormDataEntryValue | null) {
  return typeof target === 'string' && /^\/(?!\/)/.test(target) ? target : '/';
}

export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return data({ok: false, error: 'method'}, {status: 405});
  }
  const form = await request.formData();
  const wantsHtml = !request.headers.get('accept')?.includes('application/json')
    && form.get('_fetcher') !== '1';
  const redirectTo = safeRedirect(form.get('redirectTo'));
  const answer = (body: {ok: boolean; status?: string; error?: string}, status = 200) =>
    wantsHtml
      ? redirect(
          `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}subscribed=${body.ok ? 1 : 0}${
            body.error ? `&reason=${body.error}` : ''
          }${body.status ? `&status=${body.status}` : ''}`,
        )
      : data(body, {status});

  const honeypot = form.get(NEWSLETTER_HONEYPOT_FIELD);
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return answer({ok: true, status: 'subscribed'});
  }
  const raw = form.get('email');
  const email = typeof raw === 'string' ? normalizeEmail(raw) : '';
  if (!isValidEmail(email)) return answer({ok: false, error: 'invalid'}, 400);
  if (throttled(clientIp(request))) return answer({ok: false, error: 'slow-down'}, 429);

  try {
    const result = await subscribeEmail(context.env, {email});
    if (result.status === 'disabled') return answer({ok: false, error: 'disabled'}, 503);
    return answer({ok: true, status: result.status});
  } catch (error) {
    console.error('Newsletter sign-up failed.', error);
    return answer({ok: false, error: 'failed'}, 502);
  }
}
```

The form (Task 2) sends a hidden `_fetcher=1` field when submitted through the fetcher, so JSON comes back; a plain HTML post redirects.

- [ ] **Step 5: `env.d.ts`** — add `NEWSLETTER_WELCOME_CODE?: string;` with a one-line comment ("shown to subscribers once the owner has created the code in Shopify").

- [ ] **Step 6: Verify, commit**

`node --test scripts/newsletter.node-test.mjs` → PASS (6 tests); `npm run typecheck`; `npm run lint`.

```
git add app/lib/newsletter.ts app/lib/newsletter.server.ts app/routes/api.subscribe.tsx env.d.ts scripts/newsletter.node-test.mjs
git commit -m "Add the email sign-up endpoint backed by Shopify customers

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Copy, form component, footer, homepage section, root loader

**Files:**
- Modify: `app/content/brand.ts` (add `newsletter`), `app/root.tsx` (loader `newsletter`), `app/components/ClaraShell.tsx` (footer), `app/routes/_index.tsx` (journal teaser → sign-up section + CSS), `app/styles/app.css` (footer form styles)
- Create: `app/components/NewsletterForm.tsx`
- Test: append to `scripts/brand.node-test.mjs`

- [ ] **Step 1: Failing test** (append to `scripts/brand.node-test.mjs`)

```js
test('the newsletter copy and forms are wired', () => {
  assert.equal(BRAND.newsletter.title, 'New work first. A letter now and then.');
  assert.match(BRAND.newsletter.success('WELCOME10'), /WELCOME10/);
  assert.doesNotMatch(BRAND.newsletter.success(null), /code/i);
  assert.match(BRAND.newsletter.body('X'), /10 % off/);
  assert.doesNotMatch(BRAND.newsletter.body(null), /10 %/);
  const form = readFileSync(path.join(ROOT, 'app/components/NewsletterForm.tsx'), 'utf8');
  assert.match(form, /action=\{NEWSLETTER_ACTION\}|action="\/api\/subscribe"/);
  assert.match(form, /NEWSLETTER_HONEYPOT_FIELD/);
  const shell = readFileSync(path.join(ROOT, 'app/components/ClaraShell.tsx'), 'utf8');
  assert.match(shell, /<NewsletterForm variant="footer"/);
  const home = readFileSync(path.join(ROOT, 'app/routes/_index.tsx'), 'utf8');
  assert.match(home, /<NewsletterForm variant="feature"/);
  assert.doesNotMatch(home, /className="journal-teaser-card"\s+to=/);
});
```

- [ ] **Step 2: `BRAND.newsletter`** (after `letter` in `app/content/brand.ts`)

```ts
  newsletter: {
    eyebrow: 'Letters from Nicosia',
    title: 'New work first. A letter now and then.',
    body: (code: string | null) =>
      `Sign up and new pieces reach you before anyone else${
        code ? ', with 10 % off your first order' : ''
      }. No noise; leave whenever you like.`,
    footerLine: (code: string | null) =>
      `Letters from Nicosia — new work first${code ? ', 10 % off your first order' : ''}.`,
    label: 'Email address',
    placeholder: 'your@email.com',
    button: 'Sign me up',
    submitting: 'Signing you up…',
    success: (code: string | null) =>
      code
        ? `You're in. Your code: ${code} — 10 % off your first order.`
        : "You're in. New work reaches you first.",
    already: "You're already on the list. New work reaches you first.",
    invalid: "That doesn't look like an email address.",
    slowDown: 'One moment, then try again.',
    disabled:
      "Sign-ups aren't open yet. Write to hello@shopclaramendes.com and we'll add you by hand.",
    failed: "That didn't go through. Try again, or write to hello@shopclaramendes.com.",
    consent: 'By signing up you agree to receive emails from Clara Mendes. Unsubscribe any time.',
    privacyLabel: 'Privacy',
    journalLink: 'Enter the journal →',
  },
```

- [ ] **Step 3: Root loader** — in `app/root.tsx` `loader`, add to the returned object:

```ts
    newsletter: {
      enabled: Boolean(env.SHOPIFY_ADMIN_ACCESS_TOKEN),
      welcomeCode: env.NEWSLETTER_WELCOME_CODE?.trim() || null,
    },
```

- [ ] **Step 4: `app/components/NewsletterForm.tsx`**

```tsx
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
```

If `fetcher.Form` does not accept `ref` in this React Router version, wrap with `useFetcher` + a plain `<fetcher.Form>` and reset through `document.getElementById(...)`; keep behaviour the same.

- [ ] **Step 5: Footer** — in `ClaraFooter` (`app/components/ClaraShell.tsx`), after the blurb `<p>` inside the first `<div>`, add `<NewsletterForm variant="footer" />` and import it. Styles in `app/styles/app.css` right after the `.site-footer` rules:

```css
/* ── Footer sign-up ── */
.newsletter--footer { margin-top: 22px; max-width: 420px; }
.newsletter__line { color: var(--color-paper); font-size: 0.92rem; line-height: 1.5; margin: 0 0 10px; }
.newsletter__label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.newsletter__trap { position: absolute; left: -10000px; top: auto; width: 1px; height: 1px; overflow: hidden; }
.newsletter__row { display: flex; gap: 8px; }
.newsletter__input {
  background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(251, 250, 246, 0.35);
  border-radius: 999px; color: var(--color-paper); flex: 1 1 auto; font-size: 0.95rem;
  min-height: 44px; min-width: 0; padding: 0 16px;
}
.newsletter__input::placeholder { color: rgba(251, 250, 246, 0.55); }
.newsletter__input:focus-visible { outline: 2px solid var(--color-paper); outline-offset: 2px; }
.newsletter__button {
  background: var(--color-paper); border: 0; border-radius: 999px; color: var(--color-ink);
  cursor: pointer; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.14em;
  min-height: 44px; padding: 0 18px; text-transform: uppercase; white-space: nowrap;
}
.newsletter__button:disabled { opacity: 0.7; cursor: default; }
.newsletter__button:focus-visible { outline: 2px solid var(--color-paper); outline-offset: 2px; }
.newsletter__message { font-size: 0.9rem; line-height: 1.5; margin: 10px 0 0; }
.newsletter__message.is-error { color: #f3c9b8; }
.newsletter__consent { font-size: 0.74rem; line-height: 1.5; margin: 10px 0 0; opacity: 0.75; }
.newsletter__consent a { color: inherit; text-decoration: underline; }
@media (max-width: 560px) {
  .newsletter__row { flex-direction: column; }
}
```

- [ ] **Step 6: Homepage section** — replace the `home-journal-teaser` section's contents in `app/routes/_index.tsx`:

```tsx
      <section
        className="home-journal-teaser"
        data-chapter="ink"
        aria-label="Letters from Nicosia — sign up"
      >
        <div className="journal-teaser-card" data-reveal>
          <div className="journal-teaser-sky" aria-hidden>
            <div className="journal-teaser-cloud" />
          </div>
          <div className="journal-teaser-copy">
            <span className="journal-teaser-eyebrow">{BRAND.newsletter.eyebrow}</span>
            <span className="journal-teaser-title">{BRAND.newsletter.title}</span>
            <span className="journal-teaser-line">{BRAND.newsletter.body(welcomeCode)}</span>
            <NewsletterForm variant="feature" />
            <Link className="journal-teaser-cta" to="/blogs/karina-of-time" prefetch="intent">
              {BRAND.newsletter.journalLink}
            </Link>
          </div>
        </div>
      </section>
```

`welcomeCode` comes from `useRouteLoaderData<typeof rootLoader>('root')?.newsletter.welcomeCode ?? null` in the `Homepage` component (import the root loader type as in the form). Import `NewsletterForm`.

CSS in `homeCss`: `.journal-teaser-card` was an `<a>`; make sure the rules do not depend on it being a link (`text-decoration`, `cursor`): keep hover lift on `.journal-teaser-cta` only. Add:

```css
.journal-teaser-copy .newsletter--feature { margin: 22px 0 6px; max-width: 520px; }
.journal-teaser-copy .newsletter__row { display: flex; gap: 8px; }
.journal-teaser-copy .newsletter__input {
  background: rgba(251, 250, 246, 0.14); border: 1px solid rgba(251, 250, 246, 0.45);
  border-radius: 999px; color: #fbfaf6; flex: 1 1 auto; font-size: 1rem; min-height: 46px; min-width: 0; padding: 0 18px;
}
.journal-teaser-copy .newsletter__input::placeholder { color: rgba(251, 250, 246, 0.6); }
.journal-teaser-copy .newsletter__button {
  background: #fbfaf6; border: 0; border-radius: 999px; color: #26231f; cursor: pointer;
  font-size: 0.74rem; font-weight: 600; letter-spacing: 0.14em; min-height: 46px; padding: 0 20px; text-transform: uppercase; white-space: nowrap;
}
.journal-teaser-copy .newsletter__button:disabled { opacity: 0.7; cursor: default; }
.journal-teaser-copy .newsletter__input:focus-visible,
.journal-teaser-copy .newsletter__button:focus-visible { outline: 2px solid #fbfaf6; outline-offset: 2px; }
.journal-teaser-copy .newsletter__message { font-size: 0.95rem; margin: 10px 0 0; }
.journal-teaser-copy .newsletter__message.is-error { color: #f3c9b8; }
.journal-teaser-copy .newsletter__consent { font-size: 0.76rem; margin: 8px 0 0; opacity: 0.8; }
.journal-teaser-copy .newsletter__consent a { color: inherit; text-decoration: underline; }
.journal-teaser-copy .newsletter__label,
.journal-teaser-copy .newsletter__trap { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
@media (max-width: 560px) { .journal-teaser-copy .newsletter__row { flex-direction: column; } }
```

The `journal-teaser-copy` element must be `position: relative` for the off-screen label/trap rule to stay inside the card; check the existing rule and add it if missing. The `journal-teaser-cta` keeps its underline/arrow styling.

- [ ] **Step 7: Verify, commit**

`node --test scripts/brand.node-test.mjs scripts/newsletter.node-test.mjs scripts/mobileLanding.node-test.mjs scripts/liquidGlass.node-test.mjs` → PASS; `npm run typecheck`; `npm run lint`.

```
git add app/content/brand.ts app/root.tsx app/components/NewsletterForm.tsx app/components/ClaraShell.tsx app/routes/_index.tsx app/styles/app.css scripts/brand.node-test.mjs
git commit -m "Add the email sign-up to the footer and the homepage

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 3: Sweep and PR (coordinator)

Dev server: footer and homepage forms at 1440 and 375 in idle, invalid (`a@b`), and disabled (no admin token locally → 503 → "Sign-ups aren't open yet") states; POST `/api/subscribe` with curl: honeypot → ok, bad email → 400, plain form → 302 with `?subscribed=0&reason=disabled`. Then PR with the owner's four actions.
