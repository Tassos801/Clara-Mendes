#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * The default share card and the Organization logo, drawn from the logo's
 * vector data (app/content/logo.ts): the stacked lockup, black parts in the
 * site ink, on paper. Deterministic and offline:
 * node scripts/build-share-card.mjs
 *
 * Writes:
 * - public/images/share/og-default.jpg     1200x630, lockup 560 px wide,
 *   centred. Social platforms print the page title under the card, so the
 *   card carries the logo alone.
 * - public/images/brand/clara-mendes-logo.png
 *   1200 px wide palette PNG, 6% padding: the `logo` Google reads from the
 *   Organization structured data (app/lib/seo.ts).
 *
 * JPEG and palette PNG only: Oxygen re-encodes WebP in public/.
 */
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {LOGO_HORIZONTAL, LOGO_STACKED} from '../app/content/logo.ts';
import {markRects, SITE_INK} from './build-app-icons.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHARE_CARD = path.join(ROOT, 'public/images/share/og-default.jpg');
const LOGO_PNG = path.join(ROOT, 'public/images/brand/clara-mendes-logo.png');

export const PAPER = '#FBFAF6';
export const SHARE_CARD_SIZE = {width: 1200, height: 630, logoWidth: 560};
export const LOGO_PNG_WIDTH = 1200;
export const LOGO_PNG_PADDING = 0.06;

const LOCKUPS = {stacked: LOGO_STACKED, horizontal: LOGO_HORIZONTAL};

/** Height of a lockup drawn `logoWidth` px wide, in whole pixels. */
export function lockupHeight(variant, logoWidth) {
  const lockup = LOCKUPS[variant];
  return Math.round((lockup.height * logoWidth) / lockup.width);
}

/**
 * An SVG canvas with the lockup `logoWidth` px wide, centred. No
 * `background` leaves it transparent. The mark's edges snap to whole pixels
 * so its touching blocks never show a seam.
 */
export function logoSvg({
  variant = 'stacked',
  width,
  height,
  logoWidth,
  background,
  ink = SITE_INK,
}) {
  const lockup = LOCKUPS[variant];
  if (!lockup) throw new Error(`Unknown lockup "${variant}"`);
  const scale = logoWidth / lockup.width;
  const x = Math.round((width - logoWidth) / 2);
  const y = Math.round((height - lockup.height * scale) / 2);
  const fill = background
    ? `<rect width="${width}" height="${height}" fill="${background}"/>\n  `
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${fill}<path fill="${ink}" fill-rule="evenodd" transform="translate(${x} ${y}) scale(${scale.toFixed(6)})" d="${lockup.textPath}"/>
  ${markRects({
    x: x + lockup.mark.x * scale,
    y: y + lockup.mark.y * scale,
    scale: scale * lockup.mark.scale,
    ink,
    snap: true,
  })}
</svg>`;
}

/** Rasterise an SVG string at its own pixel size. */
export function render(svg) {
  return sharp(Buffer.from(svg));
}

function log(target, info) {
  console.log(
    `${path.relative(ROOT, target)}  ${info.width}x${info.height}  ${info.size} bytes`,
  );
}

async function main() {
  await mkdir(path.dirname(SHARE_CARD), {recursive: true});
  const card = await render(
    logoSvg({...SHARE_CARD_SIZE, background: PAPER}),
  )
    // 4:4:4 keeps the thin bars and the block edges free of colour bleed.
    .jpeg({quality: 85, progressive: true, chromaSubsampling: '4:4:4'})
    .toFile(SHARE_CARD);
  log(SHARE_CARD, card);

  const padding = Math.round(LOGO_PNG_WIDTH * LOGO_PNG_PADDING);
  const logoWidth = LOGO_PNG_WIDTH - 2 * padding;
  await mkdir(path.dirname(LOGO_PNG), {recursive: true});
  const logo = await render(
    logoSvg({
      width: LOGO_PNG_WIDTH,
      height: lockupHeight('stacked', logoWidth) + 2 * padding,
      logoWidth,
      background: PAPER,
    }),
  )
    .png({palette: true, compressionLevel: 9, effort: 10})
    .toFile(LOGO_PNG);
  log(LOGO_PNG, logo);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}

/* eslint-enable no-console */
