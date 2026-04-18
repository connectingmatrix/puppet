import { Browser } from '../sdk/browser.mjs';
import { readServerState } from '../sdk/server-state.mjs';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const readConsole = (logs) => ({ error: (...args) => logs.push({ level: 'error', text: args.join(' ') }), log: (...args) => logs.push({ level: 'log', text: args.join(' ') }), warn: (...args) => logs.push({ level: 'warn', text: args.join(' ') }) });

export const runScript = async (baseUrl, payload) => {
    const browser = new Browser(baseUrl);
    const logs = [];
    const control = {
        start: async (options = {}) => {
            const port = `${options.port || new URL(browser.baseUrl).port || '4017'}`;
            const nextBaseUrl = `http://127.0.0.1:${port}`;
            browser.setBaseUrl(nextBaseUrl);
            const state = await readServerState(nextBaseUrl);
            const result = { baseUrl: nextBaseUrl, browser: state.status === 'connected' ? browser : null, extensionUrl: state.extensionUrl, instanceId: state.instanceId, port, status: state.status };
            globalThis.browser = result.browser;
            return result;
        },
        stop: async () => (delete globalThis.browser, null)
    };
    browser.sessionId = payload.sessionId || '';
    const state = await control.start(payload);
    if (payload.pages && payload.pages.length) {
        let index = 0;
        for (const page of payload.pages) {
            await browser.newPage(page.url, { ...page, newTab: Boolean(page.newTab) || index > 0 });
            index += 1;
        }
    }
    if (!(payload.pages && payload.pages.length) && browser.sessionId) browser.live.open(browser.sessionId);
    const run = new AsyncFunction('args', 'browser', 'server', 'console', payload.script || '');
    try {
        const result = await Promise.race([run(payload.args || [], state.browser, control, readConsole(logs)), new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out while running the script.')), payload.timeoutMs || 120000))]);
        const pages = await browser.sessionPages();
        if (payload.closeOnExit) await browser.close();
        await control.stop();
        const pageIds = [];
        for (const page of pages) pageIds.push(page.pageId);
        return { logs, pageIds, result, sessionId: browser.sessionId };
    } catch (error) {
        if (payload.closeOnExit) await browser.close();
        await control.stop();
        throw error;
    }
};
