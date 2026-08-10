/**
 * Scene definitions and placement math for the room-mockup generator
 * (scripts/generate-room-mockups.mjs). Pure data + geometry so
 * scripts/roomMockups.node-test.mjs can assert the layout without sharp.
 *
 * All scenes crop public/images/backdrops/our-story-light.jpg (2560 x 1714),
 * a frontally photographed sage wall lit by a window at camera-left, so
 * placement is a plain rectangle — no warp. Crops are in source pixels;
 * print placement is computed in output pixels after the crop is resized to
 * MOCKUP_OUTPUT.
 *
 * Scale honesty: the detail crops contain no scale reference, so either print
 * may fill the frame like a close-up product shot. The context crop keeps the
 * floor lamp (IKEA-style shade, ~31 cm across ~265 source px, i.e.
 * ~8.5 px/cm). The 16 x 20 print is exactly twice the width of the 8 x 10
 * print in that shared scene, while the 20 x 24 print is 2.5 times as wide:
 * widthRatio 0.192, 0.384, and 0.48 respectively.
 */

// Art prints are 8 x 10 in portrait (4:5), same ratio as the flat shots.
export const ART_RATIO = {width: 4, height: 5};

export const MOCKUP_OUTPUT = {width: 1600, height: 2000};

export const MOCKUP_SCENES = [
  {
    key: 'detail',
    sizeKey: '8x10',
    source: 'public/images/backdrops/our-story-light.jpg',
    // Lamp-free stretch of wall left of the window-light wedge; plaster
    // texture and the light falloff keep it photographic.
    crop: {left: 60, top: 170, width: 1100, height: 1375},
    print: {centerXRatio: 0.5, centerYRatio: 0.46, widthRatio: 0.46},
    // Window light from camera-left: shadow falls right+down.
    shadow: {dx: 12, dy: 14, blur: 16, opacity: 0.3},
    contactShadow: {dx: 4, dy: 5, blur: 5, opacity: 0.24},
    sheen: {angle: 'top-left', opacity: 0.05},
    fileSuffix: 'room-detail',
    altFor: (shortTitle) =>
      `${shortTitle} art print shown unframed on a sage green wall`,
  },
  {
    key: 'context',
    sizeKey: '8x10',
    source: 'public/images/backdrops/our-story-light.jpg',
    // Tight crop around the lamp head; the print hangs in its light cone.
    // The shade (~31 cm) spans ~265 source px, so 173 source px keeps the
    // 20.3 cm print at true scale relative to the lamp while both fill the
    // tighter frame at a presentable size.
    crop: {left: 950, top: 450, width: 900, height: 1125},
    print: {centerXRatio: 0.3, centerYRatio: 0.5, widthRatio: 0.192},
    // The lamp above camera-right dominates: shadow falls down-left.
    shadow: {dx: -8, dy: 10, blur: 12, opacity: 0.3},
    contactShadow: {dx: -3, dy: 4, blur: 4, opacity: 0.22},
    sheen: {angle: 'top-right', opacity: 0.05},
    fileSuffix: 'room-context',
    altFor: (shortTitle) =>
      `${shortTitle} art print shown unframed at its true 8 by 10 inch size on a sage wall beside a reading lamp`,
  },
  {
    key: 'detail-16x20',
    sizeKey: '16x20',
    source: 'public/images/backdrops/our-story-light.jpg',
    crop: {left: 60, top: 170, width: 1100, height: 1375},
    print: {centerXRatio: 0.5, centerYRatio: 0.46, widthRatio: 0.46},
    shadow: {dx: 12, dy: 14, blur: 16, opacity: 0.3},
    contactShadow: {dx: 4, dy: 5, blur: 5, opacity: 0.24},
    sheen: {angle: 'top-left', opacity: 0.05},
    fileSuffix: 'room-detail-16x20',
    altFor: (shortTitle) =>
      `${shortTitle} 16 by 20 inch art print shown unframed on a sage green wall`,
  },
  {
    key: 'context-16x20',
    sizeKey: '16x20',
    source: 'public/images/backdrops/our-story-light.jpg',
    crop: {left: 950, top: 450, width: 900, height: 1125},
    print: {centerXRatio: 0.3, centerYRatio: 0.5, widthRatio: 0.384},
    shadow: {dx: -8, dy: 10, blur: 12, opacity: 0.3},
    contactShadow: {dx: -3, dy: 4, blur: 4, opacity: 0.22},
    sheen: {angle: 'top-right', opacity: 0.05},
    fileSuffix: 'room-context-16x20',
    altFor: (shortTitle) =>
      `${shortTitle} art print shown unframed at its true 16 by 20 inch size on a sage wall beside a reading lamp`,
  },
  {
    key: 'detail-20x24',
    sizeKey: '20x24',
    artRatio: {width: 5, height: 6},
    source: 'public/images/backdrops/our-story-light.jpg',
    crop: {left: 60, top: 170, width: 1100, height: 1375},
    print: {centerXRatio: 0.5, centerYRatio: 0.46, widthRatio: 0.46},
    shadow: {dx: 12, dy: 14, blur: 16, opacity: 0.3},
    contactShadow: {dx: 4, dy: 5, blur: 5, opacity: 0.24},
    sheen: {angle: 'top-left', opacity: 0.05},
    fileSuffix: 'room-detail-20x24',
    altFor: (shortTitle) =>
      `${shortTitle} 20 by 24 inch art print shown unframed on a sage green wall`,
  },
  {
    key: 'context-20x24',
    sizeKey: '20x24',
    artRatio: {width: 5, height: 6},
    source: 'public/images/backdrops/our-story-light.jpg',
    crop: {left: 950, top: 450, width: 900, height: 1125},
    print: {centerXRatio: 0.3, centerYRatio: 0.5, widthRatio: 0.48},
    shadow: {dx: -8, dy: 10, blur: 12, opacity: 0.3},
    contactShadow: {dx: -3, dy: 4, blur: 4, opacity: 0.22},
    sheen: {angle: 'top-right', opacity: 0.05},
    fileSuffix: 'room-context-20x24',
    altFor: (shortTitle) =>
      `${shortTitle} art print shown unframed at its true 20 by 24 inch size on a sage wall beside a reading lamp`,
  },
];

export function filterMockupScenes(scenes, sizeKey) {
  if (!sizeKey) return scenes;
  if (!['8x10', '16x20', '20x24'].includes(sizeKey)) {
    throw new Error(`Unknown mockup size filter: ${sizeKey}`);
  }
  return scenes.filter((scene) => scene.sizeKey === sizeKey);
}

export function computePrintPlacement(scene, output = MOCKUP_OUTPUT) {
  const width = Math.round(output.width * scene.print.widthRatio);
  const ratio = scene.artRatio ?? ART_RATIO;
  const height = Math.round((width * ratio.height) / ratio.width);
  const left = Math.round(output.width * scene.print.centerXRatio - width / 2);
  const top = Math.round(output.height * scene.print.centerYRatio - height / 2);

  if (left < 0 || top < 0) {
    throw new Error(`${scene.key}: print placed outside the top/left edge`);
  }
  if (left + width > output.width || top + height > output.height) {
    throw new Error(`${scene.key}: print placed outside the bottom/right edge`);
  }

  return {left, top, width, height};
}

/**
 * Decides what the media-append sync should do for one product, so the
 * duplicate guard stays unit-testable without the Admin API.
 *
 * - 'complete': every planned mockup alt already exists — nothing to do.
 * - 'mismatch': alts differ but the product already carries the full media
 *   count (flat art + all mockups); appending would duplicate, so surface
 *   it for manual resolution instead of mutating.
 * - 'append': append `missing`.
 */
export function resolveMockupAppendPlan(existingMedia, plannedMedia) {
  const existingAlts = new Set(existingMedia.map((node) => node.alt));
  const missing = plannedMedia.filter((media) => !existingAlts.has(media.alt));

  if (!missing.length) {
    return {action: 'complete', missing: []};
  }
  if (existingMedia.length >= 1 + plannedMedia.length) {
    return {action: 'mismatch', missing};
  }
  return {action: 'append', missing};
}

// 'quiet-form-01.webp' -> 'quiet-form-01-room-detail.webp'
export function mockupFileName(sourceFileName, scene) {
  const base = sourceFileName.replace(/\.[a-z0-9]+$/i, '');
  return `${base}-${scene.fileSuffix}.webp`;
}

// '/images/product-art/quiet-form/quiet-form-01.webp' ->
// 'quiet-form/quiet-form-01-room-detail.webp'
export function mockupRelativePath(catalogImagePath, scene) {
  const relative = catalogImagePath.replace(/^\/images\/product-art\//, '');
  const directory = relative.includes('/')
    ? relative.slice(0, relative.lastIndexOf('/'))
    : '';
  const file = mockupFileName(
    relative.slice(relative.lastIndexOf('/') + 1),
    scene,
  );
  return directory ? `${directory}/${file}` : file;
}
