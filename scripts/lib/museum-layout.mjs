/**
 * Print layouts for museum reproductions (brief §6): the full composition is
 * kept, never cropped or stretched, and sits centred on white paper with a
 * border of at least BORDER_FRACTION of the short paper side. Orientation
 * follows the artwork, so a landscape woodblock print uses 10 × 8 paper.
 *
 * Qualification compares the original's pixels with the placed image area:
 * 300 pixels per printed inch is the pilot target; 150–299 needs an explicit
 * owner exception with a recorded reason; below 150 the size is omitted. The
 * print file is resampled to the paper grid, which adds no detail — this is
 * why the verdict uses native pixels, not the exported file.
 */

import {PRINT_SIZES} from '../../app/lib/printCatalog.ts';
import {MIN_NATIVE_PPI} from './product-pipeline.mjs';

export const PILOT_TARGET_PPI = 300;
export const BORDER_FRACTION = 0.06;
const FILE_PPI = 300;

/** Near-square works use portrait paper. */
export function orientationOf({height, width}) {
  return width > height * 1.02 ? 'landscape' : 'portrait';
}

export function paperPixels(size, orientation) {
  const portrait = PRINT_SIZES[size];
  if (!portrait) throw new Error(`Unknown print size: ${size}`);
  return orientation === 'landscape'
    ? {height: portrait.width, width: portrait.height}
    : {height: portrait.height, width: portrait.width};
}

const inches = (pixels) => Math.round((pixels / FILE_PPI) * 100) / 100;

export function borderedLayout(
  original,
  size,
  {borderFraction = BORDER_FRACTION} = {},
) {
  if (!(original?.width > 0 && original?.height > 0))
    throw new Error('borderedLayout needs the original pixel dimensions');
  const orientation = orientationOf(original);
  const paper = paperPixels(size, orientation);
  const border = Math.round(Math.min(paper.width, paper.height) * borderFraction);
  const scale = Math.min(
    (paper.width - 2 * border) / original.width,
    (paper.height - 2 * border) / original.height,
  );
  const width = Math.floor(original.width * scale);
  const height = Math.floor(original.height * scale);
  const image = {
    height,
    left: Math.floor((paper.width - width) / 2),
    top: Math.floor((paper.height - height) / 2),
    width,
  };
  const nativePpi =
    Math.round(Math.min(original.width / inches(width), original.height / inches(height)) * 10) / 10;
  let verdict = 'unsupported';
  if (nativePpi >= PILOT_TARGET_PPI) verdict = 'qualified';
  else if (nativePpi >= MIN_NATIVE_PPI) verdict = 'exception-required';
  return {
    borderPx: border,
    image,
    imageInches: {height: inches(height), width: inches(width)},
    nativePpi,
    orientation,
    paper,
    paperInches: {height: inches(paper.height), width: inches(paper.width)},
    size,
    verdict,
  };
}

export function qualifySizes(original, sizes = Object.keys(PRINT_SIZES)) {
  return sizes.map((size) => borderedLayout(original, size));
}
