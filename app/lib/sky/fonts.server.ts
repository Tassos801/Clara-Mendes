/**
 * EB Garamond (regular + italic) for every server-rendered PDF, fetched
 * from the storefront's own /fonts and cached per isolate. Both faces are
 * static public assets, so one fetch per worker lifetime is enough.
 */
import type {SkyFonts} from './pdf.server.ts';

let fontsPromise: Promise<SkyFonts> | null = null;

export async function fetchPublicBytes(url: URL) {
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`${url.pathname} → ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

export function loadSkyFonts(base: URL): Promise<SkyFonts> {
  fontsPromise ??= Promise.all([
    fetchPublicBytes(new URL('/fonts/EBGaramond-Regular.ttf', base)),
    fetchPublicBytes(new URL('/fonts/EBGaramond-Italic.ttf', base)),
  ])
    .then(([regular, italic]) => ({regular, italic}))
    .catch((error: unknown) => {
      fontsPromise = null;
      throw error;
    });
  return fontsPromise;
}
