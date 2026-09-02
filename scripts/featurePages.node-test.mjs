import assert from 'node:assert/strict';
import {featurePageRedirect, YOUR_SKY_PAGE} from '../app/lib/featurePages.ts';

assert.equal(YOUR_SKY_PAGE.path, '/your-sky');
assert.equal(YOUR_SKY_PAGE.handle, 'your-sky-star-map');
assert.equal(YOUR_SKY_PAGE.occasions.length, 3);
assert.equal(YOUR_SKY_PAGE.how.length, 3);
assert.equal(YOUR_SKY_PAGE.faq.length, 3);
for (const occasion of YOUR_SKY_PAGE.occasions) {
  assert.ok(occasion.image.startsWith('/images/your-sky/'));
}

// The old product URL redirects to the page, query string intact.
assert.equal(
  featurePageRedirect(
    'your-sky-star-map',
    '?Size=8+%C3%97+10+in&Finish=Natural+frame',
  ),
  '/your-sky?Size=8+%C3%97+10+in&Finish=Natural+frame',
);
assert.equal(featurePageRedirect('your-sky-star-map', ''), '/your-sky');
assert.equal(featurePageRedirect('YOUR-SKY-STAR-MAP', ''), '/your-sky');
// Other products never redirect; a dark feature page never redirects either.
assert.equal(featurePageRedirect('quiet-form-i-art-print', ''), null);
assert.equal(featurePageRedirect(null, ''), null);
assert.equal(
  featurePageRedirect('your-sky-star-map', '', {'your-sky-star-map': false}),
  null,
);
