/**
 * EB Garamond (regular + italic) for every server-rendered PDF, fetched
 * from the storefront's own public assets and cached per isolate.
 *
 * The PDF copies live under /fonts/pdf/*.bin on purpose: Shopify's CDN
 * ("imagery" optimisation) transcodes anything served as a font — the
 * /fonts/*.ttf files arrive as WOFF2 even though the deploy holds TrueType.
 * pdf-lib can read WOFF2 for metrics but embeds the raw bytes as a TrueType
 * font program, which PDF readers and print RIPs cannot use. A non-font
 * extension is served byte for byte, and every load is checked, so a font
 * that is not TrueType fails loudly instead of printing broken text.
 */
import type {SkyFonts} from './pdf.server.ts';

export const PDF_FONT_PATHS = {
  regular: '/fonts/pdf/EBGaramond-Regular.bin',
  italic: '/fonts/pdf/EBGaramond-Italic.bin',
} as const;

let fontsPromise: Promise<SkyFonts> | null = null;

/** TrueType (0x00010000 or 'true') — the only font program PDFs embed here. */
export function isTrueTypeFont(bytes: Uint8Array) {
  if (bytes.length < 4) return false;
  const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  return tag === '\u0000\u0001\u0000\u0000' || tag === 'true';
}

export async function fetchPublicBytes(url: URL) {
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`${url.pathname} → ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function fetchTrueType(url: URL) {
  const bytes = await fetchPublicBytes(url);
  if (!isTrueTypeFont(bytes)) {
    const tag = String.fromCharCode(...bytes.slice(0, 4));
    throw new Error(`${url.pathname} is not a TrueType font (starts "${tag}")`);
  }
  return bytes;
}

export function loadSkyFonts(base: URL): Promise<SkyFonts> {
  fontsPromise ??= Promise.all([
    fetchTrueType(new URL(PDF_FONT_PATHS.regular, base)),
    fetchTrueType(new URL(PDF_FONT_PATHS.italic, base)),
  ])
    .then(([regular, italic]) => ({regular, italic}))
    .catch((error: unknown) => {
      fontsPromise = null;
      throw error;
    });
  return fontsPromise;
}

/**
 * The same fonts for a PDF route, or null after logging — callers answer
 * 503 so Prodigi (or the browser) retries instead of receiving a PDF with
 * an unusable font.
 */
export async function loadSkyFontsOrNull(base: URL, route: string) {
  try {
    return await loadSkyFonts(base);
  } catch (error: unknown) {
    console.error(`${route}: fonts unavailable`, error);
    return null;
  }
}

export function fontsUnavailableResponse() {
  return new Response('Fonts temporarily unavailable', {
    status: 503,
    headers: {'Retry-After': '60'},
  });
}
