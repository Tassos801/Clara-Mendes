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

function cssBlock(selectorRegex, source = homepageSource) {
  const match = source.match(new RegExp(`${selectorRegex}\\s*\\{([^}]*)\\}`, 's'));
  assert.ok(match, `missing rule ${selectorRegex}`);
  return match[1];
}

test('the headline is visible on the first frame: no fade, no delay', () => {
  const main = cssBlock('\\.hm-prompt-main');
  assert.doesNotMatch(main, /opacity:\s*0/);
  assert.doesNotMatch(main, /animation:/);
  const sub = cssBlock('\\.hm-prompt-sub');
  assert.doesNotMatch(sub, /opacity:\s*0/);
  assert.doesNotMatch(sub, /animation:/);
  assert.doesNotMatch(homepageSource, /hmFadeInSlow/);
});

test('the cursor orb, custom cursor and interior backdrop are gone', () => {
  for (const gone of [
    'hm-orb-btn',
    'hm-cursor-dot',
    'hm-cursor-outline',
    'hm-layer-blur',
    'hm-interaction-anchor',
    'hero-interior',
    'cursor: none',
  ]) {
    assert.ok(!homepageSource.includes(gone), `${gone} should be removed`);
  }
});

test('phones get one calm header row that opens the site menu', () => {
  const start = homepageSource.indexOf('@media (max-width: 768px) {');
  assert.notEqual(start, -1);
  const css = homepageSource.slice(start, homepageSource.indexOf('@media', start + 10));
  assert.match(css, /\.hm-nav-group\s*\{[^}]*display:\s*none;/s);
  assert.match(css, /\.hm-menu-button,\s*\.hm-header-icons\s*\{[^}]*display:\s*inline-flex;/s);
  assert.match(homepageSource, /onClick=\{\(\) => open\('mobile'\)\}/);
  assert.match(homepageSource, /aria-label="Open menu"/);
});

test('phones show four tiles in two columns under the headline', () => {
  const start = homepageSource.indexOf('@media (max-width: 768px) {');
  const css = homepageSource.slice(start, homepageSource.indexOf('@media', start + 10));
  assert.match(css, /\.hm-tiles\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s);
  assert.match(css, /\.hm-tile:nth-child\(n \+ 5\)\s*\{[^}]*display:\s*none;/s);
  assert.match(css, /\.hm-hero-body\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s);
});
