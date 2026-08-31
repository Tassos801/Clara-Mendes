/**
 * Runs inside the cart action on LinesAdd: validates any personalised line
 * the browser submitted (star map or birth poster, told apart by their
 * `_kind` discriminator), re-encodes its attributes canonically and
 * attaches the HMAC signature. Plain lines pass through untouched.
 */
import {
  canonicalNatalParams,
  fromNatalCartAttributes,
  isNatalCartLine,
  toNatalCartAttributes,
} from '../natal/params.ts';
import {
  canonicalSkyParams,
  fromCartAttributes,
  isSkyCartLine,
  toCartAttributes,
} from './params.ts';
import {signCanonical} from './sign.server.ts';

type LineLike = {
  attributes?: Array<{key: string; value?: string | null}> | null;
  [key: string]: unknown;
};

export const SKY_UNAVAILABLE_MESSAGE =
  'Personalisation is not available right now. Please try again later.';

export async function signSkyCartLines<T extends LineLike>(
  lines: T[],
  secret: string | undefined,
): Promise<{ok: true; lines: T[]} | {ok: false; error: string}> {
  const out: T[] = [];
  for (const line of lines) {
    if (isNatalCartLine(line.attributes)) {
      if (!secret) return {ok: false, error: SKY_UNAVAILABLE_MESSAGE};
      const decoded = fromNatalCartAttributes(line.attributes);
      if (!decoded.ok) return {ok: false, error: decoded.error};
      const sig = await signCanonical(
        canonicalNatalParams(decoded.params),
        secret,
      );
      out.push({...line, attributes: toNatalCartAttributes(decoded.params, sig)});
      continue;
    }
    if (!isSkyCartLine(line.attributes)) {
      out.push(line);
      continue;
    }
    if (!secret) return {ok: false, error: SKY_UNAVAILABLE_MESSAGE};
    const decoded = fromCartAttributes(line.attributes);
    if (!decoded.ok) return {ok: false, error: decoded.error};
    const sig = await signCanonical(canonicalSkyParams(decoded.params), secret);
    out.push({...line, attributes: toCartAttributes(decoded.params, sig)});
  }
  return {ok: true, lines: out};
}
