/**
 * Print file: a vector PDF at the exact sheet size (Prodigi processes PDFs
 * at received size). Background plate as an embedded JPEG, everything else
 * as vector marks and fully embedded EB Garamond. Small enough to render
 * inside an Oxygen worker on every fetch.
 */
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument, rgb, type PDFFont, type PDFPage, type RGB} from 'pdf-lib';
import {fitSubtitle, fitTitle, trackedWidth} from './fit.ts';
import {moonLitPath} from './moon.ts';
import type {SkyScene} from './scene.ts';
import type {SkyTheme} from './themes.ts';

export type SkyFonts = {regular: Uint8Array; italic: Uint8Array};

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
export function supported(font: PDFFont, text: string) {
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

export async function renderSkyPdf({
  scene,
  theme,
  fonts,
  plate,
  createdAt,
}: {
  scene: SkyScene;
  theme: SkyTheme;
  fonts: SkyFonts;
  plate: Uint8Array | null;
  createdAt: Date;
}) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle('Your Sky — Clara Mendes');
  doc.setProducer('Clara Mendes');
  doc.setCreator('Your Sky');
  doc.setCreationDate(createdAt);
  doc.setModificationDate(createdAt);

  // Full embedding on purpose: fontkit's subsetter drops glyphs from these
  // TrueType files (renders as gaps in pdf.js), and two full faces only add
  // ~0.8 MB.
  const regular = await doc.embedFont(fonts.regular, {subset: false});
  const italic = await doc.embedFont(fonts.italic, {subset: false});
  const {width: W, height: H, disc, scale} = scene;
  const page = doc.addPage([W, H]);
  const Y = (y: number) => H - y; // scene y grows downward

  page.drawRectangle({x: 0, y: 0, width: W, height: H, color: hex(theme.background)});

  if (plate) {
    const image = await doc.embedJpg(plate);
    // Cover the page (centre-crop), like CSS object-fit: cover.
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
    // drawSvgPath uses a top-left origin at (x, y) with y growing downward,
    // so the scene path can be reused verbatim anchored at the page top.
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

  for (const c of scene.cardinal) {
    const size = 7 * scale;
    page.drawText(c.label, {
      x: c.x - regular.widthOfTextAtSize(c.label, size) / 2,
      y: Y(c.y),
      size,
      font: regular,
      color: hex(theme.cardinal),
    });
  }

  // Long titles and place names shrink to fit the sheet margins; the SVG
  // preview applies the same rule with browser metrics.
  const measureItalic = (t: string, s: number) =>
    italic.widthOfTextAtSize(t, s);
  const measureRegular = (t: string, s: number) =>
    regular.widthOfTextAtSize(t, s);
  const title = fitTitle(
    supported(italic, scene.title),
    scene.titleSize,
    scene.maxTextWidth,
    measureItalic,
  );
  // One line sits on the design baseline; two lines straddle it so the
  // block grows upward into the gap below the sky, not into the subtitle.
  const titleOffset = (index: number) =>
    title.lines.length === 1 ? 0 : (index - 0.5) * title.size * 1.2;
  title.lines.forEach((line, index) => {
    page.drawText(line, {
      x: (W - italic.widthOfTextAtSize(line, title.size)) / 2,
      y: Y(scene.titleY + titleOffset(index)),
      size: title.size,
      font: italic,
      color: hex(theme.title),
    });
  });
  const subtitleTracking = (size: number) =>
    1.6 * scale * (size / scene.subtitleSize);
  const fitted = fitSubtitle(
    {
      place: supported(regular, scene.subtitleParts.place),
      rest: supported(regular, scene.subtitleParts.rest),
    },
    scene.subtitleSize,
    scene.maxTextWidth,
    (t, s) => trackedWidth(t, s, subtitleTracking(s), measureRegular),
  );
  fitted.lines.forEach((line, index) => {
    drawTracked(page, line, {
      x: W / 2,
      y: Y(scene.subtitleY + index * fitted.size * 1.6),
      size: fitted.size,
      font: regular,
      color: hex(theme.subtitle),
      tracking: subtitleTracking(fitted.size),
    });
  });
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
