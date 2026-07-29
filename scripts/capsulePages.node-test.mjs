import assert from 'node:assert/strict';
import {CAPSULES} from '../app/lib/capsules.ts';
import {
  capsulePagePath,
  getCapsulePage,
  listCapsulePages,
} from '../app/lib/capsulePages.ts';

// One landing page per capsule, matched by slug — a missing entry would
// silently 404 that capsule's URL while the sitemap still advertises it.
const pages = listCapsulePages();
assert.equal(pages.length, 5);
assert.deepEqual(
  pages.map((page) => page.slug).sort(),
  CAPSULES.map((capsule) => capsule.slug).sort(),
);

// SERP budget: buildSeoMeta appends " | Clara Mendes" (15 chars) and
// truncates titles at 62 — a longer seoTitle would render with "..." in
// search results. Descriptions truncate at 155.
for (const page of pages) {
  assert.ok(
    page.seoTitle.length <= 47,
    `${page.slug} seoTitle truncates in SERP: ${page.seoTitle.length} chars`,
  );
  assert.ok(
    page.metaDescription.length >= 120 && page.metaDescription.length <= 155,
    `${page.slug} metaDescription is ${page.metaDescription.length} chars`,
  );
  assert.ok(page.seoTitle.toLowerCase().includes('print'), page.slug);
}

// Editorial content is substantial, on-topic, and unique per capsule —
// these pages exist to give crawlers real copy, not thin shells.
const editorials = new Set();
for (const page of pages) {
  assert.equal(page.editorial.length, 2, page.slug);
  const combined = page.editorial.join(' ');
  assert.ok(combined.length >= 500, `${page.slug} editorial too thin`);
  assert.ok(combined.includes(page.capsule.title), page.slug);
  assert.ok(combined.toLowerCase().includes('giclée'), page.slug);
  assert.ok(
    combined.includes('200gsm Enhanced Matte Art paper'),
    `${page.slug} must state the real material spec`,
  );
  assert.ok(page.pdpBlurb.includes(page.capsule.title), page.slug);
  editorials.add(combined);
}
assert.equal(editorials.size, 5, 'editorials must be unique per capsule');

// Lookup is tolerant and safe
assert.equal(getCapsulePage(' Quiet-Form ')?.slug, 'quiet-form');
assert.equal(getCapsulePage('not-a-capsule'), null);
assert.equal(getCapsulePage(null), null);
assert.equal(capsulePagePath('neo-deco'), '/collections/neo-deco');
