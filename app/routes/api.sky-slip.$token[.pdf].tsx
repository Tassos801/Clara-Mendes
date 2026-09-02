import type {Route} from './+types/api.sky-slip.$token[.pdf]';
import {loadSkyFonts} from '~/lib/sky/fonts.server';
import {parseSlipCanonical} from '~/lib/sky/gift';
import {decodeCanonicalToken} from '~/lib/sky/sign.server';
import {renderGiftSlipPdf} from '~/lib/sky/slip.server';

/**
 * Gift packing slip for a signed token minted by the paid-order webhook.
 * Prodigi fetches this URL when it prints the order; the token carries the
 * order name and the note, so nothing is stored on our side.
 */
export async function loader({params, request, context}: Route.LoaderArgs) {
  const secret = context.env.SKY_SIGNING_SECRET;
  if (!secret) return new Response('Not configured', {status: 500});

  const decoded = await decodeCanonicalToken(params.token, secret);
  if (!decoded.ok) return new Response('Not found', {status: 404});
  const slip = parseSlipCanonical(decoded.canonical);
  if (!slip.ok) return new Response('Not found', {status: 404});

  const fonts = await loadSkyFonts(new URL(request.url));
  const pdf = await renderGiftSlipPdf({
    note: slip.note,
    orderName: slip.orderName,
    fonts,
    createdAt: new Date(),
  });

  return new Response(new Blob([pdf as BlobPart], {type: 'application/pdf'}), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="gift-note.pdf"',
      'Cache-Control': 'private, max-age=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
}
