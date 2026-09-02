// Server-side render of the real print for the static page images. Plain
// JS (createElement, no JSX) so ESLint parses it as a script; it is bundled
// by esbuild at run time (scripts/generate-your-sky-images.mjs) because the
// sky renderer it imports is TSX, which Node cannot strip on its own.
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {validateSkyParams} from '../../app/lib/sky/params.ts';
import {computeSky} from '../../app/lib/sky/scene.ts';
import {SkySvg} from '../../app/lib/sky/svg.tsx';
import {SKY_THEMES} from '../../app/lib/sky/themes.ts';

/**
 * @param {{catalog: object, params: Record<string, unknown>, plateDataUrl: string | null, size: '8x10' | '20x24', theme?: string}} input
 */
export function renderSkySvg({
  catalog,
  params,
  plateDataUrl,
  size,
  theme = 'linen',
}) {
  const validated = validateSkyParams(params);
  if (!validated.ok) throw new Error(validated.error);
  const scene = computeSky({params: validated.params, size, catalog});
  const svg = renderToStaticMarkup(
    createElement(SkySvg, {
      scene,
      theme: SKY_THEMES[theme],
      plateUrl: plateDataUrl,
    }),
  );
  return {scene, svg};
}
