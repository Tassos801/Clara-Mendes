/**
 * computeSky for the live preview, reusing the previous scene's sky layers
 * when only the text changed. A title or place-label edit then hands the
 * SVG the very same star, line and Milky Way arrays, so its memoised
 * layers skip redrawing ~5,000 elements.
 */
import type {SkyCatalog} from './catalog.ts';
import type {SkyParams} from './params.ts';
import type {SkySizeKey} from './products.ts';
import {computeSky, skySceneText, type SkyScene} from './scene.ts';

/**
 * Everything that moves a mark in the disc or the rings. The `time` detail
 * only adds the hour to the text, so it is left out.
 */
export function skyLayerKey(p: SkyParams, size: SkySizeKey) {
  const layerDetails = p.details.filter((d) => d !== 'time').join(',');
  return [size, p.date, p.time, p.lat, p.lon, p.tz, p.layout, layerDetails].join(
    '|',
  );
}

export function createSkySceneMemo() {
  let last: {key: string; catalog: SkyCatalog; scene: SkyScene} | null = null;
  return (input: {
    params: SkyParams;
    size: SkySizeKey;
    catalog: SkyCatalog;
  }): SkyScene => {
    const key = skyLayerKey(input.params, input.size);
    if (last && last.key === key && last.catalog === input.catalog) {
      return {...last.scene, ...skySceneText(input.params)};
    }
    const scene = computeSky(input);
    last = {key, catalog: input.catalog, scene};
    return scene;
  };
}
