import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const readSource = (relativePath) =>
  readFileSync(path.join(ROOT, relativePath), 'utf8');

const appCss = readSource('app/styles/app.css');
const cardSource = readSource('app/components/ClaraProductCard.tsx');
const collectionSource = readSource('app/routes/collections.all.tsx');
const homeSource = readSource('app/routes/_index.tsx');
const storySource = readSource('app/routes/our-story.tsx');

function expectGlassRule(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(
    source,
    new RegExp(`${escapedSelector}\\s*\\{[^}]*backdrop-filter`, 's'),
    `${selector} should have a liquid-glass backdrop`,
  );
}

test('defines one reusable warm liquid-glass material system', () => {
  for (const token of [
    '--glass-blur',
    '--glass-border',
    '--glass-shadow',
    '--glass-surface',
    '--glass-surface-strong',
  ]) {
    assert.ok(appCss.includes(token), `missing ${token}`);
  }
});

test('applies glass to the shared navigation, commerce, and overlay surfaces', () => {
  for (const selector of [
    '.site-header',
    '.product-gallery-arrow',
    '.product-purchase-panel',
    '.cart-drawer',
    '.mobile-nav-drawer',
    '.sticky-atc-bar',
  ]) {
    expectGlassRule(appCss, selector);
  }
});

test('extends the material to route-specific hero and merchandising controls', () => {
  expectGlassRule(homeSource, '.hm-header-top');
  expectGlassRule(homeSource, '.hm-hero-action');
  expectGlassRule(storySource, '.os-header-top');
  expectGlassRule(collectionSource, '.cv-toolbar');
  expectGlassRule(collectionSource, '.cv-facets');
  expectGlassRule(cardSource, '.cm-card-chip');
  expectGlassRule(cardSource, '.cm-quick-add');
});

test('keeps a no-blur touch fallback for fixed glass surfaces', () => {
  assert.match(
    appCss,
    /@media \(hover: none\) and \(pointer: coarse\)[\s\S]*?\.site-header,[\s\S]*?\.sticky-atc-bar[\s\S]*?backdrop-filter:\s*none/,
  );
});

test('enables the mobile sticky purchase glass after its base rule', () => {
  const baseRuleIndex = appCss.indexOf('.sticky-atc-bar {');

  assert.notEqual(baseRuleIndex, -1, 'missing the sticky purchase base rule');
  assert.match(
    appCss.slice(baseRuleIndex + 1),
    /@media \(max-width: 720px\)[\s\S]*?\.sticky-atc-bar\s*\{[^}]*display:\s*flex/,
    'the mobile display override must follow the base display rule',
  );
});
