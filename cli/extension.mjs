import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { readServer } from './options.mjs';

const configPath = new URL('../.puppet.local.json', import.meta.url);
const readSaved = async () => {
    try {
        const file = JSON.parse(await readFile(configPath, 'utf8'));
        return file.extensionUrl || '';
    } catch {
        return '';
    }
};
const saveUrl = async (extensionUrl) => writeFile(configPath, JSON.stringify({ extensionUrl }, null, 2));
const readCommand = (url) => {
    if (process.platform === 'darwin') return ['open', ['-a', 'Google Chrome', url]];
    if (process.platform === 'win32') return ['cmd', ['/c', 'start', 'chrome', url]];
    return ['xdg-open', [url]];
};

export const extensionCommand = async (args) => {
    const extensionUrl = args.find((item) => item.startsWith('chrome-extension://')) || process.env.PUPPET_EXTENSION_URL || await readSaved();
    if (!extensionUrl) throw new Error('Pass chrome-extension://.../sidepanel.html or set PUPPET_EXTENSION_URL.');
    await saveUrl(extensionUrl);
    const url = new URL(extensionUrl);
    const server = new URL(readServer(args));
    if (server.port) url.searchParams.set('port', server.port);
    url.searchParams.set('server', `${server}`);
    const command = readCommand(`${url}`);
    spawn(command[0], command[1], { stdio: 'inherit' });
    console.log(`Opened Puppet extension for ${server}.`);
};
