import fontkit from '@pdf-lib/fontkit';
import {
  PDFDocument,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from 'pdf-lib';
import artCatalog from '../../data/original-art-catalog.json' with {type: 'json'};
import type {Route} from './+types/api.hanging-guide.$file';
import {PRINT_SIZE_SPECS} from '~/lib/productSizePresentation';
import {
  parseWallGuideFileName,
  wallGuideGeometry,
  type WallSet,
} from '~/lib/wallSets';

// Per-isolate font cache: static public assets, shared across requests.
type GuideFonts = {regular: Uint8Array; italic: Uint8Array};
let fontsPromise: Promise<GuideFonts> | null = null;

async function fetchBytes(url: URL) {
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`${url.pathname} → ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function loadFonts(base: URL) {
  fontsPromise ??= Promise.all([
    fetchBytes(new URL('/fonts/EBGaramond-Regular.ttf', base)),
    fetchBytes(new URL('/fonts/EBGaramond-Italic.ttf', base)),
  ])
    .then(([regular, italic]) => ({regular, italic}))
    .catch((error: unknown) => {
      fontsPromise = null;
      throw error;
    });
  return fontsPromise;
}

const INK = rgb(0.13, 0.11, 0.1);
const SOFT = rgb(0.72, 0.68, 0.63);
const PAPER = rgb(0.99, 0.98, 0.96);
const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;

const TITLE_BY_HANDLE = new Map(
  artCatalog.map((entry) => [entry.handle, entry.title]),
);

function printLabel(handle: string) {
  const title = TITLE_BY_HANDLE.get(handle) ?? handle;
  return title.replace(/\s+Art Print$/i, '');
}

function centred(
  page: PDFPage,
  text: string,
  {x, y, size, font, color}: {x: number; y: number; size: number; font: PDFFont; color: RGB},
) {
  page.drawText(text, {
    x: x - font.widthOfTextAtSize(text, size) / 2,
    y,
    size,
    font,
    color,
  });
}

function dashedLine(
  page: PDFPage,
  {from, to, dash = 4}: {from: [number, number]; to: [number, number]; dash?: number},
) {
  page.drawLine({
    start: {x: from[0], y: from[1]},
    end: {x: to[0], y: to[1]},
    thickness: 0.8,
    color: SOFT,
    dashArray: [dash, dash],
  });
}

async function renderGuidePdf(
  set: WallSet,
  size: keyof typeof PRINT_SIZE_SPECS,
  fonts: GuideFonts,
) {
  const spec = PRINT_SIZE_SPECS[size];
  const geometry = wallGuideGeometry(size);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${set.name} — hanging guide`);
  doc.setProducer('Clara Mendes');
  doc.setCreator('shopclaramendes.com');
  // Deterministic metadata keeps the PDF byte-stable and cacheable.
  const fixed = new Date('2026-01-01T00:00:00Z');
  doc.setCreationDate(fixed);
  doc.setModificationDate(fixed);

  // liga:false — fontkit's ligature substitution mis-advances fl/fi/ffl
  // ("fl oor") when pdf-lib draws whole strings; plain glyphs render true.
  const features = {liga: false, rlig: false};
  const regular = await doc.embedFont(fonts.regular, {subset: false, features});
  const italic = await doc.embedFont(fonts.italic, {subset: false, features});
  const [W, H] = A4;
  const page = doc.addPage(A4);
  const cx = W / 2;

  page.drawRectangle({x: 0, y: 0, width: W, height: H, color: PAPER});

  // Header.
  centred(page, set.name, {x: cx, y: H - 110, size: 26, font: regular, color: INK});
  centred(
    page,
    `A hanging guide for three prints · ${spec.label} (${spec.centimeters})`,
    {x: cx, y: H - 134, size: 11.5, font: italic, color: INK},
  );
  page.drawLine({
    start: {x: MARGIN, y: H - 156},
    end: {x: W - MARGIN, y: H - 156},
    thickness: 0.6,
    color: SOFT,
  });

  // The wall. Frames and gaps share one uniform scale, so proportions are
  // exact; the drop to the floor is drawn broken (a true 145 cm drop would
  // not fit the sheet) and carries its measurement as text instead.
  const scale = (W - 2 * MARGIN - 20) / geometry.totalWidthCm;
  const frameW = geometry.widthCm * scale;
  const frameH = geometry.heightCm * scale;
  const gapW = geometry.gapCm * scale;
  const rowTop = H - 226;
  const rowBottom = rowTop - frameH;
  const rowLeft = cx - (3 * frameW + 2 * gapW) / 2;

  set.handles.forEach((handle, index) => {
    const x = rowLeft + index * (frameW + gapW);
    page.drawRectangle({
      x,
      y: rowBottom,
      width: frameW,
      height: frameH,
      borderColor: INK,
      borderWidth: 1.2,
    });
    centred(page, printLabel(handle), {
      x: x + frameW / 2,
      y: rowBottom - 16,
      size: 9,
      font: regular,
      color: INK,
    });
    if (index < 2) {
      const gapCentre = x + frameW + gapW / 2;
      centred(page, `${geometry.gapCm} cm`, {
        x: gapCentre,
        y: rowTop + 10,
        size: 8.5,
        font: italic,
        color: INK,
      });
      dashedLine(page, {
        from: [x + frameW, rowTop + 4],
        to: [x + frameW + gapW, rowTop + 4],
        dash: 2,
      });
    }
  });

  centred(
    page,
    `each print ${spec.centimeters} · wall span ${geometry.totalWidthCm.toFixed(1)} cm`,
    {x: cx, y: rowBottom - 38, size: 9.5, font: italic, color: INK},
  );

  // Broken drop from the middle frame's centre to the floor line.
  const midCentreY = rowBottom + frameH / 2;
  const floorY = rowBottom - 108;
  dashedLine(page, {from: [cx, midCentreY], to: [cx, floorY + 34]});
  // Break marks.
  page.drawLine({
    start: {x: cx - 6, y: floorY + 28},
    end: {x: cx + 6, y: floorY + 32},
    thickness: 0.8,
    color: SOFT,
  });
  page.drawLine({
    start: {x: cx - 6, y: floorY + 22},
    end: {x: cx + 6, y: floorY + 26},
    thickness: 0.8,
    color: SOFT,
  });
  dashedLine(page, {from: [cx, floorY + 20], to: [cx, floorY]});
  page.drawLine({
    start: {x: MARGIN + 40, y: floorY},
    end: {x: W - MARGIN - 40, y: floorY},
    thickness: 1,
    color: INK,
  });
  centred(page, `${geometry.centreCm} cm from the floor to each frame's centre`, {
    x: cx,
    y: floorY - 16,
    size: 9.5,
    font: italic,
    color: INK,
  });

  // Steps.
  const steps = [
    "Mark the wall's horizontal centre.",
    `Centre the middle frame on the mark, its centre ${geometry.centreCm} cm above the floor.`,
    `Hang the outer frames ${geometry.gapCm} cm away, centres level.`,
    'Keep the printed left-to-right order — the wall is composed that way.',
  ];
  let stepY = floorY - 64;
  steps.forEach((step, index) => {
    page.drawText(`${index + 1}.`, {
      x: MARGIN + 12,
      y: stepY,
      size: 11,
      font: regular,
      color: INK,
    });
    page.drawText(step, {
      x: MARGIN + 34,
      y: stepY,
      size: 11,
      font: regular,
      color: INK,
    });
    stepY -= 22;
  });

  // Footer.
  centred(page, `shopclaramendes.com · ${set.name}`, {
    x: cx,
    y: MARGIN,
    size: 9,
    font: italic,
    color: INK,
  });

  return doc.save();
}

/**
 * Free hanging-guide PDF for one wall set in one size, e.g.
 * `/api/hanging-guide/quiet-form-16x20.pdf`. Pure function of the set
 * table — nothing customer-specific, so it is publicly cacheable.
 */
export async function loader({params, request}: Route.LoaderArgs) {
  const parsed = parseWallGuideFileName(params.file);
  if (!parsed) return new Response('Not found', {status: 404});

  const fonts = await loadFonts(new URL(request.url));
  const pdf = await renderGuidePdf(parsed.set, parsed.size, fonts);

  return new Response(new Blob([pdf as BlobPart], {type: 'application/pdf'}), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${params.file}"`,
      'Cache-Control': 'public, max-age=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
}
