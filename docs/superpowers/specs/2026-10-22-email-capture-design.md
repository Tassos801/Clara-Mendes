# Email capture design

Approved by the owner on 2026-10-22. It covers the review item "no email sign-up anywhere" (acquisition is the bottleneck; see `docs/llm-wiki` analytics notes).

## Decisions

- Subscribers are **Shopify customers** with email-marketing consent, created through the Admin API. No external email service.
- Placement: a one-line form in the **footer of every page**, and a fuller **"Letters from Nicosia" section on the homepage** that takes over the journal teaser card (the journal link stays as a secondary link). No pop-ups.
- Promise: new work first, a letter now and then, and a **10 % welcome code**. The code is shown only when the owner has created it and configured it (see Owner actions).
- Double opt-in follows the store's own setting; the code does not force or bypass it.

## Server

`app/lib/newsletter.server.ts` (server-only, never imported by client code). It reuses `createAdminClient` from `app/lib/reviews.server.ts` rather than building a second Admin caller:

- `subscribeEmail(env, {email, source}) → {status: 'subscribed' | 'already' | 'disabled', message?}`.
  - If `createAdminClient` throws `ReviewsNotConfiguredError` (no `SHOPIFY_ADMIN_ACCESS_TOKEN`) → `disabled`.
  - `customerCreate` with `{email, tags: ['newsletter', 'source:storefront'], emailMarketingConsent: {marketingState: SUBSCRIBED, marketingOptInLevel: SINGLE_OPT_IN, consentUpdatedAt: <now ISO>}}`.
  - If the mutation's `userErrors` say the email is taken (`field` includes `email` and message matches /taken|already/i): `customers(first: 1, query: "email:<email>")`, then `customerEmailMarketingConsentUpdate` with the same consent → `already` when that customer was already subscribed, else `subscribed`.
  - Any other `userErrors`, HTTP error, or an access-scope error (`ACCESS_DENIED` / "not approved to access") → throw; the route turns it into the generic failure. Scope problems are also logged with a clear message so the owner sees them in Oxygen logs.
- `app/lib/newsletter.ts` (pure, testable): `normalizeEmail` (trim, lower-case), `isValidEmail` (RFC-lite: one `@`, a dot in the domain, no spaces, ≤ 254 chars), `NEWSLETTER_HONEYPOT_FIELD = 'website'`, and the consent input builder.

`app/routes/api.subscribe.tsx`:

- `action` only (POST); `loader` answers 405.
- Reads `email`, the honeypot field, and `redirectTo` (site-relative path only; default `/`).
- Honeypot filled → pretend success (200 `{ok: true}`) without calling Shopify.
- Invalid email → 400 `{ok: false, error: 'invalid'}`.
- Per-IP throttle (`app/lib` has no shared helper): a module-level `Map<ip, lastSubmitMs>` pruned on each call, 1 submit per 5 s per IP (`cf-connecting-ip` / `x-forwarded-for` first hop / `'unknown'`), 429 `{ok: false, error: 'slow-down'}`. Best-effort only: Oxygen isolates are short-lived.
- Calls `subscribeEmail`; `disabled` → 503 `{ok: false, error: 'disabled'}`; thrown → 502 `{ok: false, error: 'failed'}`; else 200 `{ok: true, status}`.
- Non-JS fallback: when the request's `Accept` prefers HTML (plain form post), redirect to `redirectTo` with `?subscribed=1` / `?subscribed=0&reason=<error>`; the forms read that query to show the same messages.

`app/root.tsx` loader adds `newsletter: {enabled: Boolean(env.SHOPIFY_ADMIN_ACCESS_TOKEN), welcomeCode: env.NEWSLETTER_WELCOME_CODE ?? null}` (no secrets leave the server). `env.d.ts` gains `NEWSLETTER_WELCOME_CODE?: string`.

## Client

`app/components/NewsletterForm.tsx`: one component, two variants (`variant="footer" | "feature"`), using `useFetcher` to POST to `/api/subscribe`. States: idle, submitting (button "Signing you up…" and disabled), success, error. It renders:

- label (visually hidden in the footer variant), `<input type="email" name="email" autoComplete="email" required inputMode="email">`, the honeypot `<input name="website" tabIndex={-1} autoComplete="off" aria-hidden>` positioned off-screen, hidden `redirectTo`, and the button.
- Consent note: "By signing up you agree to receive emails from Clara Mendes. Unsubscribe any time. [Privacy]" linking to `/policies/privacy-policy`.
- Messages come from `BRAND.newsletter`; the success message includes the code only when `welcomeCode` is set.

Copy, in `BRAND.newsletter` (`app/content/brand.ts`):

- `eyebrow`: Letters from Nicosia
- `title`: New work first. A letter now and then.
- `body(code)`: "Sign up and new pieces reach you before anyone else{code ? `, with 10 % off your first order` : ''}. No noise; leave whenever you like."
- `footerLine(code)`: "Letters from Nicosia — new work first{code ? ', 10 % off your first order' : ''}."
- `placeholder`: your@email.com
- `button`: Sign me up
- `submitting`: Signing you up…
- `success(code)`: code ? `You're in. Your code: ${code} — 10 % off your first order.` : "You're in. New work reaches you first."
- `already`: "You're already on the list. New work reaches you first."
- `invalid`: That doesn't look like an email address.
- `slowDown`: One moment, then try again.
- `disabled`: Sign-ups aren't open yet. Write to hello@shopclaramendes.com and we'll add you by hand.
- `failed`: That didn't go through. Try again, or write to hello@shopclaramendes.com.
- `consent`: By signing up you agree to receive emails from Clara Mendes. Unsubscribe any time.
- `journalLink`: Enter the journal →

Footer (`ClaraFooter` in `app/components/ClaraShell.tsx`): under the blurb paragraph, `<NewsletterForm variant="footer" />`; styles in `app/styles/app.css` next to `.site-footer` (single row input + button on desktop, stacked on phones, paper-coloured text on `--color-deep`).

Homepage (`app/routes/_index.tsx`, the `home-journal-teaser` section): the card keeps its dusk sky and class names; its copy becomes eyebrow/title/body from `BRAND.newsletter`, then `<NewsletterForm variant="feature" />`, then the journal link as a plain `<Link className="journal-teaser-cta" to="/blogs/karina-of-time">`. The card stops being one big link (a form cannot live inside an anchor). Section `aria-label` becomes "Letters from Nicosia — sign up".

Styling: the feature form is an input + button pair at least 44 px tall on a translucent light field; focus rings visible on both backgrounds; messages use `role="status"` (success) and `role="alert"` (error).

## Owner actions (listed in the PR)

1. Shopify Admin → Settings → Apps and sales channels → Develop apps → the storefront's custom app → Configuration → Admin API scopes: add `read_customers`, `write_customers`; save; reinstall if prompted; copy the token to Oxygen as `SHOPIFY_ADMIN_ACCESS_TOKEN` (production environment).
2. Shopify Admin → Discounts → Create → Amount off order → code `WELCOME10`, 10 % off, Eligibility: all customers, Limit to one use per customer, no minimum, no end date. Then Oxygen env `NEWSLETTER_WELCOME_CODE=WELCOME10`.
3. Optional: Shopify Email → Automations → Welcome new subscribers, repeating the code.
4. Settings → Notifications → Customer marketing: decide whether "require confirmation" (double opt-in) is on.

Until 1 is done the forms show the "Sign-ups aren't open yet" message; until 2 is done they omit the code.

## Tests

- `scripts/newsletter.node-test.mjs`: `normalizeEmail`, `isValidEmail` (valid, missing @, spaces, too long, plus-addressing), the consent input builder (state, opt-in level, ISO timestamp), and `subscribeEmail` against a fake Admin client: create ok; email taken → lookup + consent update → `subscribed`/`already`; access denied → throws; no token → `disabled`.
- Source assertions: both forms post to `/api/subscribe`, honeypot present, the footer renders `NewsletterForm`, the homepage section no longer wraps the card in a `Link`.
- Typecheck, lint, `npm test`; dev-server check of footer + homepage forms at 1440 and 375 (idle, error, disabled states — the dev `.env` has no admin token so `disabled` is what will show locally; the created path is exercised by the unit test); after merge and after the owner's actions, a live sign-up with a test address and a check in Admin → Customers.

## Out of scope

Pop-ups, an external ESP, SMS, the welcome email's design, account creation with passwords, and the journal's own mailto footer (left as is).
