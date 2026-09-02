/**
 * Gift note for personalised prints (star map, birth poster). The customer
 * types it in the review step; it travels as a visible cart attribute (so
 * it shows in the cart, checkout, order emails and admin) with its own HMAC
 * beside it, and the paid-order webhook turns it into a Prodigi packing
 * slip. It never touches the artwork or its signature.
 */
import type {CartAttribute} from './params.ts';

export const GIFT_NOTE_KEY = 'Gift note';
export const GIFT_SIG_KEY = '_gift_sig';
export const GIFT_NOTE_MAX = 200;
export const GIFT_NOTE_MAX_LINES = 4;

/**
 * Trim, tame whitespace, drop control characters and cap the length so the
 * signed value is exactly what the slip prints. Returns '' for "no note".
 */
export function normaliseGiftNote(input: string | null | undefined): string {
  if (!input) return '';
  const printable = [...input.replace(/\r\n?/g, '\n').replace(/\t/g, ' ')]
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code === 10 || (code >= 32 && code !== 127);
    })
    .join('');
  const lines = printable
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line !== '')
    .slice(0, GIFT_NOTE_MAX_LINES);
  return [...lines.join('\n')].slice(0, GIFT_NOTE_MAX).join('').trim();
}

/** What the cart action signs and the webhook verifies for one line. */
export function giftNoteCanonical(note: string) {
  return `gift=1&note=${encodeURIComponent(note)}`;
}

export function giftNoteFromAttributes(
  attrs: ReadonlyArray<{key: string; value?: string | null}> | null | undefined,
): {note: string; sig: string | null} {
  const note = attrs?.find((a) => a.key === GIFT_NOTE_KEY)?.value ?? '';
  const sig = attrs?.find((a) => a.key === GIFT_SIG_KEY)?.value ?? null;
  return {note, sig};
}

export function giftAttributes(note: string, sig: string): CartAttribute[] {
  return [
    {key: GIFT_NOTE_KEY, value: note},
    {key: GIFT_SIG_KEY, value: sig},
  ];
}

/** Packing-slip token body: the order name and the note(s) to print. */
export type SlipContent = {orderName: string; note: string};

export function slipCanonical({orderName, note}: SlipContent) {
  return `slip=1&order=${encodeURIComponent(orderName)}&note=${encodeURIComponent(note)}`;
}

export function parseSlipCanonical(
  canonical: string,
): {ok: true; orderName: string; note: string} | {ok: false; error: string} {
  const params = new URLSearchParams(canonical);
  if (params.get('slip') !== '1')
    return {ok: false, error: 'Not a slip token.'};
  const orderName = params.get('order') ?? '';
  const note = params.get('note') ?? '';
  if (!orderName || !note) return {ok: false, error: 'Incomplete slip token.'};
  if (slipCanonical({orderName, note}) !== canonical) {
    return {ok: false, error: 'Non-canonical slip token.'};
  }
  return {ok: true, orderName, note};
}

export function giftSlipUrl(origin: string, token: string) {
  return `${origin}/api/sky-slip/${token}.pdf`;
}
