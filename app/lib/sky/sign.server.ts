/**
 * HMAC-SHA256 signing of sky parameters (WebCrypto, works in Oxygen workers,
 * browsers and Node). The cart action signs; the webhook and the print route
 * verify, so nobody can order artwork we did not compute.
 */
import {
  canonicalSkyParams,
  parseCanonicalSkyParams,
  type SkyParams,
  type SkyValidation,
} from './params.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function base64UrlEncode(bytes: Uint8Array) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  const padded =
    text.replace(/-/g, '+').replace(/_/g, '/') +
    '='.repeat((4 - (text.length % 4)) % 4);
  try {
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  );
}

export async function signCanonical(canonical: string, secret: string) {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(canonical));
  return base64UrlEncode(new Uint8Array(sig));
}

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyCanonical(
  canonical: string,
  sig: string,
  secret: string,
) {
  const expected = await signCanonical(canonical, secret);
  return timingSafeEqual(expected, sig);
}

export async function signSkyParams(params: SkyParams, secret: string) {
  return signCanonical(canonicalSkyParams(params), secret);
}

/** `<base64url(canonical)>.<base64url(hmac)>` — safe in a URL path segment. */
export async function encodeSkyToken(params: SkyParams, secret: string) {
  const canonical = canonicalSkyParams(params);
  const sig = await signCanonical(canonical, secret);
  return `${base64UrlEncode(encoder.encode(canonical))}.${sig}`;
}

export async function decodeSkyToken(
  token: string,
  secret: string,
): Promise<SkyValidation> {
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) {
    return {ok: false, error: 'Malformed token.'};
  }
  const bytes = base64UrlDecode(body);
  if (!bytes) return {ok: false, error: 'Malformed token.'};
  const canonical = decoder.decode(bytes);
  if (!(await verifyCanonical(canonical, sig, secret))) {
    return {ok: false, error: 'Bad signature.'};
  }
  const parsed = parseCanonicalSkyParams(canonical);
  if (!parsed.ok) return parsed;
  // The canonical form must survive a re-encode, or the signature covers
  // something other than what we render.
  if (canonicalSkyParams(parsed.params) !== canonical) {
    return {ok: false, error: 'Non-canonical token.'};
  }
  return parsed;
}
