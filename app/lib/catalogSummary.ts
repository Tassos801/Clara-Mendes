// Relative imports keep this module loadable by the plain-Node test runner.
import artCatalog from '../../data/original-art-catalog.json' with {type: 'json'};
import {listShopCapsules} from './capsules.ts';
import {releasedPrintHandles} from './printCatalog.ts';

const NUMBER_WORDS = [
  'no',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty'];

/** "nineteen", "twenty-four"; digits beyond fifty-nine. */
export function countWord(count: number) {
  if (count < NUMBER_WORDS.length) return NUMBER_WORDS[count];
  const tens = TENS[Math.floor(count / 10)];
  if (!tens) return String(count);
  const units = count % 10;
  return units ? `${tens}-${NUMBER_WORDS[units]}` : tens;
}

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Catalogue-wide counts for storefront copy, derived from the data files so
 * a released print-catalog collection updates every "N works" line at once.
 */
export function catalogCounts() {
  return {
    capsules: listShopCapsules().length,
    works: artCatalog.length + releasedPrintHandles().length,
  };
}
