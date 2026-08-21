import {maxTextWidth} from './fit.ts';

export type Disc = {cx: number; cy: number; r: number};

/**
 * Zenithal stereographic projection: zenith → centre, horizon → ring,
 * north up, east on the left (the sky as seen lying on your back).
 */
export function projectAltAz(altDeg: number, azDeg: number, disc: Disc) {
  const z = (90 - altDeg) * (Math.PI / 180);
  const k = Math.tan(z / 2); // 0 at zenith, 1 at the horizon
  const az = azDeg * (Math.PI / 180);
  return {
    x: disc.cx - disc.r * k * Math.sin(az),
    y: disc.cy - disc.r * k * Math.cos(az),
  };
}

export type SkyLayout = {
  width: number;
  height: number;
  /** width / 576 — everything scales with the sheet. */
  scale: number;
  /** Widest a text line may be before it is shrunk to fit. */
  maxTextWidth: number;
  disc: Disc;
  titleY: number;
  subtitleY: number;
  creditY: number;
  titleSize: number;
  subtitleSize: number;
  creditSize: number;
};

/** Shared proportions for both print sizes. */
export function layoutFor(width: number, height: number): SkyLayout {
  const scale = width / 576;
  const r = Math.min(width * 0.4, height * 0.32);
  return {
    width,
    height,
    scale,
    maxTextWidth: maxTextWidth(width),
    disc: {cx: width / 2, cy: height * 0.4, r},
    titleY: height * 0.79,
    subtitleY: height * 0.835,
    creditY: height * 0.95,
    titleSize: 30 * scale,
    subtitleSize: 9.5 * scale,
    creditSize: 7 * scale,
  };
}

export function starRadius(mag: number, scale: number) {
  const base =
    mag <= 0 ? 2.6
    : mag <= 1 ? 2.1
    : mag <= 2 ? 1.7
    : mag <= 3 ? 1.3
    : mag <= 4 ? 0.95
    : mag <= 5 ? 0.65
    : 0.42;
  return base * scale;
}
