/** Pure helpers for the email sign-up; the server module and the form share them. */

export const NEWSLETTER_HONEYPOT_FIELD = 'website';
export const NEWSLETTER_ACTION = '/api/subscribe';
export const NEWSLETTER_TAGS = ['newsletter', 'source:storefront'];

export function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

/** Quotes, brackets, separators and control characters never belong in a sign-up address. */
// eslint-disable-next-line no-control-regex
const FORBIDDEN_EMAIL_CHARS = /["'\\():;,<>*[\]\u0000-\u001f\u007f]/;

/**
 * RFC-lite: one @, something before it, a dot in the domain, no spaces,
 * none of FORBIDDEN_EMAIL_CHARS, ≤ 254.
 */
export function isValidEmail(email: string) {
  if (!email || email.length > 254 || /\s/.test(email)) return false;
  if (FORBIDDEN_EMAIL_CHARS.test(email)) return false;
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
