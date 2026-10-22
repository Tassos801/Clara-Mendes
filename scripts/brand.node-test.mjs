import assert from 'node:assert/strict';
import test from 'node:test';
import {BRAND, HERO_TILES} from '../app/content/brand.ts';

test('the hero carries the owner line, visible word for word', () => {
  assert.equal(BRAND.hero.headline, "We don't know what we'll make next.");
  assert.equal(BRAND.hero.line, "We like art, and we promise it won't be boring.");
  assert.equal(BRAND.hero.primaryCta.href, '/collections/all');
  assert.equal(BRAND.hero.secondaryCta.href, '/our-story');
});

test('six hero tiles, each with an image, a tag and a site-relative link', () => {
  assert.equal(HERO_TILES.length, 6);
  for (const tile of HERO_TILES) {
    assert.match(tile.href, /^\//, `${tile.tag} links inside the site`);
    assert.ok(tile.image.src.length > 0);
    assert.ok(tile.image.width > 0 && tile.image.height > 0);
    assert.ok(tile.image.alt.length > 10, `${tile.tag} has a real alt text`);
    assert.ok(tile.tag.length > 0);
  }
  assert.equal(HERO_TILES[0].tag, 'our own print');
  assert.equal(HERO_TILES[1].tag, 'a borrowed Hokusai');
});

test('no brand sentence falls back on "original" as the umbrella word', () => {
  const text = JSON.stringify(BRAND);
  assert.doesNotMatch(text, /original art/i);
  assert.doesNotMatch(text, /original works?/i);
  assert.doesNotMatch(text, /something original/i);
});

test('SEO descriptions fit the 155-character truncation', () => {
  assert.ok(BRAND.seo.defaultDescription.length <= 155);
  assert.ok(BRAND.seo.homeDescription.length <= 155);
  assert.ok(BRAND.ourStory.description.length <= 155);
});
