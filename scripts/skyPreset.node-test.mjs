import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normaliseSkyPreset,
  SKY_PRESET_EVENT,
} from '../app/lib/sky/configuratorState.ts';
import {SKY_DEFAULT_TIME, SKY_TITLE_MAX} from '../app/lib/sky/params.ts';
import {YOUR_SKY_PAGE} from '../app/lib/featurePages.ts';

test('a preset carries a printable title and a valid local time', () => {
  assert.deepEqual(
    normaliseSkyPreset({title: 'The night we met', time: '22:00'}),
    {title: 'The night we met', time: '22:00'},
  );
});

test('a preset without a time falls back to the evening default', () => {
  assert.deepEqual(normaliseSkyPreset({title: '  Where you said yes '}), {
    title: 'Where you said yes',
    time: SKY_DEFAULT_TIME,
  });
});

test('malformed or oversized presets are rejected', () => {
  assert.equal(normaliseSkyPreset(null), null);
  assert.equal(normaliseSkyPreset('nope'), null);
  assert.equal(normaliseSkyPreset({title: ''}), null);
  assert.equal(normaliseSkyPreset({title: '   '}), null);
  assert.equal(
    normaliseSkyPreset({title: 'x'.repeat(SKY_TITLE_MAX + 1)}),
    null,
  );
  assert.equal(normaliseSkyPreset({title: 'Fine', time: '25:00'}), null);
  assert.equal(normaliseSkyPreset({title: 'Fine', time: '7:00'}), null);
  assert.equal(normaliseSkyPreset({title: 'Badchar'}), null);
});

test('every occasion on the page is a usable preset', () => {
  for (const occasion of YOUR_SKY_PAGE.occasions) {
    const preset = normaliseSkyPreset(occasion.preset);
    assert.ok(preset, `${occasion.title} has no valid preset`);
    assert.ok(preset.title.length > 0, `${occasion.title} preset has no title`);
  }
  assert.equal(typeof SKY_PRESET_EVENT, 'string');
});
