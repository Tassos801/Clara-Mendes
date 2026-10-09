import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {
  APPLE_TOUCH_ICON,
  FAVICON_ICO,
  MANIFEST_PATH,
  webManifest,
} from '../app/lib/webManifest.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('manifest opens the shop full-screen from the home screen', () => {
  const manifest = webManifest();
  assert.equal(manifest.name, 'Clara Mendes');
  assert.ok(manifest.short_name.length <= 12, 'iOS truncates longer names');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'any'));
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'));
});

test('every manifest icon and the Apple touch icon exist at their stated size', async () => {
  const icons = [
    ...webManifest().icons,
    {src: APPLE_TOUCH_ICON, sizes: '180x180'},
  ];
  for (const icon of icons) {
    const meta = await sharp(path.join(ROOT, 'public', icon.src)).metadata();
    assert.equal(`${meta.width}x${meta.height}`, icon.sizes, icon.src);
    assert.equal(meta.format, 'png', icon.src);
  }
});

test('the root document links the manifest and the touch icon', () => {
  const root = readFileSync(path.join(ROOT, 'app/root.tsx'), 'utf8');
  assert.match(root, /rel: 'manifest', href: MANIFEST_PATH/);
  assert.match(root, /rel: 'apple-touch-icon', href: APPLE_TOUCH_ICON/);
  assert.match(root, /name="apple-mobile-web-app-title"/);
  assert.equal(MANIFEST_PATH, '/manifest.webmanifest');
  const route = readFileSync(
    path.join(ROOT, 'app/routes/[manifest.webmanifest].tsx'),
    'utf8',
  );
  assert.match(route, /application\/manifest\+json/);
});

test('favicon.ico holds the monogram at 16, 32 and 48 px', async () => {
  const ico = readFileSync(path.join(ROOT, 'public', FAVICON_ICO));
  assert.equal(ico.readUInt16LE(2), 1, 'ICO type');
  const sizes = [];
  for (let i = 0; i < ico.readUInt16LE(4); i++) {
    const entry = 6 + 16 * i;
    const png = ico.subarray(
      ico.readUInt32LE(entry + 12),
      ico.readUInt32LE(entry + 12) + ico.readUInt32LE(entry + 8),
    );
    const meta = await sharp(png).metadata();
    assert.equal(meta.format, 'png');
    assert.equal(meta.width, ico[entry]);
    sizes.push(meta.width);
  }
  assert.deepEqual(sizes, [16, 32, 48]);
  const root = readFileSync(path.join(ROOT, 'app/root.tsx'), 'utf8');
  assert.match(root, /rel: 'icon', href: FAVICON_ICO, sizes: '32x32'/);
  assert.match(root, /rel: 'icon', type: 'image\/svg\+xml', href: favicon/);
});
