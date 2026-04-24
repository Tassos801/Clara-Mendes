import {rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const includeDependencies = process.argv.includes('--deps');

const targets = [
  'dist',
  '.dev-server',
  '.react-router',
  'tsconfig.tsbuildinfo',
];

if (includeDependencies) {
  targets.push('node_modules');
}

for (const target of targets) {
  const fullPath = path.resolve(root, target);

  if (fullPath !== root && !fullPath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing to remove path outside project: ${fullPath}`);
  }

  await rm(fullPath, {force: true, recursive: true});
  console.warn(`Removed ${target}`);
}
