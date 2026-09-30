#!/usr/bin/env node
/* eslint-disable no-console */
// One artwork on one device template, same style as the product previews but
// with a plain dark camera opening (the lens drawing is iPhone-shaped).
//   node scripts/render-case-device.mjs <master.jpg> <PHONE-CODE> <out.jpg>
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {caseMasks} from './generate-tough-case-assets.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [master, code, out] = process.argv.slice(2);
const manifest = JSON.parse(await readFile(path.join(REPO_ROOT, 'data', 'art-tough-phone-case.json'), 'utf8'));
const phone = manifest.phones.find((p) => p.code === code);
const masks = await caseMasks(path.join(REPO_ROOT, phone.template.localFile));
const {width, height, caseMask, cameraMask} = masks;
const art = await sharp(master).resize(width, height, {fit: 'cover', kernel: 'lanczos3'}).removeAlpha().raw().toBuffer();
const edge = await sharp(caseMask, {raw: {width, height, channels: 1}}).blur(18).extractChannel(0).raw().toBuffer();
const rgba = Buffer.alloc(width * height * 4);
for (let i = 0; i < width * height; i += 1) {
  const cam = cameraMask[i] > 0;
  const shade = cam ? 1 : 1 - 0.55 * (1 - edge[i] / 255);
  for (let c = 0; c < 3; c += 1) rgba[i * 4 + c] = cam ? [28, 28, 30][c] : Math.round(art[i * 3 + c] * shade);
  rgba[i * 4 + 3] = caseMask[i];
}
await writeFile(out, await sharp(rgba, {raw: {width, height, channels: 4}}).png().toBuffer());
console.log(out, width, height);
/* eslint-enable no-console */
