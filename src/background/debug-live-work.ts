import { emitLive } from '@/src/background/live-event-work';
import { patchLivePage, readTabPage } from '@/src/background/page-store';

const pending = new Map<number, number>();
let ready = false;

const dropPending = (tabId: number) => pending.set(tabId, Math.max((pending.get(tabId) || 1) - 1, 0));
const readArgs = (args = []) => {
    const items = [];
    for (const item of args) items.push(item.value || item.value === '' || item.value === 0 || item.value === false ? item.value : item.unserializableValue || item.description || '');
    return items;
};
const readLocation = (frame = {}) => ({ columnNumber: frame.columnNumber || 0, lineNumber: frame.lineNumber || 0, url: frame.url || '' });
const readSession = (tabId: number) => {
    const page = readTabPage(tabId);
    return { page, sessionId: page ? page.sessionId : '' };
};

export const ensureDebugEvents = () => {
    if (ready) return;
    ready = true;
    chrome.debugger.onEvent.addListener((source, method, params) => {
        const tabId = source.tabId || 0;
        const state = readSession(tabId);
        if (method === 'Network.requestWillBeSent') pending.set(tabId, (pending.get(tabId) || 0) + 1);
        if (method === 'Network.loadingFinished' || method === 'Network.loadingFailed') dropPending(tabId);
        if (method === 'Runtime.consoleAPICalled' && state.page) {
            const args = readArgs(params.args || []);
            emitLive('console', { args, at: Date.now(), location: readLocation(params.stackTrace && params.stackTrace.callFrames && params.stackTrace.callFrames[0] || {}), pageId: state.page.pageId, source: 'console', text: args.join(' ').trim(), type: params.type || 'log' }, state.sessionId);
        }
        if (method === 'Runtime.exceptionThrown' && state.page) {
            const detail = params.exceptionDetails || {};
            const exception = detail.exception || {};
            const text = `${exception.description || exception.value || detail.text || 'Uncaught exception'}`.trim();
            const data = { args: [text], at: Date.now(), location: readLocation(detail.stackTrace && detail.stackTrace.callFrames && detail.stackTrace.callFrames[0] || {}), pageId: state.page.pageId, source: 'pageerror', text, type: 'error' };
            emitLive('console', data, state.sessionId);
            emitLive('pageerror', data, state.sessionId);
        }
        if (method === 'Page.frameNavigated' && state.page && params.frame && !params.frame.parentId) {
            patchLivePage(state.page.pageId, { title: params.frame.name || state.page.title, url: params.frame.url || state.page.url });
            emitLive('navigation', { pageId: state.page.pageId, url: params.frame.url || state.page.url }, state.sessionId);
        }
    });
};

export const waitForNetworkIdle = (tabId: number, limit: number, idleMs: number, timeoutMs: number) => new Promise<void>((resolve, reject) => {
    const endsAt = Date.now() + timeoutMs;
    let quietAt = 0;
    const tick = () => {
        if ((pending.get(tabId) || 0) <= limit) quietAt = quietAt || Date.now();
        if ((pending.get(tabId) || 0) > limit) quietAt = 0;
        if (quietAt && Date.now() - quietAt >= idleMs) return resolve();
        if (Date.now() >= endsAt) return reject(new Error('Timed out waiting for network idle.'));
        setTimeout(tick, 150);
    };
    tick();
});
