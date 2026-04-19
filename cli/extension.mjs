import { spawn } from 'node:child_process';
import { readConfig, writeConfig } from './config.mjs';
import { readServer } from './options.mjs';

const readCommand = (url) => {
    if (process.platform === 'darwin') return ['open', ['-a', 'Google Chrome', url]];
    if (process.platform === 'win32') return ['cmd', ['/c', 'start', 'chrome', url]];
    return ['xdg-open', [url]];
};

export const extensionCommand = async (args) => {
    const config = await readConfig();
    const extensionUrl = args.find((item) => item.startsWith('chrome-extension://')) || process.env.PUPPET_EXTENSION_URL || config.extensionUrl || '';
    if (!extensionUrl) throw new Error('Run puppet configure chrome-extension://.../sidepanel.html first.');
    await writeConfig({ ...config, extensionUrl, updatedAt: Date.now() });
    const url = new URL(extensionUrl);
    const server = new URL(readServer(args));
    if (server.port) url.searchParams.set('port', server.port);
    url.searchParams.set('server', `${server}`);
    const command = readCommand(`${url}`);
    spawn(command[0], command[1], { stdio: 'inherit' });
    console.log(`Opened Puppet extension for ${server}.`);
};
