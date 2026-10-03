#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Turns supplier photographs into the storefront's branded image set for
 * every curated product (book nooks today). Each image in
 * data/curated-products.json carries a `from` recipe; this script applies
 * one shared Clara Mendes treatment so kits from different suppliers sit
 * together as one collection:
 *
 *   - 4:5 portrait, 1000 x 1250, WebP
 *   - supplier text, dimension lines and infographic panels cropped or
 *     masked away
 *   - a muted, warm grade (orange cast pulled toward the brand neutrals,
 *     slightly lifted shadows), soft vignette and fine paper grain
 *   - linen (#f4f0e8) studio backdrop for cut-out and detail layouts
 *
 * Layouts:
 *   photo   crop [x, y, w, h] -> cover 4:5 -> grade + vignette
 *   extend  crop a clean strip, widen it to 4:5 over a blurred copy of
 *           itself (for shots with infographic panels beside the object)
 *   studio  polygon `outline` around an object shot on white -> placed on
 *           linen with a soft floor shadow
 *   grid    2-column grid of detail `tiles` on linen
 *
 * A product's optional `cutout` is derived from its studio image: the
 * object on a transparent 600 x 750 canvas, for the homepage shelf.
 *
 * Usage:
 *   npm run curated:images                      generate every image
 *   npm run curated:images -- --handle <h>      one product only
 *   npm run curated:images -- --fetch --handle <h>
 *        download the product's Shopify images into
 *        assets/curated-products/<h>/supplier-N.jpg (Storefront API, read-only)
 *   npm run curated:images -- --grid --handle <h>
 *        write coordinate-grid overlays of each supplier photo to
 *        output/curated-images/<h>/ for choosing crops
 *   npm run curated:images -- --check           verify outputs exist
 */
import {existsSync} from 'node:fs';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {getRequiredEnv, loadLocalEnv, normalizeShopDomain} from './lib/env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

export const IMAGE_WIDTH = 1000;
export const IMAGE_HEIGHT = 1250;
const LINEN = '#f4f0e8';
const GRID_MARGIN = 56;
const GRID_GUTTER = 20;

export function sourceDir(handle) {
  return path.join(root, 'assets/curated-products', handle);
}

export function publicPath(src) {
  return path.join(root, 'public', src);
}

/** Every image a product declares, with a reason when its recipe is unusable. */
export function recipeProblems(product) {
  const problems = [];
  for (const image of product.images ?? []) {
    const label = `${product.handle} ${image.src}`;
    if (!image.src?.startsWith(`/images/curated/${product.handle}/`))
      problems.push(`${label}: src must live in /images/curated/<handle>/`);
    if (!image.src?.endsWith('.webp'))
      problems.push(`${label}: src must be a .webp file`);
    if (!image.alt?.trim()) problems.push(`${label}: alt text is required`);
    const from = image.from;
    if (!from?.source) {
      problems.push(`${label}: from.source is required`);
      continue;
    }
    const rect = (value) =>
      Array.isArray(value) &&
      value.length === 4 &&
      value.every((n) => Number.isInteger(n) && n >= 0);
    if (from.layout === 'photo' || from.layout === 'extend') {
      if (!rect(from.crop))
        problems.push(`${label}: crop must be [x, y, w, h]`);
    } else if (from.layout === 'studio') {
      if (!Array.isArray(from.outline) || from.outline.length < 3)
        problems.push(`${label}: outline needs at least three [x, y] points`);
    } else if (from.layout === 'grid') {
      if (!Array.isArray(from.tiles) || from.tiles.length < 2)
        problems.push(`${label}: grid needs at least two tiles`);
      else if (!from.tiles.every(rect))
        problems.push(`${label}: every tile must be [x, y, w, h]`);
    } else {
      problems.push(`${label}: unknown layout "${from.layout}"`);
    }
  }
  if (product.cutout) {
    if (!product.cutout.startsWith(`/images/curated/${product.handle}/`))
      problems.push(
        `${product.handle} cutout: must live in /images/curated/<handle>/`,
      );
    if (!product.cutout.endsWith('.webp'))
      problems.push(`${product.handle} cutout: must be a .webp file`);
    if (!cutoutSource(product))
      problems.push(
        `${product.handle} cutout: needs a "studio" image to cut from`,
      );
  }
  return problems;
}

/** Mulberry32: grain must be identical on every run so outputs do not churn. */
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function grainLayer(width, height, strength, seed = 1987) {
  const random = seededRandom(seed);
  const data = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i += 1) {
    // Sum of uniforms: a cheap, bounded approximation of gaussian grain.
    const n = (random() + random() + random() - 1.5) * strength;
    const value = Math.max(0, Math.min(255, Math.round(128 + n)));
    data[i * 3] = value;
    data[i * 3 + 1] = value;
    data[i * 3 + 2] = value;
  }
  return {input: data, raw: {width, height, channels: 3}, blend: 'soft-light'};
}

function vignetteLayer(width, height) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><radialGradient id="v" cx="50%" cy="46%" r="75%"><stop offset="52%" stop-color="#fff"/><stop offset="100%" stop-color="#a89e90"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#v)"/></svg>`;
  return {input: Buffer.from(svg), blend: 'multiply'};
}

/**
 * The brand grade. Rows of the recomb matrix sum to 1, so whites stay white
 * (important for objects shot on white), while saturated supplier orange is
 * pulled toward the store's warm neutrals.
 */
async function gradeColour(sharp, input, {lift = true} = {}) {
  let pipeline = sharp(input)
    .recomb([
      [0.9, 0.08, 0.02],
      [0.04, 0.92, 0.04],
      [0.02, 0.06, 0.92],
    ])
    .modulate({saturation: 0.86});
  if (lift) pipeline = pipeline.linear([0.95, 0.95, 0.94], [8, 7, 6]);
  return pipeline.toBuffer();
}

async function finish(sharp, input, {vignette, grain}) {
  const layers = [];
  if (vignette) layers.push(vignetteLayer(IMAGE_WIDTH, IMAGE_HEIGHT));
  layers.push(grainLayer(IMAGE_WIDTH, IMAGE_HEIGHT, grain));
  return sharp(input)
    .composite(layers)
    .sharpen({sigma: 0.6})
    .webp({quality: 82, effort: 6})
    .toBuffer();
}

function extract(sharp, file, [left, top, width, height]) {
  return sharp(file).extract({left, top, width, height});
}

async function photoLayout(sharp, file, from) {
  const cropped = await extract(sharp, file, from.crop)
    .resize(IMAGE_WIDTH, IMAGE_HEIGHT, {fit: 'cover', kernel: 'lanczos3'})
    .toBuffer();
  return finish(sharp, await gradeColour(sharp, cropped), {
    vignette: true,
    grain: 16,
  });
}

/**
 * Widens (or heightens) a clean strip to 4:5 over a heavily blurred copy of
 * itself, feathering the seam — for front shots that have infographic
 * panels beside the object.
 */
async function extendLayout(sharp, file, from) {
  const [, , width, height] = from.crop;
  const target = IMAGE_WIDTH / IMAGE_HEIGHT;
  const horizontal = width / height < target;
  const canvasWidth = horizontal ? Math.round(height * target) : width;
  const canvasHeight = horizontal ? height : Math.round(width / target);
  const feather = Math.round((horizontal ? width : height) * 0.07);
  const strip = await extract(sharp, file, from.crop).toBuffer();
  // Cover (not stretch) keeps the bokeh round, so the widened sides read as
  // the same out-of-focus room rather than a smear.
  const backdrop = await sharp(strip)
    .resize(canvasWidth, canvasHeight, {fit: 'cover'})
    .blur(40)
    .modulate({brightness: 0.86})
    .toBuffer();
  const ramp = horizontal
    ? `x1="0" y1="0" x2="1" y2="0"`
    : `x1="0" y1="0" x2="0" y2="1"`;
  const edge = (feather / (horizontal ? width : height)).toFixed(4);
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="f" ${ramp}><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="${edge}" stop-color="#fff"/><stop offset="${1 - edge}" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#f)"/></svg>`,
  );
  const feathered = await sharp(strip)
    .ensureAlpha()
    .composite([{input: mask, blend: 'dest-in'}])
    .png()
    .toBuffer();
  const seamed = await sharp(backdrop)
    .composite([
      {
        input: feathered,
        left: horizontal ? Math.round((canvasWidth - width) / 2) : 0,
        top: horizontal ? 0 : Math.round((canvasHeight - height) / 2),
      },
    ])
    .toBuffer();
  const combined = await sharp(seamed)
    .resize(IMAGE_WIDTH, IMAGE_HEIGHT, {kernel: 'lanczos3'})
    .toBuffer();
  return finish(sharp, await gradeColour(sharp, combined), {
    vignette: true,
    grain: 16,
  });
}

function linenBackdrop(shadow) {
  const shadowSvg = shadow
    ? `<filter id="s" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="16"/></filter><ellipse cx="${shadow.cx}" cy="${shadow.cy}" rx="${shadow.rx}" ry="26" fill="#3a3026" fill-opacity="0.32" filter="url(#s)"/>`
    : '';
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}"><defs><linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f3ec"/><stop offset="0.74" stop-color="${LINEN}"/><stop offset="1" stop-color="#e9e2d6"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#l)"/>${shadowSvg}</svg>`,
  );
}

/**
 * An object shot on white, isolated by a hand-drawn outline (everything
 * outside turns white), then multiplied onto linen so the white ground
 * disappears and only the object and its floor shadow remain.
 */
async function studioLayout(sharp, file, from) {
  const {width, height} = await sharp(file).metadata();
  const points = from.outline;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const pad = 4;
  const left = Math.max(0, Math.min(...xs) - pad);
  const top = Math.max(0, Math.min(...ys) - pad);
  const right = Math.min(width, Math.max(...xs) + pad);
  const bottom = Math.min(height, Math.max(...ys) + pad);
  const outside = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path fill="#fff" fill-rule="evenodd" d="M0 0H${width}V${height}H0Z M${points.map(([x, y]) => `${x} ${y}`).join(' L')} Z"/></svg>`,
  );
  // Sharp always extracts before compositing, so whiten first, crop second.
  const whitened = await sharp(file)
    .composite([{input: outside}])
    .toBuffer();
  const isolated = await sharp(whitened)
    .extract({left, top, width: right - left, height: bottom - top})
    .toBuffer();
  const objectHeight = Math.round(IMAGE_HEIGHT * (from.scale ?? 0.68));
  const objectWidth = Math.round(
    ((right - left) * objectHeight) / (bottom - top),
  );
  const floor = Math.round(IMAGE_HEIGHT * 0.84);
  const object = await sharp(await gradeColour(sharp, isolated, {lift: false}))
    .resize(objectWidth, objectHeight, {kernel: 'lanczos3'})
    .toBuffer();
  const composed = await sharp(
    linenBackdrop({
      cx: IMAGE_WIDTH / 2,
      cy: floor - 8,
      rx: Math.round(objectWidth * 0.56),
    }),
  )
    .composite([
      {
        input: object,
        left: Math.round((IMAGE_WIDTH - objectWidth) / 2),
        top: floor - objectHeight,
        blend: 'multiply',
      },
    ])
    .toBuffer();
  return finish(sharp, composed, {vignette: false, grain: 10});
}

export const CUTOUT_WIDTH = 600;
export const CUTOUT_HEIGHT = 750;

/**
 * The studio object with a transparent ground, bottom-centred on a fixed
 * 600 x 750 canvas so every kit stands on the same baseline (the homepage
 * shelf). The white ground is flood-filled from outside the outline, so
 * light details enclosed by the object (lamps, paper) stay opaque; the
 * edge is eroded a pixel and feathered to lose the white fringe.
 */
async function cutoutImage(sharp, file, outline) {
  const graded = await gradeColour(sharp, file, {lift: false});
  const {data, info} = await sharp(graded)
    .removeAlpha()
    .raw()
    .toBuffer({resolveWithObject: true});
  const {width, height} = info;
  const polygon = await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path fill="#fff" d="M${outline.map(([x, y]) => `${x} ${y}`).join(' L')} Z"/></svg>`,
    ),
  )
    .ensureAlpha()
    .extractChannel(3)
    .raw()
    .toBuffer();

  const total = width * height;
  const ground = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  const light = (i) =>
    Math.min(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]) >= 226;
  for (let i = 0; i < total; i += 1) {
    if (polygon[i] < 128) {
      ground[i] = 1;
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % width;
    for (const n of [
      x > 0 ? i - 1 : -1,
      x < width - 1 ? i + 1 : -1,
      i - width,
      i + width,
    ]) {
      if (n >= 0 && n < total && !ground[n] && light(n)) {
        ground[n] = 1;
        queue[tail++] = n;
      }
    }
  }

  const alpha = Buffer.alloc(total);
  let [left, top, right, bottom] = [width, height, 0, 0];
  for (let i = 0; i < total; i += 1) {
    const x = i % width;
    const y = (i / width) | 0;
    const edge =
      ground[i] ||
      (x > 0 && ground[i - 1]) ||
      (x < width - 1 && ground[i + 1]) ||
      (y > 0 && ground[i - width]) ||
      (y < height - 1 && ground[i + width]);
    alpha[i] = edge ? 0 : 255;
    if (!edge) {
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  const softAlpha = await sharp(alpha, {raw: {width, height, channels: 1}})
    .blur(0.7)
    .extractChannel(0)
    .raw()
    .toBuffer();
  const rgba = await sharp(data, {raw: {width, height, channels: 3}})
    .joinChannel(softAlpha, {raw: {width, height, channels: 1}})
    .png()
    .toBuffer();
  const object = await sharp(rgba)
    .extract({
      left,
      top,
      width: right - left + 1,
      height: bottom - top + 1,
    })
    .png()
    .toBuffer();
  const fitted = await sharp(object)
    .resize(Math.round(CUTOUT_WIDTH * 0.96), Math.round(CUTOUT_HEIGHT * 0.97), {
      fit: 'inside',
      kernel: 'lanczos3',
    })
    .png()
    .toBuffer({resolveWithObject: true});
  return sharp({
    create: {
      width: CUTOUT_WIDTH,
      height: CUTOUT_HEIGHT,
      channels: 4,
      background: {r: 0, g: 0, b: 0, alpha: 0},
    },
  })
    .composite([
      {
        input: fitted.data,
        left: Math.round((CUTOUT_WIDTH - fitted.info.width) / 2),
        top: CUTOUT_HEIGHT - fitted.info.height,
      },
    ])
    .sharpen({sigma: 0.5})
    .webp({quality: 86, alphaQuality: 90, effort: 6})
    .toBuffer();
}

/** The studio recipe a cut-out is derived from. */
export function cutoutSource(product) {
  return (product.images ?? []).find((image) => image.from?.layout === 'studio')
    ?.from;
}

async function gridLayout(sharp, file, from) {
  const columns = 2;
  const rows = Math.ceil(from.tiles.length / columns);
  const cellWidth = Math.floor(
    (IMAGE_WIDTH - GRID_MARGIN * 2 - GRID_GUTTER * (columns - 1)) / columns,
  );
  const cellHeight = Math.floor(
    (IMAGE_HEIGHT - GRID_MARGIN * 2 - GRID_GUTTER * (rows - 1)) / rows,
  );
  const layers = [];
  for (const [index, tile] of from.tiles.entries()) {
    const cropped = await extract(sharp, file, tile)
      .resize(cellWidth, cellHeight, {fit: 'cover', kernel: 'lanczos3'})
      .toBuffer();
    layers.push({
      input: await gradeColour(sharp, cropped),
      left: GRID_MARGIN + (index % columns) * (cellWidth + GRID_GUTTER),
      top:
        GRID_MARGIN + Math.floor(index / columns) * (cellHeight + GRID_GUTTER),
    });
  }
  const composed = await sharp(linenBackdrop(null))
    .composite(layers)
    .toBuffer();
  return finish(sharp, composed, {vignette: false, grain: 10});
}

const LAYOUTS = {
  extend: extendLayout,
  grid: gridLayout,
  photo: photoLayout,
  studio: studioLayout,
};

async function loadCatalog() {
  return JSON.parse(
    await readFile(path.join(root, 'data/curated-products.json'), 'utf8'),
  );
}

async function generate(products) {
  const sharp = require(process.env.SHARP_MODULE || 'sharp');
  for (const product of products) {
    for (const image of product.images ?? []) {
      const file = path.join(sourceDir(product.handle), image.from.source);
      if (!existsSync(file)) {
        throw new Error(
          `${product.handle}: missing ${path.relative(root, file)} — run with --fetch first`,
        );
      }
      const output = publicPath(image.src);
      await mkdir(path.dirname(output), {recursive: true});
      await writeFile(
        output,
        await LAYOUTS[image.from.layout](sharp, file, image.from),
      );
      console.log(
        `${image.src}  (${image.from.layout} from ${image.from.source})`,
      );
    }
    if (product.cutout) {
      const from = cutoutSource(product);
      const file = path.join(sourceDir(product.handle), from.source);
      await writeFile(
        publicPath(product.cutout),
        await cutoutImage(sharp, file, from.outline),
      );
      console.log(`${product.cutout}  (cutout from ${from.source})`);
    }
  }
}

async function check(products) {
  const sharp = require(process.env.SHARP_MODULE || 'sharp');
  const missing = [];
  for (const product of products) {
    for (const image of product.images ?? []) {
      const output = publicPath(image.src);
      if (!existsSync(output)) {
        missing.push(`${image.src}: not generated`);
        continue;
      }
      const {width, height} = await sharp(output).metadata();
      if (width !== IMAGE_WIDTH || height !== IMAGE_HEIGHT)
        missing.push(
          `${image.src}: ${width} x ${height}, expected 1000 x 1250`,
        );
    }
    if (product.cutout) {
      const output = publicPath(product.cutout);
      if (!existsSync(output)) {
        missing.push(`${product.cutout}: not generated`);
        continue;
      }
      const {width, height, hasAlpha} = await sharp(output).metadata();
      if (width !== CUTOUT_WIDTH || height !== CUTOUT_HEIGHT || !hasAlpha)
        missing.push(
          `${product.cutout}: expected a transparent 600 x 750 image`,
        );
    }
  }
  return missing;
}

async function fetchSources(handle) {
  const env = {...loadLocalEnv('.env', root), ...process.env};
  const domain = normalizeShopDomain(
    getRequiredEnv(env, 'PUBLIC_STORE_DOMAIN'),
  );
  const response = await fetch(
    `https://${domain}/api/${env.SHOPIFY_STOREFRONT_API_VERSION || '2026-04'}/graphql.json`,
    {
      body: JSON.stringify({
        query: `query ($handle: String!) { product(handle: $handle) { images(first: 20) { nodes { url } } } }`,
        variables: {handle},
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': getRequiredEnv(
          env,
          'PUBLIC_STOREFRONT_API_TOKEN',
        ),
      },
      method: 'POST',
    },
  );
  const body = await response.json().catch(() => null);
  const urls = body?.data?.product?.images?.nodes?.map((node) => node.url);
  if (!response.ok || !urls?.length) {
    throw new Error(
      `${handle}: no images returned by the Storefront API — is the product published to the headless channel?`,
    );
  }
  const dir = sourceDir(handle);
  await mkdir(dir, {recursive: true});
  for (const [index, url] of urls.entries()) {
    const image = await fetch(url);
    if (!image.ok) throw new Error(`${url}: HTTP ${image.status}`);
    const file = path.join(dir, `supplier-${index + 1}.jpg`);
    await writeFile(file, Buffer.from(await image.arrayBuffer()));
    console.log(path.relative(root, file));
  }
}

/** Coordinate grids (red every 100 px, blue every 20 px) for picking crops. */
async function writeGrids(handle) {
  const sharp = require(process.env.SHARP_MODULE || 'sharp');
  const dir = sourceDir(handle);
  const out = path.join(root, 'output/curated-images', handle);
  await mkdir(out, {recursive: true});
  for (const name of (await readdir(dir)).filter((f) =>
    /\.(jpe?g|png|webp)$/i.test(f),
  )) {
    const file = path.join(dir, name);
    const {width, height} = await sharp(file).metadata();
    let lines = '';
    for (let x = 20; x < width; x += 20) {
      lines += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${x % 100 ? 'rgba(0,150,255,0.22)' : 'rgba(255,0,0,0.55)'}"/>`;
      if (x % 100 === 0)
        lines += `<text x="${x + 2}" y="11" font-size="10" fill="red">${x}</text>`;
    }
    for (let y = 20; y < height; y += 20) {
      lines += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${y % 100 ? 'rgba(0,150,255,0.22)' : 'rgba(255,0,0,0.55)'}"/>`;
      if (y % 100 === 0)
        lines += `<text x="2" y="${y - 2}" font-size="10" fill="red">${y}</text>`;
    }
    const overlay = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${lines}</svg>`,
    );
    const target = path.join(out, `grid-${name.replace(/\.\w+$/, '.png')}`);
    await sharp(file)
      .composite([{input: overlay}])
      .png()
      .toFile(target);
    console.log(path.relative(root, target));
  }
}

async function main() {
  const {values} = parseArgs({
    options: {
      check: {type: 'boolean', default: false},
      fetch: {type: 'boolean', default: false},
      grid: {type: 'boolean', default: false},
      handle: {type: 'string'},
    },
  });
  const catalog = await loadCatalog();
  const products = values.handle
    ? catalog.filter((product) => product.handle === values.handle)
    : catalog;

  if ((values.fetch || values.grid) && !values.handle) {
    throw new Error('--fetch and --grid need --handle <product-handle>');
  }
  if (values.fetch) return fetchSources(values.handle);
  if (values.grid) return writeGrids(values.handle);

  if (!products.length)
    throw new Error(`No curated product "${values.handle}"`);
  const problems = products.flatMap(recipeProblems);
  if (problems.length) throw new Error(problems.join('\n'));

  if (values.check) {
    const missing = await check(products);
    if (missing.length) throw new Error(missing.join('\n'));
    console.log('All curated product images and cut-outs are present.');
    return;
  }
  await generate(products);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
/* eslint-enable no-console */
