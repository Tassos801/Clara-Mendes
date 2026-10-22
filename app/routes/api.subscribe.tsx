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
    request.headers.get('oxygen-buyer-ip') ??
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

/**
 * Site-relative paths only. Parsed as a URL against a placeholder origin so
 * tricks like `/\evil.com` or `/<tab>/evil.com`, which browsers resolve
 * off-site, fall back to `/`.
 */
function safeRedirect(target: FormDataEntryValue | null) {
  if (typeof target !== 'string') return '/';
  try {
    const url = new URL(target, 'https://x.invalid');
    if (url.origin !== 'https://x.invalid' || /[\\\s]/.test(target)) return '/';
    return url.pathname + url.search;
  } catch {
    return '/';
  }
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
    const detail = error instanceof Error ? error.message : String(error);
    if (/ACCESS_DENIED|not approved to access/i.test(detail)) {
      console.error(
        'Newsletter sign-up: the Admin token lacks read_customers/write_customers. Add both scopes to the custom app and update SHOPIFY_ADMIN_ACCESS_TOKEN.',
      );
    }
    console.error('Newsletter sign-up failed.', error);
    return answer({ok: false, error: 'failed'}, 502);
  }
}
