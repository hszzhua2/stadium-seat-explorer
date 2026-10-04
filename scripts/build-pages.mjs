import { cp, mkdir, lstat, rm, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');
// Only replace this repository's generated dist directory; never follow a link.
if (dirname(output) !== resolve(root)) throw new Error('Invalid build output path.');
try {
  const stat = await lstat(output);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('dist must be a regular directory.');
  await rm(output, { recursive: true });
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(output, { recursive: true });
const files = [
  'index.html', 'src', 'samples', 'LICENSE', 'SOURCES.md', 'THIRD_PARTY_NOTICES.md',
  'vendor/three/LICENSE', 'vendor/three/build/three.module.js', 'vendor/three/build/three.core.js',
  'vendor/three/addons/controls/OrbitControls.js', 'vendor/three/addons/loaders/GLTFLoader.js',
  'vendor/three/addons/utils/BufferGeometryUtils.js',
];
for (const file of files) {
  const destination = resolve(output, file);
  await mkdir(dirname(destination), { recursive: true });
  await cp(resolve(root, file), destination, { recursive: true, dereference: false });
}
await writeFile(resolve(output, '.nojekyll'), '');
console.log('Built static GitHub Pages site in dist/ (no API key required).');
