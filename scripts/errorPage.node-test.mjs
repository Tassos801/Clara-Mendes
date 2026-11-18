import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = readFileSync(path.join(ROOT, 'app/root.tsx'), 'utf8');
const BOUNDARY = SOURCE.slice(SOURCE.indexOf('export function ErrorBoundary()'));

test('the error page always offers the shop and contact', () => {
  assert.ok(BOUNDARY.length > 0, 'ErrorBoundary is in app/root.tsx');
  assert.match(BOUNDARY, /href="\/collections\/all"/);
  assert.match(BOUNDARY, /href="\/contact"/);
  assert.match(BOUNDARY, /href="\/search"/);
});

test('raw error text reaches only the dev server', () => {
  assert.match(BOUNDARY, /const devDetail = import\.meta\.env\.DEV/);
  assert.doesNotMatch(BOUNDARY, /\{detail\}/);
  assert.equal(BOUNDARY.match(/error\.message/g)?.length, 1);
});
