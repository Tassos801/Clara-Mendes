/**
 * The Sun through one local calendar day at a place: altitude every 15
 * minutes and the twilight phases between them. Drives the time slider's
 * shading and caption. Altitudes are geometric (no refraction), so the
 * standard limits apply: sunrise/sunset at −0.833° (refraction plus the
 * Sun's radius), civil −6°, nautical −12°, astronomical −18°.
 */
import {Astronomy} from './astronomyEngine.ts';
import {localToUtc, tzOffsetMinutes} from './time.ts';

export type SkyPhase = 'day' | 'civil' | 'nautical' | 'astronomical' | 'night';

export const SUN_HORIZON = -0.833;
/** "Dark" in the caption: the end of nautical twilight. */
export const DARK_LIMIT = -12;
export const TIMELINE_STEP = 15;
export const DAY_MINUTES = 1440;

const LIMITS: Array<[number, SkyPhase]> = [
  [SUN_HORIZON, 'day'],
  [-6, 'civil'],
  [DARK_LIMIT, 'nautical'],
  [-18, 'astronomical'],
];

export type SkyTimeline = {
  /**
   * Sun altitude (degrees) at local wall-clock minute i × TIMELINE_STEP,
   * 00:00 … 24:00 (flat through an hour a clock change skips).
   */
  altitudes: number[];
  /** Merged phases covering 0 … 1440 local minutes. */
  segments: Array<{from: number; to: number; phase: SkyPhase}>;
  sunrise: number | null;
  sunset: number | null;
  /** Evening moment the Sun sinks below DARK_LIMIT. */
  darkFrom: number | null;
  /** Morning moment the Sun climbs above DARK_LIMIT. */
  darkUntil: number | null;
};

export function phaseForAltitude(altitude: number): SkyPhase {
  for (const [limit, phase] of LIMITS) if (altitude > limit) return phase;
  return 'night';
}

/** Altitude at any local minute, linear between samples. */
export function altitudeAt(altitudes: number[], minutes: number) {
  const position = Math.max(0, Math.min(DAY_MINUTES, minutes)) / TIMELINE_STEP;
  const i = Math.min(Math.floor(position), altitudes.length - 2);
  const t = position - i;
  return altitudes[i] + (altitudes[i + 1] - altitudes[i]) * t;
}

export function phaseAt(timeline: SkyTimeline, minutes: number) {
  return phaseForAltitude(altitudeAt(timeline.altitudes, minutes));
}

const pad = (n: number) => String(n).padStart(2, '0');

function nextDate(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** Local minutes where the altitude crosses `limit` going up (rising) or down. */
function crossings(altitudes: number[], limit: number, rising: boolean) {
  const found: number[] = [];
  for (let i = 0; i + 1 < altitudes.length; i++) {
    const a = altitudes[i];
    const b = altitudes[i + 1];
    const crosses = rising ? a < limit && b >= limit : a >= limit && b < limit;
    if (crosses) found.push(i * TIMELINE_STEP + (TIMELINE_STEP * (limit - a)) / (b - a));
  }
  return found;
}

export function skyTimeline({
  date,
  lat,
  lon,
  tz,
}: {
  date: string;
  lat: number;
  lon: number;
  tz: string;
}): SkyTimeline {
  const observer = new Astronomy.Observer(lat, lon, 0);
  const [y, m, d] = date.split('-').map(Number);
  const midnight = Date.UTC(y, m - 1, d);
  const instants: number[] = [];
  const skipped: boolean[] = [];
  for (let minutes = 0; minutes <= DAY_MINUTES; minutes += TIMELINE_STEP) {
    const when = (
      minutes === DAY_MINUTES
        ? localToUtc(nextDate(date), '00:00', tz)
        : localToUtc(date, `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`, tz)
    ).getTime();
    // A wall-clock time the spring-forward change skips resolves to an
    // instant another sample already covers; sampling it would repeat part
    // of the curve and invent crossings. Such samples take the instant of
    // the next real one, so the curve stays flat through the missing hour.
    const wall = (when + tzOffsetMinutes(when, tz) * 60000 - midnight) / 60000;
    instants.push(when);
    skipped.push(Math.round(wall) !== minutes);
  }
  for (let i = instants.length - 2; i >= 0; i--) {
    if (skipped[i]) instants[i] = instants[i + 1];
  }
  const altitudes = instants.map((when) => {
    const time = Astronomy.MakeTime(new Date(when));
    const equator = Astronomy.Equator(Astronomy.Body.Sun, time, observer, true, true);
    return Astronomy.Horizon(time, observer, equator.ra, equator.dec).altitude;
  });

  const cuts = [0, DAY_MINUTES];
  for (const [limit] of LIMITS) {
    cuts.push(...crossings(altitudes, limit, true), ...crossings(altitudes, limit, false));
  }
  cuts.sort((a, b) => a - b);
  const segments: SkyTimeline['segments'] = [];
  for (let k = 0; k + 1 < cuts.length; k++) {
    const from = cuts[k];
    const to = cuts[k + 1];
    if (to - from < 1e-6) continue;
    const phase = phaseForAltitude(altitudeAt(altitudes, (from + to) / 2));
    const last = segments.at(-1);
    if (last && last.phase === phase) last.to = to;
    else segments.push({from, to, phase});
  }

  return {
    altitudes,
    segments,
    sunrise: crossings(altitudes, SUN_HORIZON, true)[0] ?? null,
    sunset: crossings(altitudes, SUN_HORIZON, false).at(-1) ?? null,
    darkFrom: crossings(altitudes, DARK_LIMIT, false).at(-1) ?? null,
    darkUntil: crossings(altitudes, DARK_LIMIT, true)[0] ?? null,
  };
}
