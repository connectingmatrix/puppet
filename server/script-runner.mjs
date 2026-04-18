import { Browser } from '../sdk/browser.mjs';
import { readServerState } from '../sdk/server-state.mjs';
import { runWithLimit } from './time-limit.mjs';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const readConsole = (logs) => ({ error: (...args) => logs.push({ level: 'error', text: args.join(' ') }), log: (...args) => logs.push({ level: 'log', text: args.join(' ') }), warn: (...args) => logs.push({ level: 'warn', text: args.join(' ') }) });
const readRunMs = (payload) => Number(payload.timeoutMs) || 120000;
const stopRun = async (browser, control, payload) => {
    if (payload.closeOnExit) await browser.close();
    await control.stop();
};

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
    const runBody = async () => {
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
        const result = await run(payload.args || [], state.browser, control, readConsole(logs));
        const pages = await browser.sessionPages();
        const pageIds = [];
        for (const page of pages) pageIds.push(page.pageId);
        return { logs, pageIds, result, sessionId: browser.sessionId };
    };
    try {
        return await runWithLimit(runBody(), readRunMs(payload), 'script run');
    } finally {
        await runWithLimit(stopRun(browser, control, payload), 5000, 'script cleanup').catch(() => {});
    }
};
