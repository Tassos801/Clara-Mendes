import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  LEGACY_SOFA_ALT_FOR,
  SOFA_SCENES,
  expectedSofaMockupAlts,
  mediaMatchesPlannedSource,
  resolveSofaMediaPlan,
  sofaMockupFileName,
  sofaMockupRelativePath,
} from './lib/sofa-mockup-scenes.mjs';

const planned = SOFA_SCENES.map((scene) => ({
  alt: scene.altFor('Quiet Form I'),
  originalSource: `https://shopclaramendes.com/images/product-art-mockups/quiet-form/quiet-form-01-${scene.fileSuffix}.jpg`,
}));
function readyMedia(media, index) {
  return {
    alt: media.alt,
    id: `sofa-${index}`,
    image: {url: media.originalSource},
    mediaContentType: 'IMAGE',
    status: 'READY',
  };
}
const currentSeven = Array.from({length: 7}, (_, index) => ({
  alt: index === 0 ? 'flat art' : `existing room ${index}`,
  id: `media-${index}`,
}));

test('keeps the reference height bracket but emits no text overlay', () => {
  const generator = readFileSync(
    fileURLToPath(new URL('./generate-sofa-mockups.mjs', import.meta.url)),
    'utf8',
  );
  assert.match(generator, /function heightBracket/);
  assert.doesNotMatch(generator, /<text\b/i);
});

test('defines all three text-free sofa scene identities', () => {
  assert.deepEqual(
    SOFA_SCENES.map((scene) => scene.sizeKey),
    ['8x10', '16x20', '20x24'],
  );
  assert.equal(expectedSofaMockupAlts('Quiet Form I').length, 3);
  assert.match(planned[1].alt, /Quiet Form I/);
  assert.match(planned[1].alt, /16 by 20 inch/);
  assert.match(planned[1].alt, /above a sofa/);
  assert.equal(
    sofaMockupFileName('quiet-form-01.webp', SOFA_SCENES[1]),
    'quiet-form-01-room-sofa-16x20.jpg',
  );
  assert.equal(
    sofaMockupRelativePath(
      '/images/product-art/quiet-form/quiet-form-01.webp',
      SOFA_SCENES[2],
    ),
    'quiet-form/quiet-form-01-room-sofa-20x24.jpg',
  );
  assert.equal(
    sofaMockupRelativePath(
      '/images/product-art/quiet-form/quiet-form-01.webp',
      SOFA_SCENES[1],
    ),
    'quiet-form/quiet-form-01-room-sofa-16x20.jpg',
  );
});

test('migrates the exact seven-image baseline plus the legacy overlay', () => {
  const legacy = {alt: LEGACY_SOFA_ALT_FOR('Quiet Form I'), id: 'legacy'};
  const plan = resolveSofaMediaPlan(
    [...currentSeven, legacy],
    planned,
    'Quiet Form I',
  );
  assert.equal(plan.action, 'migrate');
  assert.equal(plan.legacy, legacy);
  assert.equal(
    resolveSofaMediaPlan(currentSeven.slice(0, 6), planned, 'Quiet Form I')
      .action,
    'mismatch',
  );
});

test('reuses the complete clean set and rejects an unknown sofa image', () => {
  const exact = planned.map(readyMedia);
  const complete = resolveSofaMediaPlan(
    [...currentSeven, ...exact],
    planned,
    'Quiet Form I',
  );
  assert.equal(complete.action, 'complete');
  assert.equal(complete.currentByAlt.size, 3);

  const stale = {
    alt: 'old copy',
    id: 'stale-sofa',
    image: {
      url: 'https://cdn.shopify.com/quiet-form-01-room-sofa-16x20.jpg',
    },
  };
  assert.equal(
    resolveSofaMediaPlan([...currentSeven, stale], planned, 'Quiet Form I')
      .action,
    'mismatch',
  );
});

test('rejects failed or wrong-source media even when the alt matches', () => {
  const exact = planned.map(readyMedia);
  const failed = {...exact[0], status: 'FAILED'};
  const wrongSource = {
    ...exact[0],
    image: {url: 'https://cdn.shopify.com/files/not-the-clean-scene.jpg'},
  };
  assert.equal(
    resolveSofaMediaPlan(
      [...currentSeven, failed, ...exact.slice(1)],
      planned,
      'Quiet Form I',
    ).action,
    'mismatch',
  );
  assert.equal(
    resolveSofaMediaPlan(
      [...currentSeven, wrongSource, ...exact.slice(1)],
      planned,
      'Quiet Form I',
    ).action,
    'mismatch',
  );
  assert.equal(mediaMatchesPlannedSource(exact[0], planned[0]), true);
  assert.equal(
    mediaMatchesPlannedSource(
      {
        image: {
          url: exact[0].image.url.replace('.jpg', '_1.jpg'),
        },
      },
      planned[0],
    ),
    true,
  );
  assert.equal(
    mediaMatchesPlannedSource(
      {
        image: {
          url: exact[0].image.url.replace(
            '.jpg',
            '_179c2a11-7d1d-4196-b0a7-5f2b7086816f.jpg',
          ),
        },
      },
      planned[0],
    ),
    true,
  );
  assert.equal(mediaMatchesPlannedSource(wrongSource, planned[0]), false);
});
