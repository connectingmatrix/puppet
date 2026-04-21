import { spawn } from 'node:child_process';
import { browser } from './browser.mjs';
import { readBaseUrl } from './http.mjs';
import { readServerState } from './server-state.mjs';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const readPort = (baseUrl, options = {}) => `${options.port || new URL(baseUrl).port || '4017'}`;
const readResult = (baseUrl, port, state) => {
    const item = { baseUrl, browser: state.status === 'connected' ? browser : null, extensionUrl: state.extensionUrl, instanceId: state.instanceId, port, status: state.status };
    browser.setInstanceId(state.instanceId || '');
    globalThis.browser = item.browser;
    return item;
};
const readState = async (baseUrl, status = '') => {
    const state = await readServerState(baseUrl);
    if (!status || state.status === 'connected') return state;
    return { ...state, status };
};
const startProcess = (port) => {
    const child = spawn('node', ['server/index.mjs'], { cwd: new URL('..', import.meta.url), detached: true, env: { ...process.env, PORT: port }, stdio: 'ignore' });
    child.unref();
    return child;
};

export class LocalServer {
    constructor(baseUrl = '') {
        this.baseUrl = readBaseUrl(baseUrl);
        this.process = null;
    }
    async start(options = {}) {
        const port = readPort(this.baseUrl, options);
        const baseUrl = `http://127.0.0.1:${port}`;
        if (this.baseUrl !== baseUrl && this.process) this.stop();
        this.baseUrl = baseUrl;
        browser.setBaseUrl(baseUrl);
        globalThis.browser = null;
        try {
            return readResult(baseUrl, port, await readState(baseUrl));
        } catch {}
        this.process = startProcess(port);
        const endsAt = Date.now() + 15000;
        while (Date.now() < endsAt) {
            try {
                return readResult(baseUrl, port, await readState(baseUrl, 'server_started_no_instance'));
            } catch {}
            await wait(200);
        }
        throw new Error(`Timed out waiting for ${this.baseUrl} to start.`);
    }
    stop(options = {}) {
        delete globalThis.browser;
        if (!(options.force || options.kill)) return;
        if (!this.process) return;
        this.process.kill();
        this.process = null;
    }
}

export const server = new LocalServer();
