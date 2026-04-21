import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { appendFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import server from '../sdk/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = process.env.PUPPET_TEST_PORT || '4017';
const baseUrl = `http://127.0.0.1:${port}`;
const tmp = path.join(root, '.tmp');
const profile = path.join(tmp, 'puppet-headless-profile');
const dist = path.join(root, 'dist');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const chromePaths = [
  process.env.CHROME_PATH || '',
  '',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium'
];

const readChromeForTesting = () => {
  const base = path.join(tmp, 'browsers', 'chrome');
  const versions = existsSync(base) ? readdirSync(base) : [];
  for (const version of versions) {
    const folder = path.join(base, version);
    const items = [
      'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
      'chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
      'chrome-linux64/chrome'
    ];
    for (const item of items) if (existsSync(path.join(folder, item))) return path.join(folder, item);
  }
  return '';
};
const readChrome = () => {
  chromePaths[1] = readChromeForTesting();
  for (const item of chromePaths) if (item && existsSync(item)) return item;
  throw new Error('Chrome binary not found. Set CHROME_PATH or install Chrome for Testing under .tmp/browsers.');
};
const readExtensionId = async () => {
  const manifest = JSON.parse(await readFile(path.join(dist, 'manifest.json'), 'utf8'));
  const hash = createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest();
  let id = '';
  for (const byte of hash.subarray(0, 16)) id += String.fromCharCode(97 + (byte >> 4)) + String.fromCharCode(97 + (byte & 15));
  return id;
};
const readInstances = async () => {
  const response = await fetch(`${baseUrl}/api/instances`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.items || [];
};
const waitForInstance = async (known) => {
  const endsAt = Date.now() + 25000;
  while (Date.now() < endsAt) {
    for (const item of await readInstances()) if (!known.has(item.id)) return item;
    await wait(250);
  }
  throw new Error('Headless Chrome loaded the extension, but no Puppet instance connected.');
};
const runSuite = (instanceId) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['examples/sample-suite.mjs'], {
    cwd: root,
    env: { ...process.env, PUPPET_TEST_INSTANCE_ID: instanceId, PUPPET_TEST_PORT: port },
    stdio: 'inherit'
  });
  child.on('error', reject);
  child.on('exit', (code) => code ? reject(new Error(`Sample suite exited with ${code}.`)) : resolve());
});

await server.start({ port });
const known = new Set((await readInstances()).map((item) => item.id));
const extensionId = await readExtensionId();
await Promise.all([rm(profile, { force: true, recursive: true }), rm(path.join(tmp, 'puppet-headless-chrome.log'), { force: true })]);
const chrome = spawn(readChrome(), [
  '--headless=new',
  '--enable-extensions',
  `--user-data-dir=${profile}`,
  `--load-extension=${dist}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  `chrome-extension://${extensionId}/sidepanel.html`
], { stdio: ['ignore', 'ignore', 'pipe'] });
chrome.stderr.on('data', (chunk) => void appendFile(path.join(tmp, 'puppet-headless-chrome.log'), chunk));

try {
  const instance = await waitForInstance(known);
  await runSuite(instance.id);
} finally {
  chrome.kill('SIGTERM');
  await wait(500);
  if (!chrome.killed) chrome.kill('SIGKILL');
  server.stop({ force: true });
}
