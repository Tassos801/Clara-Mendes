import assert from 'node:assert/strict';
import test from 'node:test';
import {validateSkyParams} from '../app/lib/sky/params.ts';
import {computeSky} from '../app/lib/sky/scene.ts';
import {drawSkySketch} from '../app/lib/sky/sketch.ts';
import {SKY_THEMES} from '../app/lib/sky/themes.ts';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

const catalog = loadSkyCatalogSync();
const scene = computeSky({
  params: validateSkyParams({
    date: '2019-06-14', time: '22:00', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris',
    place: 'Paris, France', title: 'x', theme: 'linen', layout: 'compass', details: 'names,grid',
  }).params,
  size: '8x10',
  catalog,
});

/** A 2D context that records every call and property write. */
function recorder() {
  const calls = [];
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      return (...args) => calls.push([key, ...args]);
    },
    set(target, key, value) {
      calls.push([`=${String(key)}`, value]);
      target[key] = value;
      return true;
    },
  });
  return {ctx, calls};
}

const makePath = (d) => ({d});

test('the sketch clips to the disc and draws every layer inside save/restore', () => {
  const {ctx, calls} = recorder();
  drawSkySketch(ctx, scene, SKY_THEMES.linen, {plate: null, pixelScale: 2, makePath});
  const names = calls.map((c) => c[0]);
  assert.deepEqual(calls.find((c) => c[0] === 'setTransform' && c[1] === 2), ['setTransform', 2, 0, 0, 2, 0, 0]);
  const save = names.indexOf('save');
  const clip = names.indexOf('clip');
  assert.ok(save >= 0 && clip > save);
  assert.equal(names.lastIndexOf('restore'), names.length - 1);
  const clipArc = calls.slice(save, clip).find((c) => c[0] === 'arc');
  assert.deepEqual(clipArc.slice(1, 4), [scene.disc.cx, scene.disc.cy, scene.disc.r]);
  const pathFills = calls.filter((c) => c[0] === 'fill' && c[1] && c[1].d);
  // Milky Way passes, plus the Moon's lit part when the Moon is up.
  assert.equal(pathFills.length, scene.milkyWay.length + (scene.moon && scene.moon.phaseFraction > 0.005 ? 1 : 0));
  const labels = calls.filter((c) => c[0] === 'fillText');
  assert.equal(labels.length, scene.labels.length);
});

test('every star is one arc; stars are batched by opacity', () => {
  const {ctx, calls} = recorder();
  drawSkySketch(ctx, scene, SKY_THEMES['midnight-garden'], {plate: null, pixelScale: 1, makePath});
  const opacities = new Set(scene.stars.map((s) => s.opacity));
  const starArcs = calls.filter((c) => c[0] === 'arc' && scene.stars.some((s) => s.x === c[1] && s.y === c[2] && s.r === c[3]));
  assert.ok(starArcs.length >= scene.stars.length);
  const alphaWrites = calls.filter((c) => c[0] === '=globalAlpha').map((c) => c[1]);
  for (const o of opacities) assert.ok(alphaWrites.includes(o), `no batch at ${o}`);
});

test('the plate is drawn like the SVG slice (cover, centred)', () => {
  const {ctx, calls} = recorder();
  const plate = {width: 1000, height: 1000};
  drawSkySketch(ctx, scene, SKY_THEMES.linen, {plate, pixelScale: 1, makePath});
  const draw = calls.find((c) => c[0] === 'drawImage');
  const s = Math.max(scene.width / 1000, scene.height / 1000);
  assert.deepEqual(draw.slice(1), [plate, (scene.width - 1000 * s) / 2, (scene.height - 1000 * s) / 2, 1000 * s, 1000 * s]);
});
