import assert from 'node:assert/strict';
import test from 'node:test';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BRAND, HERO_TILES} from '../app/content/brand.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !/\.d\.ts$/.test(name) ? [full] : [];
  });
}

const BANNED = [
  /original art\b/i,
  /original works?\b/i,
  /original piece/i,
  /something original/i,
  /original clara mendes/i,
  /objects with soul/i,
];

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

test('no page claims "original art" as the brand again', () => {
  const offenders = [];
  for (const file of sourceFiles(path.join(ROOT, 'app'))) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      // Comments may describe history; shoppers never read them.
      if (/^(\/\/|\*|\/\*)/.test(trimmed)) return;
      if (BANNED.some((pattern) => pattern.test(line)))
        offenders.push(`${path.relative(ROOT, file)}:${index + 1}: ${trimmed}`);
    });
  }
  assert.deepEqual(offenders, []);
});

test('the founder letter is complete and the portrait exists', () => {
  assert.equal(BRAND.letter.title, 'A letter from Nicosia.');
  assert.equal(BRAND.letter.paragraphs.length, 4);
  assert.match(BRAND.letter.paragraphs[0], /Tassos Dimitriou/);
  assert.equal(BRAND.letter.signature, '— Tassos');
  assert.ok(BRAND.letter.portraitAlt.length > 10);
  const text = JSON.stringify(BRAND.letter);
  assert.doesNotMatch(text, /\bAI\b|artificial|generated|painted|hand-drawn/i);
  assert.ok(
    statSync(path.join(ROOT, 'public', BRAND.letter.portrait)).size > 10_000,
    'portrait file exists',
  );
  const story = readFileSync(path.join(ROOT, 'app/routes/our-story.tsx'), 'utf8');
  assert.match(story, /BRAND\.letter\.paragraphs\.map/);
  assert.match(story, /href="#os-letter"/);
  assert.match(story, /'@type': 'Person'/);
});

test('the newsletter copy and forms are wired', () => {
  assert.equal(BRAND.newsletter.title, 'New work first. A letter now and then.');
  assert.match(BRAND.newsletter.success('WELCOME10'), /WELCOME10/);
  assert.doesNotMatch(BRAND.newsletter.success(null), /code/i);
  assert.match(BRAND.newsletter.body('X'), /10 % off/);
  assert.doesNotMatch(BRAND.newsletter.body(null), /10 %/);
  const form = readFileSync(path.join(ROOT, 'app/components/NewsletterForm.tsx'), 'utf8');
  assert.match(form, /action=\{NEWSLETTER_ACTION\}|action="\/api\/subscribe"/);
  assert.match(form, /NEWSLETTER_HONEYPOT_FIELD/);
  assert.match(form, /hydrated \? <input type="hidden" name="_fetcher"/);
  const shell = readFileSync(path.join(ROOT, 'app/components/ClaraShell.tsx'), 'utf8');
  assert.match(shell, /<NewsletterForm variant="footer"/);
  const home = readFileSync(path.join(ROOT, 'app/routes/_index.tsx'), 'utf8');
  assert.match(home, /<NewsletterForm variant="feature"/);
  assert.doesNotMatch(home, /className="journal-teaser-card"\s+to=/);
});
