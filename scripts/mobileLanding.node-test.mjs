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

function getPhoneCss() {
  const start = homepageSource.indexOf('@media (max-width: 768px) {');
  assert.notEqual(start, -1, 'missing the phone viewport treatment');
  return homepageSource.slice(start, homepageSource.indexOf('@media', start + 10));
}

function getShortMobileCss() {
  const start = homepageSource.indexOf(
    '@media (max-width: 768px) and (max-height: 680px)',
  );
  const end = homepageSource.indexOf('@media (prefers-reduced-motion: reduce)');

  assert.notEqual(start, -1, 'missing the short-mobile viewport treatment');
  assert.ok(end > start, 'short-mobile rules must precede motion fallbacks');
  return homepageSource.slice(start, end);
}

test('phone landing pages keep the hero in flow so the words never meet the pill', () => {
  const css = getPhoneCss();

  // Pill, words, footnote as grid rows at every phone height: the hero can
  // never be shorter than its content (an absolute block at 46% slid under
  // the pill on phones whose browser reported a short viewport).
  assert.match(
    css,
    /\.hm-ui-layer\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto;/s,
  );
  // One full-width column (the flex layout's space-between would shrink it).
  assert.match(css, /\.hm-ui-layer\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s);
  assert.match(
    css,
    /\.hm-hero-text\s*\{[^}]*grid-row:\s*2;[^}]*position:\s*static;[^}]*transform:\s*none;/s,
  );
  assert.match(css, /\.hm-coords\s*\{[^}]*grid-row:\s*3;[^}]*position:\s*static;/s);
});

test('short mobile landing pages compact the hero without hiding its actions', () => {
  const css = getShortMobileCss();

  // The grid itself comes from the phone rules; this query only tightens it.
  assert.doesNotMatch(css, /display:\s*grid;/);
  assert.match(css, /\.hm-ui-layer\s*\{[^}]*row-gap:\s*8px;/s);
  // The one-row phone header from the 768px rules is not overridden here.
  assert.doesNotMatch(css, /\.hm-header-top\s*\{/);
  assert.match(css, /\.hm-hero-actions\s*\{[^}]*margin-top:\s*14px;/s);
  assert.match(css, /\.hm-hero-action\s*\{[^}]*min-height:\s*38px;/s);
});

test('phones get one calm header row that opens the site menu', () => {
  const css = getPhoneCss();
  assert.match(css, /\.hm-nav-group\s*\{[^}]*display:\s*none;/s);
  assert.match(css, /\.hm-menu-button,\s*\.hm-header-icons\s*\{[^}]*display:\s*inline-flex;/s);
  // "Enter the shop" repeats "See what we made" on phones.
  assert.match(css, /\.hm-interaction-anchor\s*\{[^}]*display:\s*none;/s);
  assert.match(homepageSource, /onClick=\{\(\) => open\('mobile'\)\}/);
  assert.match(homepageSource, /aria-label="Open menu"/);
});

test('the hero header renders the shared navigation list', () => {
  assert.match(homepageSource, /NAV_LINKS\.map/);
});
