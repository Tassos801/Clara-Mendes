import type {Route} from './+types/api.sky-print.$token[.pdf]';
import {loadSkyCatalog} from '~/lib/sky/catalog';
import {loadSkyFonts} from '~/lib/sky/fonts.server';
import {renderSkyPdf} from '~/lib/sky/pdf.server';
import type {SkySizeKey} from '~/lib/sky/products';
import {computeSky} from '~/lib/sky/scene';
import {decodeSkyToken} from '~/lib/sky/sign.server';
import {platePath, SKY_THEMES} from '~/lib/sky/themes';

// Per-isolate cache: plates are static public assets (fonts: fonts.server).
const plateCache = new Map<string, Promise<Uint8Array | null>>();

async function fetchBytes(url: URL) {
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`${url.pathname} → ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function loadPlate(base: URL, path: string) {
  let plate = plateCache.get(path);
  if (!plate) {
    plate = fetchBytes(new URL(path, base)).catch((error: unknown) => {
      console.error('sky-print: plate unavailable, using flat background', error);
      plateCache.delete(path);
      return null;
    });
    plateCache.set(path, plate);
  }
  return plate;
}

/**
 * Print-ready PDF for a signed parameter token. Prodigi fetches this URL
 * (up to 10 attempts) after the order is created. `?size=` selects the
 * sheet; defaults to 8x10.
 */
export async function loader({params, request, context}: Route.LoaderArgs) {
  const secret = context.env.SKY_SIGNING_SECRET;
  if (!secret) return new Response('Not configured', {status: 500});

  const decoded = await decodeSkyToken(params.token, secret);
  if (!decoded.ok) return new Response('Not found', {status: 404});

  const url = new URL(request.url);
  const size: SkySizeKey =
    url.searchParams.get('size') === '20x24' ? '20x24' : '8x10';
  const theme = SKY_THEMES[decoded.params.theme];

  const [catalog, fonts, plate] = await Promise.all([
    loadSkyCatalog(),
    loadSkyFonts(url),
    loadPlate(url, platePath(theme.id, size)),
  ]);
  const scene = computeSky({params: decoded.params, size, catalog});
  const pdf = await renderSkyPdf({
    scene,
    theme,
    fonts,
    plate,
    createdAt: new Date(`${decoded.params.date}T00:00:00Z`),
  });

  return new Response(new Blob([pdf as BlobPart], {type: 'application/pdf'}), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="your-sky-${size}.pdf"`,
      'Cache-Control': 'private, max-age=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
}
