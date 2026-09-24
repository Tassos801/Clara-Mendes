import assert from 'node:assert/strict';
import test from 'node:test';
import {localToUtc, tzOffsetMinutes} from '../app/lib/sky/time.ts';

test('local wall-clock times convert to UTC across DST and zones', () => {
  assert.equal(localToUtc('2019-06-14', '22:00', 'Europe/Paris').toISOString(), '2019-06-14T20:00:00.000Z');
  assert.equal(localToUtc('2019-01-14', '22:00', 'Europe/Paris').toISOString(), '2019-01-14T21:00:00.000Z');
  assert.equal(localToUtc('2024-01-10', '06:00', 'Australia/Sydney').toISOString(), '2024-01-09T19:00:00.000Z');
  assert.equal(tzOffsetMinutes(Date.UTC(2023, 2, 26, 1, 30), 'Europe/Lisbon'), 60);
  assert.equal(tzOffsetMinutes(Date.UTC(2023, 2, 26, 0, 30), 'Europe/Lisbon'), 0);
});

test('an unknown zone still throws', () => {
  assert.throws(() => tzOffsetMinutes(0, 'Mars/Olympus'), RangeError);
});
