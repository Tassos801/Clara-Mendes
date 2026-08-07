import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {CSP_IMG_SRC} from '../app/lib/csp.ts';

const APP_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'app',
);

const sourceFiles = readdirSync(APP_DIR, {recursive: true, withFileTypes: true})
  .filter((entry) => entry.isFile() && /\.(ts|tsx|css)$/.test(entry.name))
  .map((entry) => path.join(entry.parentPath, entry.name));

assert.ok(
  sourceFiles.length > 20,
  `app/ scan looks wrong: only ${sourceFiles.length} source files found`,
);

// Every entry is a quoted CSP keyword, a bare scheme, or an https origin —
// the quoting mistake ("'blob:'" instead of 'blob:') would silently disable
// a source in the served header.
for (const source of CSP_IMG_SRC) {
  assert.match(
    source,
    /^'(?:self|none|unsafe-inline|unsafe-eval)'$|^[a-z][a-z0-9+.-]*:$|^https:\/\/[a-z0-9.-]+$/,
    `malformed img-src entry: ${source}`,
  );
}

// Baseline sources every page depends on.
assert.ok(CSP_IMG_SRC.includes("'self'"), `img-src must keep 'self'`);
assert.ok(
  CSP_IMG_SRC.includes('https://cdn.shopify.com'),
  'img-src must keep the Shopify CDN (all product imagery)',
);

// Scheme-usage scan: a component using a scheme the allowlist lacks ships a
// silently broken image (the review-photo preview bug fixed in PR #21).
const schemeSignals = [
  {scheme: 'blob:', signal: /URL\.createObjectURL\s*\(/},
  {scheme: 'data:', signal: /url\(\s*["']?data:/},
];
for (const {scheme, signal} of schemeSignals) {
  const hits = sourceFiles.filter((file) =>
    signal.test(readFileSync(file, 'utf8')),
  );
  if (hits.length > 0) {
    assert.ok(
      CSP_IMG_SRC.includes(scheme),
      `${scheme} is used by ${path.relative(APP_DIR, hits[0])}` +
        (hits.length > 1 ? ` (+${hits.length - 1} more)` : '') +
        ` but missing from CSP_IMG_SRC`,
    );
  }
}
