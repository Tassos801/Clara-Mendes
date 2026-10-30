import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {LOGO_COLORS} from '../app/content/logo.ts';
import {organizationSchema} from '../app/lib/seo.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAPER = [0xfb, 0xfa, 0xf6];

test('the default share card is a 1200x630 JPEG', async () => {
  const meta = await sharp(
    path.join(ROOT, 'public/images/share/og-default.jpg'),
  ).metadata();
  assert.equal(meta.format, 'jpeg');
  assert.equal(`${meta.width}x${meta.height}`, '1200x630');
});

test('the Organization logo is a wide PNG on paper', async () => {
  const file = path.join(ROOT, 'public/images/brand/clara-mendes-logo.png');
  const meta = await sharp(file).metadata();
  assert.equal(meta.format, 'png');
  assert.ok(meta.width >= 1100, `${meta.width} px wide`);
  const {data} = await sharp(file)
    .removeAlpha()
    .extract({left: 0, top: 0, width: 1, height: 1})
    .raw()
    .toBuffer({resolveWithObject: true});
  assert.deepEqual([...data], PAPER);
});

test('the SVG favicon draws the mark on the oat tile', () => {
  const svg = readFileSync(path.join(ROOT, 'app/assets/favicon.svg'), 'utf8');
  assert.equal(svg.match(/<rect\b/g)?.length, 7, 'tile + six mark rectangles');
  assert.match(svg, /rx="6" fill="#F4F0E8"/);
  for (const colour of [LOGO_COLORS.red, LOGO_COLORS.blue, LOGO_COLORS.yellow]) {
    assert.ok(svg.includes(colour), colour);
  }
  assert.ok(svg.includes('#26231F'), 'site ink');
  assert.ok(!svg.includes(LOGO_COLORS.ink), "not the file's black");
});

test('the Organization structured data names the logo', () => {
  const source = readFileSync(path.join(ROOT, 'app/lib/seo.ts'), 'utf8');
  assert.match(source, /\blogo:/);
  assert.equal(
    organizationSchema('https://shopclaramendes.com/').logo,
    'https://shopclaramendes.com/images/brand/clara-mendes-logo.png',
  );
});
