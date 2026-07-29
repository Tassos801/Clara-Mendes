import assert from 'node:assert/strict';
import {
  buildPaintFragmentShader,
  DEFAULT_PALETTE,
  isPaletteName,
  PALETTES,
} from '../app/components/cinematic/paintedShader.ts';

// The octave count is baked into the GLSL loop bound (GLSL requires a
// compile-time constant); both device tiers must produce their own loop.
const mobile = buildPaintFragmentShader(3);
const desktop = buildPaintFragmentShader(4);
assert.ok(mobile.includes('for (int i = 0; i < 3; i++)'));
assert.ok(desktop.includes('for (int i = 0; i < 4; i++)'));

// Everything else about the shader is identical between tiers.
assert.equal(mobile.replace('i < 3', 'i < 4'), desktop);

// The uniforms the render loop writes every frame must exist in the source.
for (const uniform of [
  'uTime',
  'uResolution',
  'uPointer',
  'uScrollVel',
  'uColorA',
  'uColorB',
  'uColorC',
]) {
  assert.ok(mobile.includes(`uniform`) && mobile.includes(uniform), uniform);
}

// Palettes stay three valid hex colors each, and the default exists.
assert.ok(isPaletteName(DEFAULT_PALETTE));
for (const [name, colors] of Object.entries(PALETTES)) {
  assert.equal(colors.length, 3, name);
  for (const color of colors) {
    assert.match(color, /^#[0-9a-f]{6}$/i, `${name}: ${color}`);
  }
}
assert.equal(isPaletteName('not-a-palette'), false);
