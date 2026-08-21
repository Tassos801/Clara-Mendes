/**
 * Runs inside the cart action on LinesAdd: validates any star-map line the
 * browser submitted, re-encodes its attributes canonically and attaches the
 * HMAC signature. Non-sky lines pass through untouched.
 */
import {fromCartAttributes, isSkyCartLine, toCartAttributes} from './params.ts';
import {signSkyParams} from './sign.server.ts';

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
    if (!isSkyCartLine(line.attributes)) {
      out.push(line);
      continue;
    }
    if (!secret) return {ok: false, error: SKY_UNAVAILABLE_MESSAGE};
    const decoded = fromCartAttributes(line.attributes);
    if (!decoded.ok) return {ok: false, error: decoded.error};
    const sig = await signSkyParams(decoded.params, secret);
    out.push({...line, attributes: toCartAttributes(decoded.params, sig)});
  }
  return {ok: true, lines: out};
}
