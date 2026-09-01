import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSkyRenderKey,
  getSkyPreviewStatus,
  nextSkyRequiredField,
  parseSkyDraft,
  serializeSkyDraft,
  SKY_DRAFT_STORAGE_KEY,
} from '../app/lib/sky/configuratorState.ts';
import {validateSkyParams} from '../app/lib/sky/params.ts';

const place = {
  name: 'Paris',
  country: 'France',
  countryCode: 'FR',
  lat: 48.8534,
  lon: 2.3488,
  tz: 'Europe/Paris',
  label: 'Paris, France',
};

const complete = {
  place,
  date: '2019-06-14',
  time: '22:00',
  title: 'Our first night',
  theme: 'midnight-garden',
};

test('draft codec preserves valid incomplete state and rejects unsafe state', () => {
  assert.equal(SKY_DRAFT_STORAGE_KEY, 'cm:your-sky:draft:v1');
  const incomplete = {...complete, date: ''};
  assert.deepEqual(parseSkyDraft(serializeSkyDraft(incomplete), 'linen'), incomplete);
  assert.equal(parseSkyDraft('{bad json', 'linen'), null);
  assert.equal(
    parseSkyDraft(JSON.stringify({...complete, theme: 'neon'}), 'linen'),
    null,
  );
  assert.equal(
    parseSkyDraft(JSON.stringify({...complete, date: '1850-01-01'}), 'linen'),
    null,
  );
});

test('next required field is deterministic', () => {
  assert.equal(nextSkyRequiredField({place: null, date: ''}), 'place');
  assert.equal(nextSkyRequiredField({place, date: ''}), 'date');
  assert.equal(nextSkyRequiredField({place, date: '2019-06-14'}), null);
});

test('preview is ready only for the exact current rendered input', () => {
  const validation = validateSkyParams({
    date: complete.date,
    time: complete.time,
    lat: place.lat,
    lon: place.lon,
    tz: place.tz,
    place: place.label,
    title: complete.title,
    theme: complete.theme,
  });
  assert.equal(validation.ok, true);
  const key = createSkyRenderKey(validation.params, '20x24');
  assert.equal(
    getSkyPreviewStatus({
      failed: false,
      hasRequired: true,
      renderKey: key,
      sceneKey: key,
    }),
    'ready',
  );
  assert.equal(
    getSkyPreviewStatus({
      failed: false,
      hasRequired: true,
      renderKey: key,
      sceneKey: null,
    }),
    'updating',
  );
  assert.equal(
    getSkyPreviewStatus({
      failed: false,
      hasRequired: false,
      renderKey: null,
      sceneKey: key,
    }),
    'example',
  );
  assert.equal(
    getSkyPreviewStatus({
      failed: true,
      hasRequired: true,
      renderKey: key,
      sceneKey: null,
    }),
    'error',
  );
});
