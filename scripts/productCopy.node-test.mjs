import assert from 'node:assert/strict';
import {
  getProductDescription,
  getProductLede,
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
