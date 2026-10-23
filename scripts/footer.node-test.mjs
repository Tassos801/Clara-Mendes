import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');

const SHELL = read('app/components/ClaraShell.tsx');
const CSS = read('app/styles/app.css');

const footerStart = SHELL.indexOf('function ClaraFooter()');
const FOOTER = SHELL.slice(
  footerStart,
  SHELL.indexOf('\nfunction ', footerStart + 1),
);

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('the footer keeps the sign-up form', () => {
  assert.ok(footerStart > 0, 'ClaraFooter is in ClaraShell.tsx');
  assert.match(FOOTER, /<NewsletterForm variant="footer"/);
});

test('the footer links sit in four headed columns', () => {
  for (const heading of ['Shop', 'Wall art by style', 'Clara Mendes', 'Help']) {
    assert.match(
      FOOTER,
      new RegExp(`<h2 className="footer-heading">${escape(heading)}</h2>`),
      heading,
    );
  }
  assert.equal(FOOTER.match(/className="footer-column"/g)?.length, 4);
  assert.doesNotMatch(FOOTER, /aria-label="Footer navigation"/);
});

test('the style links keep their texts and paths', () => {
  const styleLinks = [
    ['/collections/all?type=Art+Prints', 'Unframed Art Prints'],
    ['/collections/abstract-wall-art', 'Abstract Wall Art'],
    ['/collections/terracotta-wall-art', 'Terracotta Wall Art'],
    ['/collections/blue-abstract-wall-art', 'Blue Abstract Art'],
    ['/collections/geometric-wall-art', 'Geometric Wall Art'],
    ['/collections/dark-botanical-wall-art', 'Dark Botanicals'],
    ['/collections/living-room-wall-art', 'Living Room Art'],
    ['/collections/bedroom-wall-art', 'Bedroom Art'],
    ['/collections/wall-art-sets-of-3', 'Sets of 3'],
  ];
  const column = FOOTER.slice(
    FOOTER.indexOf('aria-label="Shop wall art by style"'),
    FOOTER.indexOf('aria-label="Clara Mendes"'),
  );
  let last = -1;
  for (const [href, label] of styleLinks) {
    const at = column.search(
      new RegExp(`<Link to="${escape(href)}">\\s*${escape(label)}\\s*</Link>`),
    );
    assert.ok(at > last, `${label} → ${href}, in order`);
    last = at;
  }
});

test('the help links point at the four policies', () => {
  for (const href of [
    '/policies/shipping-policy',
    '/policies/refund-policy',
    '/policies/privacy-policy',
    '/policies/terms-of-service',
  ]) {
    assert.match(FOOTER, new RegExp(`<Link to="${escape(href)}">`), href);
  }
});

test('the bottom row carries the year and the social links', () => {
  assert.match(FOOTER, /className="footer-bottom"/);
  assert.match(FOOTER, /new Date\(\)\.getFullYear\(\)/);
  for (const href of [
    'https://www.instagram.com/shopclaramendes/',
    'https://www.pinterest.com/shopclaramendes/',
    'https://www.facebook.com/shopclaramendes',
  ]) {
    assert.match(
      FOOTER,
      new RegExp(`<a\\s+href="${escape(href)}"[^>]*rel="noreferrer"[^>]*>`),
      href,
    );
  }
});

test('the footer columns are a four-up grid that goes two-up on phones', () => {
  assert.match(
    CSS,
    /\.footer-columns \{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/,
  );
  assert.match(
    CSS,
    /@media \(max-width: 720px\) \{\s*\.footer-columns \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
  );
  // The old wrapping flex row left "Facebook" alone on its own line.
  assert.doesNotMatch(CSS, /\.site-footer nav \{[^}]*flex-wrap/);
  assert.doesNotMatch(CSS, /\.site-footer nav\b/);
});
