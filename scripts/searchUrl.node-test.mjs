import assert from 'node:assert/strict';
import {urlWithTrackingParams} from '../app/lib/search.ts';

// Multi-word terms are encoded exactly once (no %2520 double-encoding)
const url = urlWithTrackingParams({
  baseUrl: '/products/quiet-form-i-art-print',
  trackingParams: 'utm_source=shopify',
  term: 'Quiet Form',
});
assert.equal(
  url,
  '/products/quiet-form-i-art-print?q=Quiet+Form&utm_source=shopify',
);
assert.ok(!url.includes('%25'), `double-encoded query in ${url}`);

// Round-trips back to the original term through standard URL parsing
const parsed = new URL(url, 'https://shopclaramendes.com');
assert.equal(parsed.searchParams.get('q'), 'Quiet Form');

// Shopify tracking parameters are appended untouched
const tracked = urlWithTrackingParams({
  baseUrl: '/products/patina-blue-ii-art-print',
  trackingParams: '_pos=2&_sid=abc123&_ss=r',
  term: 'blue abstract print',
});
assert.ok(tracked.endsWith('&_pos=2&_sid=abc123&_ss=r'));
assert.equal(
  new URL(tracked, 'https://shopclaramendes.com').searchParams.get('q'),
  'blue abstract print',
);

// No tracking params -> plain single-encoded query string
assert.equal(
  urlWithTrackingParams({baseUrl: '/products/x', term: 'vase & bowl'}),
  '/products/x?q=vase+%26+bowl',
);
