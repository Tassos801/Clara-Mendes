import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {
  NAV_LINKS,
  PRIMARY_LINKS,
  SHOP_LINKS,
  SHOP_PATH,
} from '../app/lib/navLinks.ts';
import {BRAND} from '../app/content/brand.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');

test('desktop headers carry three links: Shop, Artists, Our Story', () => {
  const labels = PRIMARY_LINKS.map(({label}) => label);
  assert.equal(labels[0], 'Shop');
  assert.equal(PRIMARY_LINKS[0].to, SHOP_PATH);
  assert.equal(labels.at(-1), 'Our Story');
  assert.ok(labels.length <= 3, labels.join(', '));
  for (const label of ['Journal', 'Contact', 'Search', 'Clothing']) {
    assert.ok(!labels.includes(label), `${label} is back in the header`);
  }
});

test('the mobile menu still lists every page, Shop lines included', () => {
  const targets = NAV_LINKS.map(({to}) => to);
  for (const {to} of [...PRIMARY_LINKS, ...SHOP_LINKS]) {
    assert.ok(targets.includes(to), `${to} missing from the mobile menu`);
  }
  for (const to of ['/blogs/karina-of-time', '/contact', '/search']) {
    assert.ok(targets.includes(to), `${to} missing from the mobile menu`);
  }
  assert.equal(new Set(targets).size, targets.length, 'a link is listed twice');
});

test('the site header opens the Shop lines under Shop and shows search', () => {
  const shell = read('app/components/ClaraShell.tsx');
  assert.match(shell, /PRIMARY_LINKS\.map/);
  assert.match(shell, /className="site-nav-shop-menu"/);
  assert.match(shell, /SHOP_LINKS\.map/);
  const css = read('app/styles/app.css');
  assert.match(
    css,
    /\.site-nav-shop:focus-within \.site-nav-shop-menu\s*\{[^}]*visibility:\s*visible;/,
  );
  assert.match(css, /\.mobile-search-button\s*\{\s*display:\s*flex;/);
});

test('Our Story renders the same short list', () => {
  const story = read('app/routes/our-story.tsx');
  assert.match(story, /PRIMARY_LINKS\.map/);
  assert.doesNotMatch(story, /NAV_LINKS/);
});

test('the footer keeps one short brand line', () => {
  const shell = read('app/components/ClaraShell.tsx');
  assert.match(shell, /<p>\{BRAND\.footer\.blurb\}<\/p>/);
  assert.doesNotMatch(shell, /We ship across the EU/);
  assert.ok(BRAND.footer.blurb.length <= 60, BRAND.footer.blurb);
});
