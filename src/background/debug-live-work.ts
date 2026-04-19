import { emitLive } from '@/src/background/live-event-work';
import { patchLivePage, readTabPage } from '@/src/background/page-store';

const pending = new Map<number, Map<string, Record<string, unknown>>>();
let ready = false;

const readItems = (tabId: number) => pending.get(tabId) || new Map<string, Record<string, unknown>>();
const dropPending = (tabId: number, requestId = '') => {
    const items = readItems(tabId);
    items.delete(requestId);
    pending.set(tabId, items);
};
const readSession = (tabId: number) => {
    const page = readTabPage(tabId);
    return { page, sessionId: page ? page.sessionId : '' };
};
const savePending = (tabId: number, params) => {
    const request = params.request || {};
    const items = readItems(tabId);
    items.set(`${params.requestId || ''}`, { at: Date.now(), method: request.method || '', type: params.type || '', url: request.url || '' });
    pending.set(tabId, items);
};
export const clearPendingRequests = (tabId: number) => pending.set(tabId, new Map<string, Record<string, unknown>>());
export const readPendingRequests = (tabId: number, limit = 8) => {
    const out = [];
    for (const item of readItems(tabId).values()) {
        if (out.length >= limit) break;
        out.push(item);
    }
    return out;
};

export const ensureDebugEvents = () => {
    if (ready) return;
    ready = true;
    chrome.debugger.onEvent.addListener((source, method, params) => {
        const tabId = source.tabId || 0;
        const state = readSession(tabId);
        if (method === 'Network.requestWillBeSent') savePending(tabId, params);
        if (method === 'Network.loadingFinished' || method === 'Network.loadingFailed') dropPending(tabId, `${params.requestId || ''}`);
        if (method === 'Runtime.consoleAPICalled' && state.page) {
            const parts = [];
            for (const item of params.args || []) parts.push(item.value || item.description || '');
            emitLive('console', { pageId: state.page.pageId, text: parts.join(' ').trim(), type: params.type || 'log' }, state.sessionId);
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
        if (readItems(tabId).size <= limit) quietAt = quietAt || Date.now();
        if (readItems(tabId).size > limit) quietAt = 0;
        if (quietAt && Date.now() - quietAt >= idleMs) return resolve();
        if (Date.now() >= endsAt) return reject(new Error('Timed out waiting for network idle.'));
        setTimeout(tick, 150);
    };
    tick();
});
