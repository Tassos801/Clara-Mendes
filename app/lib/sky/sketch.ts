/**
 * Canvas sketch of the map disc for the living preview. While the time
 * slider is scrubbed the preview recomputes the scene every frame and
 * draws just the disc here, over the exact SVG (whose rings, cardinals and
 * text don't move with time). Same layers, order and constants as
 * svg.tsx, so the hand-back to the exact SVG is a quiet fade. Browser
 * only; `makePath` is injectable so node tests can record calls.
 */
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
} from './style.ts';
import type {SkyTheme} from './themes.ts';

const TAU = Math.PI * 2;
const FONT = "'EB Garamond', Georgia, 'Times New Roman', serif";

export type SketchPlate = CanvasImageSource & {width: number; height: number};

export type SketchOptions = {
  /** Loaded background plate, drawn like the SVG's `xMidYMid slice`. */
  plate: SketchPlate | null;
  /** Canvas pixels per scene point. */
  pixelScale: number;
  makePath?: (d: string) => Path2D;
};

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}

export function drawSkySketch(
  ctx: CanvasRenderingContext2D,
  scene: SkyScene,
  theme: SkyTheme,
  {plate, pixelScale, makePath = (d) => new Path2D(d)}: SketchOptions,
) {
  const {width: W, height: H, disc, scale} = scene;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W * pixelScale, H * pixelScale);
  ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
  ctx.save();
  circle(ctx, disc.cx, disc.cy, disc.r);
  ctx.clip();

  // Paper: background, plate, disc tint — as the SVG draws under the disc.
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.background;
  ctx.fillRect(disc.cx - disc.r, disc.cy - disc.r, 2 * disc.r, 2 * disc.r);
  if (plate && plate.width > 0 && plate.height > 0) {
    const s = Math.max(W / plate.width, H / plate.height);
    const w = plate.width * s;
    const h = plate.height * s;
    ctx.drawImage(plate, (W - w) / 2, (H - h) / 2, w, h);
  }
  if (theme.disc) {
    ctx.globalAlpha = theme.discOpacity;
    ctx.fillStyle = theme.disc;
    circle(ctx, disc.cx, disc.cy, disc.r);
    ctx.fill();
  }

  ctx.fillStyle = theme.milkyWay;
  for (const pass of scene.milkyWay) {
    ctx.globalAlpha = theme.milkyWayOpacity * pass.weight;
    ctx.fill(makePath(pass.path));
  }

  if (scene.grid) {
    ctx.globalAlpha = theme.gridOpacity;
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = GRID_WIDTH * scale;
    ctx.beginPath();
    for (const r of scene.grid.circles) {
      ctx.moveTo(disc.cx + r, disc.cy);
      ctx.arc(disc.cx, disc.cy, r, 0, TAU);
    }
    for (const l of scene.grid.spokes) {
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = theme.lineOpacity;
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = LINE_WIDTH * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const l of scene.lines) {
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
  }
  ctx.stroke();

  ctx.fillStyle = theme.glow;
  for (const ring of GLOW_RINGS) {
    ctx.globalAlpha = ring.opacity;
    ctx.beginPath();
    for (const g of scene.glows) {
      ctx.moveTo(g.x + g.r * ring.radius, g.y);
      ctx.arc(g.x, g.y, g.r * ring.radius, 0, TAU);
    }
    ctx.fill();
  }

  // Stars, one path per opacity step (starStyle has five).
  const byOpacity = new Map<number, SkyScene['stars']>();
  for (const s of scene.stars) {
    const group = byOpacity.get(s.opacity);
    if (group) group.push(s);
    else byOpacity.set(s.opacity, [s]);
  }
  ctx.fillStyle = theme.star;
  for (const [opacity, group] of byOpacity) {
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    for (const s of group) {
      ctx.moveTo(s.x + s.r, s.y);
      ctx.arc(s.x, s.y, s.r, 0, TAU);
    }
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.planet;
  ctx.fillStyle = theme.planet;
  ctx.lineWidth = PLANET_STROKE * scale;
  for (const p of scene.planets) {
    circle(ctx, p.x, p.y, p.r);
    ctx.stroke();
    circle(ctx, p.x, p.y, p.r * PLANET_DOT);
    ctx.fill();
  }

  const moon = scene.moon;
  if (moon) {
    ctx.fillStyle = theme.moonGlow;
    for (const g of MOON_GLOW) {
      ctx.globalAlpha = Math.min(1, g.opacity * theme.moonGlowStrength);
      circle(ctx, moon.x, moon.y, moon.r * g.radius);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.background;
    circle(ctx, moon.x, moon.y, moon.r);
    ctx.fill();
    ctx.globalAlpha = theme.moonShadeOpacity;
    ctx.fillStyle = theme.moonShade;
    circle(ctx, moon.x, moon.y, moon.r);
    ctx.fill();
    const lit = moonLitPath(moon.x, moon.y, moon.r, moon.phaseFraction, moon.litRight);
    if (lit) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = theme.moonFace;
      ctx.fill(makePath(lit));
    }
    ctx.globalAlpha = MOON_EDGE_OPACITY;
    ctx.strokeStyle = theme.moonEdge;
    ctx.lineWidth = MOON_EDGE_WIDTH * scale;
    circle(ctx, moon.x, moon.y, moon.r);
    ctx.stroke();
  }

  if (scene.labels.length) {
    ctx.globalAlpha = theme.labelColorOpacity;
    ctx.fillStyle = theme.labelColor;
    ctx.font = `${LABEL_SIZE * scale}px ${FONT}`;
    ctx.textAlign = 'center';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${LABEL_TRACKING * scale}px`;
    for (const l of scene.labels) ctx.fillText(l.text, l.x, l.y);
  }
  ctx.restore();
}
