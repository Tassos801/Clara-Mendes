#!/usr/bin/env node

// Builds the decorative watercolour page art for the clothing page from the
// Quiet Current "B - Mineral Wash" garment layers (own artwork, same masks that
// are printed on the garments).
//
//   node scripts/build-clothing-page-art.mjs --source "<...>\B-mineral-wash\masters"
//
// Optional: --out-masters <dir> and --out-web <dir> write somewhere else (for tests).
//
// Output (all RGBA, transparent background, no network, no randomness):
//   assets/clothing/<name>-master.png        full-size masters
//   public/images/clothing/<name>.webp       web exports, no enlargement
//   names: fern-moss, fern-clay, mineral-strata-moss, mineral-strata-clay
//
// The layer files are single-channel masks: pixel value = pigment opacity.
// Alpha is always taken from the masks and keeps their pigment variation.
// Nothing is thresholded.

import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function report(message) {
  process.stdout.write(`${message}
`);
}

// Brand palette. Used as fallback when an SVG master cannot be read.
const BRAND = {
  ink: '#26231F',
  ivory: '#FBFAF6',
  oat: '#F4F0E8',
  mist: '#DFE4DC',
  clay: '#9C6F5D',
  moss: '#6F7769',
};

// Source files. The SVG masters say which colour each layer gets on the garment.
const FERN_LAYER = '308-left-leg-fern.png';
const FERN_SVG_SUFFIX = '308-left-leg.svg';
const STRATA_SVG_SUFFIX = '121-body.svg';
const STRATA_LAYERS = {
  veil: '121-body-veil.png',
  'stratum-1': '121-body-stratum-1.png',
  'stratum-2': '121-body-stratum-2.png',
  'stratum-3': '121-body-stratum-3.png',
};

const COLOURWAYS = {
  moss: {fallbackFern: BRAND.moss, fallbackGround: BRAND.moss, fallbackWash: BRAND.mist},
  clay: {fallbackFern: BRAND.clay, fallbackGround: BRAND.clay, fallbackWash: BRAND.oat},
};

// Fern settings.
const FERN_PADDING = 0.06; // of the long edge of the content box, each side
const FERN_TARGET_ALPHA = 0.85; // densest stroke after normalising
const FERN_MASTER_MAX = 2400;
const FERN_WEB_MAX = 900;
const FERN_EDGE_FADE = 0.04; // fade where the stem was cut by the panel edge

// Strata settings. The 121-body panel is a seamless loop: the left and right
// edges are the same side-seam wash. The picture is a window on that loop, so
// the whole height of the washes fits a 3:1 frame without cutting the ridges.
const STRATA_RATIO = 3; // width : height
const STRATA_WINDOW_LEFT = 2000; // source px, left edge of the window (wraps)
const STRATA_TOP_MARGIN = 24; // source px above the first visible wash
const STRATA_MASTER_MAX_WIDTH = 3600;
const STRATA_WEB_MAX_WIDTH = 1600;
const STRATA_FEATHER = {left: 0.1, right: 0.1, top: 0.05, bottom: 0.2}; // of width / height

// Washes, back to front. `colour` is a role taken from the garment SVG:
//   wash   = the light wash colour (Mist on moss, Oat on clay)
//   ground = the garment ground colour (Moss on moss, Clay on clay)
// `gain` multiplies the mask value, so the garment opacity pattern is kept.
// On the garment the washes are light on a dark ground. On a light page the
// ground colour has to carry the tone, so the strata also get a thin ground glaze.
// `offset` (source px), `stretch` and `flip` place each wash on the looping
// panel, so the ridges of different layers do not line up in identical stacks.
const STRATA_RECIPE = [
  {layer: 'veil', colour: 'wash', gain: 1.5, offset: 1725, stretch: 1.8, flip: false},
  {layer: 'stratum-1', colour: 'wash', gain: 1.8, offset: 0, stretch: 1.3, flip: false},
  {layer: 'stratum-1', colour: 'ground', gain: 0.2, offset: 0, stretch: 1.3, flip: false},
  {layer: 'stratum-2', colour: 'ground', gain: 0.38, offset: 900, stretch: 1, flip: true},
  {layer: 'stratum-3', colour: 'ground', gain: 0.52, offset: 2600, stretch: 0.8, flip: false},
];

// Soft washes hide compression well; these keep each strata export near 110 KB.
const WEBP = {quality: 72, alphaQuality: 72, effort: 6};

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) throw new Error(`Unexpected argument: ${argument}`);
    const [rawKey, inline] = argument.slice(2).split(/=(.*)/s);
    const value = inline ?? argv[(index += 1)];
    if (value === undefined) throw new Error(`Missing value for --${rawKey}`);
    options[rawKey] = value;
  }
  return options;
}

const options = parseArguments(process.argv.slice(2));
if (!options.source) {
  throw new Error(
    'Usage: node scripts/build-clothing-page-art.mjs --source "<path to B-mineral-wash\\masters>"',
  );
}
const sourceRoot = path.resolve(options.source);
const layersRoot = path.join(sourceRoot, 'layers');
const masterDir = path.resolve(options['out-masters'] ?? path.join(repoRoot, 'assets', 'clothing'));
const webDir = path.resolve(options['out-web'] ?? path.join(repoRoot, 'public', 'images', 'clothing'));

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
}

async function readSvgColours(colourway, suffix) {
  const file = path.join(sourceRoot, `${colourway}-${suffix}`);
  try {
    const text = await readFile(file, 'utf8');
    const colours = {};
    for (const match of text.matchAll(/<rect\s+id="([^"]+)"[^>]*?\sfill="(#[0-9A-Fa-f]{6})"/g)) {
      colours[match[1]] = match[2].toUpperCase();
    }
    return colours;
  } catch (error) {
    report(`Could not read ${file} (${error.message}); using palette fallback.`);
    return {};
  }
}

async function readMask(layerFile) {
  const {data, info} = await sharp(path.join(layersRoot, layerFile))
    .extractChannel(0)
    .raw()
    .toBuffer({resolveWithObject: true});
  return {data, width: info.width, height: info.height};
}

function smoothstep(edge0, edge1, x) {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (t * 6 - 15) + 10); // smootherstep
}

async function writeOutputs(name, rgba, width, height, webMax, webMaxIsWidth) {
  await mkdir(masterDir, {recursive: true});
  await mkdir(webDir, {recursive: true});
  const masterPath = path.join(masterDir, `${name}-master.png`);
  const webPath = path.join(webDir, `${name}.webp`);
  const png = await sharp(rgba, {raw: {width, height, channels: 4}})
    .png({compressionLevel: 9, effort: 10})
    .toBuffer();
  await writeFile(masterPath, png);

  const longEdge = webMaxIsWidth ? width : Math.max(width, height);
  const scale = Math.min(1, webMax / longEdge);
  const webWidth = Math.max(1, Math.round(width * scale));
  const webHeight = Math.max(1, Math.round(height * scale));
  const web = await sharp(png)
    .resize(webWidth, webHeight, {kernel: 'lanczos3', withoutEnlargement: true})
    .webp(WEBP)
    .toBuffer();
  await writeFile(webPath, web);
  const webMeta = await sharp(web).metadata();
  report(
    `${path.relative(repoRoot, masterPath)}  ${width}x${height}  ${png.length} bytes`,
  );
  report(
    `${path.relative(repoRoot, webPath)}  ${webMeta.width}x${webMeta.height}  ${web.length} bytes`,
  );
}

// ---------------------------------------------------------------- ferns

async function buildFerns() {
  const mask = await readMask(FERN_LAYER);
  const {data, width, height} = mask;

  let maxValue = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = data[y * width + x];
      if (value === 0) continue;
      if (value > maxValue) maxValue = value;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxValue === 0) throw new Error(`${FERN_LAYER} is empty`);

  const boxWidth = maxX - minX + 1;
  const boxHeight = maxY - minY + 1;
  const pad = Math.round(Math.max(boxWidth, boxHeight) * FERN_PADDING);
  const cropWidth = boxWidth + pad * 2;
  const cropHeight = boxHeight + pad * 2;
  const fade = Math.round(Math.max(boxWidth, boxHeight) * FERN_EDGE_FADE);
  // Sides where the artwork was cut by the edge of the garment panel.
  const cutLeft = minX === 0;
  const cutRight = maxX === width - 1;
  const cutTop = minY === 0;
  const cutBottom = maxY === height - 1;

  const gain = (FERN_TARGET_ALPHA * 255) / maxValue;

  for (const [colourway, config] of Object.entries(COLOURWAYS)) {
    const svg = await readSvgColours(colourway, FERN_SVG_SUFFIX);
    const fernColour = svg['wash-fern'] ?? config.fallbackFern;
    const [r, g, b] = hexToRgb(fernColour);
    const rgba = Buffer.alloc(cropWidth * cropHeight * 4);
    for (let y = 0; y < cropHeight; y += 1) {
      for (let x = 0; x < cropWidth; x += 1) {
        const sx = minX - pad + x;
        const sy = minY - pad + y;
        const out = (y * cropWidth + x) * 4;
        rgba[out] = r;
        rgba[out + 1] = g;
        rgba[out + 2] = b;
        if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
        let alpha = Math.min(255, data[sy * width + sx] * gain);
        if (alpha === 0) continue;
        if (cutBottom) alpha *= smoothstep(0, fade, maxY - sy);
        if (cutTop) alpha *= smoothstep(0, fade, sy - minY);
        if (cutLeft) alpha *= smoothstep(0, fade, sx - minX);
        if (cutRight) alpha *= smoothstep(0, fade, maxX - sx);
        rgba[out + 3] = Math.round(alpha);
      }
    }

    let outBuffer = rgba;
    let outWidth = cropWidth;
    let outHeight = cropHeight;
    const longEdge = Math.max(cropWidth, cropHeight);
    if (longEdge > FERN_MASTER_MAX) {
      const scale = FERN_MASTER_MAX / longEdge;
      outWidth = Math.round(cropWidth * scale);
      outHeight = Math.round(cropHeight * scale);
      outBuffer = await sharp(rgba, {raw: {width: cropWidth, height: cropHeight, channels: 4}})
        .resize(outWidth, outHeight, {kernel: 'lanczos3'})
        .raw()
        .toBuffer();
    }
    report(
      `fern-${colourway}: colour ${fernColour}, mask max ${maxValue}/255 scaled to alpha ${FERN_TARGET_ALPHA}`,
    );
    await writeOutputs(`fern-${colourway}`, outBuffer, outWidth, outHeight, FERN_WEB_MAX, false);
  }
}

// --------------------------------------------------------------- strata

// Reads one layer as a full-height panel, scaled by `scale`, from `cropTop` down.
async function readStrataPanel(layerFile, cropTop, scale) {
  const full = sharp(path.join(layersRoot, layerFile));
  const meta = await full.metadata();
  const cropHeight = meta.height - cropTop;
  const {data, info} = await full
    .extractChannel(0)
    .extract({left: 0, top: cropTop, width: meta.width, height: cropHeight})
    .resize(Math.round(meta.width * scale), Math.round(cropHeight * scale), {
      kernel: 'lanczos3',
      fit: 'fill',
    })
    .raw()
    .toBuffer({resolveWithObject: true});
  if (info.channels !== 1) throw new Error(`${layerFile}: expected 1 channel`);
  return {data, width: info.width, height: info.height};
}

// First source row where any wash is visible.
async function findContentTop() {
  let top = Infinity;
  for (const file of Object.values(STRATA_LAYERS)) {
    const {data, width, height} = await readMask(file);
    for (let y = 0; y < height && y < top; y += 1) {
      let found = false;
      for (let x = 0; x < width; x += 1) {
        if (data[y * width + x] >= 8) {
          found = true;
          break;
        }
      }
      if (found) {
        top = y;
        break;
      }
    }
  }
  return top;
}

async function buildStrata() {
  const meta = await sharp(path.join(layersRoot, STRATA_LAYERS.veil)).metadata();
  const cropTop = Math.max(0, (await findContentTop()) - STRATA_TOP_MARGIN);
  const cropHeight = meta.height - cropTop;
  const windowSourceWidth = Math.round(cropHeight * STRATA_RATIO);
  const targetWidth = Math.min(STRATA_MASTER_MAX_WIDTH, windowSourceWidth);
  const scale = targetWidth / windowSourceWidth;
  const targetHeight = Math.round(cropHeight * scale);

  const panels = {};
  for (const [key, file] of Object.entries(STRATA_LAYERS)) {
    panels[key] = await readStrataPanel(file, cropTop, scale);
  }
  const panelWidth = panels.veil.width;
  const panelHeight = panels.veil.height;
  if (panelHeight !== targetHeight) throw new Error('Panel height mismatch');
  // Window on the looping panel: wraps around the seam. Each wash gets its own
  // offset, stretch and flip. Linear sampling keeps the grain smooth.
  const windowFor = (step) => {
    const panel = panels[step.layer];
    const out = Buffer.alloc(targetWidth * targetHeight);
    const shift = (STRATA_WINDOW_LEFT + step.offset) * scale;
    for (let x = 0; x < targetWidth; x += 1) {
      let position = (shift + x) / step.stretch;
      if (step.flip) position = -position;
      const base = Math.floor(position);
      const fraction = position - base;
      const left = ((base % panelWidth) + panelWidth) % panelWidth;
      const right = (left + 1) % panelWidth;
      for (let y = 0; y < targetHeight; y += 1) {
        const row = y * panelWidth;
        out[y * targetWidth + x] = Math.round(
          panel.data[row + left] * (1 - fraction) + panel.data[row + right] * fraction,
        );
      }
    }
    return out;
  };
  const windows = STRATA_RECIPE.map(windowFor);

  // Edge feather, so no side of the picture ends in a hard cut.
  const feather = new Float32Array(targetWidth * targetHeight);
  const fx0 = targetWidth * STRATA_FEATHER.left;
  const fx1 = targetWidth * STRATA_FEATHER.right;
  const fyTop = targetHeight * STRATA_FEATHER.top;
  const fyBottom = targetHeight * STRATA_FEATHER.bottom;
  for (let y = 0; y < targetHeight; y += 1) {
    const vertical =
      smoothstep(0, fyTop, y) * smoothstep(0, fyBottom, targetHeight - 1 - y);
    for (let x = 0; x < targetWidth; x += 1) {
      feather[y * targetWidth + x] =
        vertical * smoothstep(0, fx0, x) * smoothstep(0, fx1, targetWidth - 1 - x);
    }
  }

  for (const [colourway, config] of Object.entries(COLOURWAYS)) {
    const svg = await readSvgColours(colourway, STRATA_SVG_SUFFIX);
    const roles = {
      ground: svg.ground ?? config.fallbackGround,
      wash: svg['wash-stratum-1'] ?? config.fallbackWash,
    };
    const stack = STRATA_RECIPE.map((step, stepIndex) => ({
      mask: windows[stepIndex],
      gain: step.gain,
      rgb: hexToRgb(roles[step.colour]),
    }));

    const pixels = targetWidth * targetHeight;
    const rgba = Buffer.alloc(pixels * 4);
    for (let index = 0; index < pixels; index += 1) {
      // Straight "over" compositing, back to front.
      let outAlpha = 0;
      let outR = 0;
      let outG = 0;
      let outB = 0;
      for (const layer of stack) {
        const alpha = Math.min(1, (layer.mask[index] / 255) * layer.gain);
        if (alpha <= 0) continue;
        const total = alpha + outAlpha * (1 - alpha);
        outR = (layer.rgb[0] * alpha + outR * outAlpha * (1 - alpha)) / total;
        outG = (layer.rgb[1] * alpha + outG * outAlpha * (1 - alpha)) / total;
        outB = (layer.rgb[2] * alpha + outB * outAlpha * (1 - alpha)) / total;
        outAlpha = total;
      }
      const base = index * 4;
      if (outAlpha === 0) {
        [rgba[base], rgba[base + 1], rgba[base + 2]] = stack[stack.length - 1].rgb;
        continue;
      }
      rgba[base] = Math.round(outR);
      rgba[base + 1] = Math.round(outG);
      rgba[base + 2] = Math.round(outB);
      rgba[base + 3] = Math.round(outAlpha * feather[index] * 255);
    }
    report(
      `mineral-strata-${colourway}: ${STRATA_RECIPE.map(
        (step) => `${step.layer} ${roles[step.colour]} x${step.gain} (offset ${step.offset}, stretch ${step.stretch}${step.flip ? ', flipped' : ''})`,
      ).join(', ')}; rows ${cropTop}-${meta.height}, columns from ${STRATA_WINDOW_LEFT} (wraps)`,
    );
    await writeOutputs(
      `mineral-strata-${colourway}`,
      rgba,
      targetWidth,
      targetHeight,
      STRATA_WEB_MAX_WIDTH,
      true,
    );
  }
}

await buildFerns();
await buildStrata();
