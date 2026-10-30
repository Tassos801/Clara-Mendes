#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Turns the owner's logo file into the vector data the storefront draws:
 * the wordmark traced into one path (potrace, fill-rule evenodd) and the
 * mark as six measured rectangles. Deterministic; re-run only if the file in
 * docs/brand changes.
 *
 *   node scripts/trace-logo.mjs <folder with potrace installed>
 *
 * potrace (the pure-JS port) is not a repo dependency. Install it once in a
 * scratch folder: `npm init -y && npm i potrace@2`, then pass that folder.
 *
 * Writes app/content/logo.ts and public/images/brand/*.svg, then rebuilds
 * the stacked lockup and measures its overlap with the source's alpha mask
 * (expect about 0.99; exits 1 below 0.98).
 */
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'docs/brand/clara-mendes-logo-2026-10-30.webp');
const OUT_TS = path.join(ROOT, 'app/content/logo.ts');
const OUT_SVG = path.join(ROOT, 'public/images/brand');

const potraceDir = process.argv[2];
if (!potraceDir) {
  console.error('Usage: node scripts/trace-logo.mjs <folder with potrace installed>');
  process.exit(2);
}
const potrace = createRequire(path.join(path.resolve(potraceDir), 'package.json'))('potrace');

// The file is 1536 x 1024 with a transparent background. Measured in it:
// the text block (CLARA over MENDES) and the mark, whose six rectangles
// meet on one seam. ORIGIN is the lockup's top-left in file pixels.
const ORIGIN = {x: 367, y: 256};
const LOCKUP = {width: 803, height: 497};
const TEXT_REGION = {left: 360, top: 448, width: 550, height: 260};
const SCALE = 4; // trace at 4x for smoother curves
const COLORS = {red: '#CE1415', blue: '#023E95', yellow: '#F9C006'};
const INK = '#111111';
const MARK = {
  x: 519, // in the lockup
  width: 284,
  height: 497,
  rects: [
    {fill: 'ink', x: 214, y: 0, width: 26, height: 290}, // tall bar
    {fill: 'red', x: 98, y: 104, width: 116, height: 186},
    {fill: 'blue', x: 0, y: 202, width: 98, height: 88},
    {fill: 'ink', x: 98, y: 290, width: 26, height: 207}, // lower bar
    {fill: 'yellow', x: 158, y: 290, width: 126, height: 38},
    {fill: 'ink', x: 158, y: 328, width: 72, height: 68}, // square
  ],
};
// One-line lockup: word gap, gap to the mark and the mark's height, all in
// units of the 100-unit cap height.
const WORD_GAP = 64;
const MARK_GAP = 72;
const MARK_H = 240;

const f = (v) => Math.round(v).toString();

async function traceText() {
  const mask = await sharp(SOURCE)
    .ensureAlpha()
    .extract(TEXT_REGION)
    .extractChannel(3)
    .resize(TEXT_REGION.width * SCALE, TEXT_REGION.height * SCALE, {kernel: 'lanczos3'})
    .negate()
    .threshold(128)
    .png()
    .toBuffer();
  const svg = await new Promise((resolve, reject) =>
    potrace.trace(
      mask,
      {threshold: 128, turdSize: 8, optTolerance: 1, alphaMax: 1, turnPolicy: 'minority', blackOnWhite: true},
      (err, out) => (err ? reject(err) : resolve(out)),
    ),
  );
  const d = svg.match(/ d="([^"]+)"/)?.[1];
  if (!d) throw new Error('potrace returned no path');
  const tx = (v) => v / SCALE + TEXT_REGION.left - ORIGIN.x;
  const ty = (v) => v / SCALE + TEXT_REGION.top - ORIGIN.y;
  const tokens = d.match(/[MLCZmlcz]|-?\d*\.?\d+(?:e-?\d+)?/g);
  const isNum = (t) => !/[A-Za-z]/.test(t);
  const subpaths = [];
  let cur = null;
  let cx = 0;
  let cy = 0;
  let i = 0;
  const point = () => {
    cur.minX = Math.min(cur.minX, cx);
    cur.maxX = Math.max(cur.maxX, cx);
    cur.minY = Math.min(cur.minY, cy);
    cur.maxY = Math.max(cur.maxY, cy);
  };
  while (i < tokens.length) {
    const t = tokens[i++];
    const rel = t === t.toLowerCase();
    if (t === 'M' || t === 'm') {
      cx = (rel ? cx : 0) + +tokens[i++];
      cy = (rel ? cy : 0) + +tokens[i++];
      cur = {cmds: [['M', tx(cx), ty(cy)]], minX: cx, maxX: cx, minY: cy, maxY: cy};
      subpaths.push(cur);
    } else if (t === 'L' || t === 'l') {
      while (i < tokens.length && isNum(tokens[i])) {
        cx = (rel ? cx : 0) + +tokens[i++];
        cy = (rel ? cy : 0) + +tokens[i++];
        cur.cmds.push(['L', tx(cx), ty(cy)]);
        point();
      }
    } else if (t === 'C' || t === 'c') {
      while (i < tokens.length && isNum(tokens[i])) {
        const bx = rel ? cx : 0;
        const by = rel ? cy : 0;
        const pts = [];
        for (let k = 0; k < 3; k++) {
          cx = bx + +tokens[i++];
          cy = by + +tokens[i++];
          pts.push(tx(cx), ty(cy));
        }
        cur.cmds.push(['C', ...pts]);
        point();
      }
    } else if (t === 'Z' || t === 'z') {
      cur.cmds.push(['Z']);
    } else {
      throw new Error(`unexpected path token ${t}`);
    }
  }
  for (const s of subpaths) {
    s.x0 = tx(s.minX);
    s.x1 = tx(s.maxX);
    s.y0 = ty(s.minY);
    s.y1 = ty(s.maxY);
    s.row = (s.y0 + s.y1) / 2 < 322 ? 1 : 2;
  }
  // The text crop also holds a sliver of the blue block, right of CLARA.
  return subpaths.filter((s) => !(s.row === 1 && s.x0 > 470));
}

const pathOf = (subpaths, dx = 0, dy = 0) =>
  subpaths
    .map((s) =>
      s.cmds
        .map(([c, ...n]) => (c === 'Z' ? 'Z' : c + n.map((v, k) => f(v + (k % 2 ? dy : dx))).join(' ')))
        .join(''),
    )
    .join('');

const rowBox = (subpaths, row) => {
  const ss = subpaths.filter((s) => s.row === row);
  return {
    x0: Math.min(...ss.map((s) => s.x0)),
    x1: Math.max(...ss.map((s) => s.x1)),
    y0: Math.min(...ss.map((s) => s.y0)),
    y1: Math.max(...ss.map((s) => s.y1)),
  };
};

const rects = (ink, dx = 0, dy = 0, s = 1) =>
  MARK.rects
    .map(
      (r) =>
        `<rect fill="${r.fill === 'ink' ? ink : COLORS[r.fill]}" x="${f(dx + r.x * s)}" y="${f(dy + r.y * s)}" width="${f(r.width * s)}" height="${f(r.height * s)}"/>`,
    )
    .join('\n  ');

function svgFile(viewBox, width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}" role="img" aria-labelledby="t">
  <title id="t">Clara Mendes</title>
  ${body}
</svg>
`;
}

async function main() {
  const subpaths = await traceText();
  const textPath = pathOf(subpaths);
  const c = rowBox(subpaths, 1);
  const m = rowBox(subpaths, 2);
  if (subpaths.length !== 15 || c.x1 > 450 || m.x1 > 540) {
    throw new Error(`unexpected trace: ${subpaths.length} subpaths, CLARA to ${c.x1}, MENDES to ${m.x1}`);
  }

  const capH = c.y1 - c.y0;
  const scale = MARK_H / MARK.height;
  const textW = c.x1 - c.x0 + WORD_GAP + (m.x1 - m.x0);
  const markX = textW + MARK_GAP;
  const shiftY = (MARK_H - capH) / 2;
  const linePath =
    pathOf(subpaths.filter((s) => s.row === 1), -c.x0, -c.y0 + shiftY) +
    pathOf(subpaths.filter((s) => s.row === 2), -m.x0 + (c.x1 - c.x0) + WORD_GAP, -m.y0 + shiftY);
  const horizontal = {
    width: Math.round(markX + MARK.width * scale),
    height: MARK_H,
    mark: {x: Math.round(markX), y: 0, scale: Number(scale.toFixed(4))},
  };

  const stackedSvg = (ink) =>
    svgFile(
      `0 0 ${LOCKUP.width} ${LOCKUP.height}`,
      LOCKUP.width,
      LOCKUP.height,
      `<path fill="${ink}" fill-rule="evenodd" d="${textPath}"/>\n  ${rects(ink, MARK.x, 0)}`,
    );
  const horizontalSvg = (ink) =>
    svgFile(
      `0 0 ${horizontal.width} ${horizontal.height}`,
      horizontal.width,
      horizontal.height,
      `<path fill="${ink}" fill-rule="evenodd" d="${linePath}"/>\n  ${rects(ink, horizontal.mark.x, horizontal.mark.y, horizontal.mark.scale)}`,
    );
  const markSvg = (ink) => svgFile(`0 0 ${MARK.width} ${MARK.height}`, MARK.width, MARK.height, rects(ink));

  await mkdir(OUT_SVG, {recursive: true});
  const files = {
    'clara-mendes-logo.svg': stackedSvg(INK),
    'clara-mendes-logo-horizontal.svg': horizontalSvg(INK),
    'clara-mendes-mark.svg': markSvg(INK),
  };
  for (const [name, body] of Object.entries(files)) {
    await writeFile(path.join(OUT_SVG, name), body);
    console.log(`public/images/brand/${name}  ${body.length} bytes`);
  }

  const rectLines = MARK.rects
    .map((r) => `    {fill: '${r.fill}', x: ${r.x}, y: ${r.y}, width: ${r.width}, height: ${r.height}},`)
    .join('\n');
  const ts = `/**
 * The Clara Mendes logo (the owner's file of 2026-10-30) as vector data, so
 * the storefront draws it inline at any size: the wordmark as one traced
 * path (fill-rule evenodd) and the mark as six rectangles. "ink" rectangles
 * take the surrounding text colour, so the same data serves the dark footer.
 *
 * Generated by scripts/trace-logo.mjs from
 * docs/brand/clara-mendes-logo-2026-10-30.webp. Do not edit by hand; re-run
 * the script if the file changes. No imports, so plain Node can load it.
 */

export const LOGO_COLORS = {
  red: '${COLORS.red}',
  blue: '${COLORS.blue}',
  yellow: '${COLORS.yellow}',
  /** The file's black; on the site the ink parts use currentColor instead. */
  ink: '${INK}',
} as const;

export type LogoRect = {
  fill: 'ink' | 'red' | 'blue' | 'yellow';
  x: number;
  y: number;
  width: number;
  height: number;
};

/** The mark alone, in its own box. The six rectangles meet on the y=290 seam. */
export const LOGO_MARK = {
  width: ${MARK.width},
  height: ${MARK.height},
  rects: [
${rectLines}
  ] as LogoRect[],
} as const;

/** The official lockup: CLARA over MENDES, the mark to the right. */
export const LOGO_STACKED = {
  width: ${LOCKUP.width},
  height: ${LOCKUP.height},
  /** Height of one line of capitals, for sizing by text size. */
  capHeight: 100,
  /** Where the mark's box sits, and its scale, in this box. */
  mark: {x: ${MARK.x}, y: 0, scale: 1},
  textPath:
    '${textPath}',
} as const;

/**
 * One-line lockup for short, wide places such as the header: CLARA MENDES
 * with the mark at 2.4 cap heights, the capitals centred on it.
 */
export const LOGO_HORIZONTAL = {
  width: ${horizontal.width},
  height: ${horizontal.height},
  capHeight: 100,
  mark: {x: ${horizontal.mark.x}, y: ${horizontal.mark.y}, scale: ${horizontal.mark.scale}},
  textPath:
    '${linePath}',
} as const;
`;
  await writeFile(OUT_TS, ts);
  console.log(`app/content/logo.ts  ${ts.length} bytes`);

  // Fidelity: rebuild the lockup at 1:1 and compare alpha masks with the file.
  const rebuilt = await sharp(Buffer.from(stackedSvg(INK)), {density: 72}).ensureAlpha().raw().toBuffer();
  const source = await sharp(SOURCE)
    .ensureAlpha()
    .extract({left: ORIGIN.x, top: ORIGIN.y, width: LOCKUP.width, height: LOCKUP.height})
    .raw()
    .toBuffer();
  let both = 0;
  let either = 0;
  for (let p = 3; p < source.length; p += 4) {
    const a = source[p] > 127;
    const b = rebuilt[p] > 127;
    if (a && b) both++;
    if (a || b) either++;
  }
  const iou = both / either;
  console.log(`overlap with the source (IoU) ${iou.toFixed(4)}`);
  if (iou < 0.98) {
    console.error('The rebuilt lockup drifts from the file; check the trace.');
    process.exit(1);
  }
}

await main();
/* eslint-enable no-console */
