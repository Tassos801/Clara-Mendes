/**
 * Gift packing slip: one A4 sheet Prodigi prints and encloses instead of
 * its default slip. The customer's note sits alone in the centre in
 * italic; the order name and shop address run small along the foot. No
 * prices, no item list — the parcel is a gift.
 */
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument, rgb, type PDFFont, type PDFPage} from 'pdf-lib';
import {supported, type SkyFonts} from './pdf.server.ts';

/** A4 in PostScript points. */
export const SLIP_PAGE = {width: 595.28, height: 841.89};

const INK = rgb(38 / 255, 35 / 255, 31 / 255);
const MUTED = rgb(111 / 255, 106 / 255, 98 / 255);
const NOTE_WIDTH = 360;
const NOTE_SIZES = [19, 16.5, 14];
const NOTE_BOX = 420;

/** Greedy word wrap; a single word wider than the line is split by glyph. */
export function wrapLines(
  text: string,
  measure: (text: string) => number,
  maxWidth: number,
): string[] {
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      if (!word) continue;
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) out.push(line);
      line = '';
      let chunk = '';
      for (const glyph of [...word]) {
        if (measure(chunk + glyph) > maxWidth && chunk) {
          out.push(chunk);
          chunk = '';
        }
        chunk += glyph;
      }
      line = chunk;
    }
    out.push(line);
  }
  return out;
}

function drawCentred(
  page: PDFPage,
  text: string,
  {
    y,
    size,
    font,
    color,
    tracking = 0,
  }: {
    y: number;
    size: number;
    font: PDFFont;
    color: typeof INK;
    tracking?: number;
  },
) {
  const chars = [...text];
  const width =
    chars.reduce((w, c) => w + font.widthOfTextAtSize(c, size), 0) +
    tracking * Math.max(0, chars.length - 1);
  let cursor = (SLIP_PAGE.width - width) / 2;
  for (const c of chars) {
    page.drawText(c, {x: cursor, y, size, font, color});
    cursor += font.widthOfTextAtSize(c, size) + tracking;
  }
}

export async function renderGiftSlipPdf({
  note,
  orderName,
  fonts,
  createdAt,
}: {
  note: string;
  orderName: string;
  fonts: SkyFonts;
  createdAt: Date;
}) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`Gift note — ${orderName}`);
  doc.setProducer('Clara Mendes');
  doc.setCreator('Your Sky');
  doc.setCreationDate(createdAt);
  doc.setModificationDate(createdAt);

  const regular = await doc.embedFont(fonts.regular, {subset: false});
  const italic = await doc.embedFont(fonts.italic, {subset: false});
  const {width: W, height: H} = SLIP_PAGE;
  const page = doc.addPage([W, H]);
  page.drawRectangle({x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1)});

  drawCentred(page, 'CLARA MENDES', {
    y: H - 118,
    size: 10.5,
    font: regular,
    color: INK,
    tracking: 3.2,
  });
  page.drawLine({
    start: {x: W / 2 - 28, y: H - 146},
    end: {x: W / 2 + 28, y: H - 146},
    thickness: 0.6,
    color: MUTED,
  });

  // The note shrinks through three sizes until it fits the centre box;
  // anything still longer is clipped at the bottom rather than overflowing.
  const text = supported(italic, note);
  let size = NOTE_SIZES[NOTE_SIZES.length - 1];
  let lines: string[] = [];
  for (const candidate of NOTE_SIZES) {
    size = candidate;
    lines = wrapLines(
      text,
      (t) => italic.widthOfTextAtSize(t, candidate),
      NOTE_WIDTH,
    );
    if (lines.length * candidate * 1.5 <= NOTE_BOX) break;
  }
  const lineHeight = size * 1.5;
  const blockHeight = Math.min(lines.length * lineHeight, NOTE_BOX);
  const top = H / 2 + blockHeight / 2 + 20;
  lines.forEach((line, index) => {
    const y = top - (index + 1) * lineHeight;
    if (y < H / 2 - NOTE_BOX / 2) return;
    page.drawText(line, {
      x: (W - italic.widthOfTextAtSize(line, size)) / 2,
      y,
      size,
      font: italic,
      color: INK,
    });
  });

  drawCentred(page, `ENCLOSED WITH ORDER ${supported(regular, orderName)}`, {
    y: 96,
    size: 8.5,
    font: regular,
    color: MUTED,
    tracking: 1.8,
  });
  drawCentred(page, 'shopclaramendes.com', {
    y: 78,
    size: 9,
    font: regular,
    color: MUTED,
    tracking: 0.6,
  });

  return doc.save({useObjectStreams: false, addDefaultPage: false});
}
