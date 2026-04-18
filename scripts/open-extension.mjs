import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const configPath = new URL('../.puppet.local.json', import.meta.url);
const serverUrl = process.env.PUPPET_SERVER_URL || 'http://127.0.0.1:4017';

const readSavedUrl = async () => {
    try {
        const file = JSON.parse(await readFile(configPath, 'utf8'));
        return file.extensionUrl || '';
    } catch {
        return '';
    }
};

const saveUrl = async (extensionUrl) => {
    await writeFile(configPath, JSON.stringify({ extensionUrl }, null, 2));
};
const readOpenUrl = (extensionUrl) => {
    const url = new URL(extensionUrl);
    const server = new URL(serverUrl);
    if (server.port) url.searchParams.set('port', server.port);
    url.searchParams.set('server', serverUrl);
    return `${url}`;
};

const readServerUrl = async () => {
    try {
        const response = await fetch(`${serverUrl}/api/instances`);
        if (!response.ok) return '';
        const data = await response.json();
        const first = data.items && data.items[0] || null;
        return first && first.extensionUrl || '';
    } catch {
        return '';
    }
};

const readConnectedInstance = async () => {
    try {
        const response = await fetch(`${serverUrl}/api/instances`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.items && data.items.find((item) => item.status === 'connected') || null;
    } catch {
        return null;
    }
};

const readExtensionUrl = async () => {
    const provided = process.argv[2] || process.env.PUPPET_EXTENSION_URL || '';
    if (provided) {
        await saveUrl(provided);
        return provided;
    }
    const fromServer = await readServerUrl();
    if (fromServer) {
        await saveUrl(fromServer);
        return fromServer;
    }
    return readSavedUrl();
};

const readCommand = (extensionUrl) => {
    if (process.platform === 'darwin') return ['open', ['-a', 'Google Chrome', extensionUrl]];
    if (process.platform === 'win32') return ['cmd', ['/c', 'start', 'chrome', extensionUrl]];
    return ['xdg-open', [extensionUrl]];
};

const extensionUrl = await readExtensionUrl();
if (!extensionUrl) {
    console.error('No extension URL is known. Pass it as the first argument or set PUPPET_EXTENSION_URL.');
    process.exit(1);
}

const connected = process.env.PUPPET_OPEN_ALWAYS ? null : await readConnectedInstance();
if (connected) {
    await saveUrl(connected.extensionUrl || extensionUrl);
    console.log(`Puppet extension already connected for ${serverUrl}.`);
    process.exit(0);
}

const [command, args] = readCommand(readOpenUrl(extensionUrl));
spawn(command, args, { stdio: 'inherit' });
