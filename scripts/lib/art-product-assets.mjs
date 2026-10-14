/**
 * Production files and shopper previews for museum family products
 * (scripts/lib/art-product-pipeline.mjs plans them). Files follow the live
 * generators' contracts exactly — the four-panel greeting card and two-sided
 * postcard of prepare-art-product-extensions.py, the 16×20 150 dpi canvas,
 * and the 2000×2500 tough-case file of generate-tough-case-assets.mjs — but
 * the artwork comes from the owner-approved crop of the museum original:
 * pixels are only cut and resampled, never generated. Local files only.
 */

import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {caseMasks, renderPreview} from '../generate-tough-case-assets.mjs';
import {REPO_ROOT} from './product-pipeline.mjs';

const WARM_WHITE = {b: 230, g: 239, r: 244};
const LINEN = {b: 227, g: 234, r: 238};
/** The live postcard's address divider and stamp box. */
const POSTCARD_RULE = '#cac2b5';
const POSTCARD_STAMP = '#b7aea0';

export const sha256 = (buffer) =>
  createHash('sha256').update(buffer).digest('hex');

/** The approved crop, cut from the original once (no intermediate). */
function cropped(plan) {
  return sharp(plan.source.file).extract(plan.extract);
}

async function jpeg(pipeline, dpi, {quality = 95, mozjpeg = false} = {}) {
  return pipeline
    .toColourspace('srgb')
    .withMetadata({density: dpi})
    .jpeg({chromaSubsampling: '4:4:4', mozjpeg, quality})
    .toBuffer();
}

/** The front art at panel size, as raw-free PNG for compositing. */
async function panelArt(plan, panel) {
  return cropped(plan)
    .resize(panel.width, panel.height, {
      fit: 'cover',
      kernel: 'lanczos3',
      position: 'centre',
    })
    .png()
    .toBuffer();
}

/** Mean colour of an image, like PIL's 1×1 BOX resize in the live card. */
async function meanColour(buffer) {
  const {channels} = await sharp(buffer).stats();
  const [r, g, b] = channels.map((channel) => Math.round(channel.mean));
  return {b, g, r};
}

/**
 * The production file for a cropped family. Returns the encoded JPEG.
 * Framed prints reuse the bordered print file and never come here.
 */
export async function renderFamilyFile(plan) {
  const {output} = plan;
  if (plan.family === 'canvas') {
    return jpeg(
      cropped(plan).resize(output.width, output.height, {
        fit: 'cover',
        kernel: 'lanczos3',
        position: 'centre',
      }),
      output.dpi,
    );
  }
  if (plan.family === 'phone-case') {
    // generate-tough-case-assets.mjs renderPrintFile(): sRGB, 300 dpi,
    // quality 90 mozjpeg 4:4:4.
    return jpeg(
      cropped(plan).resize(output.width, output.height, {
        fit: 'cover',
        kernel: 'lanczos3',
        position: 'centre',
      }),
      output.dpi,
      {mozjpeg: true, quality: 90},
    );
  }
  const {panel} = output;
  const art = await panelArt(plan, panel);
  const layers = [{input: art, left: panel.left, top: panel.top}];
  if (plan.family === 'greeting-card') {
    // Rear panel in the artwork's mean colour, inside left blank.
    const rear = await sharp({
      create: {
        background: await meanColour(art),
        channels: 3,
        height: output.height,
        width: panel.left,
      },
    })
      .png()
      .toBuffer();
    layers.unshift({input: rear, left: 0, top: 0});
  } else if (plan.family === 'postcard') {
    // Address side: the live divider rule and stamp box.
    const half = panel.left;
    const rule = Math.floor(half / 2);
    layers.unshift({
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${half}" height="${output.height}" shape-rendering="crispEdges">` +
          `<rect x="${rule - 2}" y="220" width="4" height="${output.height - 440}" fill="${POSTCARD_RULE}"/>` +
          `<rect x="${half - 430 + 2}" y="172" width="246" height="156" fill="none" stroke="${POSTCARD_STAMP}" stroke-width="4"/>` +
          '</svg>',
      ),
      left: 0,
      top: 0,
    });
  } else {
    throw new Error(`${plan.handle}: no renderer for ${plan.family}`);
  }
  return jpeg(
    sharp({
      create: {
        background: WARM_WHITE,
        channels: 3,
        height: output.height,
        width: output.width,
      },
    }).composite(layers),
    output.dpi,
  );
}

/**
 * Mean absolute difference (0–255) between the artwork region of a
 * production file and the approved crop of the original, both reduced to
 * 96 px wide. A small number proves the panel holds exactly that crop:
 * nothing generated, nothing shifted, nothing missing.
 */
export async function artMatchError(plan, file) {
  const panel = plan.output.panel ?? {
    height: plan.output.height,
    left: 0,
    top: 0,
    width: plan.output.width,
  };
  const width = 96;
  const height = Math.round((width * panel.height) / panel.width);
  const reduce = (pipeline) =>
    pipeline
      .resize(width, height, {fit: 'fill', kernel: 'lanczos3'})
      .removeAlpha()
      .raw()
      .toBuffer();
  const ours = await reduce(sharp(file).extract(panel));
  const theirs = await reduce(
    cropped(plan).resize(panel.width, panel.height, {
      fit: 'cover',
      kernel: 'lanczos3',
      position: 'centre',
    }),
  );
  let total = 0;
  for (let i = 0; i < ours.length; i += 1)
    total += Math.abs(ours[i] - theirs[i]);
  return Math.round((total / ours.length) * 100) / 100;
}

/**
 * Largest mean difference (0–255 per channel) between a deployed image and
 * the committed file it was served from. Oxygen re-encodes images under
 * /print-files/ (4:2:0 chroma, about 1.4 on the case files); a different
 * artwork or crop is tens of levels away.
 */
export const MAX_REENCODE_DIFFERENCE = 3;

/**
 * Whether `deployed` shows the same pixels as `reference` within re-encode
 * tolerance: the same pixel size and a mean absolute difference per channel
 * no larger than `maxMeanDifference`. Byte hashes cannot be used because the
 * host re-encodes the file.
 */
export async function compareDeployedImage(
  deployed,
  reference,
  {maxMeanDifference = MAX_REENCODE_DIFFERENCE} = {},
) {
  const decode = (buffer) =>
    sharp(buffer)
      .toColourspace('srgb')
      .removeAlpha()
      .raw()
      .toBuffer({resolveWithObject: true});
  const [live, ours] = await Promise.all([decode(deployed), decode(reference)]);
  const size = (info) => `${info.width}x${info.height}`;
  if (
    live.info.width !== ours.info.width ||
    live.info.height !== ours.info.height ||
    live.info.channels !== ours.info.channels
  )
    return {
      detail: `${size(live.info)} served, ${size(ours.info)} committed`,
      meanDifference: null,
      ok: false,
      size: {height: live.info.height, width: live.info.width},
    };
  let total = 0;
  let max = 0;
  for (let i = 0; i < live.data.length; i += 1) {
    const difference = Math.abs(live.data[i] - ours.data[i]);
    total += difference;
    if (difference > max) max = difference;
  }
  const meanDifference = Math.round((total / live.data.length) * 100) / 100;
  return {
    detail: `${size(live.info)}, mean difference ${meanDifference}/255 (max ${max}; limit ${maxMeanDifference})`,
    meanDifference,
    ok: meanDifference <= maxMeanDifference,
    size: {height: live.info.height, width: live.info.width},
  };
}

/** Facts read back from an encoded file. */
export async function describeFile(buffer) {
  const meta = await sharp(buffer).metadata();
  return {
    channels: meta.channels,
    dpi: meta.density,
    height: meta.height,
    sha256: sha256(buffer),
    space: meta.space,
    width: meta.width,
  };
}

const svg = (width, height, body) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`,
  );

/** A soft drop shadow under a rectangle, as an SVG layer. */
function shadow(
  width,
  height,
  box,
  {blur = 26, dx = 16, dy = 26, alpha = 0.3} = {},
) {
  return {
    input: svg(
      width,
      height,
      `<defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${blur}"/></filter></defs>` +
        `<rect x="${box.left + dx}" y="${box.top + dy}" width="${box.width}" height="${box.height}" fill="rgb(60,48,36)" fill-opacity="${alpha}" filter="url(#s)"/>`,
    ),
    left: 0,
    top: 0,
  };
}

/** Centres an object of the given aspect inside the preview. */
function place(size, aspect, {maxWidth, maxHeight, lift = 0}) {
  let width = maxWidth;
  let height = Math.round(width / aspect);
  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * aspect);
  }
  return {
    height,
    left: Math.round((size.width - width) / 2),
    top: Math.round((size.height - height) / 2) - lift,
    width,
  };
}

async function onLinen(size, layers) {
  return sharp({
    create: {
      background: LINEN,
      channels: 3,
      height: size.height,
      width: size.width,
    },
  })
    .composite(layers)
    .webp({quality: 90})
    .toBuffer();
}

/**
 * The shopper preview for a product, `PREVIEW_SIZE` (4:5) WebP: the
 * product itself on linen, from its production file — no text, no
 * invented scene. The case uses the live tough-case renderer on the iPhone
 * 16 Pro template (`masks` from caseMasks()).
 */
export async function renderFamilyPreview(plan, printFile, {masks} = {}) {
  const size = {height: plan.preview.height, width: plan.preview.width};
  if (plan.family === 'phone-case') {
    if (!masks) throw new Error('phone-case previews need the template masks');
    const jpg = await renderPreview(printFile, masks);
    return sharp(jpg).webp({quality: 90}).toBuffer();
  }
  const file = await sharp(printFile).metadata();
  if (plan.family === 'framed-print') {
    const aspect = file.width / file.height;
    const outer = place(size, aspect, {
      lift: 40,
      maxHeight: 1520,
      maxWidth: 1300,
    });
    const moulding = Math.round(Math.max(outer.width, outer.height) * 0.04);
    const inner = {
      height: outer.height - moulding * 2,
      width: outer.width - moulding * 2,
    };
    const sheet = await sharp(printFile)
      .resize(inner.width, inner.height, {fit: 'fill', kernel: 'lanczos3'})
      .png()
      .toBuffer();
    const frame = svg(
      outer.width,
      outer.height,
      `<defs><linearGradient id="w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c39d6c"/><stop offset="1" stop-color="#a47c4e"/></linearGradient></defs>` +
        `<rect width="${outer.width}" height="${outer.height}" fill="url(#w)"/>` +
        `<rect x="1" y="1" width="${outer.width - 2}" height="${outer.height - 2}" fill="none" stroke="rgba(70,48,24,0.45)" stroke-width="2"/>` +
        `<rect x="${moulding - 3}" y="${moulding - 3}" width="${inner.width + 6}" height="${inner.height + 6}" fill="none" stroke="rgba(60,40,20,0.55)" stroke-width="6"/>`,
    );
    return onLinen(size, [
      shadow(size.width, size.height, outer),
      {input: frame, left: outer.left, top: outer.top},
      {input: sheet, left: outer.left + moulding, top: outer.top + moulding},
    ]);
  }
  if (plan.family === 'canvas') {
    const face = place(size, file.width / file.height, {
      lift: 40,
      maxHeight: 1460,
      maxWidth: 1240,
    });
    const depth = Math.round(Math.max(face.width, face.height) * 0.035);
    const art = await sharp(printFile)
      .resize(face.width, face.height, {fit: 'fill', kernel: 'lanczos3'})
      .png()
      .toBuffer();
    // Mirror wrap, as Prodigi prints it: each edge mirrors the picture.
    const side = await sharp(art)
      .extract({
        height: face.height,
        left: face.width - depth,
        top: 0,
        width: depth,
      })
      .flop()
      .modulate({brightness: 0.7})
      .png()
      .toBuffer();
    const bottom = await sharp(art)
      .extract({
        height: depth,
        left: 0,
        top: face.height - depth,
        width: face.width,
      })
      .flip()
      .modulate({brightness: 0.55})
      .png()
      .toBuffer();
    return onLinen(size, [
      shadow(size.width, size.height, {
        ...face,
        height: face.height + depth,
        width: face.width + depth,
      }),
      {
        input: side,
        left: face.left + face.width,
        top: face.top + Math.round(depth / 2),
      },
      {
        input: bottom,
        left: face.left + Math.round(depth / 2),
        top: face.top + face.height,
      },
      {input: art, left: face.left, top: face.top},
    ]);
  }
  // Cards and postcards: the artwork panel as the printed piece.
  const panelBuffer = await sharp(printFile)
    .extract(plan.output.panel)
    .toBuffer();
  const piece = place(
    size,
    plan.output.panel.width / plan.output.panel.height,
    {
      lift: 30,
      maxHeight: plan.family === 'greeting-card' ? 1380 : 1400,
      maxWidth: plan.family === 'greeting-card' ? 980 : 1300,
    },
  );
  const art = await sharp(panelBuffer)
    .resize(piece.width, piece.height, {fit: 'fill', kernel: 'lanczos3'})
    .png()
    .toBuffer();
  const layers = [];
  if (plan.family === 'greeting-card') {
    // The kraft envelope it comes with, tucked behind.
    const envelope = {
      height: Math.round(piece.height * 0.96),
      left: piece.left + Math.round(piece.width * 0.16),
      top: piece.top + Math.round(piece.height * 0.08),
      width: Math.round(piece.width * 1.02),
    };
    layers.push(shadow(size.width, size.height, envelope, {alpha: 0.22}), {
      input: svg(
        envelope.width,
        envelope.height,
        `<rect width="${envelope.width}" height="${envelope.height}" fill="#c9a77c"/><path d="M0 0 L${envelope.width / 2} ${Math.round(envelope.height * 0.42)} L${envelope.width} 0" fill="none" stroke="rgba(90,62,30,0.35)" stroke-width="4"/>`,
      ),
      left: envelope.left,
      top: envelope.top,
    });
  }
  layers.push(shadow(size.width, size.height, piece, {alpha: 0.28}), {
    input: art,
    left: piece.left,
    top: piece.top,
  });
  return onLinen(size, layers);
}

function worktrees() {
  try {
    return execFileSync('git', ['worktree', 'list', '--porcelain'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split(/\r?\n/)
      .filter((line) => line.startsWith('worktree '))
      .map((line) => path.resolve(line.slice('worktree '.length)));
  } catch {
    return [];
  }
}

/**
 * The Prodigi template the live case previews use, found by its recorded
 * checksum in this worktree or any other worktree of the repository (the
 * templates live under the gitignored output/ folder).
 */
export function findCaseTemplate(device) {
  const tried = [];
  for (const root of [REPO_ROOT, ...worktrees()]) {
    const candidate = path.join(root, ...device.template.localFile.split('/'));
    if (tried.includes(candidate)) continue;
    tried.push(candidate);
    if (
      existsSync(candidate) &&
      sha256(readFileSync(candidate)) === device.template.sha256
    )
      return candidate;
  }
  throw new Error(
    `No ${device.template.localFile} with sha256 ${device.template.sha256} in this or any other worktree; download it from ${device.templateUrl} into output/prodigi-assets/tough-phone-case/`,
  );
}

export {caseMasks};
