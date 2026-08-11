import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const homepageSource = readFileSync(
  path.join(ROOT, 'app/routes/_index.tsx'),
  'utf8',
);

function getShortMobileCss() {
  const start = homepageSource.indexOf(
    '@media (max-width: 768px) and (max-height: 680px)',
  );
  const end = homepageSource.indexOf('@media (prefers-reduced-motion: reduce)');

  assert.notEqual(start, -1, 'missing the short-mobile viewport treatment');
  assert.ok(end > start, 'short-mobile rules must precede motion fallbacks');
  return homepageSource.slice(start, end);
}

test('short mobile landing pages use a collision-free grid composition', () => {
  const css = getShortMobileCss();

  assert.match(
    css,
    /\.hm-ui-layer\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto;/s,
  );
  assert.match(
    css,
    /\.hm-hero-text\s*\{[^}]*position:\s*static;[^}]*transform:\s*none;/s,
  );
  assert.match(
    css,
    /\.hm-interaction-anchor\s*\{[^}]*position:\s*static;[^}]*transform:\s*none;/s,
  );
});

test('short mobile landing pages compact the hero without hiding its actions', () => {
  const css = getShortMobileCss();

  assert.match(css, /\.hm-header-top\s*\{[^}]*gap:\s*0\.65rem;/s);
  assert.match(css, /\.hm-hero-actions\s*\{[^}]*margin-top:\s*14px;/s);
  assert.match(css, /\.hm-hero-action\s*\{[^}]*min-height:\s*38px;/s);
});
