import assert from 'node:assert/strict';
import artCatalog from '../data/original-art-catalog.json' with {type: 'json'};
import {PHONE_CASE_DEVICE_LABELS} from '../app/lib/artExtensions.ts';
import {
  getProductDescription,
  getProductLede,
  getProductStory,
  normalizeSentenceSpacing,
} from '../app/lib/productCopy.ts';

// Malformed sentence boundaries produced by flattened HTML paragraphs
assert.equal(
  normalizeSentenceSpacing(
    'Sculptural arches and a charcoal circle held in warm, architectural balance.An original Clara Mendes composition designed to work alone.',
  ),
  'Sculptural arches and a charcoal circle held in warm, architectural balance. An original Clara Mendes composition designed to work alone.',
);
assert.equal(
  normalizeSentenceSpacing('Printed to order.The paper is heavyweight.'),
  'Printed to order. The paper is heavyweight.',
);
assert.equal(
  normalizeSentenceSpacing('Ready to hang!Order yours now.'),
  'Ready to hang! Order yours now.',
);
assert.equal(
  normalizeSentenceSpacing('Is it framed?No, prints ship unframed.'),
  'Is it framed? No, prints ship unframed.',
);

// Already-correct descriptions are untouched
assert.equal(
  normalizeSentenceSpacing('A calm piece. It works alone or in groups.'),
  'A calm piece. It works alone or in groups.',
);

// Dimensions, decimals, initials, URLs, and filenames must stay intact
assert.equal(
  normalizeSentenceSpacing('Unframed 8 × 10 in portrait print.'),
  'Unframed 8 × 10 in portrait print.',
);
assert.equal(
  normalizeSentenceSpacing('Priced at $34.00 with 1.5 cm margins.'),
  'Priced at $34.00 with 1.5 cm margins.',
);
assert.equal(
  normalizeSentenceSpacing('Ships across the U.S. only.'),
  'Ships across the U.S. only.',
);
assert.equal(
  normalizeSentenceSpacing('Visit shopclaramendes.com for details.'),
  'Visit shopclaramendes.com for details.',
);
assert.equal(
  normalizeSentenceSpacing('The file quiet-form-01.webp is the source asset.'),
  'The file quiet-form-01.webp is the source asset.',
);

// getProductDescription applies the fix end to end for art prints
const artPrint = {
  description:
    'Sculptural arches and a charcoal circle held in warm, architectural balance.An original Clara Mendes composition designed to work alone or as part of its coordinated three-print capsule.200gsm enhanced matte fine-art paper Giclée printed with archival pigment inks Unframed 8 × 10 inch portrait print Printed to order.',
  handle: 'quiet-form-i-art-print',
  productType: 'Art Prints',
  title: 'Quiet Form I Art Print',
};
const cleaned = getProductDescription(artPrint);
assert.ok(!/[a-z][.!?][A-Z]/.test(cleaned), `merged boundary in: ${cleaned}`);
assert.ok(cleaned.includes('balance. An original'));
assert.ok(cleaned.includes('8 × 10 inch'));

// The lede is the first sentence once spacing is repaired
assert.equal(
  getProductLede(artPrint),
  'Sculptural arches and a charcoal circle held in warm, architectural balance.',
);

// Supplier/internal language is still stripped
assert.equal(
  getProductDescription({
    description:
      'A woven cotton trivet. Supplier reference: CJ-12345 Materials and care details to be confirmed with the supplier.',
    handle: 'unknown-product',
    productType: 'Accents',
    title: 'Trivet',
  }),
  'A woven cotton trivet.',
);

// Phone case: curated copy exists and names every supported device, so the
// description can never drift from data/art-product-extensions.json.
const phoneCase = {
  description: 'Shopify description is overridden by curated copy.',
  handle: 'art-snap-phone-case',
  productType: 'Phone Cases',
  title: 'Art Snap Phone Case',
};
const phoneCaseDescription = getProductDescription(phoneCase);
for (const label of PHONE_CASE_DEVICE_LABELS) {
  assert.ok(
    phoneCaseDescription.includes(label),
    `phone case copy is missing device: ${label}`,
  );
}

// Spec-sheet product types (prints, cases) trim the lede to the first
// sentence; other product types keep the full description.
assert.equal(
  getProductLede(phoneCase),
  'Original Clara Mendes artwork wrapped edge to edge around a slim snap phone case.',
);
assert.equal(
  getProductLede({
    description: 'A woven cotton trivet. It works in multiples.',
    handle: 'unknown-product',
    productType: 'Accents',
    title: 'Trivet',
  }),
  'A woven cotton trivet. It works in multiples.',
);

// Every live original has one distinct, compact editorial story for the shop
// grid. Keeping the text in the catalog makes the artwork metadata the single
// source of truth and the upper bound protects the mobile two-column layout.
const stories = new Set();
for (const product of artCatalog) {
  const story = getProductStory(product);
  assert.equal(story, product.story, `story mismatch: ${product.handle}`);
  assert.match(story, /[.!?]$/, `story needs punctuation: ${product.handle}`);

  const wordCount = story.trim().split(/\s+/).length;
  assert.ok(
    wordCount >= 10 && wordCount <= 18,
    `story must be 10-18 words (${wordCount}): ${product.handle}`,
  );
  assert.ok(!stories.has(story), `duplicate story: ${product.handle}`);
  stories.add(story);
}

assert.equal(stories.size, artCatalog.length);
assert.equal(getProductStory({handle: 'not-an-original'}), null);
