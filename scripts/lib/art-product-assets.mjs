/**
 * Production files and shopper previews for museum family products
 * (scripts/lib/art-product-pipeline.mjs plans them). Files follow the live
 * generators' contracts exactly — the four-panel greeting card and two-sided
 * postcard of prepare-art-product-extensions.py, the 16×20 150 dpi canvas,
 * and the 2000×2500 tough-case file of generate-tough-case-assets.mjs — but
 * the artwork comes from the owner-approved crop of the museum original:
 * pixels are only cut and resampled, never generated. The mug's 2705×1122
 * wrap (Prodigi GLOBAL-MUG-W) holds the whole work twice on white. Local
 * files only.
 */

import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {caseMasks, renderPreview} from '../generate-tough-case-assets.mjs';
import {REPO_ROOT} from './product-pipeline.mjs';

const WARM_WHITE = {b: 230, g: 239, r: 244};
const WHITE = {b: 255, g: 255, r: 255};
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
  if (output.placements) {
    // The whole work, fitted to each panel on white. Each placement has
    // the master's aspect to the pixel, so `fill` neither crops nor bends.
    const art = new Map();
    const layers = [];
    for (const box of output.placements) {
      const key = `${box.width}x${box.height}`;
      if (!art.has(key))
        art.set(
          key,
          await cropped(plan)
            .flatten({background: WHITE})
            .resize(box.width, box.height, {fit: 'fill', kernel: 'lanczos3'})
            .png()
            .toBuffer(),
        );
      layers.push({input: art.get(key), left: box.left, top: box.top});
    }
    return jpeg(
      sharp({
        create: {
          background: WHITE,
          channels: 3,
          height: output.height,
          width: output.width,
        },
      }).composite(layers),
      output.dpi,
    );
  }
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
 * nothing generated, nothing shifted, nothing missing. A mug is checked at
 * both placements against the whole master; the worse one is returned.
 */
export async function artMatchError(plan, file) {
  const whole = Boolean(plan.output.placements);
  const regions = plan.output.placements ?? [
    plan.output.panel ?? {
      height: plan.output.height,
      left: 0,
      top: 0,
      width: plan.output.width,
    },
  ];
  let worst = 0;
  for (const panel of regions) {
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
      whole
        ? cropped(plan)
            .flatten({background: WHITE})
            .resize(panel.width, panel.height, {
              fit: 'fill',
              kernel: 'lanczos3',
            })
        : cropped(plan).resize(panel.width, panel.height, {
            fit: 'cover',
            kernel: 'lanczos3',
            position: 'centre',
          }),
    );
    let total = 0;
    for (let i = 0; i < ours.length; i += 1)
      total += Math.abs(ours[i] - theirs[i]);
    worst = Math.max(worst, Math.round((total / ours.length) * 100) / 100);
  }
  return worst;
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
  if (plan.family === 'mug') return mugPreview(size, printFile);
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

/** The hanger's wooden strips, by colour (the preview shows oak). */
const OAK = ['#caa77a', '#a98458'];

/**
 * The shopper preview of a supplied-file family (suppliedAssetPlan), from
 * its lead file: the product itself on linen, drawn plainly — the hanger's
 * oak strips and cord, the acrylic's gloss, the metal panel's edge, the
 * cushion's soft edge, the blanket flat. Nothing is added to the art.
 */
export async function renderSuppliedPreview(plan, leadFile) {
  const size = {height: plan.preview.height, width: plan.preview.width};
  if (plan.family === 'printful-mug')
    // An upright work is printed twice, centred on each quarter of the
    // wrap: turn the first copy to the viewer.
    return mugPreview(size, leadFile, {
      ...PRINTFUL_MUG_MM,
      front:
        (plan.layout ?? plan.orientation) === 'portrait'
          ? PRINTFUL_MUG_MM.wrap / 4
          : PRINTFUL_MUG_MM.front,
    });
  const file = await sharp(leadFile).metadata();
  const aspect = file.width / file.height;
  const art = async (box) =>
    sharp(leadFile)
      .resize(box.width, box.height, {fit: 'fill', kernel: 'lanczos3'})
      .png()
      .toBuffer();

  if (plan.family === 'hanger-print') {
    const sheet = place(size, aspect, {
      lift: 10,
      maxHeight: 1460,
      maxWidth: 1300,
    });
    // The strips are 1.5 cm deep and a little wider than the paper.
    const dpi = plan.files[0]?.dpi ?? 300;
    const mmToPx = sheet.height / ((file.height / dpi) * 25.4);
    const strip = Math.max(18, Math.round(15 * mmToPx));
    const overhang = Math.round(strip * 0.6);
    const stripBox = (top) => ({
      height: strip,
      left: sheet.left - overhang,
      top,
      width: sheet.width + overhang * 2,
    });
    const top = stripBox(sheet.top - Math.round(strip * 0.15));
    const bottom = stripBox(
      sheet.top + sheet.height - strip + Math.round(strip * 0.15),
    );
    const wood = (box) =>
      svg(
        box.width,
        box.height,
        `<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${OAK[0]}"/><stop offset="1" stop-color="${OAK[1]}"/></linearGradient></defs>` +
          `<rect width="${box.width}" height="${box.height}" rx="3" fill="url(#w)"/>` +
          `<rect x="1" y="1" width="${box.width - 2}" height="${box.height - 2}" rx="3" fill="none" stroke="rgba(70,48,24,0.35)" stroke-width="2"/>`,
      );
    const apex = {
      x: Math.round(size.width / 2),
      y: Math.max(40, top.top - 210),
    };
    const cord = svg(
      size.width,
      size.height,
      `<path d="M${top.left + Math.round(top.width * 0.12)} ${top.top + 4} L${apex.x} ${apex.y} L${top.left + Math.round(top.width * 0.88)} ${top.top + 4}" fill="none" stroke="rgb(120,96,70)" stroke-width="5" stroke-linejoin="round"/>` +
        `<circle cx="${apex.x}" cy="${apex.y}" r="8" fill="rgb(90,80,70)"/>`,
    );
    return onLinen(size, [
      {input: cord, left: 0, top: 0},
      shadow(size.width, size.height, sheet, {alpha: 0.24}),
      {input: await art(sheet), left: sheet.left, top: sheet.top},
      {input: wood(top), left: top.left, top: top.top},
      {input: wood(bottom), left: bottom.left, top: bottom.top},
    ]);
  }

  if (plan.family === 'acrylic-print' || plan.family === 'metal-print') {
    const panel = place(size, aspect, {
      lift: 30,
      maxHeight: 1480,
      maxWidth: 1320,
    });
    const acrylic = plan.family === 'acrylic-print';
    const finish = svg(
      panel.width,
      panel.height,
      acrylic
        ? // High gloss: a soft diagonal sheen and a bright polished edge.
          `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.04"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>` +
            `<rect width="${panel.width}" height="${panel.height}" fill="url(#g)"/>` +
            `<rect x="2" y="2" width="${panel.width - 4}" height="${panel.height - 4}" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="4"/>`
        : // Matt metal: a thin brushed-grey edge.
          `<rect x="1.5" y="1.5" width="${panel.width - 3}" height="${panel.height - 3}" fill="none" stroke="rgb(150,150,148)" stroke-width="3"/>`,
    );
    return onLinen(size, [
      shadow(size.width, size.height, panel, {
        alpha: acrylic ? 0.34 : 0.3,
        blur: 30,
        dx: 22,
        dy: 34,
      }),
      {input: await art(panel), left: panel.left, top: panel.top},
      {input: finish, left: panel.left, top: panel.top},
    ]);
  }

  if (plan.family === 'cushion' || plan.family === 'blanket') {
    const cushion = plan.family === 'cushion';
    const piece = place(size, aspect, {
      lift: 20,
      maxHeight: cushion ? 1240 : 1500,
      maxWidth: cushion ? 1240 : 1260,
    });
    const radius = Math.round(piece.width * (cushion ? 0.07 : 0.015));
    const outline = svg(
      piece.width,
      piece.height,
      `<rect width="${piece.width}" height="${piece.height}" rx="${radius}" fill="#fff"/>`,
    );
    // A cushion is fuller in the middle: darker towards its edges.
    const shade = svg(
      piece.width,
      piece.height,
      cushion
        ? `<defs><radialGradient id="r" cx="0.5" cy="0.48" r="0.72"><stop offset="0.55" stop-color="rgb(40,32,24)" stop-opacity="0"/><stop offset="1" stop-color="rgb(40,32,24)" stop-opacity="0.32"/></radialGradient></defs><rect width="${piece.width}" height="${piece.height}" rx="${radius}" fill="url(#r)"/>`
        : `<rect width="${piece.width}" height="${piece.height}" rx="${radius}" fill="none" stroke="rgba(60,48,36,0.18)" stroke-width="4"/>`,
    );
    const shaped = await sharp(await art(piece))
      .ensureAlpha()
      .composite([{blend: 'dest-in', input: outline}, {input: shade}])
      .png()
      .toBuffer();
    return onLinen(size, [
      shadow(size.width, size.height, piece, {alpha: cushion ? 0.3 : 0.2}),
      {input: shaped, left: piece.left, top: piece.top},
    ]);
  }
  throw new Error(`${plan.handle}: no preview for ${plan.family}`);
}

/**
 * An 11 oz mug: 82 mm across, 95 mm tall; Prodigi's wrap is 229 × 95 mm
 * and faces the viewer at its first panel's centre.
 */
const MUG_MM = {diameter: 82, front: 57.25, height: 95, wrap: 229};
/**
 * Printful's White Glossy Mug, 11 oz: 82 mm across, 96 mm tall, a 9 × 3.5 in
 * (228.6 × 88.9 mm) print area. Its file holds a wide work once at the
 * centre, so the preview turns the mug until most of it faces the viewer.
 */
const PRINTFUL_MUG_MM = {
  diameter: 82,
  front: 84,
  height: 96,
  printHeight: 88.9,
  wrap: 228.6,
};

/**
 * The mug side-on with the wrap position `front` facing the viewer and the
 * handle at the wrap's seam (left). Each column of the body samples the
 * print file at the arc length its angle reaches on the cylinder, so the art
 * curves away at the sides as on the mug; past the wrap's end the ceramic
 * is white. Shading and the handle are drawn; nothing is added to the art.
 */
async function mugPreview(size, printFile, mug = MUG_MM) {
  const perMm = 980 / mug.diameter;
  const body = {
    height: Math.round(mug.height * perMm),
    width: Math.round(mug.diameter * perMm),
  };
  body.left = Math.round((size.width - body.width) / 2) + 70;
  body.top = Math.round((size.height - body.height) / 2) - 30;
  const wrapWidth = Math.round(mug.wrap * perMm);
  // A print area shorter than the mug sits centred, white above and below.
  const wrapHeight = Math.min(
    body.height,
    Math.round((mug.printHeight ?? mug.height) * perMm),
  );
  const offsetY = Math.round((body.height - wrapHeight) / 2);
  const wrap = await sharp(printFile)
    .resize(wrapWidth, wrapHeight, {fit: 'fill', kernel: 'lanczos3'})
    .removeAlpha()
    .raw()
    .toBuffer();
  const out = Buffer.alloc(body.width * body.height * 3, 255);
  const radius = mug.diameter / 2;
  for (let x = 0; x < body.width; x += 1) {
    const u = (x + 0.5 - body.width / 2) / (body.width / 2);
    const mm = mug.front + radius * Math.asin(Math.max(-1, Math.min(1, u)));
    const column = mm * perMm - 0.5;
    if (column < 0 || column > wrapWidth - 1) continue;
    const left = Math.floor(column);
    const right = Math.min(left + 1, wrapWidth - 1);
    const t = column - left;
    for (let y = 0; y < wrapHeight; y += 1) {
      const a = (y * wrapWidth + left) * 3;
      const b = (y * wrapWidth + right) * 3;
      const o = ((y + offsetY) * body.width + x) * 3;
      for (let c = 0; c < 3; c += 1)
        out[o + c] = Math.round(wrap[a + c] * (1 - t) + wrap[b + c] * t);
    }
  }
  const {height, width} = body;
  const corner = Math.round(width * 0.06);
  const outline = `M0 0 H${width} V${height - corner} Q${width} ${height} ${width - corner} ${height} H${corner} Q0 ${height} 0 ${height - corner} Z`;
  const cylinder = await sharp(out, {raw: {channels: 3, height, width}})
    .ensureAlpha()
    .composite([
      {
        blend: 'dest-in',
        input: svg(width, height, `<path d="${outline}" fill="#fff"/>`),
      },
      {
        input: svg(
          width,
          height,
          `<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0">` +
            `<stop offset="0" stop-color="rgb(40,32,24)" stop-opacity="0.34"/>` +
            `<stop offset="0.18" stop-color="rgb(40,32,24)" stop-opacity="0.08"/>` +
            `<stop offset="0.32" stop-color="#fff" stop-opacity="0.16"/>` +
            `<stop offset="0.5" stop-color="#fff" stop-opacity="0"/>` +
            `<stop offset="0.8" stop-color="rgb(40,32,24)" stop-opacity="0.1"/>` +
            `<stop offset="1" stop-color="rgb(40,32,24)" stop-opacity="0.38"/>` +
            `</linearGradient></defs>` +
            `<path d="${outline}" fill="url(#g)"/>` +
            `<rect width="${width}" height="6" fill="#fff" fill-opacity="0.7"/>`,
        ),
      },
    ])
    .png()
    .toBuffer();
  const handle = {
    centreY: body.top + Math.round(height * 0.46),
    rx: Math.round(width * 0.24),
    ry: Math.round(height * 0.29),
  };
  const handleLayer = svg(
    size.width,
    size.height,
    `<ellipse cx="${body.left + 8}" cy="${handle.centreY}" rx="${handle.rx}" ry="${handle.ry}" fill="none" stroke="rgb(150,140,128)" stroke-width="76"/>` +
      `<ellipse cx="${body.left + 8}" cy="${handle.centreY}" rx="${handle.rx}" ry="${handle.ry}" fill="none" stroke="#f4f2ee" stroke-width="68"/>` +
      `<ellipse cx="${body.left + 8}" cy="${handle.centreY}" rx="${handle.rx - 22}" ry="${handle.ry - 22}" fill="none" stroke="rgb(40,32,24)" stroke-opacity="0.12" stroke-width="10"/>`,
  );
  return onLinen(size, [
    shadow(size.width, size.height, {...body, height, width}, {alpha: 0.24}),
    {input: handleLayer, left: 0, top: 0},
    {input: cylinder, left: body.left, top: body.top},
  ]);
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
