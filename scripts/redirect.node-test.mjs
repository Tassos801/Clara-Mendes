import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isLocalPath,
  toLocalPath,
  withSearchParams,
} from '../app/lib/redirect.ts';

const TAB = String.fromCharCode(9);
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const BACKSLASH = String.fromCharCode(92);

test('accepts ordinary same-origin paths', () => {
  for (const path of [
    '/',
    '/collections/all',
    '/products/quiet-form-i-art-print?Size=8+%C3%97+10+in#top',
    '/search?q=quiet%20form',
    '/your-sky?date=2024-06-01&time=22:00',
  ]) {
    assert.equal(isLocalPath(path), true, path);
  }
});

test('rejects anything that could leave the origin', () => {
  for (const value of [
    '',
    'https://evil.com',
    '//evil.com',
    `/${BACKSLASH}evil.com`,
    `${BACKSLASH}evil.com`,
    `/foo${BACKSLASH}bar`,
    `/${TAB}/evil.com`,
    `/${LF}/evil.com`,
    `/${CR}/evil.com`,
    'javascript:alert(1)',
    'collections/all',
  ]) {
    assert.equal(isLocalPath(value), false, JSON.stringify(value));
  }
});

test('a decoded redirect parameter cannot smuggle a tab past the check', () => {
  // /discount/CODE?redirect=/%09/evil.com decodes to a path with a tab,
  // which a browser parses as //evil.com.
  const value = new URLSearchParams('redirect=/%09/evil.com').get('redirect');
  assert.equal(value, `/${TAB}/evil.com`);
  assert.equal(
    new URL(value, 'https://shopclaramendes.com').origin,
    'https://evil.com',
    'the browser resolves the tabbed path off-origin',
  );
  assert.equal(isLocalPath(value), false);
});

test('a local path is re-serialised so it is always a valid Location header', () => {
  for (const value of ['/€', '/café?q=naïve#sélection']) {
    const path = toLocalPath(value);
    assert.ok(path, value);
    assert.doesNotThrow(() => new Headers({Location: path}), path);
  }
  assert.throws(() => new Headers({Location: '/€'}), 'raw input would throw');
  assert.equal(toLocalPath('/products/a?x=1#top'), '/products/a?x=1#top');
  assert.equal(toLocalPath('//evil.com'), null);
  assert.equal(toLocalPath(null), null);
});

test('discount redirects keep extra parameters in the query, before the fragment', () => {
  assert.equal(
    withSearchParams('/p?a=1#top', new URLSearchParams('utm_source=ig')),
    '/p?a=1&utm_source=ig#top',
  );
  assert.equal(withSearchParams('/', new URLSearchParams()), '/');
});
