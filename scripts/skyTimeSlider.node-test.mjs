import assert from 'node:assert/strict';
import test from 'node:test';
import {
  minutesToTime,
  phaseWord,
  SLIDER_MAX,
  SLIDER_STEP,
  sliderKeyTarget,
  sliderPercent,
  timeToMinutes,
  timeValueText,
  trackGradient,
  twilightCaption,
} from '../app/lib/sky/timeSlider.ts';
import {skyTimeline} from '../app/lib/sky/twilight.ts';

const paris = skyTimeline({date: '2019-06-14', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris'});

test('times and minutes convert both ways', () => {
  assert.equal(SLIDER_STEP, 5);
  assert.equal(SLIDER_MAX, 1435);
  assert.equal(timeToMinutes('22:00'), 1320);
  assert.equal(timeToMinutes('00:05'), 5);
  assert.equal(timeToMinutes('7:5'), null);
  assert.equal(minutesToTime(1320), '22:00');
  assert.equal(minutesToTime(0), '00:00');
  assert.equal(minutesToTime(1435), '23:55');
  assert.equal(minutesToTime(1439.6), '23:59');
});

test('PageUp and PageDown move an hour; other keys are left to the input', () => {
  assert.equal(sliderKeyTarget('PageUp', 1320), 1380);
  assert.equal(sliderKeyTarget('PageDown', 1320), 1260);
  assert.equal(sliderKeyTarget('PageUp', 1420), SLIDER_MAX);
  assert.equal(sliderKeyTarget('PageDown', 30), 0);
  assert.equal(sliderKeyTarget('ArrowRight', 1320), null);
  assert.equal(sliderKeyTarget('Home', 1320), null);
});

test('value text names the time and the light', () => {
  assert.equal(phaseWord(paris, 13 * 60), 'daylight');
  assert.equal(phaseWord(paris, 22 * 60 + 10), 'dusk');
  assert.equal(phaseWord(paris, 5 * 60 + 20), 'dawn');
  assert.equal(phaseWord(paris, 23 * 60), 'twilight');
  assert.equal(phaseWord(paris, 60), 'last light');
  assert.equal(timeValueText(paris, 1320), '22:00, dusk');
  assert.equal(timeValueText(null, 1320), '22:00');
});

test('the caption reads sunrise, sunset and darkness, or the polar case', () => {
  assert.equal(twilightCaption(paris), 'Sunrise 05:47 · sunset 21:55 · dark from 23:38');
  const tromsoSummer = skyTimeline({date: '2023-06-21', lat: 69.6492, lon: 18.9553, tz: 'Europe/Oslo'});
  assert.equal(twilightCaption(tromsoSummer), 'Midnight sun — the sun never sets');
  const tromsoWinter = skyTimeline({date: '2023-12-21', lat: 69.6492, lon: 18.9553, tz: 'Europe/Oslo'});
  assert.equal(twilightCaption(tromsoWinter), 'The sun stays down · dark from 15:37');
  const stockholm = skyTimeline({date: '2023-06-21', lat: 59.3293, lon: 18.0686, tz: 'Europe/Stockholm'});
  assert.match(twilightCaption(stockholm), /^Sunrise 03:\d\d · sunset 22:\d\d · twilight all night$/);
});

test('the track gradient runs through every phase in order', () => {
  const gradient = trackGradient(paris);
  assert.match(gradient, /^linear-gradient\(to right, /);
  const stops = gradient.match(/#[0-9a-f]{6}/g);
  assert.equal(stops.length, paris.segments.length * 2);
  assert.equal(sliderPercent(0), 0);
  assert.equal(sliderPercent(SLIDER_MAX), 100);
  assert.equal(sliderPercent(1440), 100);
});
