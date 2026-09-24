/**
 * Print file: a vector PDF at the exact sheet size (Prodigi processes PDFs
 * at received size). Background plate as an embedded JPEG, everything else
 * as vector marks and fully embedded EB Garamond. Small enough to render
 * inside an Oxygen worker on every fetch. Layer order and every constant
 * match the SVG preview (app/lib/sky/svg.tsx).
 */
import fontkit from '@pdf-lib/fontkit';
import {
  appendBezierCurve,
  clip,
  closePath,
  endPath,
  LineCapStyle,
  moveTo,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type PDFDict,
  type PDFFont,
  type PDFName,
  type PDFPage,
  type PDFRef,
  type RGB,
} from 'pdf-lib';
import {fitSubtitle, fitTitle, trackedWidth} from './fit.ts';
import {moonLitPath} from './moon.ts';
import type {SkyScene} from './scene.ts';
import {
  GLOW_RINGS,
  GRID_WIDTH,
  LABEL_SIZE,
  LABEL_TRACKING,
  LINE_WIDTH,
  MOON_EDGE_OPACITY,
  MOON_EDGE_WIDTH,
  MOON_GLOW,
  PLANET_DOT,
  PLANET_STROKE,
  RING,
  TICK,
  TITLE_LINE_HEIGHT,
} from './style.ts';
import type {SkyTheme} from './themes.ts';

export type SkyFonts = {regular: Uint8Array; italic: Uint8Array};

const KAPPA = 0.5522847498; // cubic Bézier circle constant

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
    opacity,
  }: {
    x: number;
    y: number;
    size: number;
    font: PDFFont;
    color: RGB;
    tracking: number;
    opacity?: number;
  },
) {
  const chars = [...text];
  const width =
    chars.reduce((w, c) => w + font.widthOfTextAtSize(c, size), 0) +
    tracking * (chars.length - 1);
  let cursor = x - width / 2;
  for (const c of chars) {
    page.drawText(c, {x: cursor, y, size, font, color, opacity});
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

/**
 * pdf-lib mints a fresh `/ExtGState` resource for every draw call that
 * carries an opacity (PDFPage.maybeEmbedGraphicsState -> PDFPageLeaf.
 * newExtGState), even when an identical one — same Type/ca/CA/BM — already
 * sits in the page's resources: a star field, a Milky Way and a triple-ring
 * glow easily produce thousands of draws sharing a few dozen distinct
 * opacities, so unpatched this can add thousands of duplicate dicts (and
 * hundreds of KB) to one page. Patch the page's own `newExtGState` with a
 * cache keyed by the dict's serialised form (`dict.toString()`, which for
 * these dicts prints only the Type/ca/CA/BM entries that are actually set)
 * so a repeat opacity reuses the existing resource name. Deterministic: for
 * a given scene the draw calls happen in the same order every render, so
 * the same calls hit (and miss) the cache the same way every time.
 */
function dedupeExtGState(page: PDFPage) {
  const cache = new Map<string, PDFName>();
  const node = page.node;
  const original = node.newExtGState.bind(node);
  node.newExtGState = (tag: string, dict: PDFRef | PDFDict): PDFName => {
    const key = dict.toString();
    const cached = cache.get(key);
    if (cached) return cached;
    const name = original(tag, dict);
    cache.set(key, name);
    return name;
  };
}

/** Everything drawn until the matching `pop` is clipped to the circle. */
function pushCircleClip(page: PDFPage, cx: number, cy: number, r: number) {
  const k = r * KAPPA;
  page.pushOperators(
    pushGraphicsState(),
    moveTo(cx + r, cy),
    appendBezierCurve(cx + r, cy + k, cx + k, cy + r, cx, cy + r),
    appendBezierCurve(cx - k, cy + r, cx - r, cy + k, cx - r, cy),
    appendBezierCurve(cx - r, cy - k, cx - k, cy - r, cx, cy - r),
    appendBezierCurve(cx + k, cy - r, cx + r, cy - k, cx + r, cy),
    closePath(),
    clip(),
    endPath(),
  );
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
  dedupeExtGState(page);
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

  pushCircleClip(page, disc.cx, Y(disc.cy), disc.r);

  for (const pass of scene.milkyWay) {
    // drawSvgPath uses a top-left origin at (x, y) with y growing downward
    // (like the Moon path below), so the scene path can be reused verbatim
    // anchored at the page top.
    page.drawSvgPath(pass.path, {
      x: 0,
      y: H,
      color: hex(theme.milkyWay),
      opacity: theme.milkyWayOpacity * pass.weight,
    });
  }

  if (scene.grid) {
    for (const r of scene.grid.circles) {
      page.drawCircle({
        x: disc.cx,
        y: Y(disc.cy),
        size: r,
        opacity: 0,
        borderColor: hex(theme.grid),
        borderOpacity: theme.gridOpacity,
        borderWidth: GRID_WIDTH * scale,
      });
    }
    for (const l of scene.grid.spokes) {
      page.drawLine({
        start: {x: l.x1, y: Y(l.y1)},
        end: {x: l.x2, y: Y(l.y2)},
        thickness: GRID_WIDTH * scale,
        color: hex(theme.grid),
        opacity: theme.gridOpacity,
      });
    }
  }

  for (const line of scene.lines) {
    page.drawLine({
      start: {x: line.x1, y: Y(line.y1)},
      end: {x: line.x2, y: Y(line.y2)},
      thickness: LINE_WIDTH * scale,
      color: hex(theme.line),
      opacity: theme.lineOpacity,
      // Matches the SVG preview's strokeLinecap="round" on constellation
      // lines. Grid spokes and compass ticks stay the PDF default (butt) in
      // both renderers.
      lineCap: LineCapStyle.Round,
    });
  }

  for (const ring of GLOW_RINGS) {
    for (const g of scene.glows) {
      page.drawCircle({
        x: g.x,
        y: Y(g.y),
        size: g.r * ring.radius,
        color: hex(theme.glow),
        opacity: ring.opacity,
      });
    }
  }

  for (const star of scene.stars) {
    page.drawCircle({
      x: star.x,
      y: Y(star.y),
      size: star.r,
      color: hex(theme.star),
      opacity: star.opacity < 1 ? star.opacity : undefined,
    });
  }

  for (const planet of scene.planets) {
    page.drawCircle({
      x: planet.x,
      y: Y(planet.y),
      size: planet.r,
      opacity: 0,
      borderColor: hex(theme.planet),
      borderOpacity: 1,
      borderWidth: PLANET_STROKE * scale,
    });
    page.drawCircle({
      x: planet.x,
      y: Y(planet.y),
      size: planet.r * PLANET_DOT,
      color: hex(theme.planet),
    });
  }

  if (scene.moon) {
    const m = scene.moon;
    for (const g of MOON_GLOW) {
      page.drawCircle({
        x: m.x,
        y: Y(m.y),
        size: m.r * g.radius,
        color: hex(theme.moonGlow),
        opacity: Math.min(1, g.opacity * theme.moonGlowStrength),
      });
    }
    page.drawCircle({x: m.x, y: Y(m.y), size: m.r, color: hex(theme.background)});
    page.drawCircle({
      x: m.x,
      y: Y(m.y),
      size: m.r,
      color: hex(theme.moonShade),
      opacity: theme.moonShadeOpacity,
    });
    // drawSvgPath uses a top-left origin at (x, y) with y growing downward,
    // so the scene path can be reused verbatim anchored at the page top.
    const path = moonLitPath(m.x, m.y, m.r, m.phaseFraction, m.litRight);
    if (path) page.drawSvgPath(path, {x: 0, y: H, color: hex(theme.moonFace)});
    page.drawCircle({
      x: m.x,
      y: Y(m.y),
      size: m.r,
      opacity: 0,
      borderColor: hex(theme.moonEdge),
      borderOpacity: MOON_EDGE_OPACITY,
      borderWidth: MOON_EDGE_WIDTH * scale,
    });
  }

  for (const label of scene.labels) {
    drawTracked(page, supported(regular, label.text), {
      x: label.x,
      y: Y(label.y),
      size: LABEL_SIZE * scale,
      font: regular,
      color: hex(theme.labelColor),
      tracking: LABEL_TRACKING * scale,
      opacity: theme.labelColorOpacity,
    });
  }

  page.pushOperators(popGraphicsState());

  page.drawCircle({
    x: disc.cx,
    y: Y(disc.cy),
    size: disc.r,
    borderColor: hex(theme.ring),
    borderWidth: RING.outer * scale,
    opacity: 0,
    borderOpacity: theme.ringOpacity,
  });
  page.drawCircle({
    x: disc.cx,
    y: Y(disc.cy),
    size: disc.r - RING.gap * scale,
    borderColor: hex(theme.ring),
    borderWidth: RING.inner * scale,
    opacity: 0,
    borderOpacity: theme.ringOpacity * 0.7,
  });

  if (scene.compass) {
    for (const t of scene.compass.ticks) {
      page.drawLine({
        start: {x: t.x1, y: Y(t.y1)},
        end: {x: t.x2, y: Y(t.y2)},
        thickness: TICK.width * scale,
        color: hex(theme.ring),
        opacity: theme.ringOpacity,
      });
    }
    const numeralSize = TICK.numeralSize * scale;
    for (const n of scene.compass.numerals) {
      page.drawText(n.text, {
        x: n.x - regular.widthOfTextAtSize(n.text, numeralSize) / 2,
        y: Y(n.y),
        size: numeralSize,
        font: regular,
        color: hex(theme.cardinal),
      });
    }
  }

  for (const c of scene.cardinal) {
    page.drawText(c.label, {
      x: c.x - regular.widthOfTextAtSize(c.label, scene.cardinalSize) / 2,
      y: Y(c.y),
      size: scene.cardinalSize,
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
    {maxTwoLineSize: scene.titleTwoLineMaxSize},
  );
  // One line sits on the design baseline; two lines straddle it, capped in
  // size so they clear both the S cardinal and the subtitle.
  const titleOffset = (index: number) =>
    title.lines.length === 1
      ? 0
      : (index - 0.5) * title.size * TITLE_LINE_HEIGHT;
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
