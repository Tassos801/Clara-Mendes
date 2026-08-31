import type {Route} from './+types/api.natal-print.$token[.pdf]';
import {
  canonicalNatalParams,
  parseCanonicalNatalParams,
} from '~/lib/natal/params';
import {renderNatalPdf} from '~/lib/natal/pdf.server';
import type {NatalSizeKey} from '~/lib/natal/products';
import {computeNatal} from '~/lib/natal/scene';
import {loadSkyCatalog} from '~/lib/sky/catalog';
import type {SkyFonts} from '~/lib/sky/pdf.server';
import {decodeCanonicalToken} from '~/lib/sky/sign.server';
import {platePath, SKY_THEMES} from '~/lib/sky/themes';

// Per-isolate caches: fonts and plates are static public assets.
let fontsPromise: Promise<SkyFonts> | null = null;
const plateCache = new Map<string, Promise<Uint8Array | null>>();

async function fetchBytes(url: URL) {
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`${url.pathname} → ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function loadFonts(base: URL) {
  fontsPromise ??= Promise.all([
    fetchBytes(new URL('/fonts/EBGaramond-Regular.ttf', base)),
    fetchBytes(new URL('/fonts/EBGaramond-Italic.ttf', base)),
  ])
    .then(([regular, italic]) => ({regular, italic}))
    .catch((error: unknown) => {
      fontsPromise = null;
      throw error;
    });
  return fontsPromise;
}

function loadPlate(base: URL, path: string) {
  let plate = plateCache.get(path);
  if (!plate) {
    plate = fetchBytes(new URL(path, base)).catch((error: unknown) => {
      console.error('natal-print: plate unavailable, using flat background', error);
      plateCache.delete(path);
      return null;
    });
    plateCache.set(path, plate);
  }
  return plate;
}

/**
 * Print-ready birth-poster PDF for a signed parameter token. Prodigi
 * fetches this URL after the order is created. `?size=` selects the sheet;
 * defaults to 8x10. Same statelessness as the sky's print route: nothing
 * stored, everything reproducible from the order.
 */
export async function loader({params, request, context}: Route.LoaderArgs) {
  const secret = context.env.SKY_SIGNING_SECRET;
  if (!secret) return new Response('Not configured', {status: 500});

  const decoded = await decodeCanonicalToken(params.token, secret);
  if (!decoded.ok) return new Response('Not found', {status: 404});
  const parsed = parseCanonicalNatalParams(decoded.canonical);
  if (!parsed.ok || canonicalNatalParams(parsed.params) !== decoded.canonical) {
    return new Response('Not found', {status: 404});
  }

  const url = new URL(request.url);
  const size: NatalSizeKey =
    url.searchParams.get('size') === '20x24' ? '20x24' : '8x10';
  const theme = SKY_THEMES[parsed.params.theme];

  const [catalog, fonts, plate] = await Promise.all([
    loadSkyCatalog(),
    loadFonts(url),
    loadPlate(url, platePath(theme.id, size)),
  ]);
  const scene = computeNatal({params: parsed.params, size, catalog});
  const pdf = await renderNatalPdf({
    scene,
    theme,
    fonts,
    plate,
    createdAt: new Date(`${parsed.params.date}T00:00:00Z`),
  });

  return new Response(new Blob([pdf as BlobPart], {type: 'application/pdf'}), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="first-light-${size}.pdf"`,
      'Cache-Control': 'private, max-age=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
}
