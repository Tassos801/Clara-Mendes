/**
 * Print file for the birth poster: a vector PDF at the exact sheet size,
 * background plate as an embedded JPEG, everything else vector marks and
 * fully embedded EB Garamond — the same scaffold as the sky's renderer.
 */
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument, rgb, type PDFFont, type PDFPage, type RGB} from 'pdf-lib';
import {fitTextSize, fitTitle, trackedWidth} from '../sky/fit.ts';
import {moonLitPath} from '../sky/moon.ts';
import type {SkyFonts} from '../sky/pdf.server.ts';
import type {SkyTheme} from '../sky/themes.ts';
import type {NatalScene} from './scene.ts';

function hex(color: string): RGB {
  const n = parseInt(color.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Text centred on x with manual tracking (pdf-lib has no letter-spacing). */
function drawTracked(
  page: PDFPage,
  text: string,
  {
    x,
    y,
    size,
    font,
    color,
    tracking,
  }: {x: number; y: number; size: number; font: PDFFont; color: RGB; tracking: number},
) {
  const chars = [...text];
  const width =
    chars.reduce((w, c) => w + font.widthOfTextAtSize(c, size), 0) +
    tracking * (chars.length - 1);
  let cursor = x - width / 2;
  for (const c of chars) {
    page.drawText(c, {x: cursor, y, size, font, color});
    cursor += font.widthOfTextAtSize(c, size) + tracking;
  }
}

/** Drop characters the font cannot shape rather than failing the order. */
function supported(font: PDFFont, text: string) {
  const chars = [...text];
  const kept = chars.filter((c) => {
    try {
      font.widthOfTextAtSize(c, 10);
      return true;
    } catch {
      return false;
    }
  });
  return kept.join('');
}

export async function renderNatalPdf({
  scene,
  theme,
  fonts,
  plate,
  createdAt,
}: {
  scene: NatalScene;
  theme: SkyTheme;
  fonts: SkyFonts;
  plate: Uint8Array | null;
  createdAt: Date;
}) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle('First Light — Clara Mendes');
  doc.setProducer('Clara Mendes');
  doc.setCreator('First Light');
  doc.setCreationDate(createdAt);
  doc.setModificationDate(createdAt);

  // Full embedding on purpose (fontkit's subsetter drops glyphs); ligatures
  // off because whole-string draws mis-advance fl/fi pairs otherwise.
  const features = {liga: false, rlig: false};
  const regular = await doc.embedFont(fonts.regular, {subset: false, features});
  const italic = await doc.embedFont(fonts.italic, {subset: false, features});
  const {width: W, height: H, disc, scale} = scene;
  const page = doc.addPage([W, H]);
  const Y = (y: number) => H - y; // scene y grows downward

  page.drawRectangle({x: 0, y: 0, width: W, height: H, color: hex(theme.background)});

  if (plate) {
    const image = await doc.embedJpg(plate);
    const ratio = Math.max(W / image.width, H / image.height);
    const w = image.width * ratio;
    const h = image.height * ratio;
    page.drawImage(image, {x: (W - w) / 2, y: (H - h) / 2, width: w, height: h});
  }

  if (theme.disc) {
    page.drawCircle({
      x: disc.cx,
      y: Y(disc.cy),
      size: disc.r,
      color: hex(theme.disc),
      opacity: theme.discOpacity,
    });
  }

  for (const line of scene.lines) {
    page.drawLine({
      start: {x: line.x1, y: Y(line.y1)},
      end: {x: line.x2, y: Y(line.y2)},
      thickness: 0.35 * scale,
      color: hex(theme.line),
      opacity: theme.lineOpacity,
    });
  }

  for (const star of scene.stars) {
    if (star.mag < 1.5) {
      page.drawCircle({
        x: star.x,
        y: Y(star.y),
        size: star.r * 2.4,
        color: hex(theme.halo),
        opacity: 0.12,
      });
    }
    page.drawCircle({x: star.x, y: Y(star.y), size: star.r, color: hex(theme.star)});
  }

  for (const planet of scene.planets) {
    page.drawCircle({x: planet.x, y: Y(planet.y), size: planet.r, color: hex(theme.planet)});
  }

  if (scene.moon) {
    const m = scene.moon;
    page.drawCircle({
      x: m.x,
      y: Y(m.y),
      size: m.r,
      color: hex(theme.moonDark),
      borderColor: hex(theme.moonLit),
      borderWidth: 0.4 * scale,
    });
    const path = moonLitPath(m.x, m.y, m.r, m.phaseFraction, m.litRight);
    if (path) page.drawSvgPath(path, {x: 0, y: H, color: hex(theme.moonLit)});
  }

  page.drawCircle({
    x: disc.cx,
    y: Y(disc.cy),
    size: disc.r,
    borderColor: hex(theme.ring),
    borderWidth: 0.6 * scale,
    opacity: 0,
    borderOpacity: theme.ringOpacity,
  });

  // The name shrinks or breaks to fit exactly as the preview does.
  const measureItalic = (t: string, s: number) => italic.widthOfTextAtSize(t, s);
  const measureRegular = (t: string, s: number) => regular.widthOfTextAtSize(t, s);
  const name = fitTitle(
    supported(italic, scene.name),
    scene.nameSize,
    scene.maxTextWidth,
    measureItalic,
  );
  const nameOffset = (index: number) =>
    name.lines.length === 1 ? 0 : (index - 0.5) * name.size * 1.2;
  name.lines.forEach((line, index) => {
    page.drawText(line, {
      x: (W - italic.widthOfTextAtSize(line, name.size)) / 2,
      y: Y(scene.nameY + nameOffset(index)),
      size: name.size,
      font: italic,
      color: hex(theme.title),
    });
  });

  const tracking = (size: number, base: number) => 1.6 * scale * (size / base);
  const born = supported(regular, scene.born);
  const bornSize = fitTextSize(
    born,
    scene.bornSize,
    scene.maxTextWidth,
    (t, s) => trackedWidth(t, s, tracking(s, scene.bornSize), measureRegular),
  );
  drawTracked(page, born, {
    x: W / 2,
    y: Y(scene.bornY),
    size: bornSize,
    font: regular,
    color: hex(theme.subtitle),
    tracking: tracking(bornSize, scene.bornSize),
  });

  const place = supported(regular, scene.place);
  const placeSize = fitTextSize(
    place,
    scene.placeSize,
    scene.maxTextWidth,
    (t, s) => trackedWidth(t, s, tracking(s, scene.placeSize), measureRegular),
  );
  drawTracked(page, place, {
    x: W / 2,
    y: Y(scene.placeY),
    size: placeSize,
    font: regular,
    color: hex(theme.subtitle),
    tracking: tracking(placeSize, scene.placeSize),
  });

  if (scene.details) {
    const details = supported(italic, scene.details);
    const detailsSize = fitTextSize(
      details,
      scene.detailsSize,
      scene.maxTextWidth,
      measureItalic,
    );
    page.drawText(details, {
      x: (W - italic.widthOfTextAtSize(details, detailsSize)) / 2,
      y: Y(scene.detailsY),
      size: detailsSize,
      font: italic,
      color: hex(theme.title),
    });
  }

  drawTracked(page, scene.credit, {
    x: W / 2,
    y: Y(scene.creditY),
    size: scene.creditSize,
    font: regular,
    color: hex(theme.credit),
    tracking: 1.8 * scale,
  });

  return doc.save({useObjectStreams: false, addDefaultPage: false});
}
