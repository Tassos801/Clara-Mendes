import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SOFA_SCENE,
  expectedSofaMockupAlt,
  resolveSofaMediaPlan,
  sofaMockupFileName,
  sofaMockupRelativePath,
} from './lib/sofa-mockup-scenes.mjs';

const planned = {
  alt: expectedSofaMockupAlt('Quiet Form I'),
  originalSource:
    'https://shopclaramendes.com/images/product-art-mockups/quiet-form/quiet-form-01-room-sofa-16x20.jpg',
};
const currentSeven = Array.from({length: 7}, (_, index) => ({
  alt: index === 0 ? 'flat art' : `existing room ${index}`,
  id: `media-${index}`,
}));

test('defines a 16x20 sofa scene with stable file and alt identities', () => {
  assert.equal(SOFA_SCENE.sizeKey, '16x20');
  assert.match(planned.alt, /Quiet Form I/);
  assert.match(planned.alt, /16 by 20 inch/);
  assert.match(planned.alt, /above a sofa/);
  assert.equal(
    sofaMockupFileName('quiet-form-01.webp'),
    'quiet-form-01-room-sofa-16x20.jpg',
  );
  assert.equal(
    sofaMockupRelativePath('/images/product-art/quiet-form/quiet-form-01.webp'),
    'quiet-form/quiet-form-01-room-sofa-16x20.jpg',
  );
});

test('appends only to the exact seven-image baseline', () => {
  assert.equal(resolveSofaMediaPlan(currentSeven, planned).action, 'append');
  assert.equal(
    resolveSofaMediaPlan(currentSeven.slice(0, 6), planned).action,
    'mismatch',
  );
  assert.equal(
    resolveSofaMediaPlan(
      [...currentSeven, {alt: 'unrelated eighth image'}],
      planned,
    ).action,
    'mismatch',
  );
});

test('reuses an exact sofa media match and rejects a stale duplicate', () => {
  const exact = {alt: planned.alt, id: 'sofa'};
  const complete = resolveSofaMediaPlan([...currentSeven, exact], planned);
  assert.equal(complete.action, 'complete');
  assert.equal(complete.media, exact);
  assert.equal(
    resolveSofaMediaPlan([...currentSeven.slice(0, 6), exact], planned).action,
    'mismatch',
  );

  const stale = {
    alt: 'old copy',
    id: 'stale-sofa',
    image: {
      url: 'https://cdn.shopify.com/quiet-form-01-room-sofa-16x20.jpg',
    },
  };
  assert.equal(
    resolveSofaMediaPlan([...currentSeven, stale], planned).action,
    'mismatch',
  );
});
