import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const required = [
  'artifacts/puppet.crx',
  'dist/background.js',
  'dist/manifest.json',
  'dist/sidepanel.html',
  'dist/sidepanel.js',
  'server/index.mjs',
  'sdk/index.mjs',
  'bin/puppet.mjs'
];

for (const item of required) {
  if (!existsSync(join(root, item))) throw new Error(`Missing packaged Puppet file: ${item}`);
}
