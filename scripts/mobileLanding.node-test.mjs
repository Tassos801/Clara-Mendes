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

  // Pill, words and orb as grid rows at every phone height: the hero can
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
  // The product footnote left the hero on 2026-10-23.
  assert.doesNotMatch(homepageSource, /hm-coords/);
});

test('short mobile landing pages compact the hero', () => {
  const css = getShortMobileCss();

  // The grid itself comes from the phone rules; this query only tightens it.
  assert.doesNotMatch(css, /display:\s*grid;/);
  assert.match(css, /\.hm-ui-layer\s*\{[^}]*row-gap:\s*8px;/s);
  // The one-row phone header from the 768px rules is not overridden here.
  assert.doesNotMatch(css, /\.hm-header-top\s*\{/);
});

test('the hero holds the headline and the "Enter the shop" orb', () => {
  // Since 2026-10-29: no second line and no button.
  for (const gone of ['hm-prompt-sub', 'hm-hero-action']) {
    assert.doesNotMatch(homepageSource, new RegExp(gone), gone);
  }
  assert.match(homepageSource, /<h1 ref=\{titleRef\} id="home-title" className="hm-prompt-main">/);
  // The orb came back the same day, on phones too: it is the hero's only
  // way into the shop, so phones place it in flow below the words.
  assert.match(homepageSource, /aria-label="Enter the shop"/);
  assert.match(homepageSource, /<span className="hm-label-enter">Enter the shop<\/span>/);
  assert.match(homepageSource, /void navigate\('\/collections\/all'\)/);
  const css = getPhoneCss();
  assert.match(
    css,
    /\.hm-interaction-anchor\s*\{[^}]*grid-row:\s*3;[^}]*position:\s*static;[^}]*transform:\s*none;/s,
  );
  assert.doesNotMatch(homepageSource, /\.hm-interaction-anchor\s*\{[^}]*display:\s*none;/s);
});

test('phones get one calm header row that opens the site menu', () => {
  const css = getPhoneCss();
  assert.match(css, /\.hm-nav-group\s*\{[^}]*display:\s*none;/s);
  assert.match(css, /\.hm-menu-button,\s*\.hm-header-icons\s*\{[^}]*display:\s*inline-flex;/s);
  assert.match(homepageSource, /onClick=\{\(\) => open\('mobile'\)\}/);
  assert.match(homepageSource, /aria-label="Open menu"/);
});

test('the hero header renders the short shared navigation list', () => {
  assert.match(homepageSource, /PRIMARY_LINKS\.map/);
  assert.doesNotMatch(homepageSource, /NAV_LINKS|hm-cart-link/);
});
