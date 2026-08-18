import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {CSP_IMG_SRC, CSP_SCRIPT_SRC} from '../app/lib/csp.ts';

const APP_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'app',
);
const rootSource = readFileSync(path.join(APP_DIR, 'root.tsx'), 'utf8');

const sourceFiles = readdirSync(APP_DIR, {recursive: true, withFileTypes: true})
  .filter((entry) => entry.isFile() && /\.(ts|tsx|css)$/.test(entry.name))
  .map((entry) => path.join(entry.parentPath, entry.name));

assert.ok(
  sourceFiles.length > 20,
  `app/ scan looks wrong: only ${sourceFiles.length} source files found`,
);

assert.match(
  rootSource,
  /<Links\s+nonce=""\s*\/>/,
  'Links must explicitly opt out of the server-only router nonce to hydrate safely',
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

// script-src entries must be well-formed too.
for (const source of CSP_SCRIPT_SRC) {
  assert.match(
    source,
    /^'(?:self|none|unsafe-inline|unsafe-eval)'$|^[a-z][a-z0-9+.-]*:$|^https:\/\/[a-z0-9.-]+$/,
    `malformed script-src entry: ${source}`,
  );
}

// Hydrogen's createContentSecurityPolicy has no default scriptSrc to merge
// into a custom value, so this list is the whole allowlist. Dropping these
// two entries CSP-blocked the consent privacy banner (killing analytics
// consent site-wide) and Oxygen-served lazy chunks — caught 2026-08-18.
assert.ok(CSP_SCRIPT_SRC.includes("'self'"), `script-src must keep 'self'`);
assert.ok(
  CSP_SCRIPT_SRC.includes('https://cdn.shopify.com'),
  'script-src must keep the Shopify CDN (privacy banner + Oxygen asset chunks)',
);
assert.ok(
  CSP_SCRIPT_SRC.includes('https://www.googletagmanager.com'),
  'script-src must keep googletagmanager (ad platform tags)',
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
