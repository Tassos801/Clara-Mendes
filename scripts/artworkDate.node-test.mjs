import assert from 'node:assert/strict';
import test from 'node:test';
import artRegistry from '../data/art-registry.json' with {type: 'json'};
import {displayArtworkDate} from '../app/lib/artRegistry.ts';

test('museum dates show one circa form and British day-month order', () => {
  assert.equal(displayArtworkDate('ca. 1830–32'), 'c. 1830–32');
  assert.equal(displayArtworkDate('c 1936'), 'c. 1936');
  assert.equal(displayArtworkDate('c. 1907'), 'c. 1907');
  assert.equal(displayArtworkDate('c. 1915–26'), 'c. 1915–26');
  assert.equal(displayArtworkDate('snake year 1857'), '1857');
  assert.equal(displayArtworkDate('January 18, 1911'), '18 January 1911');
  assert.equal(displayArtworkDate('1858'), '1858');
  assert.equal(displayArtworkDate('1940–41'), '1940–41');
  // A cloth the museum dates by century (Cleveland's Honeysuckle).
  assert.equal(displayArtworkDate('Early 20th century'), 'early 20th century');
  assert.equal(displayArtworkDate('20th century'), '20th century');
  assert.equal(displayArtworkDate(''), '');
  assert.equal(displayArtworkDate(undefined), null);
});

test('every registry date displays in a house form', () => {
  const dates = [];
  const walk = (node) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object')
      for (const [key, value] of Object.entries(node))
        key === 'date' && typeof value === 'string' ? dates.push(value) : walk(value);
  };
  walk(artRegistry);
  assert.ok(dates.length > 20);
  for (const date of dates) {
    assert.match(
      displayArtworkDate(date),
      /^(?:(c\. )?(\d{1,2} [A-Z][a-z]+ )?\d{4}(–\d{2,4})?|(?:(?:early|mid|late) )?\d{1,2}(?:st|nd|rd|th) century)$/,
      date,
    );
  }
});
