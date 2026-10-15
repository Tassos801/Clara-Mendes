// Review sheets for the museum crops (app/lib/museumCrops.ts): where each
// product's crop sits on the work, and each crop shaped as its product.
// Local files only; nothing here touches Shopify or Prodigi.
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {CROP_SHAPES, SHAPES, cropPlan} from '../../app/lib/museumCrops.ts';

const COLOURS = {
  canvas: '#e07b00',
  card: '#1f9d55',
  case: '#d62d20',
  postcard: '#2463eb',
};
const PAPER = '#f4f0e8';
const INK = '#26231f';
const SHEET_WIDTH = 2000;
const GUTTER = 40;

const escape = (text) =>
  String(text).replace(
    /[&<>"]/g,
    (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c],
  );

function svg(width, height, body) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`,
  );
}

/** The master image (original less trim) as a sharp instance source. */
async function masterBuffer(originalPath, trim, size) {
  return sharp(originalPath)
    .extract({
      height: size.height,
      left: trim?.left ?? 0,
      top: trim?.top ?? 0,
      width: size.width,
    })
    .jpeg({quality: 95})
    .toBuffer();
}

async function cropImage(master, box, height) {
  return sharp(master).extract(box).resize({height}).toBuffer();
}

/** A crop rendered as its product, `height` px tall, with its numbers. */
async function productTile(shape, master, entry, height) {
  let art = await cropImage(master, entry.box, height);
  const {width} = await sharp(art).metadata();
  const pad = 24;
  const tileWidth = width + pad * 2;
  const tileHeight = height + pad * 2 + 70;
  let under = '';
  let over = '';
  if (shape === 'case') {
    const radius = Math.round(width * 0.14);
    const mask = svg(
      width,
      height,
      `<rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="#fff"/>`,
    );
    art = await sharp(art)
      .composite([{blend: 'dest-in', input: mask}])
      .png()
      .toBuffer();
    const bump = Math.round(width * 0.36);
    const at = pad + Math.round(width * 0.07);
    // The narrowest device (0.577 wide) shows the crop between these lines.
    const inset = Math.round((width - height * 0.577) / 2);
    over =
      `<rect x="${at}" y="${at}" width="${bump}" height="${bump}" rx="${Math.round(bump * 0.28)}" fill="rgba(30,30,30,0.85)"/>` +
      [pad + inset, pad + width - inset]
        .map(
          (x) =>
            `<line x1="${x}" y1="${pad}" x2="${x}" y2="${pad + height}" stroke="#fff" stroke-dasharray="8 8" stroke-width="2" opacity="0.85"/>`,
        )
        .join('');
  } else if (shape === 'canvas') {
    const depth = Math.round(height * 0.035);
    under =
      `<rect x="${pad + width}" y="${pad + depth}" width="${depth}" height="${height}" fill="rgba(0,0,0,0.28)"/>` +
      `<rect x="${pad + depth}" y="${pad + height}" width="${width}" height="${depth}" fill="rgba(0,0,0,0.18)"/>`;
  } else {
    under = `<rect x="${pad + 6}" y="${pad + 8}" width="${width}" height="${height}" fill="rgba(0,0,0,0.16)"/>`;
  }
  over +=
    `<text x="${pad}" y="${height + pad * 2 + 26}" font-family="Segoe UI, Arial" font-size="22" font-weight="700" fill="${COLOURS[shape]}">${escape(SHAPES[shape].label)}</text>` +
    `<text x="${pad}" y="${height + pad * 2 + 56}" font-family="Segoe UI, Arial" font-size="19" fill="${INK}">${Math.round(entry.ppi)} ppi · ${escape(entry.verdict)} · keeps ${Math.round(entry.coverage * 100)}%</text>`;
  return sharp({
    create: {
      background: PAPER,
      channels: 3,
      height: tileHeight,
      width: tileWidth,
    },
  })
    .composite([
      {input: svg(tileWidth, tileHeight, under), left: 0, top: 0},
      {input: art, left: pad, top: pad},
      {input: svg(tileWidth, tileHeight, over), left: 0, top: 0},
    ])
    .png()
    .toBuffer();
}

/**
 * One review sheet per artwork: the work with each crop outlined, then each
 * crop it has as its product. Returns the sheet paths.
 */
export async function renderCropPreviews({
  artworks,
  originalsDir,
  outDir,
  data,
  registry,
  title = 'Museum crops',
}) {
  mkdirSync(outDir, {recursive: true});
  const written = [];
  const byShape = Object.fromEntries(CROP_SHAPES.map((shape) => [shape, []]));
  for (const {artwork, label, fileStem} of artworks) {
    const plan = cropPlan(artwork.id, {data, registry});
    if (!plan) throw new Error(`no crops for ${artwork.id}`);
    const master = await masterBuffer(
      path.join(originalsDir, artwork.original.fileName),
      artwork.trim,
      plan.size,
    );
    const crops = (data?.crops ?? {})[artwork.id];

    // The work with every crop outlined.
    const overviewHeight = 820;
    const scale = overviewHeight / plan.size.height;
    const overview = await sharp(master)
      .resize({height: overviewHeight})
      .toBuffer();
    const {width: overviewWidth} = await sharp(overview).metadata();
    const r = (v) => Math.round(v * scale);
    const outlines =
      `<rect x="${r(crops.area.left * plan.size.width)}" y="${r(crops.area.top * plan.size.height)}" width="${r((crops.area.right - crops.area.left) * plan.size.width)}" height="${r((crops.area.bottom - crops.area.top) * plan.size.height)}" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="10 8"/>` +
      plan.shapes
        .map(
          ({box, shape}, index) =>
            `<rect x="${r(box.left) + index * 2}" y="${r(box.top) + index * 2}" width="${r(box.width) - index * 4}" height="${r(box.height) - index * 4}" fill="none" stroke="${COLOURS[shape]}" stroke-width="5"/>`,
        )
        .join('');
    const overviewTile = await sharp(overview)
      .composite([
        {input: svg(overviewWidth, overviewHeight, outlines), left: 0, top: 0},
      ])
      .png()
      .toBuffer();

    const tiles = [];
    for (const entry of plan.shapes) {
      const {shape} = entry;
      tiles.push(await productTile(shape, master, entry, 560));
      byShape[shape].push({
        label,
        tile: await productTile(shape, master, entry, 420),
      });
    }
    const tileMeta = await Promise.all(tiles.map((t) => sharp(t).metadata()));
    const rowWidth =
      tileMeta.reduce((sum, m) => sum + m.width, 0) +
      GUTTER * (tiles.length - 1);
    const width = Math.max(
      SHEET_WIDTH,
      overviewWidth + GUTTER * 2,
      rowWidth + GUTTER * 2,
    );
    const tilesTop = 110 + overviewHeight + GUTTER;
    const height =
      tilesTop + Math.max(...tileMeta.map((m) => m.height)) + GUTTER;
    const legend = plan.shapes
      .map(
        ({shape}, i) =>
          `<rect x="${GUTTER + i * 250}" y="72" width="22" height="22" fill="${COLOURS[shape]}"/><text x="${GUTTER + 32 + i * 250}" y="90" font-family="Segoe UI, Arial" font-size="20" fill="${INK}">${escape(SHAPES[shape].label)}</text>`,
      )
      .join('');
    const header =
      `<text x="${GUTTER}" y="48" font-family="Georgia, serif" font-size="36" fill="${INK}">${escape(label)}</text>` +
      `<text x="${width - GUTTER}" y="48" text-anchor="end" font-family="Segoe UI, Arial" font-size="20" fill="#746f65">${escape(artwork.id)} · ${plan.size.width}×${plan.size.height} px · dashed white = printed area</text>` +
      legend;
    let left = Math.round((width - rowWidth) / 2);
    const tileLayers = tiles.map((input, i) => {
      const layer = {input, left, top: tilesTop};
      left += tileMeta[i].width + GUTTER;
      return layer;
    });
    const file = path.join(outDir, `${fileStem}.jpg`);
    await sharp({create: {background: PAPER, channels: 3, height, width}})
      .composite([
        {input: svg(width, 110, header), left: 0, top: 0},
        {
          input: overviewTile,
          left: Math.round((width - overviewWidth) / 2),
          top: 110,
        },
        ...tileLayers,
      ])
      .jpeg({quality: 88})
      .toFile(file);
    written.push(file);
  }
  if (artworks.length > 1)
    for (const shape of CROP_SHAPES)
      if (byShape[shape].length)
        written.push(
          await renderShapeOverview(shape, byShape[shape], outDir, title),
        );
  return written;
}

/** Every artwork in one shape, five to a row: the collection as a shopper sees it. */
async function renderShapeOverview(shape, entries, outDir, title) {
  const metas = await Promise.all(
    entries.map(({tile}) => sharp(tile).metadata()),
  );
  const columns = Math.min(5, entries.length);
  const cellWidth = Math.max(...metas.map((m) => m.width));
  const cellHeight = Math.max(...metas.map((m) => m.height)) + 40;
  const rows = Math.ceil(entries.length / columns);
  const width = columns * cellWidth + (columns + 1) * GUTTER;
  const height = 90 + rows * cellHeight + rows * GUTTER;
  const layers = [];
  let captions = `<text x="${GUTTER}" y="56" font-family="Georgia, serif" font-size="38" fill="${INK}">${escape(title)} · ${escape(SHAPES[shape].label)}</text>`;
  entries.forEach(({label, tile}, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left =
      GUTTER +
      column * (cellWidth + GUTTER) +
      Math.round((cellWidth - metas[index].width) / 2);
    const top = 90 + row * (cellHeight + GUTTER);
    layers.push({input: tile, left, top});
    captions += `<text x="${left + 24}" y="${top + metas[index].height + 28}" font-family="Georgia, serif" font-size="22" fill="${INK}">${escape(label.length > 30 ? `${label.slice(0, 29)}…` : label)}</text>`;
  });
  const file = path.join(outDir, `overview-${shape}.jpg`);
  await sharp({create: {background: PAPER, channels: 3, height, width}})
    .composite([
      ...layers,
      {input: svg(width, height, captions), left: 0, top: 0},
    ])
    .jpeg({quality: 86})
    .toFile(file);
  return file;
}
