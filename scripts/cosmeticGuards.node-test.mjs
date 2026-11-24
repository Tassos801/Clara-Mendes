import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');

test('body text uses the loaded Inter stack, not reset.css system fonts', () => {
  // reset.css sets a system font stack on body, which beats the one html
  // passes down; app.css must set the brand stack on body itself.
  const appCss = read('app/styles/app.css');
  assert.match(appCss, /\nbody \{[^}]*font-family: var\(--sans\);/);
  assert.match(appCss, /--sans:\s*'Inter Variable'/);
  assert.match(appCss, /@import '@fontsource-variable\/inter\/wght\.css';/);
});

test('product cards contain their screen-reader text', () => {
  // The sale tag holds an absolutely positioned .sr-only label. Without a
  // positioned card it escaped the artist pages' sideways rows and widened
  // the page to 1120 px on a 390 px phone (2026-11-24).
  const card = read('app/components/ClaraProductCard.tsx');
  assert.match(card, /\n\.cm-card \{[^}]*position: relative;/);
});

test('desktop shop tabs wrap so every product type stays visible', () => {
  // Sixteen tabs need about 1,420 px; the page column leaves about 1,170.
  const shop = read('app/routes/collections.all.tsx');
  assert.match(
    shop,
    /@media \(min-width: 981px\) \{[\s\S]*?\.cv-type-tabs \{[^}]*flex-wrap: wrap;[^}]*overflow-x: visible;/,
  );
});
