/**
 * Shopify signs webhook bodies with HMAC-SHA256 over the raw bytes using
 * the app's client (API) secret, base64-encoded in X-Shopify-Hmac-Sha256.
 */
const encoder = new TextEncoder();

export async function verifyShopifyWebhook(
  rawBody: string,
  hmacHeader: string | null,
  secret: string,
) {
  if (!hmacHeader) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody)),
  );
  let binary = '';
  for (const b of digest) binary += String.fromCharCode(b);
  const expected = btoa(binary);
  if (expected.length !== hmacHeader.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ hmacHeader.charCodeAt(i);
  }
  return diff === 0;
}
