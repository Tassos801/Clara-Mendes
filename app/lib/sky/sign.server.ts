/**
 * HMAC-SHA256 signing of sky parameters (WebCrypto, works in Oxygen workers,
 * browsers and Node). The cart action signs; the webhook and the print route
 * verify, so nobody can order artwork we did not compute.
 *
 * Two kinds of signature exist and must never verify for each other:
 *
 * - The cart attribute `_sig` is a bare HMAC over the canonical parameters.
 *   It is returned to the browser in every cart response, so it proves only
 *   that the parameters came from this server.
 * - A token (`<base64url(canonical)>.<hmac>`) grants access to a print-ready
 *   asset or a packing slip. Its HMAC covers the purpose as well, so the
 *   `_sig` a customer can read from their cart cannot be turned into the
 *   URL of the finished print.
 */
import {
  canonicalSkyParams,
  parseCanonicalSkyParams,
  type SkyParams,
  type SkyValidation,
} from './params.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** What a token grants. Part of the signed message. */
export type TokenPurpose = 'print' | 'slip';

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

/** The message a token's HMAC covers: the purpose, then the canonical. */
function tokenMessage(purpose: TokenPurpose, canonical: string) {
  return `${purpose}\n${canonical}`;
}

/** `<base64url(canonical)>.<base64url(hmac)>` — safe in a URL path segment. */
export async function encodeCanonicalToken(
  canonical: string,
  secret: string,
  purpose: TokenPurpose,
) {
  const sig = await signCanonical(tokenMessage(purpose, canonical), secret);
  return `${base64UrlEncode(encoder.encode(canonical))}.${sig}`;
}

export type CanonicalTokenDecode =
  | {ok: true; canonical: string}
  | {ok: false; error: string};

/**
 * Verify a token's HMAC for the given purpose and return its canonical
 * string, kind-agnostic.
 */
export async function decodeCanonicalToken(
  token: string,
  secret: string,
  purpose: TokenPurpose,
): Promise<CanonicalTokenDecode> {
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) {
    return {ok: false, error: 'Malformed token.'};
  }
  const bytes = base64UrlDecode(body);
  if (!bytes) return {ok: false, error: 'Malformed token.'};
  const canonical = decoder.decode(bytes);
  if (!(await verifyCanonical(tokenMessage(purpose, canonical), sig, secret))) {
    return {ok: false, error: 'Bad signature.'};
  }
  return {ok: true, canonical};
}

export async function encodeSkyToken(params: SkyParams, secret: string) {
  return encodeCanonicalToken(canonicalSkyParams(params), secret, 'print');
}

export async function decodeSkyToken(
  token: string,
  secret: string,
): Promise<SkyValidation> {
  const decoded = await decodeCanonicalToken(token, secret, 'print');
  if (!decoded.ok) return decoded;
  const parsed = parseCanonicalSkyParams(decoded.canonical);
  if (!parsed.ok) return parsed;
  // The canonical form must survive a re-encode, or the signature covers
  // something other than what we render.
  if (canonicalSkyParams(parsed.params) !== decoded.canonical) {
    return {ok: false, error: 'Non-canonical token.'};
  }
  return parsed;
}
