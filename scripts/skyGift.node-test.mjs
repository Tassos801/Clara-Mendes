import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {signSkyCartLines} from '../app/lib/sky/cartLines.server.ts';
import {buildProdigiOrderFromShopify} from '../app/lib/sky/fulfilment.ts';
import {
  GIFT_NOTE_KEY,
  GIFT_SIG_KEY,
  giftNoteCanonical,
  normaliseGiftNote,
  parseSlipCanonical,
  slipCanonical,
} from '../app/lib/sky/gift.ts';
import {
  toNatalCartAttributes,
  validateNatalParams,
} from '../app/lib/natal/params.ts';
import {toCartAttributes, validateSkyParams} from '../app/lib/sky/params.ts';
import {
  decodeCanonicalToken,
  signCanonical,
  signSkyParams,
} from '../app/lib/sky/sign.server.ts';
import {
  renderGiftSlipPdf,
  SLIP_PAGE,
  wrapLines,
} from '../app/lib/sky/slip.server.ts';

const SECRET = 'test-secret-at-least-32-characters-long!!';
const ORIGIN = 'https://shopclaramendes.com';
const sky = validateSkyParams({
  date: '2019-06-14',
  time: '22:00',
  lat: 48.8566,
  lon: 2.3522,
  tz: 'Europe/Paris',
  place: 'Paris, France',
  title: 'The night we met',
  theme: 'linen',
}).params;
const natal = validateNatalParams({
  name: 'Amélie Nováková',
  date: '2026-05-14',
  time: '07:32',
  lat: 52.52,
  lon: 13.405,
  tz: 'Europe/Berlin',
  place: 'Berlin, Germany',
  details: '3.4 kg · 51 cm',
  theme: 'linen',
}).params;
const fonts = {
  regular: new Uint8Array(readFileSync('public/fonts/EBGaramond-Regular.ttf')),
  italic: new Uint8Array(readFileSync('public/fonts/EBGaramond-Italic.ttf')),
};
const createdAt = new Date('2026-09-02T09:00:00Z');
const NOTE = 'Happy birthday, Anna.\nThe sky the night we met — with love, T.';

const attr = (key) => (a) => a.key === key;

test('a note is trimmed, tamed and capped before it is signed', () => {
  assert.equal(
    normaliseGiftNote('  Happy   birthday,\r\n\r\n  Anna!  '),
    'Happy birthday,\nAnna!',
  );
  assert.equal(normaliseGiftNote('tab\there\u0007bell\u0000 '), 'tab herebell');
  assert.equal(normaliseGiftNote('1\n2\n3\n4\n5\n6'), '1\n2\n3\n4');
  assert.equal([...normaliseGiftNote('é'.repeat(300))].length, 200);
  assert.equal(normaliseGiftNote('   \n\n  '), '');
  assert.equal(normaliseGiftNote(undefined), '');
  assert.equal(
    normaliseGiftNote(NOTE),
    NOTE,
    'a clean note is its own normal form',
  );
});

test('the cart action signs the note on personalised lines only', async () => {
  const lines = [
    {
      merchandiseId: 'plain',
      quantity: 1,
      attributes: [{key: GIFT_NOTE_KEY, value: 'x'}],
    },
    {
      merchandiseId: 'sky',
      quantity: 1,
      attributes: [
        ...toCartAttributes(sky),
        {key: GIFT_NOTE_KEY, value: '  Happy birthday,\n\n Anna!  '},
        {key: GIFT_SIG_KEY, value: 'forged'},
      ],
    },
    {
      merchandiseId: 'natal',
      quantity: 1,
      attributes: [
        ...toNatalCartAttributes(natal),
        {key: GIFT_NOTE_KEY, value: 'Welcome, little one.'},
      ],
    },
    {
      merchandiseId: 'sky-no-note',
      quantity: 1,
      attributes: [
        ...toCartAttributes(sky),
        {key: GIFT_NOTE_KEY, value: '   '},
      ],
    },
  ];
  const result = await signSkyCartLines(lines, SECRET);
  assert.equal(result.ok, true);
  const [plain, skyLine, natalLine, blank] = result.lines;
  assert.deepEqual(
    plain.attributes,
    [{key: GIFT_NOTE_KEY, value: 'x'}],
    'plain lines pass through',
  );

  const note = skyLine.attributes.find(attr(GIFT_NOTE_KEY)).value;
  const sig = skyLine.attributes.find(attr(GIFT_SIG_KEY)).value;
  assert.equal(note, 'Happy birthday,\nAnna!');
  assert.notEqual(sig, 'forged');
  assert.equal(sig, await signCanonical(giftNoteCanonical(note), SECRET));
  assert.equal(skyLine.attributes.filter(attr(GIFT_SIG_KEY)).length, 1);
  assert.ok(
    skyLine.attributes.find(attr('_sig')),
    'the sky signature is still there',
  );

  assert.equal(
    natalLine.attributes.find(attr(GIFT_NOTE_KEY)).value,
    'Welcome, little one.',
  );
  assert.ok(natalLine.attributes.find(attr(GIFT_SIG_KEY)));
  assert.ok(natalLine.attributes.find(attr('_kind')));

  assert.equal(
    blank.attributes.find(attr(GIFT_NOTE_KEY)),
    undefined,
    'a blank note is dropped',
  );
  assert.equal(blank.attributes.find(attr(GIFT_SIG_KEY)), undefined);
});

async function paidOrder(giftLines) {
  const sig = await signSkyParams(sky, SECRET);
  const base = toCartAttributes(sky, sig).map(({key, value}) => ({
    name: key,
    value,
  }));
  const withNote = async (note, tamper) => [
    ...base,
    {name: GIFT_NOTE_KEY, value: note},
    {
      name: GIFT_SIG_KEY,
      value: tamper ?? (await signCanonical(giftNoteCanonical(note), SECRET)),
    },
  ];
  const line_items = [];
  let id = 1;
  for (const spec of giftLines) {
    line_items.push({
      id: id++,
      sku: 'CM-SKY-8X10-NAT',
      quantity: 1,
      properties: spec === null ? base : await withNote(spec.note, spec.tamper),
    });
  }
  return {
    id: 7001,
    name: '#1077',
    email: 'anna@example.com',
    phone: null,
    shipping_address: {
      name: 'Anna Beispiel',
      address1: 'Musterstraße 1',
      address2: '',
      city: 'Berlin',
      province: null,
      zip: '10115',
      country_code: 'DE',
      phone: null,
    },
    line_items,
  };
}

test('the webhook turns a signed note into a Prodigi packing slip', async () => {
  const result = await buildProdigiOrderFromShopify(
    await paidOrder([{note: NOTE}]),
    {
      secret: SECRET,
      origin: ORIGIN,
    },
  );
  assert.equal(result.kind, 'order');
  const url = result.payload.packingSlip?.url;
  assert.match(
    url,
    /^https:\/\/shopclaramendes\.com\/api\/sky-slip\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.pdf$/,
  );
  const token = url.split('/api/sky-slip/')[1].replace(/\.pdf$/, '');
  const decoded = await decodeCanonicalToken(token, SECRET);
  assert.equal(decoded.ok, true);
  const slip = parseSlipCanonical(decoded.canonical);
  assert.deepEqual(slip, {ok: true, orderName: '#1077', note: NOTE});
  assert.equal(result.payload.items.length, 1, 'the print itself is unchanged');
});

test('notes are deduplicated across lines, absent without a note, fatal when tampered', async () => {
  const twice = await buildProdigiOrderFromShopify(
    await paidOrder([{note: NOTE}, {note: NOTE}, {note: 'Second card.'}]),
    {secret: SECRET, origin: ORIGIN},
  );
  assert.equal(twice.kind, 'order');
  const token = twice.payload.packingSlip.url
    .split('/api/sky-slip/')[1]
    .replace(/\.pdf$/, '');
  const slip = parseSlipCanonical(
    (await decodeCanonicalToken(token, SECRET)).canonical,
  );
  assert.equal(slip.note, `${NOTE}\nSecond card.`);

  const none = await buildProdigiOrderFromShopify(await paidOrder([null]), {
    secret: SECRET,
    origin: ORIGIN,
  });
  assert.equal(none.kind, 'order');
  assert.equal('packingSlip' in none.payload, false);

  const tampered = await buildProdigiOrderFromShopify(
    await paidOrder([{note: 'I hacked this', tamper: 'nope'}]),
    {secret: SECRET, origin: ORIGIN},
  );
  assert.equal(tampered.kind, 'problem');
  assert.match(tampered.reason, /gift note/i);

  const unsigned = await paidOrder([{note: 'x'}]);
  unsigned.line_items[0].properties = unsigned.line_items[0].properties.filter(
    (p) => p.name !== GIFT_SIG_KEY,
  );
  const missing = await buildProdigiOrderFromShopify(unsigned, {
    secret: SECRET,
    origin: ORIGIN,
  });
  assert.equal(missing.kind, 'problem');
});

test('slip tokens are canonical and refuse foreign or incomplete bodies', () => {
  const canonical = slipCanonical({orderName: '#1077', note: NOTE});
  assert.deepEqual(parseSlipCanonical(canonical), {
    ok: true,
    orderName: '#1077',
    note: NOTE,
  });
  assert.equal(parseSlipCanonical('v=1&date=2019-06-14').ok, false);
  assert.equal(parseSlipCanonical('slip=1&order=%231077').ok, false);
  assert.equal(
    parseSlipCanonical('slip=1&note=hi&order=%231077').ok,
    false,
    'field order is fixed',
  );
});

test('the slip is one A4 page in EB Garamond and copes with long words', async () => {
  const pdf = await renderGiftSlipPdf({
    note: NOTE,
    orderName: '#1077',
    fonts,
    createdAt,
  });
  const text = Buffer.from(pdf).toString('latin1');
  assert.match(
    text,
    new RegExp(
      `/MediaBox \\[ ?0 0 ${SLIP_PAGE.width} ${SLIP_PAGE.height} ?\\]`,
    ),
  );
  assert.match(text, /EBGaramond/);
  assert.doesNotMatch(text, /\/DCTDecode/, 'no images on the slip');
  assert.ok(
    pdf.byteLength < 2 * 1024 * 1024,
    `slip is ${pdf.byteLength} bytes`,
  );
  const again = await renderGiftSlipPdf({
    note: NOTE,
    orderName: '#1077',
    fonts,
    createdAt,
  });
  assert.equal(
    Buffer.compare(Buffer.from(pdf), Buffer.from(again)),
    0,
    'deterministic',
  );

  const shouty = normaliseGiftNote(`${'W'.repeat(120)} ${'M'.repeat(80)}`);
  const long = await renderGiftSlipPdf({
    note: shouty,
    orderName: '#1077',
    fonts,
    createdAt,
  });
  assert.ok(long.byteLength > 50 * 1024);
});

test('word wrap splits on spaces first and by glyph only when it must', () => {
  const measure = (t) => [...t].length * 10;
  assert.deepEqual(wrapLines('the quick brown fox', measure, 100), [
    'the quick',
    'brown fox',
  ]);
  assert.deepEqual(wrapLines('a\nb', measure, 100), ['a', 'b']);
  assert.deepEqual(wrapLines('abcdefghijkl xy', measure, 50), [
    'abcde',
    'fghij',
    'kl xy',
  ]);
});
