/**
 * Pure maths behind the time-of-night slider: the value is local minutes
 * after midnight in 5-minute steps (00:00 … 23:55), bound to the same
 * `time` parameter as the Time field.
 */
import {
  altitudeAt,
  DAY_MINUTES,
  phaseAt,
  SUN_HORIZON,
  type SkyPhase,
  type SkyTimeline,
} from './twilight.ts';

export const SLIDER_STEP = 5;
export const SLIDER_MAX = DAY_MINUTES - SLIDER_STEP;
const HOUR = 60;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const pad = (n: number) => String(n).padStart(2, '0');

export function timeToMinutes(time: string): number | null {
  const match = time.match(TIME_RE);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function minutesToTime(minutes: number) {
  const m = Math.max(0, Math.min(DAY_MINUTES - 1, Math.round(minutes)));
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/**
 * An hour per PageUp/PageDown, from the nearest 5-minute step; null leaves
 * the key to the native input.
 */
export function sliderKeyTarget(key: string, minutes: number): number | null {
  const snapped = Math.round(minutes / SLIDER_STEP) * SLIDER_STEP;
  if (key === 'PageUp') return Math.max(minutes, Math.min(SLIDER_MAX, snapped + HOUR));
  if (key === 'PageDown') return Math.min(minutes, Math.max(0, snapped - HOUR));
  return null;
}

/** Position along the track, 0–100. */
export function sliderPercent(minutes: number) {
  return Math.max(0, Math.min(100, (minutes / SLIDER_MAX) * 100));
}

const WORDS: Record<SkyPhase, {morning: string; evening: string}> = {
  day: {morning: 'daylight', evening: 'daylight'},
  civil: {morning: 'dawn', evening: 'dusk'},
  nautical: {morning: 'twilight', evening: 'twilight'},
  astronomical: {morning: 'first light', evening: 'last light'},
  night: {morning: 'night', evening: 'night'},
};

/**
 * Plain words for the light at that minute. Morning or evening follows the
 * Sun itself (climbing or sinking), not the clock: at 01:00 in a Paris
 * June the Sun is still sinking, so that is "last light", not "first".
 */
export function phaseWord(timeline: SkyTimeline, minutes: number) {
  const rising =
    altitudeAt(timeline.altitudes, minutes + 5) >=
    altitudeAt(timeline.altitudes, minutes - 5);
  const words = WORDS[phaseAt(timeline, minutes)];
  return rising ? words.morning : words.evening;
}

export function timeValueText(timeline: SkyTimeline | null, minutes: number) {
  const time = minutesToTime(minutes);
  return timeline ? `${time}, ${phaseWord(timeline, minutes)}` : time;
}

export const PHASE_COLOURS: Record<SkyPhase, string> = {
  day: '#e9dfcc',
  civil: '#b39f95',
  nautical: '#5f5d77',
  astronomical: '#373a52',
  night: '#1f2233',
};

/**
 * CSS gradient for the track: each phase's colour across its span, with
 * a short blend (≤ 6 min each side) at every boundary.
 */
export function trackGradient(timeline: SkyTimeline) {
  const stops = timeline.segments.flatMap(({from, to, phase}) => {
    const blend = Math.min(6, (to - from) / 4);
    const colour = PHASE_COLOURS[phase];
    return [
      `${colour} ${sliderPercent(from + blend).toFixed(2)}%`,
      `${colour} ${sliderPercent(to - blend).toFixed(2)}%`,
    ];
  });
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

export function twilightCaption(timeline: SkyTimeline) {
  const highest = Math.max(...timeline.altitudes);
  const lowest = Math.min(...timeline.altitudes);
  if (lowest > SUN_HORIZON) return 'Midnight sun — the sun never sets';
  if (highest <= SUN_HORIZON) {
    return timeline.darkFrom !== null
      ? `The sun stays down · dark from ${minutesToTime(timeline.darkFrom)}`
      : 'The sun stays down all day';
  }
  // In chronological order: far north, the date's sunset can be last
  // night's, just after midnight, before this morning's sunrise.
  const events: Array<[number, string]> = [];
  if (timeline.sunrise !== null) events.push([timeline.sunrise, 'sunrise']);
  if (timeline.sunset !== null) events.push([timeline.sunset, 'sunset']);
  if (timeline.darkFrom !== null) events.push([timeline.darkFrom, 'dark from']);
  else if (timeline.darkUntil !== null) events.push([timeline.darkUntil, 'dark until']);
  events.sort((a, b) => a[0] - b[0]);
  const parts = events.map(([at, label]) => `${label} ${minutesToTime(at)}`);
  if (timeline.darkFrom === null && timeline.darkUntil === null) parts.push('twilight all night');
  const caption = parts.join(' · ');
  return caption[0].toUpperCase() + caption.slice(1);
}
