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

test('the footer links sit in three headed columns', () => {
  for (const heading of ['Shop', 'Clara Mendes', 'Help']) {
    assert.match(
      FOOTER,
      new RegExp(`<h2 className="footer-heading">${escape(heading)}</h2>`),
      heading,
    );
  }
  assert.equal(FOOTER.match(/className="footer-column"/g)?.length, 3);
  assert.doesNotMatch(FOOTER, /aria-label="Footer navigation"/);
  // The style landing pages left the footer on 2026-10-23 to keep it short;
  // they stay reachable through the sitemap and their related-page links.
  assert.doesNotMatch(FOOTER, /Wall art by style|abstract-wall-art/);
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

test('the footer columns are a three-up grid that goes two-up on phones', () => {
  assert.match(
    CSS,
    /\.footer-columns \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/,
  );
  assert.match(
    CSS,
    /@media \(max-width: 720px\) \{\s*\.footer-columns \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
  );
  // The old wrapping flex row left "Facebook" alone on its own line.
  assert.doesNotMatch(CSS, /\.site-footer nav \{[^}]*flex-wrap/);
  assert.doesNotMatch(CSS, /\.site-footer nav\b/);
});
