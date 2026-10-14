// Relative imports keep this module loadable by the plain-Node test runner
// and by scripts/museum.mjs, which cannot resolve the Vite "~" alias.
import museumCrops from '../../data/museum-crops.json' with {type: 'json'};
import {
  ART_REGISTRY,
  findArtwork,
  masterSize,
  orientationOf,
  type ArtRegistry,
} from './artRegistry.ts';

/**
 * Framings of museum artworks for products that are not the shape of the
 * work: phone cases, card fronts, postcards and canvas. Prints and framed
 * prints keep the whole composition on paper (museum-layout.mjs) and never
 * use these.
 *
 * A crop is chosen by eye (AI-chosen, then the owner approves) and recorded
 * as data: the printed block of the sheet (`area`, so a crop never shows bare
 * museum paper) and, per shape, a centre and an optional zoom. The box itself
 * is always computed — the largest box of the shape's aspect inside the area,
 * tightened by `zoom` and moved as little as possible to stay inside — so
 * every crop has the exact aspect its product needs. Pixels are only ever
 * cut, never generated.
 */

export const CROP_SHAPES = ['case', 'card', 'postcard', 'canvas'] as const;
export type CropShape = (typeof CROP_SHAPES)[number];

type ShapeSpec = {
  label: string;
  /** Width / height. Canvas follows the artwork's orientation instead. */
  aspect: number | 'orientation-4:5';
  /** Printed length of the side `ppiSide` measures, in inches. */
  inches: number;
  ppiSide: 'height' | 'width' | 'long';
};

export const SHAPES: Record<CropShape, ShapeSpec> = {
  // Prodigi centre-crops the case file to each device (0.577–0.626 wide).
  // The crop is what the widest device shows; narrower ones lose a little
  // of its sides. The largest print area is 2310 px (7.7 in) tall.
  case: {label: 'Phone case', aspect: 0.626, inches: 7.7, ppiSide: 'height'},
  // The front panel of the 7×5 folded card: 1529×2161 px at 300 dpi.
  card: {
    label: 'Greeting card',
    aspect: 1529 / 2161,
    inches: 7.2,
    ppiSide: 'height',
  },
  // The art half of the 7×5 postcard: 2162×1559 px at 300 dpi.
  postcard: {
    label: 'Postcard',
    aspect: 2162 / 1559,
    inches: 7.2,
    ppiSide: 'width',
  },
  // 16×20 stretched canvas, hung the way the artwork reads.
  canvas: {
    label: 'Canvas 16×20',
    aspect: 'orientation-4:5',
    inches: 20,
    ppiSide: 'long',
  },
};

/** The phone-case file is 4:5; the visible crop sits in its centre. */
export const CASE_FILE_ASPECT = 4 / 5;

export type CropSpec = {cx: number; cy: number; zoom?: number};
export type CropArea = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};
export type ArtworkCrops = {area: CropArea} & Record<CropShape, CropSpec>;

export type MuseumCrops = {
  $comment?: string;
  approval: {approved: boolean; at?: string; by?: string};
  chosen: {at: string; by: string; note?: string};
  crops: Record<string, ArtworkCrops>;
};

export const MUSEUM_CROPS = museumCrops as unknown as MuseumCrops;

export type PixelBox = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export function shapeAspect(
  shape: CropShape,
  size: {height: number; width: number},
) {
  const {aspect} = SHAPES[shape];
  if (aspect !== 'orientation-4:5') return aspect;
  return orientationOf(size) === 'landscape' ? 5 / 4 : 4 / 5;
}

function areaBox(size: {height: number; width: number}, area: CropArea) {
  const left = Math.round(area.left * size.width);
  const top = Math.round(area.top * size.height);
  return {
    height: Math.round(area.bottom * size.height) - top,
    left,
    top,
    width: Math.round(area.right * size.width) - left,
  };
}

/** Centre a span on `centre`, moved as little as needed to fit [min, max]. */
function place(length: number, centre: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(centre - length / 2), min), max - length);
}

/**
 * The crop for one shape, in master pixels (the original less its trim).
 * A phone-case crop is also capped so its 4:5 file still fits the master.
 */
export function cropBox(
  size: {height: number; width: number},
  crops: ArtworkCrops,
  shape: CropShape,
): PixelBox {
  const spec = crops[shape];
  const area = areaBox(size, crops.area);
  const aspect = shapeAspect(shape, size);
  let height = Math.min(area.height, area.width / aspect);
  if (shape === 'case')
    height = Math.min(height, size.width / CASE_FILE_ASPECT);
  height /= Math.max(spec.zoom ?? 1, 1);
  height = Math.floor(height);
  const width = Math.round(height * aspect);
  const left = place(
    width,
    spec.cx * size.width,
    area.left,
    area.left + area.width,
  );
  const top = place(
    height,
    spec.cy * size.height,
    area.top,
    area.top + area.height,
  );
  return {height, left, top, width};
}

/** The 4:5 phone-case file around a case crop, kept inside the master. */
export function caseFileBox(
  size: {height: number; width: number},
  crop: PixelBox,
): PixelBox {
  const width = Math.round(crop.height * CASE_FILE_ASPECT);
  const centre = crop.left + crop.width / 2;
  const left = Math.min(
    Math.max(Math.round(centre - width / 2), 0),
    size.width - width,
  );
  return {height: crop.height, left, top: crop.top, width};
}

export function cropPpi(shape: CropShape, box: PixelBox) {
  const {inches, ppiSide} = SHAPES[shape];
  const pixels =
    ppiSide === 'height'
      ? box.height
      : ppiSide === 'width'
        ? box.width
        : Math.max(box.width, box.height);
  return pixels / inches;
}

/** Share of the printed block a crop keeps, 0–1. */
export function cropCoverage(
  size: {height: number; width: number},
  crops: ArtworkCrops,
  box: PixelBox,
) {
  const area = areaBox(size, crops.area);
  return (box.width * box.height) / (area.width * area.height);
}

export type CropPlan = {
  artworkId: string;
  shapes: Array<{
    box: PixelBox;
    coverage: number;
    file?: PixelBox;
    ppi: number;
    shape: CropShape;
    verdict: 'qualified' | 'exception-required' | 'unsupported';
  }>;
  size: {height: number; width: number};
};

/** Every crop of one artwork with its ppi verdict. */
export function cropPlan(
  artworkId: string,
  {
    data = MUSEUM_CROPS,
    registry = ART_REGISTRY,
  }: {data?: MuseumCrops; registry?: ArtRegistry} = {},
): CropPlan | null {
  const artwork = findArtwork(artworkId, registry);
  const crops = data.crops[artworkId];
  const size = artwork ? masterSize(artwork) : null;
  if (!artwork || !crops || !size) return null;
  return {
    artworkId,
    shapes: CROP_SHAPES.map((shape) => {
      const box = cropBox(size, crops, shape);
      const ppi = cropPpi(shape, box);
      return {
        box,
        coverage: cropCoverage(size, crops, box),
        ...(shape === 'case' ? {file: caseFileBox(size, box)} : {}),
        ppi,
        shape,
        // The museum print verdicts (museum-layout.mjs).
        verdict:
          ppi >= 300
            ? 'qualified'
            : ppi >= 150
              ? 'exception-required'
              : 'unsupported',
      };
    }),
    size,
  };
}

const UNIT = (value: unknown) =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 1;

/** Everything that would make the crop data unsafe to render from. */
export function validateMuseumCrops(
  data: MuseumCrops = MUSEUM_CROPS,
  registry: ArtRegistry = ART_REGISTRY,
): string[] {
  const problems: string[] = [];
  if (!data.chosen?.by?.trim() || !data.chosen?.at?.trim())
    problems.push('museum-crops: chosen records who chose the crops and when');
  if (typeof data.approval?.approved !== 'boolean')
    problems.push('museum-crops: approval.approved must be true or false');
  if (
    data.approval?.approved &&
    (!data.approval.by?.trim() || !data.approval.at?.trim())
  )
    problems.push('museum-crops: an approval records who approved and when');
  for (const [id, crops] of Object.entries(data.crops ?? {})) {
    const at = `museum-crops ${id}`;
    const artwork = findArtwork(id, registry);
    if (!artwork) {
      problems.push(`${at}: unknown artwork`);
      continue;
    }
    if (!masterSize(artwork)) problems.push(`${at}: no fetched original`);
    const {area} = crops;
    if (
      !area ||
      ![area.left, area.top, area.right, area.bottom].every(UNIT) ||
      area.right - area.left < 0.5 ||
      area.bottom - area.top < 0.5
    )
      problems.push(
        `${at}: area must be fractions with right > left and bottom > top, at least half the sheet`,
      );
    for (const shape of CROP_SHAPES) {
      const spec = crops[shape];
      if (!spec || !UNIT(spec.cx) || !UNIT(spec.cy))
        problems.push(`${at}: ${shape} needs cx and cy between 0 and 1`);
      else if (spec.zoom != null && !(spec.zoom >= 1 && spec.zoom <= 3))
        problems.push(`${at}: ${shape}.zoom must be between 1 and 3`);
    }
  }
  return problems;
}
